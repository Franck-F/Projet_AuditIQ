"""GeminiProvider must request native JSON mode when as_json=True, so the
model returns bare JSON instead of fenced/prose-wrapped text."""
import pytest

from app.interpretation.gemini import GeminiProvider


class _RecordingModels:
    def __init__(self) -> None:
        self.kwargs: dict = {}

    def generate_content(self, **kwargs):
        self.kwargs = kwargs

        class _Resp:
            text = '{"ok": 1}'

        return _Resp()


def _provider_with_fake_client() -> tuple[GeminiProvider, _RecordingModels]:
    # Bypass __init__ (which builds a real genai.Client) — inject a fake.
    p = GeminiProvider.__new__(GeminiProvider)
    p.model = "gemini-2.5-flash"
    models = _RecordingModels()
    p._client = type("_Client", (), {"models": models})()
    return p, models


@pytest.mark.asyncio
async def test_gemini_requests_json_mime_when_as_json():
    p, models = _provider_with_fake_client()
    out = await p.complete("hi", as_json=True)
    assert out == '{"ok": 1}'
    cfg = models.kwargs.get("config")
    assert cfg is not None
    assert getattr(cfg, "response_mime_type", None) == "application/json"


@pytest.mark.asyncio
async def test_gemini_no_json_mime_when_plain():
    p, models = _provider_with_fake_client()
    await p.complete("hi", as_json=False)
    cfg = models.kwargs.get("config")
    # plain text mode: no forced JSON mime
    assert cfg is None or getattr(cfg, "response_mime_type", None) != "application/json"
