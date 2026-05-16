from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.integrations.storage import Storage
from app.interpretation.base import LLMProvider
from app.interpretation.gemini import get_llm_provider
from app.routers.datasets import get_storage_dep
from app.schemas.audit import AuditCreate, AuditOut
from app.schemas.auth import CurrentUser
from app.services import audit_service

router = APIRouter(prefix="/audits", tags=["audits"])


def get_llm_provider_dep() -> LLMProvider | None:
    return get_llm_provider()


@router.post("", response_model=AuditOut, status_code=201)
async def create_audit(
    body: AuditCreate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
    llm_provider: LLMProvider | None = Depends(get_llm_provider_dep),  # noqa: B008
) -> AuditOut:
    if body.module == "M2":
        return await audit_service.run_m2_audit(
            session, storage, org_id=user.org_id, user_id=user.id,
            body=body, llm_provider=llm_provider,
        )
    return await audit_service.run_m1_audit(
        session, storage, org_id=user.org_id, user_id=user.id,
        body=body, llm_provider=llm_provider,
    )


@router.get("/{audit_id}", response_model=AuditOut)
async def get_audit(
    audit_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> AuditOut:
    return await audit_service.get_audit(session, audit_id, org_id=user.org_id)
