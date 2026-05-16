import json

import pytest
from pydantic import ValidationError

from app.audit_engine import M1Config, run_m1
from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut


def test_interpretation_out_shape():
    i = InterpretationOut(
        narrative="texte",
        ai_act_anchors=["AI Act art. 10"],
        disclaimers=["Aide à l'analyse, pas un verdict de conformité."],
        provider="fallback",
        model="deterministic",
    )
    assert i.provider == "fallback"
    with pytest.raises(ValidationError):
        InterpretationOut(narrative="x", ai_act_anchors=[], disclaimers=[],
                           provider="p", model="m", extra="nope")


class _FakeProvider:
    name = "fake"
    model = "fake-1"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return "{}"


def test_fake_provider_satisfies_protocol():
    assert isinstance(_FakeProvider(), LLMProvider)


def test_prompt_template_loads_and_has_placeholder():
    from app.interpretation.m1 import load_prompt_template

    tpl = load_prompt_template()
    assert "{metrics_json}" in tpl
    assert "AI Act" in tpl
    assert "JSON" in tpl


def _result():
    import pandas as pd

    df = pd.DataFrame(
        {"genre": ["H"] * 200 + ["F"] * 200,
         "decision": (["oui"] * 100 + ["non"] * 100)
         + (["oui"] * 72 + ["non"] * 128)}
    )
    return run_m1(df, M1Config(protected_attribute="genre",
                               decision_column="decision",
                               favorable_value="oui"))


class _OkProvider:
    name = "gemini"
    model = "gemini-1.5-pro"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return json.dumps({
            "narrative": "Écart défavorable détecté pour les femmes.",
            "ai_act_anchors": ["AI Act art. 10"],
            "disclaimers": ["Aide à l'analyse."],
        })


class _BoomProvider:
    name = "gemini"
    model = "gemini-1.5-pro"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        raise RuntimeError("quota exceeded")


async def test_interpret_m1_uses_provider_json():
    from app.interpretation.m1 import interpret_m1

    out = await interpret_m1(_result(), provider=_OkProvider())
    assert out.provider == "gemini"
    assert "femmes" in out.narrative.lower()
    assert out.ai_act_anchors == ["AI Act art. 10"]


async def test_interpret_m1_fallback_when_provider_none():
    from app.interpretation.m1 import interpret_m1

    out = await interpret_m1(_result(), provider=None)
    assert out.provider == "fallback"
    assert out.model == "deterministic"
    assert "0.72" in out.narrative or "fail" in out.narrative.lower()
    assert out.ai_act_anchors
    assert out.disclaimers


async def test_interpret_m1_fallback_when_provider_raises():
    from app.interpretation.m1 import interpret_m1

    out = await interpret_m1(_result(), provider=_BoomProvider())
    assert out.provider == "fallback"
    assert out.disclaimers
