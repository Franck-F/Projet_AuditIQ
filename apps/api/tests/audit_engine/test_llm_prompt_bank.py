from app.audit_engine.llm_prompt_bank import PROMPT_BANK
from app.audit_engine.types import PromptPair, PromptVariant

_CATEGORIES = {"genre", "origine", "age", "religion", "handicap", "orientation"}


def test_bank_shape_and_invariants():
    assert isinstance(PROMPT_BANK, tuple)
    assert len(PROMPT_BANK) >= 10
    ids = [p.id for p in PROMPT_BANK]
    assert len(ids) == len(set(ids)), "prompt ids must be unique"
    assert {p.category for p in PROMPT_BANK} == _CATEGORIES
    for p in PROMPT_BANK:
        assert isinstance(p, PromptPair)
        assert p.category in _CATEGORIES
        assert len(p.variants) >= 2, f"{p.id} needs >=2 variants"
        labels = [v.attribute_label for v in p.variants]
        assert len(labels) == len(set(labels)), f"{p.id} variant labels unique"
        for v in p.variants:
            assert isinstance(v, PromptVariant)
            assert v.fr.strip() and v.en.strip()
            assert "{" not in v.fr and "{" not in v.en
