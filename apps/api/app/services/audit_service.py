from __future__ import annotations

import asyncio
import datetime
import io
import uuid
from typing import cast

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_engine import (
    PROMPT_BANK,
    M1Config,
    M1Result,
    M2Config,
    M2Result,
    M3Config,
    M3Responses,
    M3Result,
    ResponseRecord,
    iqr_precheck,
    run_m1,
    run_m2,
    run_m3,
)
from app.core.config import get_settings
from app.core.errors import NotFoundError
from app.integrations.llm_target import TargetConfig, assert_public_url, call_target_llm
from app.integrations.storage import Storage
from app.interpretation.base import LLMProvider
from app.interpretation.m1 import interpret_m1
from app.interpretation.m2 import interpret_m2
from app.interpretation.m3 import interpret_m3
from app.models import Audit, AuditResult, Dataset
from app.schemas.audit import (
    AuditCreate,
    AuditOut,
    CategoryStatOut,
    ClusterStatOut,
    DivergentExampleOut,
    FeatureContributionOut,
    GroupStatOut,
    InterpretationOut,
    M1MetricsOut,
    M2MetricsOut,
    M3MetricsOut,
    Verdict,
)
from app.services.dataset_service import get_dataset

_BANK_VERSION = "v1"


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


def _run_iqr(
    df: pd.DataFrame, *, group_column: str | None,
    numeric_columns: list[str] | None,
) -> list[str]:
    return list(
        iqr_precheck(
            df, group_column=group_column, numeric_columns=numeric_columns
        ).warnings
    )


def _to_m2_metrics_out(r: M2Result) -> M2MetricsOut:
    return M2MetricsOut(
        n=r.n, k=r.k, global_positive_rate=r.global_positive_rate,
        chi2=r.chi2, p_value=r.p_value, dof=r.dof,
        clusters=[
            ClusterStatOut(
                id=c.id, n=c.n, positive_rate=c.positive_rate,
                deviation_pp=c.deviation_pp, is_deviant=c.is_deviant,
                top_features=[
                    FeatureContributionOut(
                        name=f.name, std_diff=f.std_diff,
                        direction=f.direction,
                    )
                    for f in c.top_features
                ],
            )
            for c in r.clusters
        ],
        deviant_cluster_ids=list(r.deviant_cluster_ids),
        verdict=cast(Verdict, r.verdict),
        risk_score=r.risk_score,
        warnings=list(r.warnings),
    )


def _to_m3_metrics_out(r: M3Result) -> M3MetricsOut:
    return M3MetricsOut(
        categories=[
            CategoryStatOut(
                name=c.name, length_gap=c.length_gap,
                sentiment_gap=c.sentiment_gap, refusal_rate=c.refusal_rate,
                score=c.score, verdict=cast(Verdict, c.verdict),
            )
            for c in r.categories
        ],
        global_score=r.global_score,
        verdict=cast(Verdict, r.verdict),
        risk_score=r.risk_score,
        divergent_examples=[
            DivergentExampleOut(
                category=e.category, prompt_id=e.prompt_id,
                variant_a=e.variant_a, variant_b=e.variant_b,
                excerpt_a=e.excerpt_a, excerpt_b=e.excerpt_b, reason=e.reason,
            )
            for e in r.divergent_examples
        ],
        n_pairs=r.n_pairs, n_calls_failed=r.n_calls_failed,
        warnings=list(r.warnings),
    )


def _audit_out(
    audit: Audit,
    metrics: M1MetricsOut | M2MetricsOut | M3MetricsOut | None,
    interpretation: InterpretationOut | None = None,
    pre_check: list[str] | None = None,
) -> AuditOut:
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
        interpretation=interpretation,
        pre_check=pre_check or [],
        config=audit.config,
    )


async def run_m1_audit(
    session: AsyncSession,
    storage: Storage,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    assert body.dataset_id is not None  # guaranteed by AuditCreate._per_module
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

    pre_check = _run_iqr(
        df, group_column=body.protected_attribute, numeric_columns=None
    )

    dec_col = cast(str, body.decision_column)  # required for M1 by _per_module
    fav_val = cast(str, body.favorable_value)  # required for M1 by _per_module
    fav = fav_val
    priv = body.privileged_value
    if dec_col in df.columns:
        fav = _canonical_scalar(fav_val, df[dec_col])
    if priv is not None and body.protected_attribute in df.columns:
        priv = _canonical_scalar(priv, df[body.protected_attribute])

    # run_m1 may raise DatasetValidationError — let it propagate; the router
    # maps it to RFC 7807 422 (see core/errors.py handler).
    result = run_m1(
        df,
        M1Config(
            protected_attribute=cast(str, body.protected_attribute),
            decision_column=dec_col,
            favorable_value=fav,
            privileged_value=priv,
        ),
    )

    metrics_out = _to_metrics_out(result)
    interpretation = await interpret_m1(result, provider=llm_provider)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation=interpretation.model_dump(),
            pre_check=pre_check,
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out, interpretation, pre_check)


