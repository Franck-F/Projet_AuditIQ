"""Lenient JSON parsing for LLM output (tolerates markdown fences / prose)."""
import json

import pytest

from app.interpretation._json import loads_lenient


def test_loads_plain_json():
    assert loads_lenient('{"a": 1}') == {"a": 1}


def test_loads_strips_json_fence():
    raw = '```json\n{"a": 1}\n```'
    assert loads_lenient(raw) == {"a": 1}


def test_loads_strips_bare_fence():
    raw = '```\n{"a": 1}\n```'
    assert loads_lenient(raw) == {"a": 1}


def test_loads_extracts_object_amid_prose():
    raw = 'Voici le JSON demandé :\n{"a": 1}\nMerci.'
    assert loads_lenient(raw) == {"a": 1}


def test_loads_raises_on_no_json():
    with pytest.raises(json.JSONDecodeError):
        loads_lenient("aucun json ici")
