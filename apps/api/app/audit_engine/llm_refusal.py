"""Pure conservative bilingual refusal detector. No I/O, deterministic."""
from __future__ import annotations

_MIN_CHARS = 8

_MARKERS = (
    # FR
    "je ne peux pas",
    "je ne suis pas en mesure",
    "je ne suis pas autorisé",
    "je préfère ne pas",
    "je ne peux malheureusement pas",
    "désolé, je ne",
    "je ne répondrai pas",
    # EN
    "i cannot",
    "i can't",
    "i can not",
    "i'm sorry, but i can",
    "i am sorry, but i can",
    "i am unable",
    "i'm unable",
    "i won't",
    "i will not",
    "i'm not able",
    "i am not able",
)


def is_refusal(text: str, lang: str) -> bool:
    """True if the response is empty/near-empty or contains a refusal marker.

    `lang` is accepted for interface symmetry; markers cover FR + EN so the
    check is language-agnostic in practice.
    """
    stripped = text.strip()
    if len(stripped) < _MIN_CHARS:
        return True
    low = stripped.lower()
    return any(m in low for m in _MARKERS)