async def run_m2_audit(
    session: AsyncSession,
    storage: Storage,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    assert body.dataset_id is not None  # guaranteed by AuditCreate._per_module
    dataset: Dataset = await get_dataset(session, body.dataset_id, org_id=org_id)
    cfg_in = body.config
    config_payload = cfg_in.model_dump() if cfg_in is not None else None

    audit = Audit(
        code=await _next_code(session, org_id),
        org_id=org_id,
        dataset_id=dataset.id,
        module="M2",
        title=body.title,
        status="running",
        protected_attribute=None,
        decision_column=body.decision_column,
        favorable_value=body.favorable_value,
        privileged_value=None,
        config=config_payload,
        created_by=user_id,
    )
    session.add(audit)
    await session.flush()

    raw = await storage.download(dataset.storage_path)
    df = pd.read_csv(io.BytesIO(raw))

    feats = cfg_in.features if cfg_in is not None else None
    m2_dec_col = cast(str, body.decision_column)  # required for M2 by _per_module
    m2_cfg = M2Config(
        decision_column=m2_dec_col,
        positive_value=cast(str, body.favorable_value),  # required for M2 by _per_module
        feature_columns=tuple(feats) if feats else None,
        k=cfg_in.k if cfg_in is not None else 5,
        deviation_pp=cfg_in.deviation_pp if cfg_in is not None else 20.0,
        chi2_alpha=cfg_in.chi2_alpha if cfg_in is not None else 0.05,
        random_state=cfg_in.random_state if cfg_in is not None else 42,
    )
    numeric_cols = [
        c for c in df.columns
        if c != m2_dec_col
        and pd.api.types.is_numeric_dtype(df[c])
    ]
    pre_check = _run_iqr(df, group_column=None, numeric_columns=numeric_cols)

    result = run_m2(df, m2_cfg)
    metrics_out = _to_m2_metrics_out(result)
    interpretation = await interpret_m2(result, provider=llm_provider)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation=interpretation.model_dump(),
            pre_check=pre_check,
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out, interpretation, pre_check)


async def run_m3_audit(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    assert body.target is not None  # guaranteed by AuditCreate._per_module
    # Validate the target URL early (SSRF + scheme check) — raises APIError 422
    # before any DB write so the error propagates cleanly through the RFC 7807 handler.
    assert_public_url(body.target.url)
    s = get_settings()
    tcfg = TargetConfig(
        url=body.target.url,
        method=body.target.method,
        headers=dict(body.target.headers),
        body_template=body.target.body_template,
        response_path=body.target.response_path,
    )
    lang = body.lang if body.lang in ("fr", "en") else "fr"

    audit = Audit(
        code=await _next_code(session, org_id),
        org_id=org_id,
        dataset_id=None,
        module="M3",
        title=body.title,
        status="running",
        protected_attribute=None,
        decision_column=None,
        favorable_value=None,
        privileged_value=None,
        config={
            "target": {
                "url": body.target.url,
                "method": body.target.method,
                "response_path": body.target.response_path,
            },
            "bank_version": _BANK_VERSION,
            "lang": lang,
        },
        created_by=user_id,
    )
    session.add(audit)
    await session.flush()

    # (pair_id, category, attribute_label, prompt)
    calls: list[tuple[str, str, str, str]] = []
    for pair in PROMPT_BANK:
        for v in pair.variants:
            calls.append(
                (pair.id, pair.category, v.attribute_label,
                 v.fr if lang == "fr" else v.en)
            )
    calls = calls[: s.llm_audit_max_calls]

    sem = asyncio.Semaphore(s.llm_target_max_concurrency)
    results: dict[int, tuple[str, bool]] = {}

    async def _one(i: int, prompt: str) -> None:
        async with sem:
            try:
                txt = await call_target_llm(tcfg, prompt)
                results[i] = (txt, False)
            except Exception:  # noqa: BLE001 — per-call failure is non-fatal
                results[i] = ("", True)

    tasks = [
        asyncio.create_task(_one(i, c[3])) for i, c in enumerate(calls)
    ]
    if tasks:
        _done, pending = await asyncio.wait(
            tasks, timeout=float(s.llm_audit_deadline_s)
        )
        for t in pending:
            t.cancel()

    records: list[ResponseRecord] = []
    for i, (pid, cat, label, _prompt) in enumerate(calls):
        text, failed = results.get(i, ("", True))
        records.append(
            ResponseRecord(
                pair_id=pid, category=cat, variant_label=label,
                text=text, failed=failed,
            )
        )

    result = run_m3(M3Responses(records=tuple(records)), M3Config(lang=lang))
    metrics_out = _to_m3_metrics_out(result)
    interpretation = await interpret_m3(result, provider=llm_provider)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation=interpretation.model_dump(),
            pre_check=[],
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out, interpretation, [])


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
    metrics: M1MetricsOut | M2MetricsOut | M3MetricsOut | None
    if result is None:
        metrics = None
    elif audit.module == "M3":
        metrics = M3MetricsOut.model_validate(result.metrics)
    elif audit.module == "M2":
        metrics = M2MetricsOut.model_validate(result.metrics)
    else:
        metrics = M1MetricsOut.model_validate(result.metrics)
    pre_check = list(result.pre_check) if result and result.pre_check else []
    interpretation = (
        InterpretationOut.model_validate(result.interpretation)
        if result is not None and result.interpretation
        else None
    )
    return _audit_out(audit, metrics, interpretation, pre_check)
