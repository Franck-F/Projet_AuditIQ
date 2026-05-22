import pandas as pd

from app.audit_engine.intersectional import run_intersectional
from app.audit_engine.types import M1Config


def _cfg(**kw):
    base = {"protected_attribute": "genre", "decision_column": "d",
            "favorable_value": "oui", "secondary_protected_attribute": "orig"}
    base.update(kw)
    return M1Config(**base)


def test_crossed_cells_and_worst_cell():
    # homme×fr high rate ; femme×etr low rate
    df = pd.DataFrame({
        "genre": ["h"] * 40 + ["f"] * 40,
        "orig": (["fr"] * 20 + ["etr"] * 20) + (["fr"] * 20 + ["etr"] * 20),
        "d": (["oui"] * 18 + ["non"] * 2 + ["oui"] * 14 + ["non"] * 6)
        + (["oui"] * 12 + ["non"] * 8 + ["oui"] * 4 + ["non"] * 16),
    })
    r = run_intersectional(df, _cfg(privileged_value="h",
                                    secondary_privileged_value="fr"))
    assert len(r.cells) == 4
    assert (r.reference_primary, r.reference_secondary) == ("h", "fr")
    # worst = femme×etr (lowest rate)
    assert (r.worst_primary, r.worst_secondary) == ("f", "etr")
    assert r.disparate_impact == min(c.disparate_impact for c in r.cells)
    assert r.verdict in ("pass", "warn", "fail")
    assert len(r.marginal_di) == 2
    assert r.reason is None


def test_reference_falls_back_to_max_rate_cell_when_no_privileged():
    df = pd.DataFrame({
        "genre": ["h"] * 40 + ["f"] * 40,
        "orig": (["fr"] * 20 + ["etr"] * 20) * 2,
        "d": (["oui"] * 19 + ["non"] + ["oui"] * 10 + ["non"] * 10)
        + (["oui"] * 10 + ["non"] * 10 + ["oui"] * 5 + ["non"] * 15),
    })
    r = run_intersectional(df, _cfg())  # no privileged values
    # reference = the max-selection-rate cell (h×fr here)
    assert (r.reference_primary, r.reference_secondary) == ("h", "fr")


def test_sparse_cell_excluded_with_warning_never_raises():
    # f×etr has only n=3 -> below min_group_error (5) -> excluded + warning
    df = pd.DataFrame({
        "genre": ["h"] * 40 + ["f"] * 23,
        "orig": (["fr"] * 20 + ["etr"] * 20) + (["fr"] * 20 + ["etr"] * 3),
        "d": (["oui"] * 15 + ["non"] * 5) * 2 + (["oui"] * 10 + ["non"] * 10)
        + ["oui", "non", "oui"],
    })
    r = run_intersectional(df, _cfg())
    assert any("etr" in w for w in r.warnings)
    assert all(not (c.primary_value == "f" and c.secondary_value == "etr")
               for c in r.cells)


def test_fewer_than_two_usable_cells_sets_reason():
    # almost everything sparse -> <2 usable cells
    df = pd.DataFrame({
        "genre": ["h"] * 30 + ["f"] * 8,
        "orig": (["fr"] * 28 + ["etr"] * 2) + (["fr"] * 4 + ["etr"] * 4),
        "d": (["oui"] * 20 + ["non"] * 10)
        + ["oui", "non", "oui", "non"] * 2,
    })
    r = run_intersectional(df, _cfg())
    assert r.reason is not None
    # never raised


def test_equal_opportunity_per_cell_when_ground_truth():
    df = pd.DataFrame({
        "genre": ["h"] * 40 + ["f"] * 40,
        "orig": (["fr"] * 20 + ["etr"] * 20) * 2,
        "d": (["oui"] * 12 + ["non"] * 8) * 4,
        "reel": (["oui"] * 10 + ["non"] * 10) * 4,
    })
    r = run_intersectional(df, _cfg(ground_truth_column="reel"))
    assert r.equal_opportunity_diff is not None
    assert r.equalized_odds_diff is not None
    assert any(c.tpr is not None for c in r.cells)
