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
    assert out.model == "deterministic"
    assert len(out.disclaimers) == 3   # base disclaimers, no EO disclaimer appended
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    assert "equal opportunity" not in blob
    assert "vrais positifs" not in blob
    assert "normati" not in blob
    assert "simultan" not in blob


async def test_interpret_m1_fallback_mentions_intersectional_contrast():
    from app.audit_engine.types import (
        IntersectionalCell,
        IntersectionalResult,
        M1Result,
    )
    from app.interpretation.m1 import interpret_m1

    inter = IntersectionalResult(
        cells=(IntersectionalCell("f", "etr", 20, 3, 0.15, 0.3, "fail"),),
        reference_primary="h", reference_secondary="fr",
        worst_primary="f", worst_secondary="etr", disparate_impact=0.3,
        demographic_parity_diff=0.35, verdict="fail", risk_score=80,
        marginal_di=(0.86, 0.9),
    )
    r = M1Result(
        groups=(), reference_value="h", disparate_impact=0.3,
        demographic_parity_diff=0.35, worst_group="f", verdict="fail",
        risk_score=80, warnings=(), intersectional=inter,
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    assert "intersection" in blob or "sous-groupe" in blob
    assert "etr" in blob  # worst crossed subgroup named


async def test_interpret_m1_no_intersectional_unchanged_shape():
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
