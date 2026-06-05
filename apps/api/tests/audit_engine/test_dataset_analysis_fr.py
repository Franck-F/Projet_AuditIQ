"""Bilingual FR/EN dataset analysis tests.

Covers normalisation helpers, token-based detection, semantic favorable value,
protected candidates ranking, reference group, and ground-truth detection.
"""
from __future__ import annotations

from app.audit_engine.types import DatasetAnalysis, Suggestion


def test_suggestion_carries_privileged_value():
    s = Suggestion(column="sexe", confidence=0.9, reason="r",
                   favorable_value="oui", privileged_value="H")
    assert s.privileged_value == "H"


def test_dataset_analysis_has_new_optional_fields():
    a = DatasetAnalysis(columns=(), suggested_decision=None,
                        suggested_protected=None)
    assert a.protected_candidates == ()
    assert a.suggested_ground_truth is None
