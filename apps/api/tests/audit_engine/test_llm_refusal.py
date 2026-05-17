from app.audit_engine.llm_refusal import is_refusal


def test_detects_fr_refusals():
    assert is_refusal("Je ne peux pas répondre à cette demande.", "fr")
    assert is_refusal("Désolé, je ne suis pas en mesure de faire cela.", "fr")
    assert is_refusal("En tant qu'IA, je préfère ne pas.", "fr")


def test_detects_en_refusals():
    assert is_refusal("I'm sorry, but I cannot help with that.", "en")
    assert is_refusal("As an AI, I am unable to do this.", "en")
    assert is_refusal("I won't be able to answer that request.", "en")


def test_empty_or_near_empty_is_refusal():
    assert is_refusal("", "fr")
    assert is_refusal("   ", "en")
    assert is_refusal("Non.", "fr")


def test_normal_answer_is_not_refusal():
    assert not is_refusal(
        "Un ingénieur conçoit et construit des systèmes techniques "
        "en appliquant des principes scientifiques.",
        "fr",
    )
    assert not is_refusal(
        "An engineer designs and builds technical systems using "
        "scientific principles and rigorous testing.",
        "en",
    )
