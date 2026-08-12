import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.team import (
    MemberCreate,
    MemberPublic,
    TeamCreate,
    TeamPublic,
)

router = APIRouter(prefix="/teams", tags=["teams"])


async def _owned_team(team_id: uuid.UUID, user: User, db: AsyncSession) -> Team:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tim tidak ditemukan")
    if team.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bukan pemilik tim")
    return team


async def _members(team_id: uuid.UUID, db: AsyncSession) -> list[TeamMember]:
    result = await db.scalars(
        select(TeamMember)
        .where(TeamMember.team_id == team_id)
        .order_by(TeamMember.created_at)
    )
    return list(result)


async def _to_public(team: Team, db: AsyncSession) -> TeamPublic:
    members = await _members(team.id, db)
    return TeamPublic(
        id=team.id,
        nama_tim=team.nama_tim,
        owner_id=team.owner_id,
        members=[MemberPublic.model_validate(m) for m in members],
    )


@router.post("", response_model=TeamPublic, status_code=status.HTTP_201_CREATED)
async def create_team(
    payload: TeamCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TeamPublic:
    team = Team(nama_tim=payload.nama_tim, owner_id=user.id)
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return await _to_public(team, db)


@router.get("", response_model=list[TeamPublic])
async def list_teams(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TeamPublic]:
    teams = list(
        await db.scalars(
            select(Team).where(Team.owner_id == user.id).order_by(Team.created_at.desc())
        )
    )
    return [await _to_public(t, db) for t in teams]


@router.get("/{team_id}", response_model=TeamPublic)
async def get_team(
    team_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TeamPublic:
    team = await _owned_team(team_id, user, db)
    return await _to_public(team, db)


@router.post(
    "/{team_id}/members",
    response_model=TeamPublic,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    team_id: uuid.UUID,
    payload: MemberCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TeamPublic:
    team = await _owned_team(team_id, user, db)
    db.add(TeamMember(team_id=team.id, nama=payload.nama, peran=payload.peran))
    await db.commit()
    return await _to_public(team, db)


@router.delete("/{team_id}/members/{member_id}", response_model=TeamPublic)
async def remove_member(
    team_id: uuid.UUID,
    member_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TeamPublic:
    team = await _owned_team(team_id, user, db)
    member = await db.get(TeamMember, member_id)
    if member is None or member.team_id != team.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anggota tidak ditemukan")
    await db.delete(member)
    await db.commit()
    return await _to_public(team, db)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    team = await _owned_team(team_id, user, db)
    await db.delete(team)
    await db.commit()

