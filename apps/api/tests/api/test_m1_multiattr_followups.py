"""Follow-ups from PR #60 review: IQR pre-check covers ALL protected
attributes (not just the first), and the interpretation disclaimer is
pluralised when several attributes are audited."""
import pandas as pd
import pytest

from app.audit_engine.types import GroupStat, M1Result, MarginalResult
from app.interpretation.m1 import interpret_m1
from app.services.audit_service import _run_iqr_multi

# ── Fix 1: IQR across all protected attributes ───────────────────────────────

def _df_two_attrs() -> pd.DataFrame:
    # attr "a" balanced (50/50) ; attr "b" has a tiny group "q" (n=2)
    return pd.DataFrame(
        {
            "a": ["x"] * 50 + ["y"] * 50,
            "b": ["p"] * 98 + ["q"] * 2,
            "d": ["oui", "non"] * 50,
        }
    )


def test_run_iqr_multi_flags_a_non_primary_attribute():
    warnings = _run_iqr_multi(_df_two_attrs(), ["a", "b"])
    # the imbalance is on the SECOND attribute "b" — it must be flagged
    assert any("[b]" in w and "q" in w for w in warnings)
    # every warning is prefixed with its attribute (multi-attribute audit)
    assert all(w.startswith("[a]") or w.startswith("[b]") for w in warnings)


def test_run_iqr_multi_single_attribute_keeps_legacy_text():
    df = pd.DataFrame({"a": ["x"] * 98 + ["y"] * 2, "d": ["oui", "non"] * 50})
    warnings = _run_iqr_multi(df, ["a"])
    assert warnings  # the tiny group "y" is flagged
    # single attribute → no "[attr]" prefix (backward compatible)
    assert all("[a]" not in w for w in warnings)


# ── Fix 2: pluralised disclaimer ─────────────────────────────────────────────

def _marginal(attr: str) -> MarginalResult:
    return MarginalResult(
        attribute=attr,
        groups=(GroupStat(attr + "1", 50, 25, 0.5, 1.0),),
        reference_value=attr + "1",
        disparate_impact=0.6,
        demographic_parity_diff=0.2,
        worst_group=attr + "2",
        verdict="fail",
        risk_score=60,
    )


def _result(*attrs: str) -> M1Result:
    marg = tuple(_marginal(a) for a in attrs)
    first = marg[0]
    return M1Result(
        groups=first.groups,
        reference_value=first.reference_value,
        disparate_impact=first.disparate_impact,
        demographic_parity_diff=first.demographic_parity_diff,
        worst_group=first.worst_group,
        verdict="fail",
        risk_score=60,
        marginals=marg,
    )


@pytest.mark.asyncio
async def test_disclaimer_plural_for_multiple_attributes():
    out = await interpret_m1(_result("sexe", "age"), provider=None)
    assert any("aux attributs protégés" in d for d in out.disclaimers)
    assert not any("à l'attribut protégé" in d for d in out.disclaimers)


@pytest.mark.asyncio
async def test_disclaimer_singular_for_one_attribute():
    out = await interpret_m1(_result("sexe"), provider=None)
    assert any("à l'attribut protégé" in d for d in out.disclaimers)
    assert not any("aux attributs protégés" in d for d in out.disclaimers)
