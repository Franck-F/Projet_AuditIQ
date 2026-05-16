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
    assert res.warnings == ()
    with pytest.raises(FrozenInstanceError):
        res.verdict = "pass"  # type: ignore[misc]
    assert isinstance(res.groups, tuple)
    with pytest.raises(AttributeError):
        res.groups.append(g)  # type: ignore[attr-defined]


def test_m2_types_are_frozen_and_coerce_sequences():
    from dataclasses import FrozenInstanceError

    from app.audit_engine.types import (
        ClusterStat,
        FeatureContribution,
        IqrReport,
        M2Config,
        M2Result,
    )

    cfg = M2Config(decision_column="y", positive_value="1", feature_columns=["a", "b"])
    assert cfg.feature_columns == ("a", "b")
    assert cfg.k == 5
    assert cfg.deviation_pp == 20.0
    assert cfg.chi2_alpha == 0.05
    assert cfg.random_state == 42

    fc = FeatureContribution(name="age", std_diff=1.23, direction="above")
    cs = ClusterStat(
        id=0, n=10, positive_rate=0.2, deviation_pp=-30.0,
        is_deviant=True, top_features=[fc],
    )
    assert cs.top_features == (fc,)

    res = M2Result(
        n=100, k=5, global_positive_rate=0.5, chi2=12.0, p_value=0.001, dof=4,
        clusters=[cs], deviant_cluster_ids=[0], verdict="fail", risk_score=80,
        warnings=["w"],
    )
    assert res.clusters == (cs,)
    assert res.deviant_cluster_ids == (0,)
    assert res.warnings == ("w",)
    with pytest.raises(FrozenInstanceError):
        res.verdict = "pass"  # type: ignore[misc]

    rep = IqrReport(warnings=["x"])
    assert rep.warnings == ("x",)
