from __future__ import annotations

import asyncio
import datetime
import io
import uuid
from typing import cast

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

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
from app.core.db import _sessionmaker
from app.core.errors import NotFoundError
from app.integrations.llm_target import TargetConfig, assert_public_url, call_target_llm
from app.integrations.storage import Storage, get_storage
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
    IntersectionalCellOut,
    IntersectionalOut,
    M1MetricsOut,
    M2MetricsOut,
    M3MetricsOut,
    MarginalOut,
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
                tpr=g.tpr,
                fpr=g.fpr,
                fnr=g.fnr,
                accuracy=g.accuracy,
                precision=g.precision,
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
        equal_opportunity_diff=result_obj.equal_opportunity_diff,
        equalized_odds_diff=result_obj.equalized_odds_diff,
        demographic_parity_verdict=(
            cast(Verdict, result_obj.demographic_parity_verdict)
            if result_obj.demographic_parity_verdict is not None else None
        ),
        equal_opportunity_verdict=(
            cast(Verdict, result_obj.equal_opportunity_verdict)
            if result_obj.equal_opportunity_verdict is not None else None
        ),
        equalized_odds_verdict=(
            cast(Verdict, result_obj.equalized_odds_verdict)
            if result_obj.equalized_odds_verdict is not None else None
        ),
        truelabel_reason=result_obj.truelabel_reason,
        marginals=[
            MarginalOut(
                attribute=m.attribute,
                groups=[
                    GroupStatOut(
                        value=g.value,
                        n=g.n,
                        favorable=g.favorable,
                        selection_rate=g.selection_rate,
                        disparate_impact=g.disparate_impact,
                        tpr=g.tpr,
                        fpr=g.fpr,
                        fnr=g.fnr,
                        accuracy=g.accuracy,
                        precision=g.precision,
                    )
                    for g in m.groups
                ],
                reference_value=m.reference_value,
                disparate_impact=m.disparate_impact,
                demographic_parity_diff=m.demographic_parity_diff,
                worst_group=m.worst_group,
                verdict=cast(Verdict, m.verdict),
                risk_score=m.risk_score,
                warnings=list(m.warnings),
                equal_opportunity_diff=m.equal_opportunity_diff,
                equalized_odds_diff=m.equalized_odds_diff,
                demographic_parity_verdict=(
                    cast(Verdict, m.demographic_parity_verdict)
                    if m.demographic_parity_verdict is not None else None
                ),
                equal_opportunity_verdict=(
                    cast(Verdict, m.equal_opportunity_verdict)
                    if m.equal_opportunity_verdict is not None else None
                ),
                equalized_odds_verdict=(
                    cast(Verdict, m.equalized_odds_verdict)
                    if m.equalized_odds_verdict is not None else None
                ),
                truelabel_reason=m.truelabel_reason,
                demographic_parity_ratio=m.demographic_parity_ratio,
                equal_opportunity_ratio=m.equal_opportunity_ratio,
                equalized_odds_ratio=m.equalized_odds_ratio,
            )
            for m in result_obj.marginals
        ],
        pairwise=[
            IntersectionalOut(
                cells=[
                    IntersectionalCellOut(
                        primary_value=c.primary_value,
                        secondary_value=c.secondary_value,
                        n=c.n,
                        favorable=c.favorable,
                        selection_rate=c.selection_rate,
                        disparate_impact=c.disparate_impact,
                        verdict=cast(Verdict, c.verdict),
                        tpr=c.tpr,
                        fpr=c.fpr,
                    )
                    for c in p.cells
                ],
                reference_primary=p.reference_primary,
                reference_secondary=p.reference_secondary,
                worst_primary=p.worst_primary,
                worst_secondary=p.worst_secondary,
                disparate_impact=p.disparate_impact,
                demographic_parity_diff=p.demographic_parity_diff,
                verdict=cast(Verdict, p.verdict),
                risk_score=p.risk_score,
                marginal_di=list(p.marginal_di),
                equal_opportunity_diff=p.equal_opportunity_diff,
                equalized_odds_diff=p.equalized_odds_diff,
                demographic_parity_verdict=(
                    cast(Verdict, p.demographic_parity_verdict)
                    if p.demographic_parity_verdict is not None else None
                ),
                equal_opportunity_verdict=(
                    cast(Verdict, p.equal_opportunity_verdict)
                    if p.equal_opportunity_verdict is not None else None
                ),
                equalized_odds_verdict=(
                    cast(Verdict, p.equalized_odds_verdict)
                    if p.equalized_odds_verdict is not None else None
                ),
                warnings=list(p.warnings),
                reason=p.reason,
                primary_attribute=p.primary_attribute,
                secondary_attribute=p.secondary_attribute,
                demographic_parity_ratio=p.demographic_parity_ratio,
                equal_opportunity_ratio=p.equal_opportunity_ratio,
                equalized_odds_ratio=p.equalized_odds_ratio,
            )
            for p in result_obj.pairwise
        ],
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


