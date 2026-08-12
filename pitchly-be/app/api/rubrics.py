import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import DEFAULT_RUBRIC_BOBOT, DEFAULT_RUBRIC_KRITERIA
from app.db.session import get_db
from app.models.rubric import CompetitionRubric
from app.models.user import User
from app.schemas.rubric import RubricPublic

router = APIRouter(prefix="/rubrics", tags=["rubrics"])


@router.post("", response_model=RubricPublic, status_code=status.HTTP_201_CREATED)
async def upload_rubric(
    file: UploadFile | None = File(None),
    nama_kompetisi: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompetitionRubric:
    # Extraction of criteria/weights from the uploaded pedoman is wired in a
    # later slice; for now store the fallback template (PRD §5.3).
    if file is not None:
        data = await file.read()
        if not data:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Berkas kosong")

    rubric = CompetitionRubric(
        owner_id=user.id,
        nama_kompetisi=nama_kompetisi,
        kriteria_json=DEFAULT_RUBRIC_KRITERIA,
        bobot_json=DEFAULT_RUBRIC_BOBOT,
    )
    db.add(rubric)
    await db.commit()
    await db.refresh(rubric)
    return rubric


@router.get("", response_model=list[RubricPublic])
async def list_rubrics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CompetitionRubric]:
    result = await db.scalars(
        select(CompetitionRubric)
        .where(CompetitionRubric.owner_id == user.id)
        .order_by(CompetitionRubric.created_at.desc())
    )
    return list(result)


@router.delete("/{rubric_id}", status_code=status.HTTP_200_OK)
async def delete_rubric(
    rubric_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    rubric = await db.get(CompetitionRubric, rubric_id)
    if rubric is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rubrik tidak ditemukan")
    if rubric.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bukan pemilik rubrik")
    await db.delete(rubric)
    await db.commit()
    return {"status": "rubrik dihapus"}
