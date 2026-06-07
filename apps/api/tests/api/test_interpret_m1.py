import json

import pytest

from app.audit_engine.types import GroupStat, M1Result
from app.interpretation.m1 import interpret_m1


class _StubLLM:
    """Stub LLM provider that returns a canned JSON response."""

    name = "stub"
    model = "stub-1"

    def __init__(self, response_json: str) -> None:
        self.response_json = response_json

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return self.response_json


@pytest.fixture
def m1_result_pass() -> M1Result:
    """Fixture: a passing M1Result."""
    return M1Result(
        groups=(GroupStat("a", 40, 20, 0.5, 1.0),
                GroupStat("b", 40, 12, 0.3, 0.6)),
        reference_value="a", disparate_impact=0.6,
        demographic_parity_diff=0.2, worst_group="b", verdict="pass",
        risk_score=30, warnings=(),
    )


async def test_interpret_m1_fallback_mentions_normative_tension_when_eo_present():
    r = M1Result(
        groups=(GroupStat("a", 40, 20, 0.5, 1.0, tpr=0.9, fpr=0.1),
                GroupStat("b", 40, 12, 0.3, 0.6, tpr=0.5, fpr=0.4)),
        reference_value="a", disparate_impact=0.6,
        demographic_parity_diff=0.2, worst_group="b", verdict="fail",
        risk_score=70, warnings=(),
        equal_opportunity_diff=0.4, equalized_odds_diff=0.4,
        demographic_parity_verdict="fail",
        equal_opportunity_verdict="fail",
        equalized_odds_verdict="fail",
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    assert "equal opportunity" in blob or "vrais positifs" in blob
    # impossibility-theorem / normative framing surfaced
    assert "normati" in blob or "simultan" in blob


async def test_interpret_m1_no_eo_is_unchanged_shape():
    r = M1Result(
        groups=(GroupStat("a", 40, 20, 0.5, 1.0),
                GroupStat("b", 40, 12, 0.3, 0.6)),
        reference_value="a", disparate_impact=0.6,
        demographic_parity_diff=0.2, worst_group="b", verdict="fail",
        risk_score=70, warnings=(),
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    assert out.model == "deterministic"
    assert len(out.disclaimers) == 3   # base disclaimers, no EO disclaimer appended
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    assert "equal opportunity" not in blob
    assert "vrais positifs" not in blob
    assert "normati" not in blob
    assert "simultan" not in blob


async def test_interpret_m1_fallback_mentions_pairwise_contrast():
    """2-attribute result: fallback narrative mentions both attributes and worst pair."""
    from app.audit_engine.types import (
        IntersectionalCell,
        IntersectionalResult,
        M1Result,
        MarginalResult,
    )
    from app.interpretation.m1 import interpret_m1

    marginal_sexe = MarginalResult(
        attribute="sexe",
        groups=(),
        reference_value="H", disparate_impact=0.86,
        demographic_parity_diff=0.14, worst_group="F",
        verdict="warn", risk_score=50,
    )
    marginal_origine = MarginalResult(
        attribute="origine",
        groups=(),
        reference_value="fr", disparate_impact=0.9,
        demographic_parity_diff=0.1, worst_group="etr",
        verdict="warn", risk_score=40,
    )
    pair = IntersectionalResult(
        cells=(IntersectionalCell("f", "etr", 20, 3, 0.15, 0.3, "fail"),),
        reference_primary="H", reference_secondary="fr",
        worst_primary="F", worst_secondary="etr", disparate_impact=0.3,
        demographic_parity_diff=0.35, verdict="fail", risk_score=80,
        marginal_di=(0.86, 0.9),
        primary_attribute="sexe", secondary_attribute="origine",
    )
    r = M1Result(
        groups=(), reference_value="H", disparate_impact=0.3,
        demographic_parity_diff=0.35, worst_group="F", verdict="fail",
        risk_score=80, warnings=(),
        marginals=(marginal_sexe, marginal_origine),
        pairwise=(pair,),
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    # Both attribute names should appear
    assert "sexe" in blob
    assert "origine" in blob
    # Intersectional contrast (Gender Shades) should be described
    assert "intersection" in blob or "sous-groupe" in blob
    # Worst crossed subgroup named
    assert "etr" in blob


async def test_interpret_m1_no_pairwise_unchanged_shape():
    from app.audit_engine.types import GroupStat, M1Result
    from app.interpretation.m1 import interpret_m1

    r = M1Result(
        groups=(GroupStat("a", 40, 20, 0.5, 1.0),
                GroupStat("b", 40, 12, 0.3, 0.6)),
        reference_value="a", disparate_impact=0.6,
        demographic_parity_diff=0.2, worst_group="b", verdict="fail",
        risk_score=70, warnings=(),
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    assert "intersection" not in blob


@pytest.mark.asyncio
async def test_interpret_m1_recommendations_parsed_from_valid_json(
    m1_result_pass: M1Result,
) -> None:
    """LLM returns 3 valid recos → all 3 surface in InterpretationOut."""
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"title": "R1", "detail": "D1.", "priority": "high"},
                {"title": "R2", "detail": "D2.", "priority": "medium"},
                {"title": "R3", "detail": "D3.", "priority": "low"},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m1(m1_result_pass, provider=provider)
    assert len(out.recommendations) == 3
    assert out.recommendations[0].title == "R1"
    assert out.recommendations[0].priority == "high"


@pytest.mark.asyncio
async def test_interpret_m1_recommendations_dropped_when_malformed(
    m1_result_pass: M1Result,
) -> None:
    """LLM returns 1 valid + 1 invalid → only the valid one surfaces."""
    llm_json = json.dumps(
        {
            "narrative": "n",
            "ai_act_anchors": ["a"],
            "disclaimers": ["d"],
            "recommendations": [
                {"title": "Valid", "detail": "OK.", "priority": "high"},
                {"title": "No priority", "detail": "OK."},
            ],
        },
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m1(m1_result_pass, provider=provider)
    assert len(out.recommendations) == 1
    assert out.recommendations[0].title == "Valid"


@pytest.mark.asyncio
async def test_interpret_m1_recommendations_empty_when_field_absent(
    m1_result_pass: M1Result,
) -> None:
    """LLM omits recommendations field → empty list (audit still valid)."""
    llm_json = json.dumps(
        {"narrative": "n", "ai_act_anchors": ["a"], "disclaimers": ["d"]},
        ensure_ascii=False,
    )
    provider = _StubLLM(llm_json)
    out = await interpret_m1(m1_result_pass, provider=provider)
    assert out.recommendations == []
