"""Bilingual FR/EN dataset analysis tests.

Covers normalisation helpers, token-based detection, semantic favorable value,
protected candidates ranking, reference group, and ground-truth detection.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.audit_engine.dataset_analysis import (
    _favorable_value,
    _name_is_decision,
    _name_is_protected,
    _normalize,
    _tokens,
    run_dataset_analysis,
)
from app.audit_engine.types import DatasetAnalysis, Suggestion

_FIXTURES = Path(__file__).parent / "fixtures"


def test_suggestion_carries_privileged_value():
    s = Suggestion(column="sexe", confidence=0.9, reason="r",
                   favorable_value="oui", privileged_value="H")
    assert s.privileged_value == "H"


def test_dataset_analysis_has_new_optional_fields():
    a = DatasetAnalysis(columns=(), suggested_decision=None,
                        suggested_protected=None)
    assert a.protected_candidates == ()
    assert a.suggested_ground_truth is None


def test_normalize_strips_accents_and_case():
    assert _normalize("ÂGE") == "age"
    assert _normalize("Accordé") == "accorde"


def test_tokens_split_on_non_alnum():
    assert _tokens("experience_ans") == {"experience", "ans"}
    # 'experience_ans' must NOT be treated as the protected attribute 'age'
    assert _name_is_protected("experience_ans") is False


def test_name_detection_french():
    assert _name_is_decision("embauche") is True
    assert _name_is_decision("accorde") is True
    assert _name_is_protected("sexe") is True   # 'sexe' != 'sex' regression
    assert _name_is_protected("origine") is True


def test_recruitment_dataset_detects_decision_and_protected():
    df = pd.read_csv(_FIXTURES / "m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_decision is not None
    assert a.suggested_decision.column == "embauche"
    assert a.suggested_protected is not None
    assert a.suggested_protected.column == "sexe"


def test_favorable_value_semantic_majority_positive():
    # majority is 'accepté' (favorable) — must NOT pick the minority class
    df = pd.DataFrame({"embauche": ["accepté"] * 7 + ["refusé"] * 3})
    assert _favorable_value(df, "embauche") == "accepté"


def test_favorable_value_fallback_minority_when_no_positive_token():
    df = pd.DataFrame({"d": ["X"] * 8 + ["Y"] * 2})
    assert _favorable_value(df, "d") == "Y"  # minority fallback


def test_recruitment_favorable_is_oui():
    df = pd.read_csv(_FIXTURES / "m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_decision.favorable_value == "oui"


def test_protected_candidates_ranked_and_top_matches_suggested():
    df = pd.read_csv(_FIXTURES / "m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert len(a.protected_candidates) >= 1
    # 'sexe' (name-evocative) is present and ranked first
    assert a.protected_candidates[0].column == "sexe"
    assert a.suggested_protected.column == a.protected_candidates[0].column
    # ranked by descending confidence
    confs = [c.confidence for c in a.protected_candidates]
    assert confs == sorted(confs, reverse=True)


def test_reference_group_is_highest_favorable_rate():
    df = pd.read_csv(_FIXTURES / "m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    # H is hired ~80% vs F ~28% -> reference (privileged) = H
    assert a.suggested_protected.privileged_value == "H"


def test_ground_truth_detected_on_truelabel_dataset():
    df = pd.read_csv(_FIXTURES / "m1-truelabel-eo.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_ground_truth is not None
    assert a.suggested_ground_truth.column == "actually_qualified"


def test_no_ground_truth_when_absent():
    df = pd.read_csv(_FIXTURES / "m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_ground_truth is None


def test_credit_dataset_detects_accorde_and_sexe():
    df = pd.read_csv(_FIXTURES / "m1-credit-equitable.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_decision is not None
    assert a.suggested_decision.column == "accorde"
    assert a.suggested_protected is not None
    assert a.suggested_protected.column == "sexe"
