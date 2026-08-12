from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.analysis import DocumentAnalysis
from app.models.document import Document
from app.models.rubric import CompetitionRubric
from app.models.scorecard import Scorecard
from app.models.session import Session
from app.models.team import Team, TeamMember
from app.models.turn import SessionTurn
from app.models.user import User
from app.schemas.auth import PasswordChange, ProfileUpdate, UserPublic

router = APIRouter(prefix="/account", tags=["account"])


@router.patch("/profile", response_model=UserPublic)
async def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    user.nama = payload.nama.strip()
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    if user.auth_provider != "local":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Akun Google tidak memakai kata sandi.",
        )
    if not verify_password(payload.password_lama, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Kata sandi lama salah.")
    user.password_hash = hash_password(payload.password_baru)
    await db.commit()
    return {"status": "kata sandi diperbarui"}


async def _delete_documents_and_sessions(user: User, db: AsyncSession) -> dict[str, int]:
    """Permanently remove a user's documents, analyses, and session data."""
    doc_ids = list(
        await db.scalars(select(Document.id).where(Document.owner_id == user.id))
    )
    sess_ids = list(
        await db.scalars(select(Session.id).where(Session.user_id == user.id))
    )

    # Unlink stored files (best effort).
    paths = list(
        await db.scalars(
            select(Document.storage_path).where(Document.owner_id == user.id)
        )
    )
    for p in paths:
        try:
            Path(p).unlink(missing_ok=True)
        except OSError:
            pass

    # Explicit child-first deletes (DB-agnostic; does not rely on FK cascade).
    if sess_ids:
        await db.execute(delete(Scorecard).where(Scorecard.session_id.in_(sess_ids)))
        await db.execute(delete(SessionTurn).where(SessionTurn.session_id.in_(sess_ids)))
    await db.execute(delete(Session).where(Session.user_id == user.id))
    if doc_ids:
        await db.execute(
            delete(DocumentAnalysis).where(DocumentAnalysis.document_id.in_(doc_ids))
        )
    await db.execute(delete(Document).where(Document.owner_id == user.id))

    return {"dokumen_dihapus": len(doc_ids), "sesi_dihapus": len(sess_ids)}


@router.delete("/data")
async def delete_my_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    counts = await _delete_documents_and_sessions(user, db)
    await db.commit()
    return counts


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await _delete_documents_and_sessions(user, db)

    team_ids = list(
        await db.scalars(select(Team.id).where(Team.owner_id == user.id))
    )
    if team_ids:
        await db.execute(delete(TeamMember).where(TeamMember.team_id.in_(team_ids)))
    await db.execute(delete(Team).where(Team.owner_id == user.id))
    await db.execute(
        delete(CompetitionRubric).where(CompetitionRubric.owner_id == user.id)
    )
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()
    return {"status": "akun dihapus permanen"}
