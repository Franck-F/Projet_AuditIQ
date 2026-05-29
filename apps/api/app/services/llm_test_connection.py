"""One-shot M3 test-connection service.

Calls the user's target LLM once with an innocuous prompt to validate
config before launching the full audit. Reuses the SSRF-hardened llm_target
client. Never persists the auth secret or the test prompt.
"""
from __future__ import annotations

import time

from app.core.errors import APIError
from app.integrations.llm_target import TargetConfig, call_target_llm
from app.schemas.audit import M3TestConnectionOut


async def check_connection(
    cfg: TargetConfig, test_prompt: str
) -> M3TestConnectionOut:
    """Return a structured outcome. Never raises — errors are reported in the body."""
    started = time.monotonic()
    try:
        extracted = await call_target_llm(cfg, test_prompt)
    except APIError as exc:
        elapsed = int((time.monotonic() - started) * 1000)
        return M3TestConnectionOut(
            status="error",
            elapsed_ms=elapsed,
            error=str(exc),
        )
    elapsed = int((time.monotonic() - started) * 1000)
    return M3TestConnectionOut(
        status="ok",
        elapsed_ms=elapsed,
        extracted_value=extracted,
    )
