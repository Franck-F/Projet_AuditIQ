"""interpret_m1 must survive real-world LLM output: fenced JSON parses, and
LLM failures surface as a logged, degraded fallback (not silent)."""
import json

import pytest

from app.audit_engine.types import GroupStat, M1Result
from app.interpretation.m1 import interpret_m1


def _result() -> M1Result:
    return M1Result(
        groups=(GroupStat("a", 40, 20, 0.5, 1.0),
                GroupStat("b", 40, 12, 0.3, 0.6)),
        reference_value="a", disparate_impact=0.6,
        demographic_parity_diff=0.2, worst_group="b", verdict="fail",
        risk_score=70, warnings=(),
    )


class _StubLLM:
    name = "stub"
    model = "stub-1"

    def __init__(self, raw: str) -> None:
        self._raw = raw

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return self._raw


class _BoomLLM:
    name = "boom"
    model = "boom-1"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        raise RuntimeError("gemini 503 unavailable")


@pytest.mark.asyncio
async def test_interpret_m1_parses_fenced_json():
    """Gemini commonly wraps JSON in ```json fences — le narratif et la
    reformulation par id du squelette doivent survivre au fence."""
    # On appose une reformulation sur la première reco déterministe (par id).
    skeleton = await interpret_m1(_result(), provider=None)
    first_id = skeleton.recommendations[0].id
    payload = {
        "narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"],
        "recommendations": [
            {"id": first_id, "title": "Titre LLM", "rationale": "Pourquoi LLM."},
        ],
    }
    fenced = "```json\n" + json.dumps(payload, ensure_ascii=False) + "\n```"
    out = await interpret_m1(_result(), provider=_StubLLM(fenced))
    assert out.provider == "stub"
    assert out.degraded is False
    # Squelette déterministe préservé, première reco reformulée par le LLM.
    assert [r.id for r in out.recommendations] == [
        r.id for r in skeleton.recommendations
    ]
    assert out.recommendations[0].title == "Titre LLM"


@pytest.mark.asyncio
async def test_interpret_m1_llm_error_is_degraded_and_logged(caplog):
    """An LLM/parse failure must be a VISIBLE degraded fallback, never silent.

    Les recommandations déterministes restent présentes (le fallback n'est
    jamais vide de recos)."""
    with caplog.at_level("WARNING"):
        out = await interpret_m1(_result(), provider=_BoomLLM())
    assert out.provider == "fallback"
    assert out.degraded is True
    assert len(out.recommendations) >= 1
    assert any(
        "gemini 503 unavailable" in r.getMessage()
        or "RuntimeError" in r.getMessage()
        for r in caplog.records
    ), "LLM failure must be logged"


@pytest.mark.asyncio
async def test_interpret_m1_no_provider_is_not_degraded():
    """No key configured is an expected fallback, not a degradation/error."""
    out = await interpret_m1(_result(), provider=None)
    assert out.provider == "fallback"
    assert out.degraded is False
