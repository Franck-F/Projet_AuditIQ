from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Audit, AuditResult
from app.schemas.dashboard import DashboardSummaryOut, RecentAudit

_RECENT_LIMIT = 10


async def get_summary(
    session: AsyncSession, *, org_id: uuid.UUID
) -> DashboardSummaryOut:
    rows = (
        await session.execute(
            select(Audit, AuditResult)
            .join(
                AuditResult,
                AuditResult.audit_id == Audit.id,
                isouter=True,
            )
            .where(Audit.org_id == org_id, Audit.archived_at.is_(None))
            .order_by(Audit.created_at.desc())
        )
    ).all()

    total = len(rows)
    failing = sum(1 for _a, r in rows if r is not None and r.verdict == "fail")
    warning = sum(1 for _a, r in rows if r is not None and r.verdict == "warn")
    scores = [r.risk_score for _a, r in rows if r is not None]
    risk = round(sum(scores) / len(scores)) if scores else 0

    module_usage: dict[str, int] = {}
    for audit, _r in rows:
        module_usage[audit.module] = module_usage.get(audit.module, 0) + 1

    recent = [
        RecentAudit(
            id=audit.id,
            code=audit.code,
            title=audit.title,
            module=audit.module,
            verdict=result.verdict if result is not None else None,
            risk_score=result.risk_score if result is not None else None,
            created_at=audit.created_at,
        )
        for audit, result in rows[:_RECENT_LIMIT]
    ]

    return DashboardSummaryOut(
        total_audits=total,
        failing_audits=failing,
        warning_audits=warning,
        risk_score=risk,
        module_usage=module_usage,
        recent_audits=recent,
    )
