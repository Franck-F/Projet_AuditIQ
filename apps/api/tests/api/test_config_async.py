from app.core.config import Settings


def test_audit_max_concurrency_default():
    s = Settings(_env_file=None)
    assert s.audit_max_concurrency == 3


def test_audit_max_concurrency_env_override(monkeypatch):
    monkeypatch.setenv("AUDIT_MAX_CONCURRENCY", "5")
    s = Settings(_env_file=None)
    assert s.audit_max_concurrency == 5
