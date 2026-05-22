import datetime
import uuid

from app.schemas.audit import AuditOut


def test_audit_out_error_defaults_none_and_accepts_str():
    base = {
        "id": uuid.uuid4(), "code": "AUD-2026-001", "title": "t",
        "status": "pending", "module": "M1", "dataset_id": uuid.uuid4(),
        "protected_attribute": None, "decision_column": None,
        "favorable_value": None, "privileged_value": None,
        "created_at": datetime.datetime.now(tz=datetime.timezone.utc),
        "completed_at": None, "metrics": None, "interpretation": None,
        "pre_check": [],
    }
    a = AuditOut(**base)
    assert a.error is None
    b = AuditOut(**{**base, "status": "failed", "error": "boom"})
    assert b.error == "boom"
