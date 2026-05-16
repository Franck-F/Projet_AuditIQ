"""Pure M2 unsupervised bias detection: run_m2(df, config) -> M2Result.

No I/O, no LLM. Deterministic via M2Config.random_state.
"""
from __future__ import annotations

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from .errors import DatasetValidationError
from .types import ClusterStat, M2Config, M2Result
from .unsupervised_metrics import (
    characterize_cluster,
    chi2_cluster_decision,
    cluster_positive_rates,
    deviations,
    m2_risk_score,
    m2_verdict,
)

_ROUND = 4


def _validate(
    df: pd.DataFrame, config: M2Config
) -> tuple[pd.DataFrame, list[str], list[str]]:
    """Validate and return (clean_df, feature_columns, warnings)."""
    dc = config.decision_column
    warnings: list[str] = []

    if dc not in df.columns:
        raise DatasetValidationError(
            f"Colonne de décision « {dc} » absente du jeu de données.",
            field="decision_column",
        )

    if config.feature_columns is not None:
        requested = list(config.feature_columns)
        missing = [c for c in requested if c not in df.columns]
        if missing:
            raise DatasetValidationError(
                f"Colonnes de features absentes : {missing}.",
                field="feature_columns",
            )
        candidate = requested
    else:
        candidate = [c for c in df.columns if c != dc]

    numeric: list[str] = []
    dropped: list[str] = []
    for c in candidate:
        if c == dc:
            continue
        if pd.api.types.is_numeric_dtype(df[c]):
            numeric.append(c)
        else:
            dropped.append(c)
    if dropped:
        warnings.append(
            f"Colonnes non numériques exclues du clustering : {dropped}."
        )
    if len(numeric) < 2:
        raise DatasetValidationError(
            f"Au moins 2 features numériques requises, trouvé {len(numeric)}.",
            field="feature_columns",
        )

    clean = df[[*numeric, dc]].dropna()
    n_dropped = len(df) - len(clean)
    if n_dropped > 0:
        warnings.append(
            f"{n_dropped} ligne(s) retirée(s) pour valeurs manquantes."
        )

    n = len(clean)
    min_rows = max(config.min_rows_factor * config.k, config.min_rows_abs)
    if n < min_rows:
        raise DatasetValidationError(
            f"Effectif insuffisant (n={n} < {min_rows}) pour k={config.k} "
            f"clusters — audit non fiable.",
            field=None,
        )
    if not (2 <= config.k < n):
        raise DatasetValidationError(
            f"k doit vérifier 2 ≤ k < n ; reçu k={config.k}, n={n}.",
            field=None,
        )

    dc_str = clean[dc].astype(str)
    decision_values = sorted(dc_str.unique())
    if len(decision_values) != 2:
        raise DatasetValidationError(
            f"La colonne de décision doit être binaire (2 valeurs), "
            f"trouvé {len(decision_values)} : {decision_values}.",
            field="decision_column",
        )
    if str(config.positive_value) not in decision_values:
        raise DatasetValidationError(
            f"Valeur positive « {config.positive_value} » absente de la "
            f"colonne de décision (valeurs : {decision_values}).",
            field="positive_value",
        )

    return clean, numeric, warnings


def run_m2(df: pd.DataFrame, config: M2Config) -> M2Result:
    """Run the M2 unsupervised bias-detection audit. Pure. Raises
    DatasetValidationError if the data/config cannot be audited."""
    clean, features, warnings = _validate(df, config)

    x = clean[features].to_numpy(dtype=float)
    positive = (
        clean[config.decision_column].astype(str)
        == str(config.positive_value)
    ).to_numpy()
    n = len(clean)

    x_scaled = StandardScaler().fit_transform(x)
    km = KMeans(
        n_clusters=config.k, random_state=config.random_state, n_init=10
    )
    labels = km.fit_predict(x_scaled)

    rates, global_rate, sizes = cluster_positive_rates(
        labels, positive, config.k
    )
    chi2, p_value, dof = chi2_cluster_decision(labels, positive, config.k)
    dev, deviant_ids = deviations(rates, global_rate, config.deviation_pp)

    for c in range(config.k):
        if 0 < sizes[c] < config.min_cluster_warn:
            warnings.append(
                f"Cluster {c} de faible effectif (n={sizes[c]} < "
                f"{config.min_cluster_warn}) — caractérisation peu concluante."
            )

    global_mean = x.mean(axis=0)
    global_std = x.std(axis=0)
    clusters: list[ClusterStat] = []
    for c in range(config.k):
        mask = labels == c
        if sizes[c] > 0:
            cluster_mean = x[mask].mean(axis=0)
            top = characterize_cluster(
                cluster_mean, global_mean, global_std, features, top_n=3
            )
        else:
            top = ()
        clusters.append(
            ClusterStat(
                id=c,
                n=sizes[c],
                positive_rate=round(rates[c], _ROUND),
                deviation_pp=dev[c],
                is_deviant=c in deviant_ids,
                top_features=top,
            )
        )

    max_abs_dev = max((abs(d) for d in dev.values()), default=0.0)
    verdict = m2_verdict(p_value, config.chi2_alpha, len(deviant_ids))
    score = m2_risk_score(
        p_value, config.chi2_alpha, max_abs_dev, len(deviant_ids), config.k
    )

    return M2Result(
        n=n,
        k=config.k,
        global_positive_rate=round(global_rate, _ROUND),
        chi2=round(chi2, _ROUND),
        p_value=round(p_value, 6),
        dof=dof,
        clusters=tuple(clusters),
        deviant_cluster_ids=tuple(deviant_ids),
        verdict=verdict,
        risk_score=score,
        warnings=tuple(warnings),
    )
