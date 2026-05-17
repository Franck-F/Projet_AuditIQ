from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.integrations.storage import Storage, get_report_storage
from app.interpretation.base import LLMProvider
from app.interpretation.gemini import get_llm_provider
from app.routers.datasets import get_storage_dep
from app.schemas.audit import AuditCreate, AuditOut
from app.schemas.auth import CurrentUser
from app.services import audit_service, report_service

router = APIRouter(prefix="/audits", tags=["audits"])


def get_llm_provider_dep() -> LLMProvider | None:
    return get_llm_provider()


def get_report_storage_dep() -> Storage:
    return get_report_storage()


@router.post("", response_model=AuditOut, status_code=201)
async def create_audit(
    body: AuditCreate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
    llm_provider: LLMProvider | None = Depends(get_llm_provider_dep),  # noqa: B008
) -> AuditOut:
    if body.module == "M3":
        return await audit_service.run_m3_audit(
            session, org_id=user.org_id, user_id=user.id,
            body=body, llm_provider=llm_provider,
        )
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


@router.get("/{audit_id}/report.xlsx")
async def get_audit_report_xlsx(
    audit_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_report_storage_dep),  # noqa: B008
) -> Response:
    data, filename = await report_service.get_or_build_excel(
        session, storage, audit_id, org_id=user.org_id
    )
    return Response(
        content=data,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{audit_id}/report.pdf")
async def get_audit_report_pdf(
    audit_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_report_storage_dep),  # noqa: B008
) -> Response:
    data, filename = await report_service.get_or_build_pdf(
        session, storage, audit_id, org_id=user.org_id
    )
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
