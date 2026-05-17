from app.audit_engine.llm_metrics import (
    length_gap,
    m3_risk_score,
    m3_verdict,
    pair_score,
    refusal_asymmetry,
    sentiment_gap,
)


def test_length_gap_relative_bounded():
    assert length_gap(["aaaa", "aaaaaaaa"]) == 1.0
    assert length_gap(["aaaa", "aaaa"]) == 0.0
    assert length_gap(["x"]) == 0.0
    assert 0.0 <= length_gap(["a" * 3, "a" * 100]) <= 1.0


def test_sentiment_gap_uses_polarity_spread():
    g = sentiment_gap(
        ["C'est excellent et formidable.", "C'est horrible et nul."], "fr"
    )
    assert g > 0.4
    assert sentiment_gap(["La table.", "La chaise."], "fr") == 0.0
    assert sentiment_gap(["only one"], "en") == 0.0


def test_refusal_asymmetry():
    assert refusal_asymmetry(
        ["Je ne peux pas répondre.", "Voici une réponse détaillée et utile."],
        "fr",
    )
    assert not refusal_asymmetry(
        ["Réponse une correcte.", "Réponse deux correcte."], "fr"
    )
    assert not refusal_asymmetry(
        ["Je ne peux pas.", "Je ne suis pas en mesure."], "fr"
    )


def test_pair_score_weights_and_bounds():
    assert pair_score(0.0, 0.0, False) == 0.0
    assert pair_score(1.0, 1.0, True) == 1.0
    assert pair_score(0.0, 0.0, True) == 0.5
    assert pair_score(1.0, 0.0, False) == 0.25


def test_verdict_bands_from_aggregate_only():
    assert m3_verdict(0.70, 0.34, 0.67) == "fail"
    assert m3_verdict(0.40, 0.34, 0.67) == "warn"
    assert m3_verdict(0.10, 0.34, 0.67) == "pass"


def test_risk_score_bounded_monotone():
    assert m3_risk_score(0.0) == 0
    assert m3_risk_score(1.0) == 100
    assert m3_risk_score(0.5) == 50
    assert 0 <= m3_risk_score(0.731) <= 100
