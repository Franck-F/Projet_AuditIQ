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


def test_recommendation_out_priority_literal() -> None:
    from app.schemas.audit import RecommendationOut

    RecommendationOut(title="Action", detail="Détail.", priority="high")
    RecommendationOut(title="Action", detail="Détail.", priority="medium")
    RecommendationOut(title="Action", detail="Détail.", priority="low")
    with pytest.raises(ValidationError):
        RecommendationOut(title="Action", detail="Détail.", priority="weird")  # type: ignore[arg-type]


def test_recommendation_out_extra_forbid() -> None:
    from app.schemas.audit import RecommendationOut

    with pytest.raises(ValidationError):
        RecommendationOut.model_validate({
            "title": "Action",
            "detail": "Détail.",
            "priority": "high",
            "extra_field": "boom",
        })


def test_recommendation_out_title_detail_length_bounds() -> None:
    from app.schemas.audit import RecommendationOut

    with pytest.raises(ValidationError):
        RecommendationOut(title="", detail="Détail.", priority="high")
    with pytest.raises(ValidationError):
        RecommendationOut(title="Action", detail="", priority="high")
    with pytest.raises(ValidationError):
        RecommendationOut(title="A" * 201, detail="Détail.", priority="high")
    with pytest.raises(ValidationError):
        RecommendationOut(title="Action", detail="D" * 1001, priority="high")


def test_interpretation_out_default_recommendations_empty() -> None:
    from app.schemas.audit import InterpretationOut

    interp = InterpretationOut(
        narrative="x",
        ai_act_anchors=["a"],
        disclaimers=["d"],
        provider="fallback",
        model="deterministic",
    )
    assert interp.recommendations == []
