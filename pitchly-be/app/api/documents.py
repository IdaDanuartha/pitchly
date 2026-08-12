import logging
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_embedder,
    get_llm,
    get_vector_store,
)
from app.db.session import get_db
from app.llm import LLMClient
from app.llm.base import LLMError
from app.models.analysis import DocumentAnalysis
from app.models.document import Document
from app.models.user import User
from app.schemas.analysis import AnalysisResponse, Finding
from app.schemas.document import (
    DocumentPublic,
    OriginalityResponse,
    SimilarSolutionPublic,
)
from app.core.config import settings
from app.core.plans import effective_plan, entitlements
from app.services.analysis import AnalysisError, analyze_document
from app.services.originality import find_similar, find_similar_web
from app.services.pdf import extract_pages, extract_text
from app.services.web_search import TavilySearch, WebSearchError
from app.storage import get_storage
from app.vector.base import VectorError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


async def _owned_document(
    document_id: uuid.UUID, user: User, db: AsyncSession
) -> Document:
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dokumen tidak ditemukan")
    if doc.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bukan pemilik dokumen")
    return doc


@router.post("", response_model=DocumentPublic, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    tipe: str = Form("proposal"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Berkas kosong")

    storage = get_storage()
    key = f"{user.id}/{uuid.uuid4()}-{file.filename}"
    path = storage.save(data, key)

    doc = Document(
        owner_id=user.id,
        tipe=tipe,
        filename=file.filename or "dokumen.pdf",
        storage_path=path,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{document_id}", response_model=DocumentPublic)
async def get_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    return await _owned_document(document_id, user, db)


@router.post("/{document_id}/analyze", response_model=AnalysisResponse)
async def analyze(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
) -> DocumentAnalysis:
    doc = await _owned_document(document_id, user, db)

    storage = get_storage()
    data = await run_in_threadpool(storage.read, doc.storage_path)
    pages = await run_in_threadpool(extract_pages, data)
    text = "\n".join(pages).strip()

    try:
        findings = await run_in_threadpool(analyze_document, text, llm, pages)
    except AnalysisError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    except LLMError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Model AI gagal merespons (GPT & Gemini). Periksa API key/model. {exc}",
        ) from exc

    analysis = DocumentAnalysis(
        document_id=doc.id,
        findings_json=[f.model_dump() for f in findings],
        model_used=llm.last_model_used or "unknown",
    )
    doc.status_analisis = "analyzed"
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    return _to_response(analysis)


@router.get("/{document_id}/analysis", response_model=AnalysisResponse)
async def get_analysis(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentAnalysis:
    doc = await _owned_document(document_id, user, db)
    analysis = await db.scalar(
        select(DocumentAnalysis)
        .where(DocumentAnalysis.document_id == doc.id)
        .order_by(DocumentAnalysis.created_at.desc())
    )
    if analysis is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analisis belum tersedia")
    return _to_response(analysis)


@router.post("/{document_id}/originality", response_model=OriginalityResponse)
async def check_originality(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    embedder=Depends(get_embedder),
    store=Depends(get_vector_store),
) -> OriginalityResponse:
    doc = await _owned_document(document_id, user, db)
    storage = get_storage()
    data = await run_in_threadpool(storage.read, doc.storage_path)
    text = await run_in_threadpool(extract_text, data)

    # Web search is a Pro/Tim feature; Free users get the offline corpus check.
    web_allowed = entitlements(effective_plan(user.plan, user.plan_expires_at))[
        "orisinalitas_web"
    ]
    web_error: str | None = None
    if settings.web_search_enabled and web_allowed:
        try:
            search = TavilySearch(settings.tavily_api_key)
            matches = await run_in_threadpool(
                find_similar_web, text, embedder, search, llm
            )
            return OriginalityResponse(
                available=True,
                sumber="web",
                matches=[SimilarSolutionPublic(**m.__dict__) for m in matches],
            )
        except (WebSearchError, VectorError) as exc:
            # Keep the message so it's visible in the network response, then
            # fall through to the offline corpus.
            web_error = str(exc)
            logger.warning("Web originality check failed: %s", web_error)

    try:
        matches = await run_in_threadpool(find_similar, text, embedder, store)
    except VectorError:
        return OriginalityResponse(
            available=False, matches=[], sumber="korpus", web_error=web_error
        )

    return OriginalityResponse(
        available=True,
        sumber="korpus",
        matches=[SimilarSolutionPublic(**m.__dict__) for m in matches],
        web_error=web_error,
    )


def _to_response(analysis: DocumentAnalysis) -> AnalysisResponse:
    return AnalysisResponse(
        id=analysis.id,
        document_id=analysis.document_id,
        findings=[Finding.model_validate(f) for f in analysis.findings_json],
        model_used=analysis.model_used,
        created_at=analysis.created_at,
    )
