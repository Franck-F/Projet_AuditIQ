from app.core.config import Settings


def test_pdf_service_defaults_empty():
    s = Settings(_env_file=None)
    assert s.pdf_service_url == ""
    assert s.pdf_service_secret.get_secret_value() == ""


def test_pdf_service_env_override(monkeypatch):
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    s = Settings(_env_file=None)
    assert s.pdf_service_url == "http://pdf:8080"
    assert s.pdf_service_secret.get_secret_value() == "shh"
