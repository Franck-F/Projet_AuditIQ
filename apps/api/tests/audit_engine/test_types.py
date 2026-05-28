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


def test_m3_types_are_frozen_and_coerce_sequences():
    from dataclasses import FrozenInstanceError

    from app.audit_engine.types import (
        CategoryStat,
        DivergentExample,
        M3Config,
        M3Responses,
        M3Result,
        PromptPair,
        PromptVariant,
        ResponseRecord,
    )

    cfg = M3Config()
    assert cfg.lang == "fr"
    assert cfg.score_warn == 0.34
    assert cfg.score_fail == 0.67

    pv = PromptVariant(attribute_label="masculin", fr="Décris un ingénieur.",
                        en="Describe an engineer.")
    pair = PromptPair(id="job-1", category="genre", variants=[pv])
    assert pair.variants == (pv,)

    rr = ResponseRecord(pair_id="job-1", category="genre",
                        variant_label="masculin", text="Réponse.", failed=False)
    resp = M3Responses(records=[rr])
    assert resp.records == (rr,)

    cs = CategoryStat(name="genre", length_gap=0.1, sentiment_gap=0.2,
                      refusal_rate=0.0, score=0.15, verdict="pass")
    ex = DivergentExample(category="genre", prompt_id="job-1",
                          variant_a="masculin", variant_b="féminin",
                          excerpt_a="...", excerpt_b="...", reason="longueur")
    res = M3Result(categories=[cs], global_score=0.15, verdict="pass",
                   risk_score=15, divergent_examples=[ex], n_pairs=1,
                   n_calls_failed=0, warnings=["w"])
    assert res.categories == (cs,)
    assert res.divergent_examples == (ex,)
    assert res.warnings == ("w",)
    with pytest.raises(FrozenInstanceError):
        res.verdict = "fail"  # type: ignore[misc]


def test_m1config_ground_truth_optional_default_none():
    from app.audit_engine.types import M1Config

    c = M1Config(protected_attribute="g", decision_column="d",
                 favorable_value="oui")
    assert c.ground_truth_column is None
    c2 = M1Config(protected_attribute="g", decision_column="d",
                  favorable_value="oui", ground_truth_column="reel")
    assert c2.ground_truth_column == "reel"


def test_m1result_truelabel_fields_default_none():
    from app.audit_engine.types import GroupStat, M1Result

    gs = GroupStat(value="a", n=10, favorable=4, selection_rate=0.4,
                   disparate_impact=1.0)
    assert gs.tpr is None and gs.fpr is None
    r = M1Result(groups=(gs,), reference_value="a", disparate_impact=1.0,
                 demographic_parity_diff=0.0, worst_group="a",
                 verdict="pass", risk_score=10)
    assert r.equal_opportunity_diff is None
    assert r.equalized_odds_diff is None
    assert r.demographic_parity_verdict is None
    assert r.equal_opportunity_verdict is None
    assert r.equalized_odds_verdict is None
    assert r.truelabel_reason is None


def test_m1config_secondary_attribute_optional_default_none():
    from app.audit_engine.types import M1Config

    c = M1Config(protected_attribute="g", decision_column="d",
                 favorable_value="oui")
    assert c.secondary_protected_attribute is None
    assert c.secondary_privileged_value is None
    c2 = M1Config(protected_attribute="g", decision_column="d",
                  favorable_value="oui", secondary_protected_attribute="o",
                  secondary_privileged_value="fr")
    assert c2.secondary_protected_attribute == "o"
    assert c2.secondary_privileged_value == "fr"


def test_intersectional_dataclasses():
    from app.audit_engine.types import (
        IntersectionalCell,
        IntersectionalResult,
        M1Result,
    )

    cell = IntersectionalCell(
        primary_value="femme", secondary_value="etrangere", n=20,
        favorable=4, selection_rate=0.2, disparate_impact=0.4,
        verdict="fail",
    )
    assert cell.tpr is None and cell.fpr is None
    r = IntersectionalResult(
        cells=(cell,), reference_primary="homme",
        reference_secondary="francaise", worst_primary="femme",
        worst_secondary="etrangere", disparate_impact=0.4,
        demographic_parity_diff=0.3, verdict="fail", risk_score=70,
        marginal_di=(0.85, 0.88),
    )
    assert r.equal_opportunity_diff is None
    assert r.equalized_odds_diff is None
    assert r.demographic_parity_verdict is None
    assert r.equal_opportunity_verdict is None
    assert r.equalized_odds_verdict is None
    assert r.warnings == ()
    assert r.reason is None
    res = M1Result(
        groups=(), reference_value="a", disparate_impact=1.0,
        demographic_parity_diff=0.0, worst_group="a", verdict="pass",
        risk_score=10,
    )
    assert res.intersectional is None


def test_column_profile_is_frozen() -> None:
    from app.audit_engine.types import ColumnProfile

    p = ColumnProfile(
        name="age",
        dtype="numeric",
        unique_count=5,
        null_ratio=0.0,
        top_values=(),
        role_hint="protected",
    )
    with pytest.raises(FrozenInstanceError):
        p.name = "x"  # type: ignore[misc]


def test_suggestion_optional_favorable_value() -> None:
    from app.audit_engine.types import Suggestion

    s = Suggestion(column="approved", confidence=0.85, reason="Nom évocateur")
    assert s.favorable_value is None
    s2 = Suggestion(
        column="approved", confidence=0.85, reason="Nom évocateur", favorable_value="1"
    )
    assert s2.favorable_value == "1"


def test_dataset_analysis_holds_optional_suggestions() -> None:
    from app.audit_engine.types import DatasetAnalysis

    a = DatasetAnalysis(columns=(), suggested_decision=None, suggested_protected=None)
    assert a.suggested_decision is None
    assert a.suggested_protected is None


def test_column_profile_top_values_coerced_to_tuple() -> None:
    from app.audit_engine.types import ColumnProfile

    p = ColumnProfile(
        name="x",
        dtype="categorical",
        unique_count=2,
        null_ratio=0.0,
        top_values=[("a", 3), ("b", 2)],  # passed as list
        role_hint="feature",
    )
    assert isinstance(p.top_values, tuple)
    assert p.top_values == (("a", 3), ("b", 2))
