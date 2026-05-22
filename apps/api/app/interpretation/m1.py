from __future__ import annotations

import json
from importlib import resources

from app.audit_engine import M1Result
from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut

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


def load_prompt_template() -> str:
    return (
        resources.files("app.interpretation.prompts")
        .joinpath("m1_fr.md")
        .read_text(encoding="utf-8")
    )


def _metrics_json(result: M1Result) -> str:
    data: dict[str, object] = {
        "disparate_impact": result.disparate_impact,
        "demographic_parity_diff": result.demographic_parity_diff,
        "verdict": result.verdict,
        "risk_score": result.risk_score,
        "worst_group": result.worst_group,
        "reference_value": result.reference_value,
        "groups": [
            {
                "value": g.value,
                "n": g.n,
                "selection_rate": g.selection_rate,
                "disparate_impact": g.disparate_impact,
                **({"tpr": g.tpr, "fpr": g.fpr} if g.tpr is not None else {}),
            }
            for g in result.groups
        ],
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
    return json.dumps(data, ensure_ascii=False)


_VERDICT_LABELS = {
    "fail": "non respectée (écart significatif)",
    "warn": "respectée avec une marge faible",
    "pass": "respectée",
}
_DI_VERDICT_LABELS = {
    "fail": "non respectée (impact disproportionné)",
    "warn": "respectée mais avec une marge faible",
    "pass": "respectée",
}


def _fallback(result: M1Result) -> InterpretationOut:
    phrase = _DI_VERDICT_LABELS.get(result.verdict, result.verdict)
    narrative = (
        f"Sur l'attribut analysé, la règle des 4/5 est {phrase}. "
        f"Le Disparate Impact est de {result.disparate_impact} "
        f"(groupe le plus défavorisé : « {result.worst_group} » ; "
        f"référence : « {result.reference_value} »). "
        f"Score de risque agrégé : {result.risk_score}/100. "
        f"Verdict : {result.verdict}."
    )
    disclaimers = list(_DISCLAIMERS)

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

    return InterpretationOut(
        narrative=narrative,
        ai_act_anchors=list(_AI_ACT_ANCHORS),
        disclaimers=disclaimers,
        provider="fallback",
        model="deterministic",
    )


async def interpret_m1(
    result: M1Result, *, provider: LLMProvider | None
) -> InterpretationOut:
    if provider is None:
        return _fallback(result)
    try:
        prompt = load_prompt_template().format(metrics_json=_metrics_json(result))
        raw = await provider.complete(prompt, as_json=True)
        data = json.loads(raw)
        return InterpretationOut(
            narrative=str(data["narrative"]),
            ai_act_anchors=[str(a) for a in data.get("ai_act_anchors", [])]
            or list(_AI_ACT_ANCHORS),
            disclaimers=[str(d) for d in data.get("disclaimers", [])]
            or list(_DISCLAIMERS),
            provider=provider.name,
            model=provider.model,
        )
    except Exception:  # noqa: BLE001 — any LLM/parse failure → safe fallback
        return _fallback(result)
