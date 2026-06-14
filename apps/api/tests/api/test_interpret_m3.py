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
async def test_interpret_m3_recommendations_from_deterministic_skeleton(
    m3_result_pass,
) -> None:
    """Le squelette déterministe pilote ; le LLM reformule par id."""
    skeleton = await interpret_m3(m3_result_pass, provider=None)
    skel_ids = [r.id for r in skeleton.recommendations]
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"id": skel_ids[0], "title": "Reformulé"},
                {"id": "id_fantome", "title": "Inventée"},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m3(m3_result_pass, provider=provider)
    assert [r.id for r in out.recommendations] == skel_ids
    assert out.recommendations[0].title == "Reformulé"
    assert "Inventée" not in [r.title for r in out.recommendations]


@pytest.mark.asyncio
async def test_interpret_m3_recommendations_fallback_when_field_absent(
    m3_result_pass,
) -> None:
    """LLM omits recommendations → deterministic skeleton kept (never empty)."""
    skeleton = await interpret_m3(m3_result_pass, provider=None)
    llm_json = json.dumps(
        {"narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"]},
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m3(m3_result_pass, provider=provider)
    assert [r.id for r in out.recommendations] == [
        r.id for r in skeleton.recommendations
    ]
    assert len(out.recommendations) >= 1
