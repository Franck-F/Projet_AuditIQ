import uuid

import pytest
from pydantic import ValidationError

from app.schemas.audit import AuditCreate, M3MetricsOut


def test_m3_create_requires_target_forbids_dataset_fields():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", module="M3",
        target={"url": "https://x/y", "method": "POST", "headers": {},
                "body_template": '{"p":"{prompt}"}',
                "response_path": "a.b"},
        lang="fr",
    )
    assert a.module == "M3"
    assert a.target is not None and a.target.response_path == "a.b"
    with pytest.raises(ValidationError):
        AuditCreate(dataset_id=uuid.uuid4(), title="t", module="M3")  # no target
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t", module="M3",
            decision_column="d",  # not allowed for M3
            target={"url": "https://x", "method": "POST", "headers": {},
                    "body_template": "{prompt}", "response_path": "a"},
        )


def test_m3_metrics_out_shape():
    m = M3MetricsOut(
        categories=[{"name": "genre", "length_gap": 0.1,
                     "sentiment_gap": 0.2, "refusal_rate": 0.0,
                     "score": 0.15, "verdict": "pass"}],
        global_score=0.15, verdict="pass", risk_score=15,
        divergent_examples=[{"category": "genre", "prompt_id": "g1",
                             "variant_a": "m", "variant_b": "f",
                             "excerpt_a": "x", "excerpt_b": "y",
                             "reason": "longueur"}],
        n_pairs=1, n_calls_failed=0, warnings=[],
    )
    assert m.categories[0].name == "genre"
