"""Defensive parser for the LLM-generated recommendations field.

The LLM may produce malformed entries (missing fields, wrong priority literal,
non-dict elements). We filter them silently — the audit must remain valid even
if the LLM is erratic.
"""
from __future__ import annotations

from pydantic import ValidationError

from app.schemas.audit import RecommendationOut


def parse_recommendations(raw: object) -> list[RecommendationOut]:
    """Filter LLM output to a list of valid RecommendationOut.

    Always returns a list (possibly empty). Never raises.
    """
    if not isinstance(raw, list):
        return []
    out: list[RecommendationOut] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        try:
            out.append(RecommendationOut.model_validate(entry))
        except ValidationError:
            continue
    return out
