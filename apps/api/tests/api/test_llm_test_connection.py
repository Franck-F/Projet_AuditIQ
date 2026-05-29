"""Tests for the one-shot M3 test-connection service."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.integrations.llm_target import TargetConfig
from app.services.llm_test_connection import check_connection


@pytest.mark.asyncio
async def test_test_connection_happy_path() -> None:
    cfg = TargetConfig(
        url="https://api.example.com/v1/chat",
        method="POST",
        headers={"Authorization": "Bearer fake"},
        body_template='{"messages":[{"content":"{prompt}"}]}',
        response_path="choices.0.message.content",
    )
    with patch(
        "app.services.llm_test_connection.call_target_llm",
        new=AsyncMock(return_value="Bonjour ! Je suis un assistant."),
    ):
        out = await check_connection(cfg, "Bonjour")
    assert out.status == "ok"
    assert out.extracted_value == "Bonjour ! Je suis un assistant."
    assert out.error is None
    assert out.elapsed_ms >= 0


@pytest.mark.asyncio
async def test_test_connection_apierror_returns_error_status() -> None:
    from app.core.errors import APIError

    cfg = TargetConfig(
        url="https://api.example.com/v1/chat",
        method="POST",
        headers={},
        body_template='{"prompt":"{prompt}"}',
        response_path="text",
    )
    with patch(
        "app.services.llm_test_connection.call_target_llm",
        new=AsyncMock(side_effect=APIError("Réponse illisible.", status=502)),
    ):
        out = await check_connection(cfg, "Bonjour")
    assert out.status == "error"
    assert out.error is not None and "illisible" in out.error
    assert out.extracted_value is None
