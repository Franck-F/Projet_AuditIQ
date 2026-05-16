import uuid

import pytest
from pydantic import ValidationError

from app.schemas.audit import AuditCreate, GroupStatOut, M1MetricsOut


def test_audit_create_rejects_extra_fields():
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(),
            title="T",
            protected_attribute="genre",
            decision_column="decision",
            favorable_value="oui",
            surprise="x",
        )


def test_m1_metrics_out_shape():
    m = M1MetricsOut(
        groups=[GroupStatOut(value="F", n=10, favorable=4, selection_rate=0.4,
                             disparate_impact=0.8)],
        reference_value="H",
        disparate_impact=0.8,
        demographic_parity_diff=0.1,
        worst_group="F",
        verdict="warn",
        risk_score=35,
        warnings=[],
    )
    assert m.verdict == "warn"
    with pytest.raises(ValidationError):
        M1MetricsOut(
            groups=[], reference_value="H", disparate_impact=1.0,
            demographic_parity_diff=0.0, worst_group="H", verdict="nope",
            risk_score=0, warnings=[],
        )
