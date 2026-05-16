from __future__ import annotations

import json
from importlib import resources

from app.audit_engine import M2Result
from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut

_AI_ACT_ANCHORS = [
    "AI Act, article 9 (système de gestion des risques)",
    "AI Act, article 10 (qualité et gouvernance des données)",
    "Code du travail L.1132-1 (discrimination indirecte / proxys)",
]
_DISCLAIMERS = [
    "Signal statistique à approfondir : ni une preuve de discrimination, ni "
    "une certification.",
    "Les clusters et leurs features dominantes appellent un examen manuel.",
    "Analyse non supervisée : aucun attribut sensible n'est utilisé.",
]


def load_prompt_template() -> str:
    return (
        resources.files("app.interpretation.prompts")
        .joinpath("m2_fr.md")
        .read_text(encoding="utf-8")
    )


def _metrics_json(result: M2Result) -> str:
    return json.dumps(
        {
            "verdict": result.verdict,
            "risk_score": result.risk_score,
            "p_value": result.p_value,
            "chi2": result.chi2,
            "global_positive_rate": result.global_positive_rate,
            "deviant_cluster_ids": list(result.deviant_cluster_ids),
            "clusters": [
                {
                    "id": c.id,
                    "n": c.n,
                    "positive_rate": c.positive_rate,
                    "deviation_pp": c.deviation_pp,
                    "is_deviant": c.is_deviant,
                    "top_features": [
                        {"name": f.name, "std_diff": f.std_diff,
                         "direction": f.direction}
                        for f in c.top_features
                    ],
                }
                for c in result.clusters
            ],
            "warnings": list(result.warnings),
        },
        ensure_ascii=False,
    )


def _fallback(result: M2Result) -> InterpretationOut:
    verdicts = {
        "fail": "des écarts de traitement significatifs entre groupes de "
        "dossiers ont été détectés",
        "warn": "un signal d'écart de traitement, à confirmer, a été détecté",
        "pass": "aucun écart de traitement significatif n'a été détecté",
    }
    phrase = verdicts.get(result.verdict, result.verdict)
    n_dev = len(result.deviant_cluster_ids)
    narrative = (
        f"Sur {result.k} groupes de dossiers analysés sans attribut sensible, "
        f"{phrase}. {n_dev} cluster(s) s'écarte(nt) nettement de la moyenne "
        f"(p={result.p_value}). Score de risque agrégé : "
        f"{result.risk_score}/100. Verdict : {result.verdict}. "
        f"Les caractéristiques distinctives des clusters déviants peuvent "
        f"être des proxys de critères protégés et méritent un examen manuel."
    )
    return InterpretationOut(
        narrative=narrative,
        ai_act_anchors=list(_AI_ACT_ANCHORS),
        disclaimers=list(_DISCLAIMERS),
        provider="fallback",
        model="deterministic",
    )


async def interpret_m2(
    result: M2Result, *, provider: LLMProvider | None
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
