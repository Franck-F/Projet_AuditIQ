import pytest

from app.audit_engine.metrics import (
    VERDICT_FAIL,
    VERDICT_PASS,
    VERDICT_WARN,
    decide_verdict,
    demographic_parity_diff,
    disparate_impacts,
    pick_reference,
    risk_score,
    selection_rate,
)


def test_selection_rate_basic():
    assert selection_rate(72, 200) == 0.36


def test_selection_rate_zero_n_raises():
    with pytest.raises(ValueError):
        selection_rate(0, 0)


def test_pick_reference_uses_privileged_when_given():
    assert pick_reference({"A": 0.4, "B": 0.6}, "A") == "A"


def test_pick_reference_max_rate_with_deterministic_tiebreak():
    assert pick_reference({"Groupe B": 0.6, "Groupe A": 0.6}, None) == "Groupe A"
    assert pick_reference({"H": 0.5, "F": 0.36}, None) == "H"


def test_disparate_impacts_ratio_to_reference():
    di, warns = disparate_impacts({"H": 0.5, "F": 0.36}, "H")
    assert di["H"] == 1.0
    assert di["F"] == pytest.approx(0.72)
    assert warns == []


def test_disparate_impacts_zero_reference_rate_is_neutral_with_warning():
    di, warns = disparate_impacts({"A": 0.0, "B": 0.0}, "A")
    assert di == {"A": 1.0, "B": 1.0}
    assert len(warns) == 1 and "non calculable" in warns[0]


def test_demographic_parity_diff():
    assert demographic_parity_diff({"A": 0.5, "B": 0.36}) == pytest.approx(0.14)


@pytest.mark.parametrize(
    "di,small,expected",
    [
        (0.72, False, VERDICT_FAIL),
        (0.79, False, VERDICT_FAIL),
        (0.80, False, VERDICT_WARN),
        (0.85, False, VERDICT_WARN),
        (0.90, False, VERDICT_PASS),
        (1.00, False, VERDICT_PASS),
        (0.95, True, VERDICT_WARN),
    ],
)
def test_decide_verdict_bands(di, small, expected):
    assert decide_verdict(di, 0.80, 0.90, small) == expected


@pytest.mark.parametrize(
    "di,imbalance,expected",
    [
        (1.00, 0.0, 0),
        (0.90, 0.0, 20),
        (0.85, 0.0, 35),
        (0.80, 0.0, 50),
        (0.72, 0.0, 55),
        (0.00, 0.0, 100),
        (1.00, 0.9, 9),
    ],
)
def test_risk_score_piecewise(di, imbalance, expected):
    assert risk_score(di, imbalance) == expected


def test_gap_verdict_uses_di_threshold_complements():
    from app.audit_engine.metrics import (
        VERDICT_FAIL,
        VERDICT_PASS,
        VERDICT_WARN,
        gap_verdict,
    )
    # defaults: di_fail_below=0.80 -> fail if gap>0.20 ; di_warn_below=0.90 -> warn if gap>0.10
    assert gap_verdict(0.05, 0.80, 0.90) == VERDICT_PASS
    assert gap_verdict(0.15, 0.80, 0.90) == VERDICT_WARN
    assert gap_verdict(0.25, 0.80, 0.90) == VERDICT_FAIL
    assert gap_verdict(0.10, 0.80, 0.90) == VERDICT_PASS  # boundary: strictly >
    assert gap_verdict(0.20, 0.80, 0.90) == VERDICT_WARN  # boundary: strictly >


def test_group_confusion_counts():
    from app.audit_engine.metrics import group_confusion

    # y_pred favorable, y_true favorable booleans
    y_pred = [True, True, False, False, True]
    y_true = [True, False, True, False, True]
    c = group_confusion(y_pred, y_true)
    # TP: pred&true -> idx0,4 =2 ; FP: pred&~true -> idx1 =1
    # FN: ~pred&true -> idx2 =1 ; TN: ~pred&~true -> idx3 =1
    assert c == {"tp": 2, "fp": 1, "fn": 1, "tn": 1}


def test_truelabel_metrics_basic_and_reference():
    from app.audit_engine.metrics import truelabel_metrics

    # groups A (priv): TPR=1.0 FPR=0.0 ; B: TPR=0.5 FPR=0.5
    conf = {
        "A": {"tp": 4, "fp": 0, "fn": 0, "tn": 4},
        "B": {"tp": 2, "fp": 2, "fn": 2, "tn": 2},
    }
    out = truelabel_metrics(conf, privileged="A")
    assert out.tpr == {"A": 1.0, "B": 0.5}
    assert out.fpr == {"A": 0.0, "B": 0.5}
    assert out.eo_diff == 0.5            # |TPR_A - TPR_B|
    assert out.eodds_diff == 0.5        # max(|dTPR|, |dFPR|)
    assert out.skipped == []
    assert out.reason is None


def test_truelabel_metrics_degenerate_skip_and_reason():
    from app.audit_engine.metrics import truelabel_metrics

    # A has no real positives (tp+fn=0) -> TPR undefined ; B normal
    conf = {
        "A": {"tp": 0, "fp": 1, "fn": 0, "tn": 5},
        "B": {"tp": 3, "fp": 1, "fn": 1, "tn": 3},
    }
    out = truelabel_metrics(conf, privileged=None)
    assert any("A" in w for w in out.skipped)
    # only B has a defined TPR -> <2 comparable for EO -> non calculable
    assert out.eo_diff is None
    assert out.reason is not None and "non calculable" in out.reason.lower()
