from __future__ import annotations

import asyncio

from app.core.config import get_settings
from app.interpretation.base import LLMProvider


class GeminiProvider:
    name = "gemini"

    def __init__(self, *, api_key: str, model: str) -> None:
        from google import genai

        self._client = genai.Client(api_key=api_key)
        self.model = model

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        def _call() -> str:
            resp = self._client.models.generate_content(
                model=self.model, contents=prompt
            )
            return resp.text or ""

        return await asyncio.to_thread(_call)


def get_llm_provider() -> LLMProvider | None:
    s = get_settings()
    key = s.gemini_api_key.get_secret_value()
    if not key:
        return None
    return GeminiProvider(api_key=key, model=s.gemini_model)
