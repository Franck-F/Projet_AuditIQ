"""Bilingual FR/EN dataset analysis tests.

Covers normalisation helpers, token-based detection, semantic favorable value,
protected candidates ranking, reference group, and ground-truth detection.
"""
from __future__ import annotations

import pandas as pd

from app.audit_engine.dataset_analysis import (
    _name_is_decision,
    _name_is_protected,
    _normalize,
    _tokens,
    run_dataset_analysis,
)
from app.audit_engine.types import DatasetAnalysis, Suggestion

DATA = r"C:\Users\Franck\Documents\projet\auditiq\Data_test"


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
    df = pd.read_csv(rf"{DATA}\m1-recrutement-biais.csv")
    a = run_dataset_analysis(df)
    assert a.suggested_decision is not None
    assert a.suggested_decision.column == "embauche"
    assert a.suggested_protected is not None
    assert a.suggested_protected.column == "sexe"
