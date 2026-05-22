import uuid

import pytest
from pydantic import ValidationError

from app.schemas.audit import AuditCreate, M1MetricsOut


def test_m1_accepts_optional_ground_truth():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", protected_attribute="genre",
        decision_column="embauche", favorable_value="oui",
        ground_truth_column="reel",
    )
    assert a.ground_truth_column == "reel"
    b = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", protected_attribute="genre",
        decision_column="embauche", favorable_value="oui",
    )
    assert b.ground_truth_column is None


def test_ground_truth_must_differ_and_is_m1_only():
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t",
            protected_attribute="g", decision_column="d",
            favorable_value="oui", ground_truth_column="d",  # == decision
        )
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t", module="M2",
            decision_column="d", favorable_value="oui",
            ground_truth_column="reel",  # not allowed for M2
        )


def test_m1_metrics_out_optional_truelabel_fields():
    m = M1MetricsOut(
        groups=[], reference_value="a", disparate_impact=1.0,
        demographic_parity_diff=0.0, worst_group="a", verdict="pass",
        risk_score=10, warnings=[],
    )
    assert m.equal_opportunity_diff is None
    assert m.equalized_odds_diff is None


def test_m1_accepts_optional_secondary_attribute():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", protected_attribute="genre",
        decision_column="embauche", favorable_value="oui",
        secondary_protected_attribute="origine",
        secondary_privileged_value="francaise",
    )
    assert a.secondary_protected_attribute == "origine"
    assert a.secondary_privileged_value == "francaise"


def test_secondary_attribute_must_differ_and_is_m1_only():
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t",
            protected_attribute="genre", decision_column="d",
            favorable_value="oui",
            secondary_protected_attribute="genre",  # == primary
        )
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t", module="M2",
            decision_column="d", favorable_value="oui",
            secondary_protected_attribute="origine",  # not allowed for M2
        )


def test_m1_metrics_out_optional_intersectional():
    m = M1MetricsOut(
        groups=[], reference_value="a", disparate_impact=1.0,
        demographic_parity_diff=0.0, worst_group="a", verdict="pass",
        risk_score=10, warnings=[],
    )
    assert m.intersectional is None
