from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    name: str
    model: str

    async def complete(self, prompt: str, *, as_json: bool = False) -> str: ...
