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


# ---------------------------------------------------------------------------
# Task 5 — new tests: ratios in _metrics_json + _fallback informative sentence
# ---------------------------------------------------------------------------

async def test_metrics_json_includes_ratios_for_marginal():
    """_metrics_json must include demographic_parity_ratio (and EO/EOdds when set)
    for each marginal."""
    from app.audit_engine.types import MarginalResult
    from app.interpretation.m1 import _metrics_json

    marginal_with_ratios = MarginalResult(
        attribute="sexe",
        groups=(),
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.3,
        worst_group="F",
        verdict="fail",
        risk_score=70,
        demographic_parity_ratio=0.5,
        equal_opportunity_ratio=0.6,
        equalized_odds_ratio=0.55,
    )
    r = M1Result(
        groups=(GroupStat("H", 60, 40, 0.667, 1.0),
                GroupStat("F", 60, 24, 0.4, 0.6)),
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.3,
        worst_group="F",
        verdict="fail",
        risk_score=70,
        warnings=(),
        marginals=(marginal_with_ratios,),
    )
    j = json.loads(_metrics_json(r))
    assert "marginals" in j
    m = j["marginals"][0]
    assert m.get("demographic_parity_ratio") == 0.5
    assert m.get("equal_opportunity_ratio") == 0.6
    assert m.get("equalized_odds_ratio") == 0.55


async def test_metrics_json_includes_per_group_rates_when_present():
    """_metrics_json must include fnr/accuracy/precision for a group that has them."""
    from app.audit_engine.types import MarginalResult
    from app.interpretation.m1 import _metrics_json

    g_with_rates = GroupStat("H", 100, 80, 0.8, 1.0,
                              tpr=0.85, fpr=0.1, fnr=0.15, accuracy=0.82,
                              precision=0.88)
    g_no_rates = GroupStat("F", 100, 40, 0.4, 0.5)

    marginal = MarginalResult(
        attribute="sexe",
        groups=(g_with_rates, g_no_rates),
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.4,
        worst_group="F",
        verdict="fail",
        risk_score=75,
        demographic_parity_ratio=0.5,
    )
    r = M1Result(
        groups=(g_with_rates, g_no_rates),
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.4,
        worst_group="F",
        verdict="fail",
        risk_score=75,
        warnings=(),
        marginals=(marginal,),
    )
    j = json.loads(_metrics_json(r))
    # top-level groups must also include rates when present
    h_grp = next(g for g in j["groups"] if g["value"] == "H")
    assert h_grp.get("fnr") == 0.15
    assert h_grp.get("accuracy") == 0.82
    assert h_grp.get("precision") == 0.88
    # group without rates: keys absent (or None)
    f_grp = next(g for g in j["groups"] if g["value"] == "F")
    assert f_grp.get("fnr") is None
    assert f_grp.get("accuracy") is None
    assert f_grp.get("precision") is None


async def test_metrics_json_includes_ratios_for_pairwise():
    """_metrics_json must include the 3 ratios for each pairwise entry."""
    from app.audit_engine.types import IntersectionalResult
    from app.interpretation.m1 import _metrics_json

    pair = IntersectionalResult(
        cells=(),
        reference_primary="H",
        reference_secondary="j",
        worst_primary="F",
        worst_secondary="v",
        disparate_impact=0.4,
        demographic_parity_diff=0.3,
        verdict="fail",
        risk_score=75,
        marginal_di=(0.5, 0.667),
        demographic_parity_ratio=0.4,
        equal_opportunity_ratio=0.5,
        equalized_odds_ratio=0.45,
        primary_attribute="sexe",
        secondary_attribute="age",
    )
    r = M1Result(
        groups=(),
        reference_value="H",
        disparate_impact=0.4,
        demographic_parity_diff=0.3,
        worst_group="F",
        verdict="fail",
        risk_score=75,
        warnings=(),
        pairwise=(pair,),
    )
    j = json.loads(_metrics_json(r))
    assert "pairwise" in j
    p = j["pairwise"][0]
    assert p.get("demographic_parity_ratio") == 0.4
    assert p.get("equal_opportunity_ratio") == 0.5
    assert p.get("equalized_odds_ratio") == 0.45


async def test_fallback_mentions_ratio_informatively_with_gt():
    """_fallback: when EO is present, the narrative includes an informative ratio
    sentence citing at least the demographic_parity_ratio of the worst marginal.
    Verdict and provider must not change."""
    from app.audit_engine.types import GroupStat, M1Result, MarginalResult
    from app.interpretation.m1 import interpret_m1

    g1 = GroupStat("H", 100, 80, 0.8, 1.0, tpr=0.85, fpr=0.1,
                   fnr=0.15, accuracy=0.82, precision=0.88)
    g2 = GroupStat("F", 100, 40, 0.4, 0.5, tpr=0.5, fpr=0.3,
                   fnr=0.5, accuracy=0.6, precision=0.7)
    mar = MarginalResult(
        attribute="sexe",
        groups=(g1, g2),
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.4,
        worst_group="F",
        verdict="fail",
        risk_score=75,
        equal_opportunity_diff=0.35,
        equalized_odds_diff=0.35,
        demographic_parity_verdict="fail",
        equal_opportunity_verdict="fail",
        equalized_odds_verdict="fail",
        demographic_parity_ratio=0.5,
        equal_opportunity_ratio=0.588,
        equalized_odds_ratio=0.333,
    )
    r = M1Result(
        groups=(g1, g2),
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.4,
        worst_group="F",
        verdict="fail",
        risk_score=75,
        warnings=(),
        equal_opportunity_diff=0.35,
        equalized_odds_diff=0.35,
        demographic_parity_verdict="fail",
        equal_opportunity_verdict="fail",
        equalized_odds_verdict="fail",
        marginals=(mar,),
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    assert out.model == "deterministic"
    blob = out.narrative.lower()
    # Informative sentence must mention at least one ratio value
    assert "0.5" in blob or "ratio" in blob or "informatif" in blob
    # Verdict unchanged (still deterministic fallback)
    assert "fail" in blob or "critique" in blob or "non respect" in blob


async def test_fallback_no_gt_no_ratio_sentence():
    """Without ground truth (no EO data), no EO/EOdds ratio sentence should appear
    in the fallback narrative, though demographic_parity_ratio is fine to mention."""
    from app.audit_engine.types import GroupStat, M1Result
    from app.interpretation.m1 import interpret_m1

    r = M1Result(
        groups=(GroupStat("H", 60, 40, 0.667, 1.0),
                GroupStat("F", 60, 24, 0.4, 0.6)),
        reference_value="H",
        disparate_impact=0.6,
        demographic_parity_diff=0.267,
        worst_group="F",
        verdict="fail",
        risk_score=70,
        warnings=(),
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    blob = out.narrative.lower()
    # No EO/EOdds ratio mention when GT absent
    assert "equal_opportunity_ratio" not in blob
    assert "equalized_odds_ratio" not in blob
