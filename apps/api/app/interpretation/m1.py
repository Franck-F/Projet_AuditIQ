from __future__ import annotations

import json
import logging
from importlib import resources

from app.audit_engine import M1Result
from app.interpretation._json import loads_lenient
from app.interpretation._recommendations import parse_recommendations
from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut

logger = logging.getLogger(__name__)

_AI_ACT_ANCHORS = [
    "AI Act, article 10 (qualité et gouvernance des données)",
    "AI Act, article 13 (transparence)",
    "AI Act, article 15 (exactitude, robustesse)",
    "Règle des 4/5 (adverse impact) ; Code du travail L.1132-1",
]
_DISCLAIMERS = [
    "Résultat d'aide à l'analyse : ni un verdict de conformité, ni une "
    "certification.",
    "L'appréciation réglementaire finale relève de votre responsabilité.",
    "Analyse limitée à l'attribut protégé et à la décision fournis.",
]
_TRUELABEL_DISCLAIMER = (
    "Métriques EO/Equalized Odds sensibles à la qualité de la vérité-terrain ; "
    "calculées par groupe, les groupes dégénérés (aucun positif ou négatif réel) "
    "sont ignorés."
)
_INTERSECTIONAL_SPARSITY_DISCLAIMER = (
    "Les sous-groupes croisés à effectif insuffisant sont exclus ; "
    "l'analyse intersectionnelle est indicative sur de petits jeux de données."
)


def _base_disclaimers(result: M1Result) -> list[str]:
    """Base disclaimers, with the scope line pluralised when several
    protected attributes are audited."""
    scope = (
        "Analyse limitée aux attributs protégés et à la décision fournis."
        if len(result.marginals) > 1
        else "Analyse limitée à l'attribut protégé et à la décision fournis."
    )
    return [_DISCLAIMERS[0], _DISCLAIMERS[1], scope]


def load_prompt_template() -> str:
    return (
        resources.files("app.interpretation.prompts")
        .joinpath("m1_fr.md")
        .read_text(encoding="utf-8")
    )


def _group_dict(g: object) -> dict[str, object]:
    """Serialize a GroupStat (engine) to a JSON-friendly dict, including new
    fairlearn fields when present."""
    from app.audit_engine.types import GroupStat as _GroupStat
    assert isinstance(g, _GroupStat)
    d: dict[str, object] = {
        "value": g.value,
        "n": g.n,
        "selection_rate": g.selection_rate,
        "disparate_impact": g.disparate_impact,
    }
    if g.tpr is not None:
        d["tpr"] = g.tpr
        d["fpr"] = g.fpr
    # Per-group rates (only when ground truth was provided)
    if g.fnr is not None:
        d["fnr"] = g.fnr
    if g.accuracy is not None:
        d["accuracy"] = g.accuracy
    if g.precision is not None:
        d["precision"] = g.precision
    return d


