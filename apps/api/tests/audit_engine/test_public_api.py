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
    assert (
        ae.M1Config(
            protected_attribute="g", decision_column="d", favorable_value="o"
        )
        is not None
    )


def test_m2_public_api_surface():
    import app.audit_engine as ae

    for name in (
        "run_m2", "M2Config", "M2Result", "ClusterStat",
        "FeatureContribution", "iqr_precheck", "IqrReport",
    ):
        assert name in ae.__all__
        assert hasattr(ae, name)


def test_m3_public_api_surface():
    import app.audit_engine as ae

    for name in (
        "run_m3", "M3Config", "M3Responses", "ResponseRecord", "M3Result",
        "CategoryStat", "DivergentExample", "PromptPair", "PromptVariant",
        "PROMPT_BANK",
    ):
        assert name in ae.__all__
        assert hasattr(ae, name)


def test_truelabel_helpers_exported():
    import app.audit_engine as ae

    assert hasattr(ae, "gap_verdict")
    assert hasattr(ae, "truelabel_metrics")
    # existing M1 surface still exported
    assert hasattr(ae, "run_m1")
    assert hasattr(ae, "M1Config")
    assert hasattr(ae, "M1Result")


def test_intersectional_symbols_exported():
    import app.audit_engine as ae

    assert hasattr(ae, "run_intersectional")
    assert hasattr(ae, "IntersectionalResult")
    assert hasattr(ae, "IntersectionalCell")
    assert hasattr(ae, "run_m1")
    assert hasattr(ae, "M1Result")
