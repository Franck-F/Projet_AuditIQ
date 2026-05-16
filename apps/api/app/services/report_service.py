from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.storage import Storage
from app.models import Report
from app.reporting.excel import build_excel_report
from app.reporting.html import build_report_html
from app.reporting.pdf_client import render_pdf
from app.services.audit_service import get_audit

_XLSX = "xlsx"
_PDF = "pdf"


async def get_or_build_excel(
    session: AsyncSession,
    storage: Storage,
    audit_id: uuid.UUID,
    *,
    org_id: uuid.UUID,
) -> tuple[bytes, str]:
    """Return (xlsx_bytes, filename). Builds once, then serves from cache.

    `get_audit` enforces org scoping (raises NotFoundError for another org).
    """
    audit = await get_audit(session, audit_id, org_id=org_id)
    existing = (
        await session.execute(
            select(Report).where(
                Report.audit_id == audit_id, Report.format == _XLSX
            )
        )
    ).scalar_one_or_none()
    filename = f"{audit.code or audit.id}.xlsx"
    if existing is not None:
        return await storage.download(existing.storage_path), filename

    data = build_excel_report(audit)
    path = f"{org_id}/{audit_id}.xlsx"
    await storage.upload(
        path,
        data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    session.add(Report(audit_id=audit_id, format=_XLSX, storage_path=path))
    await session.commit()
    return data, filename


async def get_or_build_pdf(
    session: AsyncSession,
    storage: Storage,
    audit_id: uuid.UUID,
    *,
    org_id: uuid.UUID,
) -> tuple[bytes, str]:
    """Return (pdf_bytes, filename). Builds once via the PDF microservice,
    then serves from cache. Org-scoped via get_audit. A microservice failure
    propagates as APIError(502) (raised by render_pdf) — never silent."""
    audit = await get_audit(session, audit_id, org_id=org_id)
    existing = (
        await session.execute(
            select(Report).where(
                Report.audit_id == audit_id, Report.format == _PDF
            )
        )
    ).scalar_one_or_none()
    filename = f"{audit.code or audit.id}.pdf"
    if existing is not None:
        return await storage.download(existing.storage_path), filename

    data = await render_pdf(build_report_html(audit))
    path = f"{org_id}/{audit_id}.pdf"
    await storage.upload(path, data, "application/pdf")
    session.add(Report(audit_id=audit_id, format=_PDF, storage_path=path))
    await session.commit()
    return data, filename
