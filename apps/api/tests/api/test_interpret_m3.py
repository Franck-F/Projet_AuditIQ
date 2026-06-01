import json

import pytest

from app.audit_engine import M3Config, M3Responses, ResponseRecord, run_m3
from app.interpretation.m3 import interpret_m3


def _result():
    recs = [
        ResponseRecord(pair_id="g1", category="genre", variant_label="m",
                       text="Une réponse correcte et suffisamment longue."),
        ResponseRecord(pair_id="g1", category="genre", variant_label="f",
                       text="Je ne peux pas répondre à cette demande."),
    ]
    return run_m3(M3Responses(records=recs), M3Config())


async def test_interpret_m3_fallback_when_no_provider():
    out = await interpret_m3(_result(), provider=None)
    assert out.provider == "fallback"
    assert out.model == "deterministic"
    anchors = " ".join(out.ai_act_anchors)
    assert "50" in anchors
    assert out.narrative
    assert out.disclaimers


class _Fake:
    name = "fake"
    model = "fake-1"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return json.dumps({"narrative": "Texte FR.",
                           "ai_act_anchors": ["AI Act, article 50"],
                           "disclaimers": ["Signal à approfondir."]})


async def test_interpret_m3_uses_provider_then_falls_back():
    out = await interpret_m3(_result(), provider=_Fake())
    assert out.provider == "fake"
    assert out.narrative == "Texte FR."

    class _Boom:
        name = "boom"
        model = "x"

        async def complete(self, prompt: str, *, as_json: bool = False) -> str:
            raise RuntimeError("down")

    out2 = await interpret_m3(_result(), provider=_Boom())
    assert out2.provider == "fallback"


class _StubLLM:
    """Stub LLM provider that returns a canned JSON response."""

    name = "stub"
    model = "stub-1"

    def __init__(self, response_json: str) -> None:
        self.response_json = response_json

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return self.response_json


@pytest.fixture
def m3_result_pass():
    """Fixture: a passing M3Result."""
    return _result()


@pytest.mark.asyncio
async def test_interpret_m3_recommendations_parsed_from_valid_json(
    m3_result_pass,
) -> None:
    """LLM returns 2 valid recos → all 2 surface in InterpretationOut."""
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"title": "R1", "detail": "D1.", "priority": "high"},
                {"title": "R2", "detail": "D2.", "priority": "low"},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m3(m3_result_pass, provider=provider)
    assert len(out.recommendations) == 2


@pytest.mark.asyncio
async def test_interpret_m3_recommendations_dropped_when_malformed(
    m3_result_pass,
) -> None:
    """LLM returns 1 valid + 1 with bad Literal → only the valid one surfaces."""
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"title": "Valid", "detail": "OK.", "priority": "high"},
                {"title": "Bad", "detail": "OK.", "priority": "urgent"},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m3(m3_result_pass, provider=provider)
    assert len(out.recommendations) == 1


@pytest.mark.asyncio
async def test_interpret_m3_recommendations_empty_when_field_absent(
    m3_result_pass,
) -> None:
    """LLM omits recommendations field → empty list (audit still valid)."""
    llm_json = json.dumps(
        {"narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"]},
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m3(m3_result_pass, provider=provider)
    assert out.recommendations == []