def _run_iqr_multi(df: pd.DataFrame, attributes: list[str]) -> list[str]:
    """IQR group-size pre-check across ALL protected attributes (M1).

    Each attribute is checked independently. When more than one attribute is
    audited, warnings are prefixed with ``[attribute]`` so identical group
    labels across attributes stay unambiguous. A single attribute keeps the
    legacy (unprefixed) text for backward compatibility.
    """
    multi = len(attributes) > 1
    out: list[str] = []
    for attr in attributes:
        for warning in _run_iqr(df, group_column=attr, numeric_columns=None):
            out.append(f"[{attr}] {warning}" if multi else warning)
    return out


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
        error=audit.error,
        metrics=metrics,
        interpretation=interpretation,
        pre_check=pre_check or [],
        config=audit.config,
    )


async def _load_audit(session: AsyncSession, audit_id: uuid.UUID) -> Audit:
    """Fetch an Audit row by id (no org filter — used by the split pipeline and
    the background job). Raises NotFoundError (-> RFC 7807 404) if absent.
    """
    audit = (
        await session.execute(select(Audit).where(Audit.id == audit_id))
    ).scalar_one_or_none()
    if audit is None:
        raise NotFoundError("Audit introuvable.")
    return audit


def _build_audit_row(
    body: AuditCreate, *, org_id: uuid.UUID, user_id: uuid.UUID, code: str
) -> Audit:
    """Build the pending Audit row for a request, reproducing exactly the row
    each former ``run_mX_audit`` created — dispatched by ``body.module``.
    """
    if body.module == "M3":
        assert body.target is not None  # guaranteed by AuditCreate._per_module
        lang = body.lang if body.lang in ("fr", "en") else "fr"
        return Audit(
            code=code,
            org_id=org_id,
            dataset_id=None,
            module="M3",
            title=body.title,
            status="pending",
            protected_attribute=None,
            decision_column=None,
            favorable_value=None,
            privileged_value=None,
            config={
                # Secrets (e.g. Authorization header) are NEVER persisted.
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
    if body.module == "M2":
        cfg_in = body.config
        config_payload = cfg_in.model_dump() if cfg_in is not None else None
        return Audit(
            code=code,
            org_id=org_id,
            dataset_id=body.dataset_id,
            module="M2",
            title=body.title,
            status="pending",
            protected_attribute=None,
            decision_column=body.decision_column,
            favorable_value=body.favorable_value,
            privileged_value=None,
            config=config_payload,
            created_by=user_id,
        )
    # M1
    m1_config: dict[str, object] = {}
    if body.ground_truth_column is not None:
        m1_config["ground_truth_column"] = body.ground_truth_column
    if body.secondary_protected_attribute is not None:
        m1_config["secondary_protected_attribute"] = (
            body.secondary_protected_attribute
        )
    if body.secondary_privileged_value is not None:
        m1_config["secondary_privileged_value"] = body.secondary_privileged_value
    if body.protected_attributes is not None:
        m1_config["protected_attributes"] = body.protected_attributes
    return Audit(
        code=code,
        org_id=org_id,
        dataset_id=body.dataset_id,
        module="M1",
        title=body.title,
        status="pending",
        protected_attribute=body.protected_attribute,
        decision_column=body.decision_column,
        favorable_value=body.favorable_value,
        privileged_value=body.privileged_value,
        config=m1_config if m1_config else None,
        created_by=user_id,
    )


async def submit_audit(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    """Validate the request synchronously and create the pending audit row.

    Raises APIError (-> RFC 7807) for an invalid request BEFORE any row is
    created (M1/M2: missing dataset -> 404 ; M3: SSRF target -> 422). Does
    NOT compute anything. The caller is responsible for the computation.
    """
    if body.module in ("M1", "M2"):
        assert body.dataset_id is not None  # guaranteed by AuditCreate._per_module
        # raises NotFoundError (404) if the dataset is missing / not in this org
        await get_dataset(session, body.dataset_id, org_id=org_id)
    if body.module == "M3":
        assert body.target is not None  # guaranteed by AuditCreate._per_module
        assert_public_url(body.target.url)  # raises APIError 422 on SSRF
    audit = _build_audit_row(
        body, org_id=org_id, user_id=user_id,
        code=await _next_code(session, org_id),
    )
    session.add(audit)
    await session.flush()
    await session.commit()
    return _audit_out(audit, None, None, [])


async def compute_m1_audit(
    session: AsyncSession,
    audit: Audit,
    body: AuditCreate,
    *,
    storage: Storage | None = None,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    """Run the M1 computation on an already-created (pending/running) row.

    Persists the AuditResult and sets ``status='done'`` + ``completed_at``.
    Does NOT create the row and does NOT commit — the caller commits.
    """
    storage = storage if storage is not None else get_storage()
    assert body.dataset_id is not None  # guaranteed by AuditCreate._per_module
    dataset: Dataset = await get_dataset(
        session, body.dataset_id, org_id=audit.org_id
    )

    raw = await storage.download(dataset.storage_path)
    df = pd.read_csv(io.BytesIO(raw))

    iqr_attrs = list(body.protected_attributes or []) or [
        a
        for a in (body.protected_attribute, body.secondary_protected_attribute)
        if a
    ]
    pre_check = _run_iqr_multi(df, iqr_attrs)

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
    # Resolve the protected attribute list for M1Config.
    # Prefer protected_attributes if supplied; else derive from single/secondary.
    pa_list: list[str] = list(body.protected_attributes or [])

    result = run_m1(
        df,
        M1Config(
            protected_attribute=(
                body.protected_attribute
                or (body.protected_attributes[0] if body.protected_attributes else "")
            ),
            decision_column=dec_col,
            favorable_value=fav,
            privileged_value=priv,
            ground_truth_column=body.ground_truth_column,
            secondary_protected_attribute=body.secondary_protected_attribute,
            secondary_privileged_value=body.secondary_privileged_value,
            protected_attributes=tuple(pa_list),
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
    return _audit_out(audit, metrics_out, interpretation, pre_check)



async def compute_m2_audit(
    session: AsyncSession,
    audit: Audit,
    body: AuditCreate,
    *,
    storage: Storage | None = None,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    """Run the M2 computation on an already-created (pending/running) row.

    Persists the AuditResult and sets ``status='done'`` + ``completed_at``.
    Does NOT create the row and does NOT commit — the caller commits.
    """
    storage = storage if storage is not None else get_storage()
    assert body.dataset_id is not None  # guaranteed by AuditCreate._per_module
    dataset: Dataset = await get_dataset(
        session, body.dataset_id, org_id=audit.org_id
    )
    cfg_in = body.config

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
    return _audit_out(audit, metrics_out, interpretation, pre_check)



async def compute_m3_audit(
    session: AsyncSession,
    audit: Audit,
    body: AuditCreate,
    *,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    """Run the M3 computation on an already-created (pending/running) row.

    Persists the AuditResult and sets ``status='done'`` + ``completed_at``.
    Does NOT create the row and does NOT commit — the caller commits.
    """
    assert body.target is not None  # guaranteed by AuditCreate._per_module
    s = get_settings()
    tcfg = TargetConfig(
        url=body.target.url,
        method=body.target.method,
        headers=dict(body.target.headers),
        body_template=body.target.body_template,
        response_path=body.target.response_path,
    )
    lang = body.lang if body.lang in ("fr", "en") else "fr"

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
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

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


_audit_semaphore: asyncio.Semaphore | None = None


def _get_audit_semaphore() -> asyncio.Semaphore:
    """Lazily create the module-level concurrency gate.

    Built lazily (not at import time) so the ``asyncio.Semaphore`` binds to
    the running event loop, not whatever loop happens to exist at import.
    """
    global _audit_semaphore
    if _audit_semaphore is None:
        _audit_semaphore = asyncio.Semaphore(
            get_settings().audit_max_concurrency
        )
    return _audit_semaphore


async def run_audit_job(
    audit_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
    *,
    session_maker: async_sessionmaker[AsyncSession] | None = None,
) -> None:
    """Background runner. Bounded by the audit semaphore. Uses a FRESH DB
    session (the request session is closed once the 202 is sent). Never
    propagates: any failure -> status='failed' + a non-empty error message,
    so an audit is never left stuck in 'running'.

    ``body`` is received in memory (NOT reconstructed from the DB) so it can
    carry the M3 target secret to the computation without persisting it.
    ``session_maker`` defaults to the application async-session factory
    (``app.core.db._sessionmaker()``); tests inject their own.
    """
    maker = session_maker if session_maker is not None else _sessionmaker()
    async with _get_audit_semaphore(), maker() as session:
        try:
            audit = await _load_audit(session, audit_id)
            audit.status = "running"
            await session.commit()
            compute = {
                "M1": compute_m1_audit,
                "M2": compute_m2_audit,
                "M3": compute_m3_audit,
            }[audit.module]
            await compute(session, audit, body, llm_provider=llm_provider)
            await session.commit()
        except Exception as exc:  # noqa: BLE001 — background job must never
            # crash the event loop; surface the failure on the audit row.
            await session.rollback()
            try:
                audit = await _load_audit(session, audit_id)
                audit.status = "failed"
                audit.error = str(exc) or exc.__class__.__name__
                await session.commit()
            except Exception:  # noqa: BLE001 — last-resort: nothing more
                # we can do if even the failure write fails.
                await session.rollback()