def _metrics_json(result: M1Result) -> str:
    data: dict[str, object] = {
        "disparate_impact": result.disparate_impact,
        "demographic_parity_diff": result.demographic_parity_diff,
        "verdict": result.verdict,
        "risk_score": result.risk_score,
        "worst_group": result.worst_group,
        "reference_value": result.reference_value,
        "groups": [_group_dict(g) for g in result.groups],
        "warnings": list(result.warnings),
    }
    if result.equal_opportunity_diff is not None:
        data["equal_opportunity_diff"] = result.equal_opportunity_diff
        data["equalized_odds_diff"] = result.equalized_odds_diff
        data["demographic_parity_verdict"] = result.demographic_parity_verdict
        data["equal_opportunity_verdict"] = result.equal_opportunity_verdict
        data["equalized_odds_verdict"] = result.equalized_odds_verdict
        if result.truelabel_reason is not None:
            data["truelabel_reason"] = result.truelabel_reason
    if result.marginals:
        data["marginals"] = [
            {
                "attribute": m.attribute,
                "disparate_impact": m.disparate_impact,
                "demographic_parity_diff": m.demographic_parity_diff,
                "verdict": m.verdict,
                "risk_score": m.risk_score,
                "worst_group": m.worst_group,
                "reference_value": m.reference_value,
                # Fairlearn ratios — always present (DP ratio is selection-rate based)
                "demographic_parity_ratio": m.demographic_parity_ratio,
                **(
                    {
                        "equal_opportunity_ratio": m.equal_opportunity_ratio,
                        "equalized_odds_ratio": m.equalized_odds_ratio,
                    }
                    if m.equal_opportunity_ratio is not None
                    else {}
                ),
                "groups": [_group_dict(g) for g in m.groups],
                **(
                    {
                        "equal_opportunity_diff": m.equal_opportunity_diff,
                        "equalized_odds_diff": m.equalized_odds_diff,
                    }
                    if m.equal_opportunity_diff is not None
                    else {}
                ),
            }
            for m in result.marginals
        ]
    if result.pairwise:
        data["pairwise"] = [
            {
                "primary_attribute": p.primary_attribute,
                "secondary_attribute": p.secondary_attribute,
                "disparate_impact": p.disparate_impact,
                "demographic_parity_diff": p.demographic_parity_diff,
                "marginal_di": list(p.marginal_di),
                "verdict": p.verdict,
                "risk_score": p.risk_score,
                "worst_primary": p.worst_primary,
                "worst_secondary": p.worst_secondary,
                # Fairlearn ratios
                "demographic_parity_ratio": p.demographic_parity_ratio,
                **(
                    {
                        "equal_opportunity_ratio": p.equal_opportunity_ratio,
                        "equalized_odds_ratio": p.equalized_odds_ratio,
                    }
                    if p.equal_opportunity_ratio is not None
                    else {}
                ),
            }
            for p in result.pairwise
        ]
    return json.dumps(data, ensure_ascii=False)


_VERDICT_LABELS = {
    "fail": "non respectée (écart significatif)",
    "warn": "respectée avec une marge faible",
    "pass": "respectée",
}
_VERDICT_FR = {
    "fail": "Risque élevé",
    "warn": "Vigilance",
    "pass": "Risque faible",
}
_DI_VERDICT_LABELS = {
    "fail": "non respectée (impact disproportionné)",
    "warn": "respectée mais avec une marge faible",
    "pass": "respectée",
}


