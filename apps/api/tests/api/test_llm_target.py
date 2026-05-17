import httpx
import pytest
import respx

from app.core.errors import APIError
from app.integrations.llm_target import TargetConfig, call_target_llm, extract


def test_extract_restricted_path():
    data = {"choices": [{"message": {"content": "salut"}}]}
    assert extract(data, "choices.0.message.content") == "salut"
    with pytest.raises(APIError):
        extract(data, "choices.5.message.content")
    with pytest.raises(APIError):
        extract({"a": 1}, "a.b")


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/render",
    "http://localhost/x",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5/v1",
    "http://[::1]/v1",
])
async def test_ssrf_blocks_private_and_metadata(url, monkeypatch):
    monkeypatch.setenv("LLM_TARGET_ALLOW_HTTP", "true")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        cfg = TargetConfig(url=url, method="POST", headers={},
                           body_template='{"p":"{prompt}"}',
                           response_path="a")
        with pytest.raises(APIError) as e:
            await call_target_llm(cfg, "hello")
        assert e.value.status == 422
    finally:
        get_settings.cache_clear()


async def test_https_required_outside_dev(monkeypatch):
    monkeypatch.setenv("API_ENV", "production")
    monkeypatch.setenv("LLM_TARGET_ALLOW_HTTP", "false")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "k")
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_DB_URL", "postgresql+asyncpg://u:p@h/d")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        cfg = TargetConfig(url="http://api.example.com/v1", method="POST",
                           headers={}, body_template='{"p":"{prompt}"}',
                           response_path="a")
        with pytest.raises(APIError) as e:
            await call_target_llm(cfg, "hi")
        assert e.value.status == 422
    finally:
        get_settings.cache_clear()


@respx.mock
async def test_call_success_substitutes_prompt_and_extracts(monkeypatch):
    # Resolve to a public IP so the SSRF guard passes; the connection is
    # pinned to that IP (anti-DNS-rebinding). respx 0.23.1 matches on the
    # actual request URL, so the route is registered on the pinned-IP URL
    # while Host/SNI stay = original host (security behavior intact).
    import app.integrations.llm_target as m

    monkeypatch.setattr(m, "_resolve_ips",
                        lambda host: ["93.184.216.34"])
    route = respx.post("https://93.184.216.34/v1").mock(
        return_value=httpx.Response(
            200, json={"choices": [{"message": {"content": "Bonjour"}}]}
        )
    )
    cfg = TargetConfig(
        url="https://api.example.com/v1", method="POST",
        headers={"Authorization": "Bearer SECRET"},
        body_template='{"messages":[{"role":"user","content":"{prompt}"}]}',
        response_path="choices.0.message.content",
    )
    out = await call_target_llm(cfg, 'dis "bonjour"')
    assert out == "Bonjour"
    sent = route.calls[0].request
    assert sent.headers["authorization"] == "Bearer SECRET"
    # Host + TLS SNI must remain the original hostname despite IP pinning.
    assert sent.headers["host"] == "api.example.com"
    assert sent.extensions.get("sni_hostname") == "api.example.com"
    import json as _j
    assert _j.loads(sent.content)["messages"][0]["content"] == 'dis "bonjour"'


@respx.mock
async def test_call_5xx_raises(monkeypatch):
    import app.integrations.llm_target as m

    monkeypatch.setattr(m, "_resolve_ips", lambda host: ["93.184.216.34"])
    respx.post("https://93.184.216.34/v1").mock(
        return_value=httpx.Response(503)
    )
    cfg = TargetConfig(url="https://api.example.com/v1", method="POST",
                       headers={}, body_template='{"p":"{prompt}"}',
                       response_path="a")
    with pytest.raises(APIError):
        await call_target_llm(cfg, "x")
