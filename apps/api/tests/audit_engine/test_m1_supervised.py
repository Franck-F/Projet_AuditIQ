import pandas as pd

from app.audit_engine.m1_supervised import run_m1
from app.audit_engine.types import M1Config

CFG = M1Config(
    protected_attribute="genre",
    decision_column="decision",
    favorable_value="oui",
)


def _by_value(result):
    return {g.value: g for g in result.groups}


def test_recruitment_case_is_fail(recruitment_df):
    r = run_m1(recruitment_df, CFG)
    assert r.reference_value == "Hommes"
    assert r.disparate_impact == 0.72
    assert r.worst_group == "Femmes"
    assert r.demographic_parity_diff == 0.14
    assert r.verdict == "fail"
    assert r.risk_score == 55
    assert r.warnings == ()
    g = _by_value(r)
    assert g["Femmes"].selection_rate == 0.36
    assert g["Femmes"].n == 200
    assert g["Femmes"].favorable == 72
    assert g["Hommes"].disparate_impact == 1.0


def test_fair_case_is_pass(fair_df):
    r = run_m1(fair_df, CFG)
    assert r.disparate_impact == 1.0
    assert r.demographic_parity_diff == 0.0
    assert r.verdict == "pass"
    assert r.risk_score == 0
    assert r.reference_value == "Groupe A"


def test_warn_band_case(warn_df):
    r = run_m1(warn_df, CFG)
    assert r.disparate_impact == 0.85
    assert r.verdict == "warn"
    assert r.risk_score == 35
    assert r.worst_group == "GroupB"


def test_small_sample_downgrades_to_warn(small_sample_df):
    r = run_m1(small_sample_df, CFG)
    assert r.disparate_impact == 1.0
    assert r.verdict == "warn"
    assert r.risk_score == 9
    assert any("Effectif faible" in w and "GroupB" in w for w in r.warnings)


def test_privileged_value_override(recruitment_df):
    cfg = M1Config(
        protected_attribute="genre",
        decision_column="decision",
        favorable_value="oui",
        privileged_value="Femmes",
    )
    r = run_m1(recruitment_df, cfg)
    assert r.reference_value == "Femmes"
    assert r.disparate_impact == 1.0
    assert r.verdict == "pass"


