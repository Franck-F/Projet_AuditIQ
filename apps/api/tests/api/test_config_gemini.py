from app.core.config import Settings


def test_gemini_defaults():
    s = Settings(_env_file=None)
    assert s.gemini_api_key.get_secret_value() == ""
    assert s.gemini_model == "gemini-1.5-pro"
