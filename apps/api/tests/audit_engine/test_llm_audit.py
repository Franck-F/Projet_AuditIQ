import pytest

from app.audit_engine.errors import AuditEngineError
from app.audit_engine.llm_audit import run_m3
from app.audit_engine.types import M3Config, M3Responses, ResponseRecord


def _rec(pid, cat, label, text, failed=False):
    return ResponseRecord(pair_id=pid, category=cat, variant_label=label,
                          text=text, failed=failed)

_LONG_OK = "Une réponse correcte, neutre et suffisamment longue pour le test."


def test_balanced_responses_pass():
    resp = M3Responses(records=[
        _rec("g1", "genre", "m", _LONG_OK),
        _rec("g1", "genre", "f", _LONG_OK + " Idem."),
    ])
    res = run_m3(resp, M3Config())
    assert res.verdict == "pass"
    assert res.n_pairs == 1
    assert res.n_calls_failed == 0
    assert [c.name for c in res.categories] == ["genre"]


def test_refusal_asymmetry_drives_fail():
    resp = M3Responses(records=[
        _rec("g1", "genre", "m", _LONG_OK),
        _rec("g1", "genre", "f", "Je ne peux pas répondre à cette demande."),
        _rec("o1", "origine", "a", _LONG_OK),
        _rec("o1", "origine", "b", "Je ne suis pas en mesure de répondre."),
    ])
    res = run_m3(resp, M3Config())
    assert res.verdict == "fail"
    assert res.risk_score >= 50
    assert len(res.divergent_examples) >= 1


def test_guardrail_single_noisy_metric_does_not_flip():
    resp = M3Responses(records=[
        _rec("g1", "genre", "m", "court"),
        _rec("g1", "genre", "f", "court" * 40),
    ])
    res = run_m3(resp, M3Config())
    assert res.verdict == "pass"


def test_failed_calls_counted_and_non_fatal():
    resp = M3Responses(records=[
        _rec("g1", "genre", "m", "", failed=True),
        _rec("g1", "genre", "f", _LONG_OK),
    ])
    res = run_m3(resp, M3Config())
    assert res.n_calls_failed == 1
    assert any("échec" in w.lower() or "appel" in w.lower()
               for w in res.warnings)
    assert res.verdict in ("warn", "fail")


def test_validation_errors():
    with pytest.raises(AuditEngineError):
        run_m3(M3Responses(records=[]), M3Config())
    with pytest.raises(AuditEngineError):
        run_m3(M3Responses(records=[_rec("g1", "genre", "m", _LONG_OK)]),
               M3Config())


def test_deterministic():
    resp = M3Responses(records=[
        _rec("g1", "genre", "m", _LONG_OK),
        _rec("g1", "genre", "f", "Je ne peux pas."),
    ])
    assert run_m3(resp, M3Config()) == run_m3(resp, M3Config())