def _fallback(result: M1Result, *, degraded: bool = False) -> InterpretationOut:
    phrase = _DI_VERDICT_LABELS.get(result.verdict, result.verdict)
    n_marginals = len(result.marginals) if result.marginals else 0
    if n_marginals > 1:
        intro = f"Sur les {n_marginals} attributs analysés"
    else:
        intro = "Sur l'attribut analysé"
    narrative = (
        f"{intro}, la règle des 4/5 est {phrase}. "
        f"Le Disparate Impact est de {result.disparate_impact} "
        f"(groupe le plus défavorisé : « {result.worst_group} » ; "
        f"référence : « {result.reference_value} »). "
        f"Score de risque agrégé : {result.risk_score}/100. "
        f"Verdict : {_VERDICT_FR.get(result.verdict, result.verdict)}."
    )
    disclaimers = _base_disclaimers(result)

    if result.equal_opportunity_diff is not None:
        dp_v = _VERDICT_LABELS.get(
            result.demographic_parity_verdict or "", result.demographic_parity_verdict or ""
        )
        eo_v = _VERDICT_LABELS.get(
            result.equal_opportunity_verdict or "", result.equal_opportunity_verdict or ""
        )
        eodds_v = _VERDICT_LABELS.get(
            result.equalized_odds_verdict or "", result.equalized_odds_verdict or ""
        )
        eo_narrative = (
            f" Concernant les métriques de vérité-terrain : "
            f"la Parité Démographique (différence) est {dp_v} "
            f"(écart : {result.demographic_parity_diff}). "
            f"L'Equal Opportunity (écart de vrais positifs entre groupes) est {eo_v} "
            f"(écart : {result.equal_opportunity_diff}). "
            f"L'Equalized Odds (écart max TPR/FPR) est {eodds_v} "
            f"(écart : {result.equalized_odds_diff}). "
            f"Demographic Parity, Equal Opportunity et Equalized Odds ne peuvent être "
            f"satisfaits simultanément — tout choix de métrique est un choix normatif, "
            f"pas seulement technique."
        )
        narrative += eo_narrative
        disclaimers.append(_TRUELABEL_DISCLAIMER)

    if result.marginals:
        # Describe the worst marginal across all attributes
        worst_m = max(result.marginals, key=lambda m: m.risk_score)
        if len(result.marginals) > 1:
            attrs_list = ", ".join(
                f"« {m.attribute} »" for m in result.marginals
            )
            narrative += (
                f" L'analyse porte sur {len(result.marginals)} attributs protégés : "
                f"{attrs_list}. "
                f"L'attribut le plus problématique est « {worst_m.attribute} » "
                f"(Disparate Impact : {worst_m.disparate_impact}, "
                f"groupe le plus défavorisé : « {worst_m.worst_group} »)."
            )
        # Informative ratio sentence — never changes verdict, purely additive
        ratio_parts = [
            f"ratio de parité = {worst_m.demographic_parity_ratio}"
        ]
        if worst_m.equal_opportunity_ratio is not None:
            ratio_parts.append(
                f"ratio Equal Opportunity = {worst_m.equal_opportunity_ratio}"
            )
        if worst_m.equalized_odds_ratio is not None:
            ratio_parts.append(
                f"ratio Equalized Odds = {worst_m.equalized_odds_ratio}"
            )
        narrative += (
            f" [Informatif — sans effet sur le verdict] "
            f"Indicateurs complémentaires pour « {worst_m.attribute} » : "
            f"{', '.join(ratio_parts)}. "
            f"Un ratio proche de 1 indique une parité entre groupes ; "
            f"ces ratios complètent les différences et se lisent conjointement."
        )

    if result.pairwise:
        # Describe the worst pairwise crossing (Gender Shades framing)
        worst_p = max(result.pairwise, key=lambda p: p.risk_score)
        marginal_di = list(worst_p.marginal_di)
        marginal_di_primary = marginal_di[0] if len(marginal_di) > 0 else "?"
        marginal_di_secondary = marginal_di[1] if len(marginal_di) > 1 else "?"
        ix_narrative = (
            f" L'analyse intersectionnelle (croisement "
            f"« {worst_p.primary_attribute} × {worst_p.secondary_attribute} ») "
            f"révèle que le sous-groupe croisé le plus défavorisé est "
            f"« {worst_p.worst_primary} × {worst_p.worst_secondary} », "
            f"avec un Disparate Impact de {worst_p.disparate_impact}. "
            f"En comparaison, les DI marginaux de chaque attribut pris séparément "
            f"({marginal_di_primary} et {marginal_di_secondary}) paraissent bien "
            f"moins sévères — c'est l'effet Gender Shades : l'intersection amplifie "
            f"les désavantages que l'analyse unidimensionnelle sous-estime."
        )
        narrative += ix_narrative
        disclaimers.append(_INTERSECTIONAL_SPARSITY_DISCLAIMER)

    return InterpretationOut(
        narrative=narrative,
        ai_act_anchors=list(_AI_ACT_ANCHORS),
        disclaimers=disclaimers,
        provider="fallback",
        model="deterministic",
        degraded=degraded,
    )


async def interpret_m1(
    result: M1Result, *, provider: LLMProvider | None
) -> InterpretationOut:
    if provider is None:
        return _fallback(result)
    try:
        prompt = load_prompt_template().format(metrics_json=_metrics_json(result))
        raw = await provider.complete(prompt, as_json=True)
        data = loads_lenient(raw)
        return InterpretationOut(
            narrative=str(data["narrative"]),
            ai_act_anchors=[str(a) for a in data.get("ai_act_anchors", [])]
            or list(_AI_ACT_ANCHORS),
            disclaimers=[str(d) for d in data.get("disclaimers", [])]
            or _base_disclaimers(result),
            provider=provider.name,
            model=provider.model,
            recommendations=parse_recommendations(data.get("recommendations")),
        )
    except Exception as exc:  # noqa: BLE001 — any LLM/parse failure → visible fallback
        logger.warning(
            "Interprétation M1 — chemin LLM (%s) en échec (%s: %s) ; "
            "bascule sur le fallback déterministe.",
            getattr(provider, "name", "?"), type(exc).__name__, exc,
        )
        return _fallback(result, degraded=True)
