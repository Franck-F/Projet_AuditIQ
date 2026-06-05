"""Dataset analysis engine — pure, no I/O.

Profiles columns and suggests decision/protected columns to drive the
wizard's auto-detection step (M1/M2).
"""
from __future__ import annotations

import dataclasses
import re
import unicodedata

import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import LabelEncoder

from app.audit_engine.types import (
    ColumnProfile,
    DatasetAnalysis,
    DType,
    RoleHint,
    Suggestion,
)


def _normalize(text: object) -> str:
    nfkd = unicodedata.normalize("NFKD", str(text))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _tokens(name: object) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", _normalize(name)) if t}


_DECISION_TOKENS = frozenset({
    "decision", "embauche", "embauché", "recrute", "recrutement", "accorde",
    "accord", "accepte", "admis", "admission", "retenu", "octroi", "refuse",
    "approved", "approuve", "outcome", "class", "target", "label", "result",
    "status", "hired", "selected", "granted", "predicted", "prediction", "y",
})
_PROTECTED_TOKENS = frozenset({
    "sexe", "sex", "genre", "gender", "age", "race", "origine", "origin",
    "nationalite", "nationality", "ethnie", "ethnic", "ethnicity", "religion",
    "handicap", "disability", "orientation", "situation", "familiale",
    "civilite",
})


def _name_is_decision(name: object) -> bool:
    return bool(_tokens(name) & _DECISION_TOKENS)


def _name_is_protected(name: object) -> bool:
    return bool(_tokens(name) & _PROTECTED_TOKENS)


def _infer_dtype(series: pd.Series) -> DType:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    nunique = series.nunique(dropna=True)
    if nunique <= 50:
        return "categorical"
    return "text"


def _infer_role_hint(
    name: str, dtype: DType, unique_count: int, n_rows: int
) -> RoleHint:
    if _name_is_decision(name) and 2 <= unique_count <= 10:
        return "decision"
    if _name_is_protected(name) and 2 <= unique_count <= 20:
        return "protected"
    if dtype in {"numeric", "boolean"}:
        return "feature"
    if dtype == "categorical":
        if unique_count >= max(0.9 * n_rows, 50):
            return "identifier"
        return "feature"
    if unique_count >= max(0.9 * n_rows, 50):
        return "identifier"
    return "unknown"


def _profile_column(df: pd.DataFrame, name: str) -> ColumnProfile:
    series = df[name]
    dtype = _infer_dtype(series)
    unique_count = int(series.nunique(dropna=True))
    null_ratio = float(series.isna().mean())
    if unique_count <= 50:
        counts = series.value_counts(dropna=True).head(10)
        top_values: tuple[tuple[object, int], ...] = tuple(
            (k, int(v)) for k, v in counts.items()
        )
    else:
        top_values = ()
    role_hint = _infer_role_hint(name, dtype, unique_count, len(df))
    return ColumnProfile(
        name=name,
        dtype=dtype,
        unique_count=unique_count,
        null_ratio=null_ratio,
        top_values=top_values,
        role_hint=role_hint,
    )


_CONFIDENCE_THRESHOLD = 0.3

_FAVORABLE_TOKENS = frozenset({
    "oui", "accepte", "admis", "embauche", "accorde", "approuve", "retenu",
    "octroye", "favorable", "positif", "yes", "approved", "granted", "hired",
    "selected", "accepted", "eligible", "true", "1",
})


def _favorable_value(df: pd.DataFrame, col: str) -> object | None:
    """Pick the favourable decision value by FR/EN positive vocabulary;
    fall back to the minority class when no positive label is recognised."""
    values = list(df[col].dropna().unique())
    for v in values:
        if _normalize(v) in _FAVORABLE_TOKENS:
            val: object = v
            return val
    counts = df[col].value_counts(dropna=True)
    result: object | None = counts.idxmin() if len(counts) >= 2 else None
    return result


def _normalize_score(raw: float, *, hi: float) -> float:
    """Linear clamp into [0, 1]."""
    if hi <= 0:
        return 0.0
    return max(0.0, min(1.0, raw / hi))


def _mutual_info_avg(df: pd.DataFrame, target_col: str) -> float:
    """Average normalized mutual information between target and all other columns."""
    if df.shape[1] < 2:
        return 0.0
    y_raw = df[target_col].dropna()
    if y_raw.nunique() < 2:
        return 0.0
    y = LabelEncoder().fit_transform(y_raw.astype(str))
    x = df.drop(columns=[target_col]).loc[y_raw.index]
    x_enc = pd.DataFrame(
        {c: LabelEncoder().fit_transform(x[c].fillna("__NA__").astype(str)) for c in x.columns}
    )
    try:
        mi = mutual_info_classif(x_enc, y, random_state=0)
    except ValueError:
        return 0.0
    max_mi = float(np.log2(y_raw.nunique()))
    return float(np.mean(mi) / max_mi) if max_mi > 0 else 0.0


def _suggest_decision(
    df: pd.DataFrame, profiles: tuple[ColumnProfile, ...]
) -> Suggestion | None:
    candidates: list[tuple[float, str, str, object | None]] = []
    for p in profiles:
        if not (2 <= p.unique_count <= 10):
            continue
        if p.null_ratio >= 0.3:
            continue
        if p.unique_count > len(df) / 2:
            continue
        name_score = 1.0 if _name_is_decision(p.name) else 0.0
        stats_score = _mutual_info_avg(df, p.name)
        final = 0.6 * name_score + 0.4 * stats_score
        reasons: list[str] = []
        if name_score > 0:
            reasons.append("nom évocateur")
        if stats_score > 0.3:
            reasons.append("colonne prédictible par les autres")
        reason = (
            "Colonne candidate : " + ", ".join(reasons) + "."
            if reasons
            else "Cardinalité compatible avec une décision binaire/discrète."
        )
        favorable = _favorable_value(df, p.name)
        candidates.append((final, p.name, reason, favorable))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    score, col, reason, fav = candidates[0]
    if score < _CONFIDENCE_THRESHOLD:
        return None
    return Suggestion(
        column=col,
        confidence=round(score, 3),
        reason=reason,
        favorable_value=fav,
    )


