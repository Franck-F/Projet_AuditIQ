"""TDD: additive fairlearn metric fields + helpers."""
from __future__ import annotations

from app.audit_engine.metrics import demographic_parity_ratio, group_confusion, truelabel_metrics
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


def test_demographic_parity_ratio():
    assert demographic_parity_ratio({"a": 0.8, "b": 0.2}) == 0.25
    assert demographic_parity_ratio({"a": 0.0, "b": 0.0}) == 1.0


def test_truelabel_metrics_ratios_and_rates():
    # group a: tp=8 fp=2 fn=2 tn=8 ; group b: tp=3 fp=7 fn=7 tn=3
    conf = {
        "a": {"tp": 8, "fp": 2, "fn": 2, "tn": 8},
        "b": {"tp": 3, "fp": 7, "fn": 7, "tn": 3},
    }
    r = truelabel_metrics(conf, None)
    # TPR a=0.8 b=0.3 -> ratio 0.375 ; FPR a=0.2 b=0.7 -> ratio 0.2857
    assert round(r.eo_ratio, 4) == 0.375
    assert round(r.eodds_ratio, 4) == round(min(0.3 / 0.8, 0.2 / 0.7), 4)
    # per-group rates
    assert round(r.accuracy["a"], 4) == 0.8      # (8+8)/20
    assert round(r.precision["a"], 4) == 0.8     # 8/(8+2)
    assert round(r.fnr["a"], 4) == 0.2           # 2/(8+2) ; ==1-TPR
    assert round(r.fnr["b"], 4) == 0.7
