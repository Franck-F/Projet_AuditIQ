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


def load_prompt_template() -> str:
    return (
        resources.files("app.interpretation.prompts")
        .joinpath("m1_fr.md")
        .read_text(encoding="utf-8")
    )


def _metrics_json(result: M1Result) -> str:
    return json.dumps(
        {
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
                }
                for g in result.groups
            ],
            "warnings": list(result.warnings),
        },
        ensure_ascii=False,
    )


def _fallback(result: M1Result) -> InterpretationOut:
    verdicts = {
        "fail": "non respectée (impact disproportionné)",
        "warn": "respectée mais avec une marge faible",
        "pass": "respectée",
    }
    phrase = verdicts.get(result.verdict, result.verdict)
    narrative = (
        f"Sur l'attribut analysé, la règle des 4/5 est {phrase}. "
        f"Le Disparate Impact est de {result.disparate_impact} "
        f"(groupe le plus défavorisé : « {result.worst_group} » ; "
        f"référence : « {result.reference_value} »). "
        f"Score de risque agrégé : {result.risk_score}/100. "
        f"Verdict : {result.verdict}."
    )
    return InterpretationOut(
        narrative=narrative,
        ai_act_anchors=list(_AI_ACT_ANCHORS),
        disclaimers=list(_DISCLAIMERS),
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
