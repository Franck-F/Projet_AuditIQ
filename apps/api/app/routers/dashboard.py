from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.dashboard import DashboardSummaryOut
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
async def summary(
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> DashboardSummaryOut:
    return await dashboard_service.get_summary(session, org_id=user.org_id)
