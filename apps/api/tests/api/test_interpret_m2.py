import json

from app.audit_engine import M2Config, run_m2
from app.interpretation.m2 import interpret_m2


def _result():
    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(42)
    a = pd.DataFrame({"f1": rng.normal(-5, 0.5, 120),
                      "f2": rng.normal(-5, 0.5, 120),
                      "y": (["1"] * 108) + (["0"] * 12)})
    b = pd.DataFrame({"f1": rng.normal(5, 0.5, 120),
                      "f2": rng.normal(5, 0.5, 120),
                      "y": (["1"] * 12) + (["0"] * 108)})
    return run_m2(pd.concat([a, b], ignore_index=True),
                  M2Config(decision_column="y", positive_value="1", k=2))


async def test_interpret_m2_fallback_when_no_provider():
    out = await interpret_m2(_result(), provider=None)
    assert out.provider == "fallback"
    assert out.model == "deterministic"
    assert "AI Act" in " ".join(out.ai_act_anchors)
    assert out.narrative
    assert out.disclaimers


class _FakeProvider:
    name = "fake"
    model = "fake-1"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return json.dumps({"narrative": "Texte FR.",
                           "ai_act_anchors": ["AI Act, article 10"],
                           "disclaimers": ["Aide à l'analyse."]})


async def test_interpret_m2_uses_provider_then_falls_back_on_error():
    out = await interpret_m2(_result(), provider=_FakeProvider())
    assert out.provider == "fake"
    assert out.narrative == "Texte FR."

    class _Boom:
        name = "boom"
        model = "x"

        async def complete(self, prompt: str, *, as_json: bool = False) -> str:
            raise RuntimeError("LLM down")

    out2 = await interpret_m2(_result(), provider=_Boom())
    assert out2.provider == "fallback"


async def test_interpret_m2_recommendations_parsed_from_valid_json() -> None:
    """LLM returns 2 valid recos → all 2 surface in InterpretationOut."""
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"title": "R1", "detail": "D1.", "priority": "high"},
                {"title": "R2", "detail": "D2.", "priority": "medium"},
            ],
        },
        ensure_ascii=False,
    )

    class _StubLLM:
        name = "stub"
        model = "stub-1"

        async def complete(self, prompt: str, *, as_json: bool = False) -> str:
            return llm_json

    out = await interpret_m2(_result(), provider=_StubLLM())
    assert len(out.recommendations) == 2


async def test_interpret_m2_recommendations_dropped_when_malformed() -> None:
    """LLM returns 1 valid + 1 invalid → only the valid one surfaces."""
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"title": "Valid", "detail": "OK.", "priority": "high"},
                "not a dict",
            ],
        },
        ensure_ascii=False,
    )

    class _StubLLM:
        name = "stub"
        model = "stub-1"

        async def complete(self, prompt: str, *, as_json: bool = False) -> str:
            return llm_json

    out = await interpret_m2(_result(), provider=_StubLLM())
    assert len(out.recommendations) == 1
    assert out.recommendations[0].title == "Valid"


async def test_interpret_m2_recommendations_empty_when_field_absent() -> None:
    """LLM omits recommendations field → empty list (audit still valid)."""
    llm_json = json.dumps(
        {"narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"]},
        ensure_ascii=False,
    )

    class _StubLLM:
        name = "stub"
        model = "stub-1"

        async def complete(self, prompt: str, *, as_json: bool = False) -> str:
            return llm_json

    out = await interpret_m2(_result(), provider=_StubLLM())
    assert out.recommendations == []
