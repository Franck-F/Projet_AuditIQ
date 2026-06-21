"""Fusion contrôlée des recommandations : squelette déterministe + texte LLM.

Le catalogue déterministe (``recommendations_catalog``) décide QUELLES
recommandations apparaissent et fixe leur ``category``/``priority_level``/
``owner``/``horizon``/``legal_ref`` (persona déployeur, liste blanche). Le LLM
ne fait que RÉDIGER : il peut affiner ``title``/``rationale``/``steps``, et
seulement pour les recommandations existantes (appariées par ``id``). Tout le
reste est ignoré — le LLM ne peut ni inventer une action, ni changer la
priorité, ni introduire une action de fournisseur.
"""
from __future__ import annotations

import json

from app.schemas.audit import RECOMMENDATION_CATEGORY_LABELS, RecommendationOut


def skeleton_json(skeleton: list[RecommendationOut]) -> str:
    """Sérialise le squelette déterministe pour l'injecter dans le prompt LLM.

    N'expose que les champs que le LLM peut RÉDIGER (``id``, ``title``,
    ``rationale``, ``steps``) plus la catégorie en clair (pour le contexte) ;
    le LLM ne doit modifier que le texte, pas la structure.
    """
    return json.dumps(
        [
            {
                "id": r.id,
                "categorie": RECOMMENDATION_CATEGORY_LABELS.get(
                    r.category, r.category
                ),
                "priorite": r.priority_level,
                "title": r.title,
                "rationale": r.rationale,
                "steps": list(r.steps),
            }
            for r in skeleton
        ],
        ensure_ascii=False,
    )


def _clean_str(v: object, *, max_len: int) -> str | None:
    if not isinstance(v, str):
        return None
    s = v.strip()
    if not s:
        return None
    return s[:max_len]


def _clean_steps(v: object) -> list[str] | None:
    if not isinstance(v, list):
        return None
    out = [s.strip()[:300] for s in v if isinstance(s, str) and s.strip()]
    return out or None


def merge_llm_text(
    skeleton: list[RecommendationOut], raw: object
) -> list[RecommendationOut]:
    """Applique le texte LLM (``title``/``rationale``/``steps``) au squelette
    déterministe, en l'appariant par ``id``.

    - Le squelette est la SOURCE DE VÉRITÉ : la liste finale contient
      exactement ses entrées, dans son ordre.
    - Pour chaque entrée, si le LLM fournit un ``title``/``rationale``/``steps``
      non vide pour le même ``id``, on le substitue ; sinon on garde le texte
      déterministe.
    - ``category``/``priority_level``/``owner``/``horizon``/``legal_ref``/``id``
      ne sont JAMAIS modifiables par le LLM.

    Ne lève jamais : un LLM erratique retombe sur le squelette déterministe.
    """
    by_id: dict[str, dict[str, object]] = {}
    if isinstance(raw, list):
        for entry in raw:
            if not isinstance(entry, dict):
                continue
            rid = entry.get("id")
            if isinstance(rid, str) and rid:
                by_id[rid] = entry

    merged: list[RecommendationOut] = []
    for rec in skeleton:
        patch = by_id.get(rec.id)
        if patch is None:
            merged.append(rec)
            continue
        title = _clean_str(patch.get("title"), max_len=200) or rec.title
        rationale = (
            _clean_str(patch.get("rationale"), max_len=1000)
            or _clean_str(patch.get("detail"), max_len=1000)
            or rec.rationale
        )
        steps = _clean_steps(patch.get("steps"))
        merged.append(
            rec.model_copy(
                update={
                    "title": title,
                    "rationale": rationale,
                    "detail": rationale,
                    "steps": steps if steps is not None else rec.steps,
                }
            )
        )
    return merged
