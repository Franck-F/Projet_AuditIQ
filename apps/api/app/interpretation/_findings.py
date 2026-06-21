"""Construit un ``Finding`` (constat factuel) à partir d'un résultat de module.

Le ``Finding`` alimente le ``rationale`` (« pourquoi ») des recommandations
déterministes : il rattache chaque reco au constat réel (attribut, groupe lésé,
écart chiffré).
"""
from __future__ import annotations

from typing import cast

from app.audit_engine import M1Result, M2Result, M3Result
from app.interpretation.recommendations_catalog import Finding, Sector, Verdict


def _verdict(v: str) -> Verdict:
    return cast(Verdict, v if v in ("pass", "warn", "fail") else "warn")


def _sector(sector: str | None) -> Sector:
    return cast(Sector, sector if sector in ("hr", "credit", "insurance", "other")
               else "other")


def finding_from_m1(result: M1Result, sector: str | None) -> Finding:
    # Attribut le plus problématique si plusieurs ; sinon l'attribut global.
    if result.marginals:
        worst = max(result.marginals, key=lambda m: m.risk_score)
        attribute = worst.attribute
        worst_group = worst.worst_group
        reference_value = worst.reference_value
        di = worst.disparate_impact
    else:
        attribute = None
        worst_group = result.worst_group
        reference_value = result.reference_value
        di = result.disparate_impact
    return Finding(
        verdict=_verdict(result.verdict),
        module="M1",
        sector=_sector(sector),
        attribute=attribute,
        worst_group=worst_group,
        reference_value=reference_value,
        metric_label="Disparate Impact",
        gap_text=f"{di} (règle des 4/5)",
        risk_score=result.risk_score,
    )


def finding_from_m2(result: M2Result, sector: str | None) -> Finding:
    n_dev = len(result.deviant_cluster_ids)
    gap = (
        f"{n_dev} groupe(s) de dossiers au traitement atypique"
        if n_dev
        else "aucun groupe atypique détecté"
    )
    return Finding(
        verdict=_verdict(result.verdict),
        module="M2",
        sector=_sector(sector),
        attribute=None,
        worst_group=None,
        metric_label="détection non supervisée",
        gap_text=gap,
        risk_score=result.risk_score,
        extra="les caractéristiques distinctives peuvent être des proxys de "
        "critères protégés",
    )


def finding_from_m3(result: M3Result, sector: str | None) -> Finding:
    worst = (
        max(result.categories, key=lambda c: c.score).name
        if result.categories
        else None
    )
    return Finding(
        verdict=_verdict(result.verdict),
        module="M3",
        sector=_sector(sector),
        attribute=worst,
        worst_group=None,
        metric_label="écart de traitement du chatbot",
        gap_text=(
            f"catégorie la plus exposée : « {worst} »" if worst
            else "écarts de longueur, ton ou refus"
        ),
        risk_score=result.risk_score,
    )
