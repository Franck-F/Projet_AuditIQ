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
