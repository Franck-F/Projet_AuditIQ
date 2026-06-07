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


def test_m1_metrics_out_has_marginals_and_pairwise():
    """M1MetricsOut exposes marginals/pairwise; intersectional is gone."""
    m = M1MetricsOut(
        groups=[], reference_value="a", disparate_impact=1.0,
        demographic_parity_diff=0.0, worst_group="a", verdict="pass",
        risk_score=10, warnings=[],
    )
    assert m.marginals == []
    assert m.pairwise == []
    assert not hasattr(m, "intersectional")


def test_m1_metrics_out_from_engine_maps_marginals_and_pairwise():
    """M1MetricsOut built from an M1Result with 2 marginals + 1 pair serializes both."""
    from typing import cast

    from app.audit_engine.types import (
        GroupStat,
        IntersectionalCell,
        IntersectionalResult,
        M1Result,
        MarginalResult,
    )
    from app.schemas.audit import GroupStatOut, IntersectionalOut, MarginalOut, Verdict

    g1 = GroupStat("H", 60, 40, 0.667, 1.0)
    g2 = GroupStat("F", 60, 24, 0.4, 0.6)
    g3 = GroupStat("j", 40, 30, 0.75, 1.0)
    g4 = GroupStat("v", 40, 20, 0.5, 0.667)

    mar_sexe = MarginalResult(
        attribute="sexe",
        groups=(g1, g2),
        reference_value="H",
        disparate_impact=0.6,
        demographic_parity_diff=0.267,
        worst_group="F",
        verdict="fail",
        risk_score=70,
    )
    mar_age = MarginalResult(
        attribute="age",
        groups=(g3, g4),
        reference_value="j",
        disparate_impact=0.667,
        demographic_parity_diff=0.25,
        worst_group="v",
        verdict="warn",
        risk_score=50,
    )
    pair = IntersectionalResult(
        cells=(IntersectionalCell("H", "j", 30, 25, 0.833, 1.0, "pass"),),
        reference_primary="H",
        reference_secondary="j",
        worst_primary="F",
        worst_secondary="v",
        disparate_impact=0.5,
        demographic_parity_diff=0.3,
        verdict="fail",
        risk_score=75,
        marginal_di=(0.6, 0.667),
        primary_attribute="sexe",
        secondary_attribute="age",
    )
    result = M1Result(
        groups=mar_sexe.groups,
        reference_value=mar_sexe.reference_value,
        disparate_impact=mar_sexe.disparate_impact,
        demographic_parity_diff=mar_sexe.demographic_parity_diff,
        worst_group=mar_sexe.worst_group,
        verdict="fail",
        risk_score=75,
        marginals=(mar_sexe, mar_age),
        pairwise=(pair,),
    )

    # Build M1MetricsOut using service-like adapter (manual for test)
    m_out = M1MetricsOut(
        groups=[GroupStatOut(value=g.value, n=g.n, favorable=g.favorable,
                             selection_rate=g.selection_rate,
                             disparate_impact=g.disparate_impact) for g in result.groups],
        reference_value=result.reference_value,
        disparate_impact=result.disparate_impact,
        demographic_parity_diff=result.demographic_parity_diff,
        worst_group=result.worst_group,
        verdict=cast(Verdict, result.verdict),
        risk_score=result.risk_score,
        warnings=[],
        marginals=[
            MarginalOut(
                attribute=m.attribute,
                groups=[GroupStatOut(value=g.value, n=g.n, favorable=g.favorable,
                                     selection_rate=g.selection_rate,
                                     disparate_impact=g.disparate_impact) for g in m.groups],
                reference_value=m.reference_value,
                disparate_impact=m.disparate_impact,
                demographic_parity_diff=m.demographic_parity_diff,
                worst_group=m.worst_group,
                verdict=cast(Verdict, m.verdict),
                risk_score=m.risk_score,
                warnings=list(m.warnings),
            )
            for m in result.marginals
        ],
        pairwise=[
            IntersectionalOut(
                cells=[],
                reference_primary=p.reference_primary,
                reference_secondary=p.reference_secondary,
                worst_primary=p.worst_primary,
                worst_secondary=p.worst_secondary,
                disparate_impact=p.disparate_impact,
                demographic_parity_diff=p.demographic_parity_diff,
                verdict=cast(Verdict, p.verdict),
                risk_score=p.risk_score,
                marginal_di=list(p.marginal_di),
                primary_attribute=p.primary_attribute,
                secondary_attribute=p.secondary_attribute,
            )
            for p in result.pairwise
        ],
    )

    assert len(m_out.marginals) == 2
    assert m_out.marginals[0].attribute == "sexe"
    assert m_out.marginals[1].attribute == "age"
    assert len(m_out.pairwise) == 1
    assert m_out.pairwise[0].primary_attribute == "sexe"
    assert m_out.pairwise[0].secondary_attribute == "age"
