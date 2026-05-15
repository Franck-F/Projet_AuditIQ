import pandas as pd
import pytest

from app.audit_engine.errors import DatasetValidationError
from app.audit_engine.m1_supervised import run_m1
from app.audit_engine.types import M1Config

CFG = M1Config(
    protected_attribute="genre",
    decision_column="decision",
    favorable_value="oui",
)


def _df(records):
    return pd.DataFrame.from_records(records)


def test_missing_protected_column():
    df = _df([{"decision": "oui"}, {"decision": "non"}])
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "protected_attribute"


def test_missing_decision_column():
    df = _df([{"genre": "H"}, {"genre": "F"}])
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "decision_column"


def test_decision_not_binary():
    df = _df(
        [{"genre": "H", "decision": v} for v in ("oui", "non", "peut-etre")] * 3
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "decision_column"


def test_favorable_value_not_in_decision():
    df = _df([{"genre": "H", "decision": "0"}, {"genre": "F", "decision": "1"}] * 5)
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "favorable_value"


def test_single_group():
    df = _df(
        [{"genre": "H", "decision": "oui"}, {"genre": "H", "decision": "non"}] * 5
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "protected_attribute"


def test_group_too_small_raises():
    rec = (
        [{"genre": "H", "decision": "oui"}] * 100
        + [{"genre": "H", "decision": "non"}] * 100
        + [{"genre": "F", "decision": "oui"}] * 2
        + [{"genre": "F", "decision": "non"}] * 1
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(_df(rec), CFG)
    assert e.value.field == "protected_attribute"
    assert "n=3" in e.value.message


def test_privileged_value_absent():
    df = _df(
        [{"genre": "H", "decision": "oui"}, {"genre": "F", "decision": "non"}] * 5
    )
    cfg = M1Config(
        protected_attribute="genre",
        decision_column="decision",
        favorable_value="oui",
        privileged_value="Autre",
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, cfg)
    assert e.value.field == "privileged_value"


def test_empty_after_dropna_has_field_none():
    df = pd.DataFrame({"genre": [None, None], "decision": [None, None]})
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field is None
    assert "Aucune ligne exploitable" in e.value.message


def test_explicit_privileged_group_with_zero_selection_rate_raises():
    rec = (
        [{"genre": "Privilegie", "decision": "non"}] * 30
        + [{"genre": "Autre", "decision": "oui"}] * 20
        + [{"genre": "Autre", "decision": "non"}] * 20
    )
    cfg = M1Config(
        protected_attribute="genre",
        decision_column="decision",
        favorable_value="oui",
        privileged_value="Privilegie",
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(_df(rec), cfg)
    assert e.value.field == "privileged_value"
