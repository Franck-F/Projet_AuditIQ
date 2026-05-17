"""Pure bundled bilingual polarity lexicon. No I/O, deterministic."""
from __future__ import annotations

import re

_POS_FR = {
    "excellent", "formidable", "brillant", "super", "génial", "parfait",
    "bon", "bonne", "agréable", "remarquable", "positif", "réussi",
    "satisfaisant", "utile", "clair", "compétent", "efficace", "fiable",
}
_NEG_FR = {
    "horrible", "nul", "décevant", "mauvais", "mauvaise", "terrible",
    "inutile", "médiocre", "négatif", "raté", "confus", "incompétent",
    "lent", "douteux", "désastreux", "pénible", "faible", "regrettable",
}
_POS_EN = {
    "excellent", "wonderful", "brilliant", "great", "good", "perfect",
    "amazing", "positive", "successful", "helpful", "clear", "competent",
    "efficient", "reliable", "remarkable", "satisfying", "nice", "strong",
}
_NEG_EN = {
    "awful", "terrible", "disappointing", "bad", "poor", "useless",
    "mediocre", "negative", "failed", "confusing", "incompetent", "slow",
    "doubtful", "disastrous", "painful", "weak", "regrettable", "horrible",
}
_LEX = {
    "fr": (_POS_FR, _NEG_FR),
    "en": (_POS_EN, _NEG_EN),
}
_WORD = re.compile(r"[a-zàâäçéèêëîïôöùûüœ]+", re.IGNORECASE)


def polarity(text: str, lang: str) -> float:
    """Signed polarity in [-1, 1]: (pos - neg) / (pos + neg), 0 if no hits."""
    pos_set, neg_set = _LEX.get(lang, _LEX["fr"])
    tokens = _WORD.findall(text.lower())
    pos = sum(1 for t in tokens if t in pos_set)
    neg = sum(1 for t in tokens if t in neg_set)
    total = pos + neg
    if total == 0:
        return 0.0
    return (pos - neg) / total
