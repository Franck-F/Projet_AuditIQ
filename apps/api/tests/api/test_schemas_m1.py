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


def test_m1_rejects_secondary_combined_with_protected_attributes_list():
    """Combining secondary_protected_attribute with protected_attributes must be rejected."""
    with pytest.raises(ValidationError, match="secondary_protected_attribute"):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t",
            protected_attributes=["genre", "origine"],
            secondary_protected_attribute="nationalite",  # not in the list → rejected
            decision_column="embauche",
            favorable_value="oui",
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


def test_m1_metrics_out_serializes_marginals_and_pairwise():
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


def test_groupstatout_has_fnr_accuracy_precision_fields():
    """GroupStatOut must accept fnr/accuracy/precision (all optional)."""
    from app.schemas.audit import GroupStatOut

    g = GroupStatOut(value="F", n=100, favorable=30,
                     selection_rate=0.3, disparate_impact=0.6,
                     fnr=0.2, accuracy=0.75, precision=0.8)
    assert g.fnr == 0.2
    assert g.accuracy == 0.75
    assert g.precision == 0.8

    g_no_gt = GroupStatOut(value="H", n=100, favorable=50,
                           selection_rate=0.5, disparate_impact=1.0)
    assert g_no_gt.fnr is None
    assert g_no_gt.accuracy is None
    assert g_no_gt.precision is None


def test_marginalout_has_ratio_fields():
    """MarginalOut must accept the 3 ratio fields (with safe defaults)."""
    from app.schemas.audit import GroupStatOut, MarginalOut

    m = MarginalOut(
        attribute="sexe",
        groups=[GroupStatOut(value="F", n=60, favorable=20,
                             selection_rate=0.333, disparate_impact=0.5)],
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.3,
        worst_group="F",
        verdict="fail",
        risk_score=70,
        demographic_parity_ratio=0.5,
        equal_opportunity_ratio=0.6,
        equalized_odds_ratio=0.55,
    )
    assert m.demographic_parity_ratio == 0.5
    assert m.equal_opportunity_ratio == 0.6
    assert m.equalized_odds_ratio == 0.55

    m_default = MarginalOut(
        attribute="age",
        groups=[],
        reference_value="j",
        disparate_impact=1.0,
        demographic_parity_diff=0.0,
        worst_group="j",
        verdict="pass",
        risk_score=0,
    )
    assert m_default.demographic_parity_ratio == 1.0
    assert m_default.equal_opportunity_ratio is None
    assert m_default.equalized_odds_ratio is None


def test_intersectionalout_has_ratio_fields():
    """IntersectionalOut must accept the 3 ratio fields (with safe defaults)."""
    from app.schemas.audit import IntersectionalOut

    ix = IntersectionalOut(
        cells=[],
        reference_primary="H",
        reference_secondary="j",
        worst_primary="F",
        worst_secondary="v",
        disparate_impact=0.4,
        demographic_parity_diff=0.3,
        verdict="fail",
        risk_score=75,
        marginal_di=[0.6, 0.667],
        demographic_parity_ratio=0.4,
        equal_opportunity_ratio=0.5,
        equalized_odds_ratio=0.45,
    )
    assert ix.demographic_parity_ratio == 0.4
    assert ix.equal_opportunity_ratio == 0.5
    assert ix.equalized_odds_ratio == 0.45


def test_to_metrics_out_maps_ratios_and_per_group_rates():
    """_to_metrics_out must propagate the new ratio and per-group rate fields."""

    from app.audit_engine.types import (
        GroupStat,
        IntersectionalCell,
        IntersectionalResult,
        M1Result,
        MarginalResult,
    )
    from app.services.audit_service import _to_metrics_out

    g1 = GroupStat("H", 100, 80, 0.8, 1.0, tpr=0.85, fpr=0.1,
                   fnr=0.15, accuracy=0.82, precision=0.88)
    g2 = GroupStat("F", 100, 40, 0.4, 0.5, tpr=0.5, fpr=0.3,
                   fnr=0.5, accuracy=0.6, precision=0.7)

    mar = MarginalResult(
        attribute="sexe",
        groups=(g1, g2),
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.4,
        worst_group="F",
        verdict="fail",
        risk_score=75,
        demographic_parity_ratio=0.5,
        equal_opportunity_ratio=0.588,
        equalized_odds_ratio=0.333,
    )
    ix = IntersectionalResult(
        cells=(IntersectionalCell("H", "j", 30, 25, 0.833, 1.0, "pass"),),
        reference_primary="H",
        reference_secondary="j",
        worst_primary="F",
        worst_secondary="v",
        disparate_impact=0.4,
        demographic_parity_diff=0.3,
        verdict="fail",
        risk_score=75,
        marginal_di=(0.5, 0.667),
        demographic_parity_ratio=0.4,
        equal_opportunity_ratio=0.5,
        equalized_odds_ratio=0.45,
    )
    result = M1Result(
        groups=(g1, g2),
        reference_value="H",
        disparate_impact=0.5,
        demographic_parity_diff=0.4,
        worst_group="F",
        verdict="fail",
        risk_score=75,
        marginals=(mar,),
        pairwise=(ix,),
    )

    out = _to_metrics_out(result)

    # Per-group rates in top-level groups
    h_group = next(g for g in out.groups if g.value == "H")
    assert h_group.fnr == 0.15
    assert h_group.accuracy == 0.82
    assert h_group.precision == 0.88

    f_group = next(g for g in out.groups if g.value == "F")
    assert f_group.fnr == 0.5
    assert f_group.accuracy == 0.6
    assert f_group.precision == 0.7

    # Ratio fields in MarginalOut
    marg_out = out.marginals[0]
    assert marg_out.demographic_parity_ratio == 0.5
    assert marg_out.equal_opportunity_ratio == 0.588
    assert marg_out.equalized_odds_ratio == 0.333

    # Per-group rates in marginal groups
    marg_h = next(g for g in marg_out.groups if g.value == "H")
    assert marg_h.fnr == 0.15
    assert marg_h.accuracy == 0.82
    assert marg_h.precision == 0.88

    # Ratio fields in IntersectionalOut
    ix_out = out.pairwise[0]
    assert ix_out.demographic_parity_ratio == 0.4
    assert ix_out.equal_opportunity_ratio == 0.5
    assert ix_out.equalized_odds_ratio == 0.45