def _chi2_score(df: pd.DataFrame, col: str, decision_col: str) -> float:
    """Score = -log10(p_value) of chi² independence test, normalized to [0,1] at hi=10."""
    if col == decision_col:
        return 0.0
    contingency = pd.crosstab(df[col], df[decision_col])
    if contingency.size == 0 or contingency.shape[0] < 2 or contingency.shape[1] < 2:
        return 0.0
    try:
        _, p, _, _ = chi2_contingency(contingency)
    except ValueError:
        return 0.0
    if p <= 0 or np.isnan(p):
        return 1.0
    raw = -float(np.log10(p))
    return _normalize_score(raw, hi=10.0)


def _protected_candidates(
    df: pd.DataFrame,
    profiles: tuple[ColumnProfile, ...],
    *,
    decision_col: str | None,
) -> list[Suggestion]:
    if decision_col is None or decision_col not in df.columns:
        return []
    scored: list[tuple[float, str, str]] = []
    for p in profiles:
        if p.name == decision_col:
            continue
        if not (2 <= p.unique_count <= 20):
            continue
        name_hit = _name_is_protected(p.name)
        name_score = 1.0 if name_hit else 0.0
        stats_score = _chi2_score(df, p.name, decision_col)
        final = 0.6 * name_score + 0.4 * stats_score
        if not name_hit and final < _CONFIDENCE_THRESHOLD:
            continue  # keep name-evocative columns regardless of threshold
        reasons: list[str] = []
        if name_hit:
            reasons.append("nom évocateur d'attribut sensible")
        if stats_score > 0.3:
            reasons.append("lien fort avec la décision (χ²)")
        reason = (
            "Colonne candidate : " + ", ".join(reasons) + "."
            if reasons
            else "Cardinalité compatible mais aucun signal fort détecté."
        )
        scored.append((final, p.name, reason))
    scored.sort(key=lambda t: (-t[0], t[1]))
    return [
        Suggestion(column=col, confidence=round(score, 3), reason=reason)
        for score, col, reason in scored
    ]


def _suggest_protected(
    df: pd.DataFrame,
    profiles: tuple[ColumnProfile, ...],
    *,
    decision_col: str | None,
) -> Suggestion | None:
    """Backwards-compatible thin wrapper; returns only the top candidate."""
    results = _protected_candidates(df, profiles, decision_col=decision_col)
    return results[0] if results else None


_GROUND_TRUTH_TOKENS = frozenset({
    "reel", "vrai", "vraie", "qualifie", "qualified", "actually", "ground",
    "truth", "true", "ytrue", "reelle", "effective",
})


def _suggest_ground_truth(
    df: pd.DataFrame,
    profiles: tuple[ColumnProfile, ...],
    *,
    decision_col: str | None,
    protected_col: str | None,
) -> Suggestion | None:
    if decision_col is None or decision_col not in df.columns:
        return None
    dec_vals = set(df[decision_col].dropna().astype(str).unique())
    for p in profiles:
        if p.name in {decision_col, protected_col}:
            continue
        if not (_tokens(p.name) & _GROUND_TRUTH_TOKENS):
            continue
        if p.unique_count != 2:
            continue
        col_vals = set(df[p.name].dropna().astype(str).unique())
        if col_vals != dec_vals:
            continue
        return Suggestion(
            column=p.name,
            confidence=0.9,
            reason="Colonne binaire évoquant la vérité-terrain, mêmes "
            "valeurs que la décision (active Equal Opportunity / Equalized "
            "Odds).",
        )
    return None


def _reference_group(
    df: pd.DataFrame, protected_col: str, decision_col: str, favorable: object
) -> object | None:
    clean = df[[protected_col, decision_col]].dropna()
    if clean.empty:
        return None
    fav_mask = clean[decision_col].astype(str) == str(favorable)
    rates = clean.assign(_fav=fav_mask).groupby(protected_col)["_fav"].mean()
    if rates.empty:
        return None
    ref: object = rates.idxmax()
    return ref


def run_dataset_analysis(df: pd.DataFrame) -> DatasetAnalysis:
    """Profile every column and emit decision/protected suggestions.

    Pure function — no I/O, deterministic given the input DataFrame.
    """
    profiles = tuple(_profile_column(df, c) for c in df.columns)
    sug_decision = _suggest_decision(df, profiles)
    decision_col = sug_decision.column if sug_decision else None
    candidates = _protected_candidates(df, profiles, decision_col=decision_col)
    sug_protected = candidates[0] if candidates else None
    if (
        sug_protected is not None
        and sug_decision is not None
        and sug_decision.favorable_value is not None
    ):
        ref = _reference_group(
            df, sug_protected.column, sug_decision.column,
            sug_decision.favorable_value,
        )
        if ref is not None:
            sug_protected = dataclasses.replace(sug_protected, privileged_value=ref)
            candidates = [sug_protected, *candidates[1:]]
    sug_gt = _suggest_ground_truth(
        df, profiles,
        decision_col=decision_col,
        protected_col=sug_protected.column if sug_protected else None,
    )
    return DatasetAnalysis(
        columns=profiles,
        suggested_decision=sug_decision,
        suggested_protected=sug_protected,
        protected_candidates=tuple(candidates),
        suggested_ground_truth=sug_gt,
    )
