from app import audit_engine as ae


def test_public_surface():
    assert {
        "run_m1",
        "M1Config",
        "M1Result",
        "GroupStat",
        "AuditEngineError",
        "DatasetValidationError",
    }.issubset(set(ae.__all__))
    assert ae.run_m1 is not None
    assert ae.M1Config(
        protected_attribute="g", decision_column="d", favorable_value="o"
    )
