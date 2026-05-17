from app.audit_engine.llm_sentiment import polarity


def test_polarity_positive_negative_neutral_fr():
    assert polarity("C'est excellent, formidable et brillant.", "fr") > 0.3
    assert polarity("C'est horrible, nul et décevant.", "fr") < -0.3
    assert polarity("La table a quatre pieds.", "fr") == 0.0


def test_polarity_positive_negative_neutral_en():
    assert polarity("This is excellent, wonderful and brilliant.", "en") > 0.3
    assert polarity("This is awful, terrible and disappointing.", "en") < -0.3
    assert polarity("The table has four legs.", "en") == 0.0


def test_polarity_bounded_and_deterministic():
    t = "great great great awful"
    a = polarity(t, "en")
    b = polarity(t, "en")
    assert a == b
    assert -1.0 <= a <= 1.0


def test_polarity_empty_is_zero():
    assert polarity("", "fr") == 0.0
    assert polarity("   ", "en") == 0.0
