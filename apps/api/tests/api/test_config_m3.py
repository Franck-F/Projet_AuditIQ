from app.core.config import Settings


def test_m3_settings_defaults():
    s = Settings(_env_file=None)
    assert s.llm_target_timeout_s == 20
    assert s.llm_target_max_concurrency == 4
    assert s.llm_audit_max_calls == 80
    assert s.llm_audit_deadline_s == 45
    assert s.llm_target_max_bytes == 1_000_000
    assert s.llm_target_allow_http is False


def test_m3_settings_env_override(monkeypatch):
    monkeypatch.setenv("LLM_TARGET_TIMEOUT_S", "10")
    monkeypatch.setenv("LLM_TARGET_MAX_CONCURRENCY", "8")
    monkeypatch.setenv("LLM_AUDIT_MAX_CALLS", "40")
    monkeypatch.setenv("LLM_AUDIT_DEADLINE_S", "30")
    monkeypatch.setenv("LLM_TARGET_MAX_BYTES", "500000")
    monkeypatch.setenv("LLM_TARGET_ALLOW_HTTP", "true")
    s = Settings(_env_file=None)
    assert s.llm_target_timeout_s == 10
    assert s.llm_target_max_concurrency == 8
    assert s.llm_audit_max_calls == 40
    assert s.llm_audit_deadline_s == 30
    assert s.llm_target_max_bytes == 500_000
    assert s.llm_target_allow_http is True
