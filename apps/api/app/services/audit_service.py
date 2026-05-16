from __future__ import annotations

import datetime
import io
import uuid
from typing import cast

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_engine import M1Config, M1Result, run_m1
from app.core.errors import NotFoundError
from app.integrations.storage import Storage
from app.models import Audit, AuditResult, Dataset
from app.schemas.audit import (
    AuditCreate,
    AuditOut,
    GroupStatOut,
    M1MetricsOut,
    Verdict,
)
from app.services.dataset_service import get_dataset


def _canonical_scalar(value: str, series: pd.Series) -> str:
    """Match the engine's astype(str) on a column whose dtype may be numeric.

    The pure engine compares ``series.astype(str)`` to ``str(config.value)``.
    For a numeric column, ``str(1.0)`` != ``str(1)``; coerce the user-supplied
    string through the column dtype so "1" matches a float column's "1.0".
    """
    if pd.api.types.is_numeric_dtype(series):
        try:
            coerced = pd.Series([value]).astype(series.dtype).iloc[0]
            return str(coerced)
        except (ValueError, TypeError):
            return value
    return value


async def _next_code(session: AsyncSession, org_id: uuid.UUID) -> str:
    year = datetime.datetime.now(tz=datetime.timezone.utc).year
    count = (
        await session.execute(
            select(func.count()).select_from(Audit).where(Audit.org_id == org_id)
        )
    ).scalar_one()
    return f"AUD-{year}-{count + 1:03d}"


def _to_metrics_out(result_obj: M1Result) -> M1MetricsOut:
    return M1MetricsOut(
        groups=[
            GroupStatOut(
                value=g.value,
                n=g.n,
                favorable=g.favorable,
                selection_rate=g.selection_rate,
                disparate_impact=g.disparate_impact,
            )
            for g in result_obj.groups
        ],
        reference_value=result_obj.reference_value,
        disparate_impact=result_obj.disparate_impact,
        demographic_parity_diff=result_obj.demographic_parity_diff,
        worst_group=result_obj.worst_group,
        # Engine returns a bare str but only ever VERDICT_PASS/WARN/FAIL
        # (see audit_engine.metrics.decide_verdict); narrow to the DTO Literal.
        verdict=cast(Verdict, result_obj.verdict),
        risk_score=result_obj.risk_score,
        warnings=list(result_obj.warnings),
    )


def _audit_out(audit: Audit, metrics: M1MetricsOut | None) -> AuditOut:
    return AuditOut(
        id=audit.id,
        code=audit.code,
        title=audit.title,
        status=audit.status,
        module=audit.module,
        dataset_id=audit.dataset_id,
        protected_attribute=audit.protected_attribute,
        decision_column=audit.decision_column,
        favorable_value=audit.favorable_value,
        privileged_value=audit.privileged_value,
        created_at=audit.created_at,
        completed_at=audit.completed_at,
        metrics=metrics,
    )


async def run_m1_audit(
    session: AsyncSession,
    storage: Storage,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
) -> AuditOut:
    dataset: Dataset = await get_dataset(session, body.dataset_id, org_id=org_id)

    audit = Audit(
        code=await _next_code(session, org_id),
        org_id=org_id,
        dataset_id=dataset.id,
        module="M1",
        title=body.title,
        status="running",
        protected_attribute=body.protected_attribute,
        decision_column=body.decision_column,
        favorable_value=body.favorable_value,
        privileged_value=body.privileged_value,
        created_by=user_id,
    )
    session.add(audit)
    await session.flush()

    raw = await storage.download(dataset.storage_path)
    df = pd.read_csv(io.BytesIO(raw))

    fav = body.favorable_value
    priv = body.privileged_value
    if body.decision_column in df.columns:
        fav = _canonical_scalar(body.favorable_value, df[body.decision_column])
    if priv is not None and body.protected_attribute in df.columns:
        priv = _canonical_scalar(priv, df[body.protected_attribute])

    # run_m1 may raise DatasetValidationError — let it propagate; the router
    # maps it to RFC 7807 422 (see core/errors.py handler).
    result = run_m1(
        df,
        M1Config(
            protected_attribute=body.protected_attribute,
            decision_column=body.decision_column,
            favorable_value=fav,
            privileged_value=priv,
        ),
    )

    metrics_out = _to_metrics_out(result)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation={},
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out)


async def get_audit(
    session: AsyncSession, audit_id: uuid.UUID, *, org_id: uuid.UUID
) -> AuditOut:
    audit = (
        await session.execute(
            select(Audit).where(Audit.id == audit_id, Audit.org_id == org_id)
        )
    ).scalar_one_or_none()
    if audit is None:
        raise NotFoundError("Audit introuvable.")
    result = (
        await session.execute(
            select(AuditResult).where(AuditResult.audit_id == audit_id)
        )
    ).scalar_one_or_none()
    metrics = (
        M1MetricsOut.model_validate(result.metrics) if result is not None else None
    )
    return _audit_out(audit, metrics)
