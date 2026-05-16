import numpy as np
import pandas as pd
import pytest

from app.audit_engine.errors import DatasetValidationError
from app.audit_engine.types import M2Config
from app.audit_engine.unsupervised import run_m2


def _num_df(n: int = 60, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return pd.DataFrame(
        {
            "f1": rng.normal(size=n),
            "f2": rng.normal(size=n),
            "y": rng.integers(0, 2, size=n).astype(str),
        }
    )


def test_missing_decision_column():
    cfg = M2Config(decision_column="nope", positive_value="1")
    with pytest.raises(DatasetValidationError) as e:
        run_m2(_num_df(), cfg)
    assert e.value.field == "decision_column"


def test_decision_not_binary():
    df = _num_df()
    df.loc[0, "y"] = "2"  # 3 distinct values
    cfg = M2Config(decision_column="y", positive_value="1")
    with pytest.raises(DatasetValidationError) as e:
        run_m2(df, cfg)
    assert e.value.field == "decision_column"


def test_positive_value_absent():
    cfg = M2Config(decision_column="y", positive_value="favorable")
    with pytest.raises(DatasetValidationError) as e:
        run_m2(_num_df(), cfg)
    assert e.value.field == "positive_value"


def test_too_few_numeric_features():
    df = pd.DataFrame({"f1": [1.0, 2.0, 3.0, 4.0], "y": ["1", "0", "1", "0"]})
    cfg = M2Config(decision_column="y", positive_value="1", k=2)
    with pytest.raises(DatasetValidationError) as e:
        run_m2(df, cfg)
    assert e.value.field == "feature_columns"


def test_not_enough_rows_for_k():
    df = _num_df(n=15)  # 15 < max(5*5, 20)
    cfg = M2Config(decision_column="y", positive_value="1", k=5)
    with pytest.raises(DatasetValidationError) as e:
        run_m2(df, cfg)
    assert e.value.field is None
    assert "Effectif" in e.value.message


def test_run_m2_flags_deviant_blocks_as_fail(m2_deviant_df):
    cfg = M2Config(decision_column="y", positive_value="1", k=2)
    res = run_m2(m2_deviant_df, cfg)
    assert res.n == 240
    assert res.k == 2
    assert res.p_value < 0.05
    assert len(res.deviant_cluster_ids) >= 1
    assert res.verdict == "fail"
    assert 0 <= res.risk_score <= 100
    dev = next(
        c for c in res.clusters if c.id == res.deviant_cluster_ids[0]
    )
    assert len(dev.top_features) >= 1
    assert dev.top_features[0].name in ("f1", "f2")


def test_run_m2_homogeneous_is_pass(m2_homogeneous_df):
    cfg = M2Config(decision_column="y", positive_value="1", k=3)
    res = run_m2(m2_homogeneous_df, cfg)
    assert res.verdict == "pass"
    assert res.deviant_cluster_ids == ()


def test_run_m2_is_deterministic(m2_deviant_df):
    cfg = M2Config(decision_column="y", positive_value="1", k=2)
    a = run_m2(m2_deviant_df, cfg)
    b = run_m2(m2_deviant_df, cfg)
    assert a == b


def test_run_m2_non_numeric_feature_warns(m2_deviant_df):
    df = m2_deviant_df.copy()
    df["city"] = "Paris"
    cfg = M2Config(decision_column="y", positive_value="1", k=2)
    res = run_m2(df, cfg)
    assert any("non numériques" in w for w in res.warnings)