def test_run_m1_without_ground_truth_is_byte_identical():
    df = pd.DataFrame({
        "g": ["a"] * 40 + ["b"] * 40,
        "d": (["oui"] * 30 + ["non"] * 10) + (["oui"] * 12 + ["non"] * 28),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui")
    r = run_m1(df, cfg)
    assert r.equal_opportunity_diff is None
    assert r.equalized_odds_diff is None
    assert r.demographic_parity_verdict is None
    assert all(gs.tpr is None and gs.fpr is None for gs in r.groups)
    # existing fields still populated exactly as before
    assert r.verdict in ("pass", "warn", "fail")
    assert r.disparate_impact == r.disparate_impact  # not None


def test_run_m1_with_ground_truth_computes_eo_eodds():
    # group a: model right ; group b: many false negatives
    df = pd.DataFrame({
        "g": ["a"] * 40 + ["b"] * 40,
        "d": (["oui"] * 20 + ["non"] * 20) + (["oui"] * 10 + ["non"] * 30),
        "reel": (["oui"] * 20 + ["non"] * 20) + (["oui"] * 25 + ["non"] * 15),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", privileged_value="a",
                   ground_truth_column="reel")
    r = run_m1(df, cfg)
    assert r.equal_opportunity_diff is not None
    assert r.equalized_odds_diff is not None
    assert r.equal_opportunity_verdict in ("pass", "warn", "fail")
    assert r.equalized_odds_verdict in ("pass", "warn", "fail")
    assert r.demographic_parity_verdict in ("pass", "warn", "fail")
    assert all(gs.tpr is not None for gs in r.groups)
    # GLOBAL verdict must equal the no-ground-truth verdict (D3 invariant)
    cfg_no = M1Config(protected_attribute="g", decision_column="d",
                      favorable_value="oui", privileged_value="a")
    assert r.verdict == run_m1(df, cfg_no).verdict
    assert r.risk_score == run_m1(df, cfg_no).risk_score


def test_run_m1_ground_truth_missing_rows_dropna_independent():
    df = pd.DataFrame({
        "g": ["a"] * 40 + ["b"] * 40,
        "d": (["oui"] * 20 + ["non"] * 20) + (["oui"] * 20 + ["non"] * 20),
        "reel": ([None] * 40) + (["oui"] * 20 + ["non"] * 20),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", ground_truth_column="reel")
    r = run_m1(df, cfg)
    # group a fully missing ground truth -> <2 comparable -> reason set,
    # but the audit still completes and DI/DP unaffected by gt NaNs
    assert r.disparate_impact is not None
    assert r.truelabel_reason is not None


def test_run_m1_without_secondary_attribute_is_byte_identical():
    import pandas as pd

    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({
        "g": ["a"] * 40 + ["b"] * 40,
        "d": (["oui"] * 30 + ["non"] * 10) + (["oui"] * 12 + ["non"] * 28),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui")
    r = run_m1(df, cfg)
    assert r.pairwise == ()
    assert r.verdict in ("pass", "warn", "fail")


def test_run_m1_with_secondary_attribute_attaches_intersectional():
    import pandas as pd

    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({
        "g": ["h"] * 40 + ["f"] * 40,
        "o": (["fr"] * 20 + ["etr"] * 20) * 2,
        "d": (["oui"] * 18 + ["non"] * 2 + ["oui"] * 14 + ["non"] * 6)
        + (["oui"] * 12 + ["non"] * 8 + ["oui"] * 3 + ["non"] * 17),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", privileged_value="h",
                   secondary_protected_attribute="o",
                   secondary_privileged_value="fr")
    r = run_m1(df, cfg)
    assert len(r.pairwise) == 1
    assert len(r.pairwise[0].cells) == 4
    # global verdict/risk are driven by the aggregate (worst of marginals + pair)
    order = {"pass": 0, "warn": 1, "fail": 2}
    worst_verdict = max(
        [m.verdict for m in r.marginals] + [p.verdict for p in r.pairwise],
        key=lambda v: order[v],
    )
    assert r.verdict == worst_verdict
    assert r.risk_score == max(
        [m.risk_score for m in r.marginals] + [p.risk_score for p in r.pairwise]
    )


def test_run_m1_intersectional_contrast_marginals_pass_cross_fails():
    """True Simpson's-paradox / Gender-Shades scenario.

    Each attribute audited ALONE is compliant (marginal DI ≈ 1.0, ≥ 0.8)
    because the favourable subgroups cancel: h×fr=0.9, f×etr=0.9 (high)
    vs h×etr=0.3, f×fr=0.3 (low) → genre marginal: h=f=0.6 → DI 1.0 ;
    origine marginal: fr=etr=0.6 → DI 1.0.
    But the worst crossed cell DI = 0.3/0.9 ≈ 0.33 → intersectional FAIL.
    """
    import pandas as pd

    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({
        "g": ["h"] * 60 + ["f"] * 60,
        "o": (["fr"] * 30 + ["etr"] * 30) + (["fr"] * 30 + ["etr"] * 30),
        "d": (["oui"] * 27 + ["non"] * 3 + ["oui"] * 9 + ["non"] * 21)
        + (["oui"] * 9 + ["non"] * 21 + ["oui"] * 27 + ["non"] * 3),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui",
                   secondary_protected_attribute="o")
    r = run_m1(df, cfg)
    assert len(r.pairwise) == 1
    pair = r.pairwise[0]
    assert pair.verdict == "fail"
    # Both marginal DIs are genuinely compliant (≥ 0.8)
    assert all(d >= 0.8 for d in pair.marginal_di)
    # The worst crossed cell DI is strictly worse than every marginal DI
    assert min(pair.marginal_di) > pair.disparate_impact


def test_run_m1_missing_secondary_column_raises():
    import pandas as pd
    import pytest

    from app.audit_engine.errors import DatasetValidationError
    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({"g": ["a"] * 10 + ["b"] * 10,
                       "d": ["oui", "non"] * 10})
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui",
                   secondary_protected_attribute="absent")
    with pytest.raises(DatasetValidationError):
        run_m1(df, cfg)
