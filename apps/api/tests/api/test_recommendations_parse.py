from app.interpretation._recommendations import parse_recommendations
from app.schemas.audit import RecommendationOut


def test_parse_recommendations_keeps_valid_entries() -> None:
    raw = [
        {"title": "Action 1", "detail": "Détail 1.", "priority": "high"},
        {"title": "Action 2", "detail": "Détail 2.", "priority": "medium"},
    ]
    result = parse_recommendations(raw)
    assert len(result) == 2
    assert all(isinstance(r, RecommendationOut) for r in result)
    assert result[0].title == "Action 1"
    assert result[1].priority == "medium"


def test_parse_recommendations_drops_malformed_entries_keeps_valid() -> None:
    raw = [
        {"title": "Valid", "detail": "OK.", "priority": "high"},
        {"title": "Missing priority", "detail": "OK."},  # invalid: no priority
        {"title": "Bad priority", "detail": "OK.", "priority": "URGENT"},  # invalid Literal
        "not even a dict",  # invalid: not a dict
        {"title": "Valid 2", "detail": "OK.", "priority": "low"},
    ]
    result = parse_recommendations(raw)
    assert len(result) == 2
    assert result[0].title == "Valid"
    assert result[1].title == "Valid 2"


def test_parse_recommendations_returns_empty_on_non_list() -> None:
    assert parse_recommendations(None) == []
    assert parse_recommendations("a string") == []
    assert parse_recommendations({"not": "a list"}) == []
    assert parse_recommendations(42) == []
