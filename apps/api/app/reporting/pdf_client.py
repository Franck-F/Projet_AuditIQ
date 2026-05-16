"""Thin client to the apps/pdf Puppeteer microservice. Non-silent on failure."""
from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.core.errors import APIError

_TIMEOUT = httpx.Timeout(30.0)


async def render_pdf(html: str) -> bytes:
    """POST the HTML to the PDF microservice; return PDF bytes.

    Any transport error or non-2xx response raises APIError(502) — the PDF
    is never silently swallowed; the Excel report stays independently usable.
    """
    s = get_settings()
    url = f"{s.pdf_service_url.rstrip('/')}/render"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(
                url,
                json={"html": html},
                headers={
                    "X-PDF-Secret": s.pdf_service_secret.get_secret_value()
                },
            )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise APIError(
            "Le rapport PDF est momentanément indisponible. "
            "Le rapport Excel reste disponible.",
            title="Bad Gateway",
            status=502,
        ) from exc
    return resp.content
