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
