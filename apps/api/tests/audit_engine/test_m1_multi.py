"""Tests for M1 multi-protected-attribute engine (Tasks 1-4)."""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from app.audit_engine.errors import DatasetValidationError
from app.audit_engine.intersectional import run_intersectional_pair
from app.audit_engine.m1_supervised import _marginal_audit, run_m1
from app.audit_engine.metrics import VERDICT_ORDER
from app.audit_engine.types import (
    GroupStat,
    IntersectionalResult,
    M1Config,
    M1Result,
    MarginalResult,
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


# ---------------------------------------------------------------------------
# Task 2: run_intersectional_pair
# ---------------------------------------------------------------------------

def _df():
    return pd.DataFrame({
        "sexe": ["H"] * 30 + ["F"] * 30,
        "age": (["j"] * 15 + ["v"] * 15) * 2,
        "d": (["oui"] * 24 + ["non"] * 6) + (["oui"] * 9 + ["non"] * 21),
    })


def test_run_intersectional_pair_labels_attributes():
    cfg = M1Config(protected_attribute="sexe", decision_column="d",
                   favorable_value="oui")
    r = run_intersectional_pair(_df(), cfg, "sexe", "age")
    assert r.primary_attribute == "sexe"
    assert r.secondary_attribute == "age"
    assert len(r.cells) >= 2


# ---------------------------------------------------------------------------
# Task 3: _marginal_audit
# ---------------------------------------------------------------------------

def test_marginal_audit_matches_single_run_m1():
    df = pd.read_csv(
        Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv"
    )
    cfg = M1Config(protected_attribute="sexe", decision_column="embauche",
                   favorable_value="oui", privileged_value="H")
    single = run_m1(df, cfg)                     # current top-level == this attr
    m = _marginal_audit(df, cfg, "sexe", is_primary=True)
    assert m.attribute == "sexe"
    assert m.disparate_impact == single.disparate_impact
    assert m.demographic_parity_diff == single.demographic_parity_diff
    assert m.verdict == single.verdict
    assert m.reference_value == single.reference_value


# ---------------------------------------------------------------------------
# Task 4: run_m1 orchestrates N attributes
# ---------------------------------------------------------------------------

def _attrs_cfg(attrs, **kw):
    return M1Config(protected_attribute=attrs[0], decision_column="embauche",
                    favorable_value="oui", protected_attributes=tuple(attrs),
                    **kw)


def test_run_m1_two_attributes_marginals_and_pairs():
    df = pd.read_csv(Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv")
    # use the two real categoricals available in the fixture
    cfg = _attrs_cfg(["sexe", "diplome"])
    r = run_m1(df, cfg)
    assert [m.attribute for m in r.marginals] == ["sexe", "diplome"]
    assert len(r.pairwise) == 1  # C(2,2)=1 pair
    assert r.pairwise[0].primary_attribute == "sexe"
    assert r.pairwise[0].secondary_attribute == "diplome"


def test_run_m1_three_attributes_produces_three_pairs():
    """Synthetic 3-attribute dataset: 3 marginals + C(3,2)=3 pairs.
    Each (a×x×p) combination gets 15 rows — well above min_group_error."""
    rows = []
    for a in ("a", "b"):
        for x in ("x", "y"):
            for p in ("p", "q"):
                for decision in (["oui"] * 10 + ["non"] * 5):
                    rows.append({"col_a": a, "col_x": x, "col_p": p, "decision": decision})
    df = pd.DataFrame(rows)
    cfg = M1Config(
        protected_attribute="col_a",
        decision_column="decision",
        favorable_value="oui",
        protected_attributes=("col_a", "col_x", "col_p"),
    )
    r = run_m1(df, cfg)
    assert len(r.marginals) == 3
    assert [m.attribute for m in r.marginals] == ["col_a", "col_x", "col_p"]
    assert len(r.pairwise) == 3  # C(3,2)
    pair_labels = {
        (p.primary_attribute, p.secondary_attribute) for p in r.pairwise
    }
    assert pair_labels == {
        ("col_a", "col_x"),
        ("col_a", "col_p"),
        ("col_x", "col_p"),
    }


def test_run_m1_aggregate_verdict_is_worst():
    df = pd.read_csv(Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv")
    r = run_m1(df, _attrs_cfg(["sexe", "diplome"]))
    worst = max(
        [VERDICT_ORDER[m.verdict] for m in r.marginals]
        + [VERDICT_ORDER[p.verdict] for p in r.pairwise]
    )
    assert VERDICT_ORDER[r.verdict] == worst
    assert r.risk_score == max(
        [m.risk_score for m in r.marginals] + [p.risk_score for p in r.pairwise]
    )


def test_run_m1_single_attribute_backward_compatible():
    df = pd.read_csv(Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv")
    cfg = M1Config(protected_attribute="sexe", decision_column="embauche",
                   favorable_value="oui", privileged_value="H")
    r = run_m1(df, cfg)
    assert len(r.marginals) == 1 and r.pairwise == ()
    # top-level == the single marginal (unchanged behaviour)
    assert r.disparate_impact == r.marginals[0].disparate_impact
    assert r.verdict == r.marginals[0].verdict
    assert tuple(g.value for g in r.groups) == tuple(
        g.value for g in r.marginals[0].groups
    )


def test_run_m1_rejects_more_than_four_attributes():
    """Synthetic DataFrame with all 5 protected columns present so the cap,
    not a missing-column error, is what triggers DatasetValidationError."""
    df = pd.DataFrame({
        "a": ["x", "y"] * 20,
        "b": ["p", "q"] * 20,
        "c": ["r", "s"] * 20,
        "d": ["t", "u"] * 20,
        "e": ["v", "w"] * 20,
        "decision": ["oui", "non"] * 20,
    })
    cfg = M1Config(
        protected_attribute="a",
        decision_column="decision",
        favorable_value="oui",
        protected_attributes=("a", "b", "c", "d", "e"),
    )
    with pytest.raises(DatasetValidationError):
        run_m1(df, cfg)
