"""Tests for M1 multi-protected-attribute engine (Tasks 1-4)."""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from app.audit_engine.types import (
    GroupStat, IntersectionalResult, M1Config, M1Result, MarginalResult,
)


# ---------------------------------------------------------------------------
# Task 1: Engine types
# ---------------------------------------------------------------------------

def test_m1config_protected_attributes_default():
    c = M1Config(protected_attribute="sexe", decision_column="d",
                 favorable_value="oui")
    assert c.protected_attributes == ()


def test_marginal_result_holds_attribute():
    m = MarginalResult(
        attribute="sexe",
        groups=(GroupStat("H", 10, 8, 0.8, 1.0),),
        reference_value="H", disparate_impact=0.5,
        demographic_parity_diff=0.3, worst_group="F",
        verdict="fail", risk_score=70,
    )
    assert m.attribute == "sexe" and m.verdict == "fail"


def test_intersectional_carries_attribute_names():
    r = IntersectionalResult(
        cells=(), reference_primary="", reference_secondary="",
        worst_primary="", worst_secondary="", disparate_impact=1.0,
        demographic_parity_diff=0.0, verdict="warn", risk_score=0,
        marginal_di=(1.0, 1.0), primary_attribute="sexe",
        secondary_attribute="age",
    )
    assert (r.primary_attribute, r.secondary_attribute) == ("sexe", "age")


def test_m1result_has_marginals_and_pairwise():
    r = M1Result(
        groups=(), reference_value="H", disparate_impact=0.5,
        demographic_parity_diff=0.3, worst_group="F", verdict="fail",
        risk_score=70,
    )
    assert r.marginals == () and r.pairwise == ()
