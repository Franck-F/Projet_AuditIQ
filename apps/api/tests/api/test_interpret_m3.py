import json

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
