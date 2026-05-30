from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.integrations.llm_target import TargetConfig, assert_public_url
from app.integrations.storage import Storage, get_report_storage
from app.interpretation.base import LLMProvider
from app.interpretation.gemini import get_llm_provider
from app.schemas.audit import (
    AuditCreate,
    AuditOut,
    M3TestConnectionIn,
    M3TestConnectionOut,
    M3ValidateUrlIn,
    M3ValidateUrlOut,
)
from app.schemas.auth import CurrentUser
from app.services import audit_service, report_service
from app.services.llm_test_connection import check_connection

router = APIRouter(prefix="/audits", tags=["audits"])


def get_llm_provider_dep() -> LLMProvider | None:
    return get_llm_provider()


def get_report_storage_dep() -> Storage:
    return get_report_storage()


@router.post("", response_model=AuditOut, status_code=202)
async def create_audit(
    body: AuditCreate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    llm_provider: LLMProvider | None = Depends(get_llm_provider_dep),  # noqa: B008
) -> AuditOut:
    out = await audit_service.submit_audit(
        session,
        org_id=user.org_id,
        user_id=user.id,
        body=body,
        llm_provider=llm_provider,
    )
    asyncio.create_task(
        audit_service.run_audit_job(out.id, body, llm_provider)
    )
    return out


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


@router.post("/m3/test-connection", response_model=M3TestConnectionOut)
async def m3_test_connection(
    body: M3TestConnectionIn,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
) -> M3TestConnectionOut:
    cfg = TargetConfig(
        url=body.target.url,
        method=body.target.method,
        headers=dict(body.target.headers),
        body_template=body.target.body_template,
        response_path=body.target.response_path,
    )
    return await check_connection(cfg, body.test_prompt)


@router.post("/m3/validate-url", response_model=M3ValidateUrlOut)
async def m3_validate_url(
    body: M3ValidateUrlIn,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
) -> M3ValidateUrlOut:
    # Raises APIError 422 on private/blocked URLs; FastAPI's exception handler
    # converts that to a 422 JSON response.
    assert_public_url(str(body.url))
    return M3ValidateUrlOut(status="ok")
