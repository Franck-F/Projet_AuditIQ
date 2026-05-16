import uuid

import pytest
from pydantic import ValidationError

from app.schemas.audit import AuditCreate, M2MetricsOut


def test_m1_create_defaults_module_and_requires_protected_attribute():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t",
        protected_attribute="genre", decision_column="d", favorable_value="oui",
    )
    assert a.module == "M1"
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t",
            decision_column="d", favorable_value="oui",
        )


def test_m2_create_requires_decision_and_forbids_protected_attribute():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", module="M2",
        decision_column="embauche", favorable_value="oui",
        config={"k": 4, "deviation_pp": 25.0},
    )
    assert a.module == "M2"
    assert a.protected_attribute is None
    assert a.config is not None and a.config.k == 4
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t", module="M2",
            protected_attribute="genre",
            decision_column="d", favorable_value="oui",
        )


def test_m2_metrics_out_shape():
    m = M2MetricsOut(
        n=100, k=2, global_positive_rate=0.5, chi2=12.0, p_value=0.001, dof=1,
        clusters=[{"id": 0, "n": 50, "positive_rate": 0.2,
                   "deviation_pp": -30.0, "is_deviant": True,
                   "top_features": [{"name": "age", "std_diff": 1.2,
                                     "direction": "above"}]}],
        deviant_cluster_ids=[0], verdict="fail", risk_score=80, warnings=[],
    )
    assert m.clusters[0].top_features[0].name == "age"
