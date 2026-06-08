"""Validates the in-house EO/Equalized Odds against Fairlearn (dev dep).
Runtime engine never imports fairlearn; this proves equality at _ROUND."""
import pandas as pd
import pytest

fairlearn = pytest.importorskip("fairlearn.metrics")

from app.audit_engine.m1_supervised import run_m1  # noqa: E402
from app.audit_engine.types import M1Config  # noqa: E402

_ROUND = 4


def _frame():
    return pd.DataFrame({
        "g": ["a"] * 50 + ["b"] * 50,
        "d": (["oui"] * 30 + ["non"] * 20) + (["oui"] * 15 + ["non"] * 35),
        "reel": (["oui"] * 25 + ["non"] * 25)
        + (["oui"] * 20 + ["non"] * 30),
    })


def test_eo_eodds_match_fairlearn():
    from fairlearn.metrics import (
        MetricFrame,
        equalized_odds_difference,
        false_positive_rate,
        true_positive_rate,
    )

    df = _frame()
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", ground_truth_column="reel")
    r = run_m1(df, cfg)

    y_pred = (df["d"].astype(str) == "oui").astype(int)
    y_true = (df["reel"].astype(str) == "oui").astype(int)
    sf = df["g"].astype(str)

    mf_tpr = MetricFrame(metrics=true_positive_rate, y_true=y_true,
                         y_pred=y_pred, sensitive_features=sf)
    mf_fpr = MetricFrame(metrics=false_positive_rate, y_true=y_true,
                         y_pred=y_pred, sensitive_features=sf)
    fl_eo = mf_tpr.difference()  # max - min TPR (no privileged here)
    fl_eodds = equalized_odds_difference(
        y_true, y_pred, sensitive_features=sf
    )

    # engine here used privileged=None -> max-min convention, same as fairlearn
    assert r.equal_opportunity_diff == round(float(fl_eo), _ROUND)
    assert r.equalized_odds_diff == round(float(fl_eodds), _ROUND)
    # per-group TPR/FPR equal fairlearn's by-group frame
    for gs in r.groups:
        assert gs.tpr == round(float(mf_tpr.by_group[gs.value]), _ROUND)
        assert gs.fpr == round(float(mf_fpr.by_group[gs.value]), _ROUND)


def test_ratios_match_fairlearn():
    from fairlearn.metrics import (
        MetricFrame,
        false_negative_rate,
    )
    from fairlearn.metrics import (
        demographic_parity_ratio as fl_dp_ratio,
    )
    from fairlearn.metrics import (
        equalized_odds_ratio as fl_eodds_ratio,
    )
    df = _frame()  # the existing helper with g/d/reel
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", ground_truth_column="reel")
    m = run_m1(df, cfg).marginals[0]
    y_pred = (df["d"].astype(str) == "oui").astype(int)
    y_true = (df["reel"].astype(str) == "oui").astype(int)
    sf = df["g"].astype(str)
    assert m.demographic_parity_ratio == round(
        float(fl_dp_ratio(y_pred, y_pred, sensitive_features=sf)), _ROUND)
    assert m.equalized_odds_ratio == round(
        float(fl_eodds_ratio(y_true, y_pred, sensitive_features=sf)), _ROUND)
    mf_fnr = MetricFrame(metrics=false_negative_rate, y_true=y_true,
                         y_pred=y_pred, sensitive_features=sf)
    for g in m.groups:
        if g.fnr is not None:
            assert g.fnr == round(float(mf_fnr.by_group[g.value]), _ROUND)


def test_di_and_demographic_parity_match_fairlearn():
    """Disparate Impact (4/5) and Demographic Parity gap equal fairlearn's
    demographic_parity_ratio / demographic_parity_difference. privileged=None
    -> engine uses the symmetric min/max convention, same as fairlearn."""
    from fairlearn.metrics import (
        demographic_parity_difference,
        demographic_parity_ratio,
    )

    df = pd.DataFrame({
        "g": ["a"] * 50 + ["b"] * 50,
        "d": (["oui"] * 40 + ["non"] * 10) + (["oui"] * 15 + ["non"] * 35),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui")
    r = run_m1(df, cfg)

    y_pred = (df["d"].astype(str) == "oui").astype(int)
    sf = df["g"].astype(str)
    # y_true is unused for selection-rate-based parity; pass y_pred as a dummy.
    fl_dpd = demographic_parity_difference(y_pred, y_pred, sensitive_features=sf)
    fl_ratio = demographic_parity_ratio(y_pred, y_pred, sensitive_features=sf)

    assert r.demographic_parity_diff == round(float(fl_dpd), _ROUND)
    assert r.disparate_impact == round(float(fl_ratio), _ROUND)
