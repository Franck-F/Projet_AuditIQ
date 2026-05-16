import numpy as np

from app.audit_engine.unsupervised_metrics import cluster_positive_rates


def test_cluster_positive_rates_and_global():
    labels = np.array([0, 0, 0, 1, 1, 1])
    positive = np.array([1, 1, 0, 0, 0, 0])  # cluster0: 2/3, cluster1: 0/3
    rates, global_rate, sizes = cluster_positive_rates(labels, positive, k=2)
    assert rates == {0: 2 / 3, 1: 0.0}
    assert global_rate == 2 / 6
    assert sizes == {0: 3, 1: 3}


def test_cluster_positive_rates_handles_empty_cluster():
    labels = np.array([0, 0, 0, 0])
    positive = np.array([1, 0, 1, 0])
    rates, global_rate, sizes = cluster_positive_rates(labels, positive, k=3)
    # clusters 1 and 2 are empty -> rate 0.0, size 0
    assert rates == {0: 0.5, 1: 0.0, 2: 0.0}
    assert sizes == {0: 4, 1: 0, 2: 0}
    assert global_rate == 0.5


from app.audit_engine.unsupervised_metrics import chi2_cluster_decision


def test_chi2_strong_association_low_p():
    labels = np.array([0] * 50 + [1] * 50)
    positive = np.array([1] * 45 + [0] * 5 + [0] * 45 + [1] * 5)
    chi2, p, dof = chi2_cluster_decision(labels, positive, k=2)
    assert dof == 1
    assert p < 0.05
    assert chi2 > 0


def test_chi2_no_association_high_p():
    labels = np.array([0, 1] * 50)
    positive = np.array([1, 1, 0, 0] * 25)
    chi2, p, dof = chi2_cluster_decision(labels, positive, k=2)
    assert p > 0.05


def test_chi2_degenerate_constant_decision_returns_neutral():
    labels = np.array([0] * 5 + [1] * 5)
    positive = np.array([1] * 10)  # decision constant -> no contingency
    chi2, p, dof = chi2_cluster_decision(labels, positive, k=2)
    assert chi2 == 0.0
    assert p == 1.0
    assert dof == 0


from app.audit_engine.unsupervised_metrics import deviations


def test_deviations_in_percentage_points_and_flagging():
    rates = {0: 0.20, 1: 0.55, 2: 0.50}
    dev, deviant = deviations(rates, global_rate=0.50, deviation_pp=20.0)
    assert dev[0] == -30.0
    assert dev[1] == 5.0
    assert dev[2] == 0.0
    assert deviant == (0,)  # only |dev| > 20pp


def test_deviations_threshold_is_strict():
    rates = {0: 0.30, 1: 0.50}
    dev, deviant = deviations(rates, global_rate=0.50, deviation_pp=20.0)
    assert dev[0] == -20.0
    assert deviant == ()  # exactly 20pp is NOT > 20pp


from app.audit_engine.unsupervised_metrics import characterize_cluster


def test_characterize_returns_signed_top3_by_abs_std_diff():
    feature_names = ["a", "b", "c", "d"]
    global_mean = np.array([0.0, 0.0, 0.0, 0.0])
    global_std = np.array([1.0, 1.0, 1.0, 1.0])
    cluster_mean = np.array([3.0, -2.0, 0.5, 1.0])
    top = characterize_cluster(
        cluster_mean, global_mean, global_std, feature_names, top_n=3
    )
    assert [f.name for f in top] == ["a", "b", "d"]
    assert top[0].std_diff == 3.0 and top[0].direction == "above"
    assert top[1].std_diff == -2.0 and top[1].direction == "below"


def test_characterize_skips_constant_features():
    feature_names = ["const", "x"]
    top = characterize_cluster(
        np.array([5.0, 2.0]), np.array([5.0, 0.0]),
        np.array([0.0, 1.0]), feature_names, top_n=3,
    )
    # const feature has std 0 -> std_diff 0 -> not selected over x
    assert [f.name for f in top] == ["x"]
