"""Dataset analysis engine — pure, no I/O.

Profiles columns and suggests decision/protected columns to drive the
wizard's auto-detection step (M1/M2).
"""
from __future__ import annotations

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
        counts = df[p.name].value_counts(dropna=True)
        favorable = counts.idxmin() if len(counts) >= 2 else None
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


def _suggest_protected(
    df: pd.DataFrame,
    profiles: tuple[ColumnProfile, ...],
    *,
    decision_col: str | None,
) -> Suggestion | None:
    if decision_col is None or decision_col not in df.columns:
        return None
    candidates: list[tuple[float, str, str]] = []
    for p in profiles:
        if p.name == decision_col:
            continue
        if not (2 <= p.unique_count <= 20):
            continue
        name_score = 1.0 if _name_is_protected(p.name) else 0.0
        stats_score = _chi2_score(df, p.name, decision_col)
        final = 0.6 * name_score + 0.4 * stats_score
        reasons: list[str] = []
        if name_score > 0:
            reasons.append("nom évocateur d'attribut sensible")
        if stats_score > 0.3:
            reasons.append("lien fort avec la décision (χ²)")
        reason = (
            "Colonne candidate : " + ", ".join(reasons) + "."
            if reasons
            else "Cardinalité compatible mais aucun signal fort détecté."
        )
        candidates.append((final, p.name, reason))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    score, col, reason = candidates[0]
    if score < _CONFIDENCE_THRESHOLD:
        return None
    return Suggestion(column=col, confidence=round(score, 3), reason=reason)


def run_dataset_analysis(df: pd.DataFrame) -> DatasetAnalysis:
    """Profile every column and emit decision/protected suggestions.

    Pure function — no I/O, deterministic given the input DataFrame.
    """
    profiles = tuple(_profile_column(df, c) for c in df.columns)
    sug_decision = _suggest_decision(df, profiles)
    decision_col = sug_decision.column if sug_decision else None
    sug_protected = _suggest_protected(df, profiles, decision_col=decision_col)
    return DatasetAnalysis(
        columns=profiles,
        suggested_decision=sug_decision,
        suggested_protected=sug_protected,
    )
