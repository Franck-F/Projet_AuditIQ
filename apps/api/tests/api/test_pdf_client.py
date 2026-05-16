import httpx
import pytest
import respx

from app.core.errors import APIError
from app.reporting.pdf_client import render_pdf


@respx.mock
async def test_render_pdf_success(monkeypatch):
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        route = respx.post("http://pdf:8080/render").mock(
            return_value=httpx.Response(
                200, content=b"%PDF-1.7 fake",
                headers={"content-type": "application/pdf"},
            )
        )
        out = await render_pdf("<html></html>")
        assert out == b"%PDF-1.7 fake"
        sent = route.calls[0].request
        assert sent.headers["x-pdf-secret"] == "shh"
    finally:
        get_settings.cache_clear()


@respx.mock
async def test_render_pdf_5xx_raises_502(monkeypatch):
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        respx.post("http://pdf:8080/render").mock(
            return_value=httpx.Response(503)
        )
        with pytest.raises(APIError) as e:
            await render_pdf("<html></html>")
        assert e.value.status == 502
    finally:
        get_settings.cache_clear()


@respx.mock
async def test_render_pdf_timeout_raises_502(monkeypatch):
    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        respx.post("http://pdf:8080/render").mock(
            side_effect=httpx.ConnectTimeout("boom")
        )
        with pytest.raises(APIError) as e:
            await render_pdf("<html></html>")
        assert e.value.status == 502
    finally:
        get_settings.cache_clear()
