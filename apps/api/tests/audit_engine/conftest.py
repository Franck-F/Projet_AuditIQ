import numpy as np
import pandas as pd
import pytest


def _df(rows: list[tuple[str, int, int]]) -> pd.DataFrame:
    """rows = list of (group_label, n, favorable_count). Decision is 'oui'/'non'."""
    records = []
    for label, n, fav in rows:
        records += [{"genre": label, "decision": "oui"}] * fav
        records += [{"genre": label, "decision": "non"}] * (n - fav)
    return pd.DataFrame.from_records(records)


@pytest.fixture
def recruitment_df() -> pd.DataFrame:
    # Hommes sr=0.50, Femmes sr=0.36 -> DI 0.72 -> fail
    return _df([("Hommes", 200, 100), ("Femmes", 200, 72)])


@pytest.fixture
def fair_df() -> pd.DataFrame:
    # both sr=0.60 -> DI 1.0 -> pass
    return _df([("Groupe A", 150, 90), ("Groupe B", 150, 90)])


@pytest.fixture
def warn_df() -> pd.DataFrame:
    # sr 0.50 vs 0.425 -> DI 0.85 -> warn
    return _df([("GroupA", 200, 100), ("GroupB", 200, 85)])


@pytest.fixture
def small_sample_df() -> pd.DataFrame:
    # both sr=0.60 (DI 1.0) but GroupB n=20 < 30 -> warn + warning
    return _df([("GroupA", 200, 120), ("GroupB", 20, 12)])


@pytest.fixture
def m2_deviant_df() -> pd.DataFrame:
    # Two well-separated feature blobs; one block almost always negative.
    rng = np.random.default_rng(42)
    a = pd.DataFrame(
        {"f1": rng.normal(-5, 0.5, 120), "f2": rng.normal(-5, 0.5, 120),
         "y": (["1"] * 108) + (["0"] * 12)}  # ~0.90 positive
    )
    b = pd.DataFrame(
        {"f1": rng.normal(5, 0.5, 120), "f2": rng.normal(5, 0.5, 120),
         "y": (["1"] * 12) + (["0"] * 108)}  # ~0.10 positive
    )
    return pd.concat([a, b], ignore_index=True)


@pytest.fixture
def m2_homogeneous_df() -> pd.DataFrame:
    rng = np.random.default_rng(7)
    n = 200
    return pd.DataFrame(
        {"f1": rng.normal(0, 1, n), "f2": rng.normal(0, 1, n),
         "y": rng.choice(["1", "0"], size=n)}  # decision independent of features
    )
