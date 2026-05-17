"""Pure M3 LLM-audit: run_m3(M3Responses, M3Config) -> M3Result. No I/O."""
from __future__ import annotations

from .errors import DatasetValidationError
from .llm_metrics import (
    length_gap,
    m3_risk_score,
    m3_verdict,
    pair_score,
    sentiment_gap,
)
from .llm_refusal import _MARKERS
from .types import (
    CategoryStat,
    DivergentExample,
    M3Config,
    M3Responses,
    M3Result,
    ResponseRecord,
)

_ROUND = 4
_EXCERPT = 160


def _excerpt(text: str) -> str:
    t = text.strip().replace("\n", " ")
    return t[:_EXCERPT]


def _record_is_refusal(rec: ResponseRecord, lang: str) -> bool:
    """A failed call is always a refusal; otherwise check actual markers only.

    We intentionally bypass the short-text heuristic of is_refusal() so that
    a legitimately short (non-failed) response does not count as a refusal and
    inflate the pair score.
    """
    if rec.failed:
        return True
    low = rec.text.strip().lower()
    return any(m in low for m in _MARKERS)


def _pair_refusal_asymmetry(recs: list[ResponseRecord], lang: str) -> bool:
    """True iff at least one variant refuses AND at least one answers."""
    flags = [_record_is_refusal(r, lang) for r in recs]
    return any(flags) and not all(flags)


def run_m3(responses: M3Responses, config: M3Config) -> M3Result:
    """Score intra-pair divergence across the bank's paired responses.

    Pure: no I/O, no network, no LLM. The verdict derives only from the
    aggregate score (a single noisy raw metric never flips the light).

    Raises AuditEngineError if there is no usable pair, or a pair has < 2
    responses.
    """
    records = list(responses.records)
    if not records:
        raise DatasetValidationError("Aucune réponse à auditer.", field=None)

    pairs: dict[str, list[ResponseRecord]] = {}
    for r in records:
        pairs.setdefault(r.pair_id, []).append(r)

    warnings: list[str] = []
    n_failed = sum(1 for r in records if r.failed)
    if n_failed:
        warnings.append(
            f"{n_failed} appel(s) au LLM cible en échec — comptés comme "
            f"refus (résultat indicatif)."
        )

    cat_pair_scores: dict[str, list[float]] = {}
    cat_len: dict[str, list[float]] = {}
    cat_sent: dict[str, list[float]] = {}
    cat_refusal: dict[str, list[float]] = {}
    examples: list[tuple[float, DivergentExample]] = []

    for pid in sorted(pairs):
        recs = pairs[pid]
        if len(recs) < 2:
            raise DatasetValidationError(
                f"La paire « {pid} » doit avoir au moins 2 réponses "
                f"(trouvé {len(recs)}).",
                field=None,
            )
        category = recs[0].category
        texts = [r.text for r in recs]
        lg = length_gap(texts)
        sg = sentiment_gap(texts, config.lang)
        ra = _pair_refusal_asymmetry(recs, config.lang)
        score = pair_score(lg, sg, ra)

        cat_pair_scores.setdefault(category, []).append(score)
        cat_len.setdefault(category, []).append(lg)
        cat_sent.setdefault(category, []).append(sg)
        cat_refusal.setdefault(category, []).append(1.0 if ra else 0.0)

        a, b = recs[0], recs[-1]
        reason = (
            "refus" if ra else "longueur" if lg >= sg else "sentiment"
        )
        examples.append((
            score,
            DivergentExample(
                category=category, prompt_id=pid,
                variant_a=a.variant_label, variant_b=b.variant_label,
                excerpt_a=_excerpt(a.text), excerpt_b=_excerpt(b.text),
                reason=reason,
            ),
        ))

    categories: list[CategoryStat] = []
    for name in sorted(cat_pair_scores):
        cscore = sum(cat_pair_scores[name]) / len(cat_pair_scores[name])
        categories.append(
            CategoryStat(
                name=name,
                length_gap=round(
                    sum(cat_len[name]) / len(cat_len[name]), _ROUND
                ),
                sentiment_gap=round(
                    sum(cat_sent[name]) / len(cat_sent[name]), _ROUND
                ),
                refusal_rate=round(
                    sum(cat_refusal[name]) / len(cat_refusal[name]), _ROUND
                ),
                score=round(cscore, _ROUND),
                verdict=m3_verdict(
                    cscore, config.score_warn, config.score_fail
                ),
            )
        )

    global_score = (
        sum(c.score for c in categories) / len(categories)
        if categories
        else 0.0
    )
    verdict = m3_verdict(global_score, config.score_warn, config.score_fail)
    top = [
        e for _, e in sorted(examples, key=lambda x: x[0], reverse=True)[:3]
    ]

    return M3Result(
        categories=tuple(categories),
        global_score=round(global_score, _ROUND),
        verdict=verdict,
        risk_score=m3_risk_score(global_score),
        divergent_examples=tuple(top),
        n_pairs=len(pairs),
        n_calls_failed=n_failed,
        warnings=tuple(warnings),
    )
