from dataclasses import FrozenInstanceError

import pytest

from app.audit_engine.errors import AuditEngineError, DatasetValidationError
from app.audit_engine.types import GroupStat, M1Config, M1Result


def test_dataset_validation_error_carries_field():
    err = DatasetValidationError("colonne absente", field="protected_attribute")
    assert isinstance(err, AuditEngineError)
    assert err.message == "colonne absente"
    assert err.field == "protected_attribute"


def test_m1config_defaults_follow_4_5_rule():
    cfg = M1Config(
        protected_attribute="genre",
        decision_column="decision",
        favorable_value="oui",
    )
    assert cfg.privileged_value is None
    assert cfg.di_fail_below == 0.80
    assert cfg.di_warn_below == 0.90
    assert cfg.min_group_error == 5
    assert cfg.min_group_warn == 30


def test_dataset_validation_error_field_defaults_to_none():
    err = DatasetValidationError("message simple")
    assert err.message == "message simple"
    assert err.field is None


def test_result_is_frozen_and_defaults_warnings():
    g = GroupStat(value="Femmes", n=200, favorable=72, selection_rate=0.36,
                  disparate_impact=0.72)
    res = M1Result(
        groups=[g], reference_value="Hommes", disparate_impact=0.72,
        demographic_parity_diff=0.14, worst_group="Femmes", verdict="fail",
        risk_score=55,
    )
    assert res.warnings == []
    with pytest.raises(FrozenInstanceError):
        res.verdict = "pass"  # type: ignore[misc]
