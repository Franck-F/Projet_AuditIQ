from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.storage import Storage
from app.models import Report
from app.reporting.excel import build_excel_report
from app.services.audit_service import get_audit

_XLSX = "xlsx"


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
