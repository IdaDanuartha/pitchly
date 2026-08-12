from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.plans import (
    PLAN_CATALOG,
    PLAN_IDS,
    effective_plan,
    entitlements,
    period_end,
)
from app.db.session import get_db
from app.models.session import Session
from app.models.user import User

router = APIRouter(prefix="/billing", tags=["billing"])


class SubscribeRequest(BaseModel):
    plan_id: str
    interval: str = "monthly"  # monthly|yearly


async def _billing_state(user: User, db: AsyncSession) -> dict:
    plan = effective_plan(user.plan, user.plan_expires_at)
    ent = entitlements(plan)
    dipakai = await db.scalar(
        select(func.count()).select_from(Session).where(Session.user_id == user.id)
    )
    return {
        "plan": plan,
        "interval": user.plan_interval,
        "expires_at": user.plan_expires_at,
        "entitlements": ent,
        "usage": {"sesi_dipakai": int(dipakai or 0), "sesi_kuota": ent["sesi_kuota"]},
    }


@router.get("/plans")
async def list_plans() -> dict:
    return {"plans": PLAN_CATALOG}


@router.get("/me")
async def my_billing(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await _billing_state(user, db)


@router.post("/subscribe")
async def subscribe(
    payload: SubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mock activation — no real payment gateway is integrated."""
    if payload.plan_id not in PLAN_IDS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paket tidak dikenal")

    if payload.plan_id == "free":
        user.plan = "free"
        user.plan_interval = None
        user.plan_expires_at = None
    else:
        if payload.interval not in {"monthly", "yearly"}:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Interval tidak valid")
        user.plan = payload.plan_id
        user.plan_interval = payload.interval
        user.plan_expires_at = period_end(payload.interval)

    await db.commit()
    await db.refresh(user)
    return await _billing_state(user, db)
