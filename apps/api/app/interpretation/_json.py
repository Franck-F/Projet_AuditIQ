"""Lenient JSON loader for LLM output.

LLMs (Gemini included) frequently wrap their JSON in markdown code fences
(```json ... ```) or surround it with a sentence or two, even when asked for
"JSON only". A bare ``json.loads`` then raises and the caller silently falls
back. This loader tolerates fences and surrounding prose so a well-formed JSON
object inside the response is still recovered.
"""
from __future__ import annotations

import json
from typing import Any


def loads_lenient(raw: str) -> Any:
    """``json.loads`` tolerant of markdown fences and surrounding prose.

    Returns the parsed JSON value (typically a ``dict``); typed ``Any`` to
    mirror ``json.loads`` so callers can index/``.get`` the result as before.
    Raises ``json.JSONDecodeError`` if no JSON value can be recovered.
    """
    text = raw.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1:]
        closing = text.rfind("```")
        if closing != -1:
            text = text[:closing]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Last resort: recover the outermost {...} object embedded in prose.
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start:end + 1])
        raise
