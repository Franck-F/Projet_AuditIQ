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
    assert r.warnings == []
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
