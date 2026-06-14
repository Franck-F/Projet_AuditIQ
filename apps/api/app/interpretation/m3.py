from __future__ import annotations

import json
import logging
from importlib import resources

from app.audit_engine import M3Result
from app.interpretation._json import loads_lenient
from app.interpretation._recommendations import parse_recommendations
from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut

logger = logging.getLogger(__name__)

_AI_ACT_ANCHORS = [
    "AI Act, article 50 (transparence des systèmes d'IA générative en "
    "contact avec le public)",
    "Doctrine CNIL sur les chatbots en contact avec le public",
]
_DISCLAIMERS = [
    "Signal statistique à approfondir : ni une preuve de discrimination, ni "
    "une certification.",
    "Sentiment lexical grossier et détection de refus heuristique sur des "
    "réponses courtes — fiabilité limitée.",
    "Banque de prompts réduite (12 paires) : couverture indicative.",
]


def load_prompt_template() -> str:
    return (
        resources.files("app.interpretation.prompts")
        .joinpath("m3_fr.md")
        .read_text(encoding="utf-8")
    )


def _metrics_json(result: M3Result) -> str:
    return json.dumps(
        {
            "verdict": result.verdict,
            "risk_score": result.risk_score,
            "global_score": result.global_score,
            "n_pairs": result.n_pairs,
            "n_calls_failed": result.n_calls_failed,
            "categories": [
                {
                    "name": c.name,
                    "length_gap": c.length_gap,
                    "sentiment_gap": c.sentiment_gap,
                    "refusal_rate": c.refusal_rate,
                    "score": c.score,
                    "verdict": c.verdict,
                }
                for c in result.categories
            ],
            "warnings": list(result.warnings),
        },
        ensure_ascii=False,
    )


def _fallback(result: M3Result, *, degraded: bool = False) -> InterpretationOut:
    verdicts = {
        "fail": "des écarts de traitement marqués entre variantes ont été "
        "détectés",
        "warn": "un signal d'écart de traitement, à confirmer, a été détecté",
        "pass": "aucun écart de traitement marqué n'a été détecté",
    }
    phrase = verdicts.get(result.verdict, result.verdict)
    worst = (
        max(result.categories, key=lambda c: c.score).name
        if result.categories
        else "—"
    )
    verdict_fr = {
        "fail": "Risque élevé", "warn": "Vigilance", "pass": "Risque faible",
    }.get(result.verdict, result.verdict)
    narrative = (
        f"Sur {result.n_pairs} paires de prompts soumises au chatbot, "
        f"{phrase}. Catégorie la plus exposée : « {worst} ». Score de risque "
        f"agrégé : {result.risk_score}/100. Verdict : {verdict_fr}. "
        f"Les écarts mesurés (longueur, ton, refus) sont un signal à "
        f"approfondir, pas une preuve de discrimination."
    )
    return InterpretationOut(
        narrative=narrative,
        ai_act_anchors=list(_AI_ACT_ANCHORS),
        disclaimers=list(_DISCLAIMERS),
        provider="fallback",
        model="deterministic",
        degraded=degraded,
    )


async def interpret_m3(
    result: M3Result, *, provider: LLMProvider | None
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
            or list(_DISCLAIMERS),
            provider=provider.name,
            model=provider.model,
            recommendations=parse_recommendations(data.get("recommendations")),
        )
    except Exception as exc:  # noqa: BLE001 — any LLM/parse failure → visible fallback
        logger.warning(
            "Interprétation M3 — chemin LLM (%s) en échec (%s: %s) ; "
            "bascule sur le fallback déterministe.",
            getattr(provider, "name", "?"), type(exc).__name__, exc,
        )
        return _fallback(result, degraded=True)
