from app.audit_engine.types import GroupStat, M1Result
from app.interpretation.m1 import interpret_m1


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
    assert out.narrative  # still a valid fallback, no EO mention required
