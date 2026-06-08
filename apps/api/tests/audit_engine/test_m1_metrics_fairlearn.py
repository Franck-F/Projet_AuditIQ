"""TDD: additive fairlearn metric fields + helpers."""
from __future__ import annotations

from app.audit_engine.types import GroupStat, IntersectionalResult, MarginalResult


def test_groupstat_has_extra_rates():
    g = GroupStat("H", 10, 8, 0.8, 1.0, tpr=0.9, fpr=0.1,
                  fnr=0.1, accuracy=0.85, precision=0.88)
    assert (g.fnr, g.accuracy, g.precision) == (0.1, 0.85, 0.88)


def test_marginal_has_ratio_fields():
    m = MarginalResult(
        attribute="sexe", groups=(), reference_value="H",
        disparate_impact=0.5, demographic_parity_diff=0.3, worst_group="F",
        verdict="fail", risk_score=70,
        demographic_parity_ratio=0.5, equal_opportunity_ratio=0.6,
        equalized_odds_ratio=0.55,
    )
    assert (m.demographic_parity_ratio, m.equal_opportunity_ratio,
            m.equalized_odds_ratio) == (0.5, 0.6, 0.55)


def test_intersectional_has_ratio_fields():
    r = IntersectionalResult(
        cells=(), reference_primary="", reference_secondary="",
        worst_primary="", worst_secondary="", disparate_impact=1.0,
        demographic_parity_diff=0.0, verdict="warn", risk_score=0,
        marginal_di=(1.0, 1.0), demographic_parity_ratio=0.4,
        equal_opportunity_ratio=0.5, equalized_odds_ratio=0.45,
    )
    assert r.demographic_parity_ratio == 0.4
