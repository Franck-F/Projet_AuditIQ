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
