import pandas as pd

from app.audit_engine.anomaly_iqr import iqr_precheck
from app.audit_engine.types import IqrReport


def test_group_imbalance_is_flagged():
    df = pd.DataFrame(
        {"genre": ["H"] * 200 + ["F"] * 5, "y": ["1", "0"] * 102 + ["1"]}
    )
    rep = iqr_precheck(df, group_column="genre")
    assert isinstance(rep, IqrReport)
    assert any("déséquilibre" in w.lower() or "faible" in w.lower()
               for w in rep.warnings)


def test_balanced_groups_no_warning():
    df = pd.DataFrame({"genre": ["H"] * 100 + ["F"] * 100})
    rep = iqr_precheck(df, group_column="genre")
    assert rep.warnings == ()


def test_feature_outliers_flagged_when_heavy():
    base = [10.0] * 95
    outliers = [1000.0] * 5  # 5% extreme values
    df = pd.DataFrame({"f1": base + outliers, "f2": [1.0] * 100})
    rep = iqr_precheck(df, numeric_columns=["f1", "f2"])
    assert any("f1" in w and "atypique" in w.lower() for w in rep.warnings)


def test_clean_numeric_no_warning():
    df = pd.DataFrame({"f1": list(range(100)), "f2": list(range(100))})
    rep = iqr_precheck(df, numeric_columns=["f1", "f2"])
    assert rep.warnings == ()
