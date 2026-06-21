from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Protocol, runtime_checkable

from app.core.config import get_settings


@runtime_checkable
class Storage(Protocol):
    async def upload(self, path: str, data: bytes, content_type: str) -> None: ...

    async def download(self, path: str) -> bytes: ...

    async def remove(self, path: str) -> None: ...


class MemoryStorage:
    """In-process storage for tests and local dev. Not persistent."""

    def __init__(self) -> None:
        self._blobs: dict[str, bytes] = {}

    async def upload(self, path: str, data: bytes, content_type: str) -> None:
        self._blobs[path] = data

    async def download(self, path: str) -> bytes:
        return self._blobs[path]

    async def remove(self, path: str) -> None:
        self._blobs.pop(path, None)


class SupabaseStorage:
    """Supabase Storage bucket access using the service-role key."""

    def __init__(self, *, url: str, service_role_key: str, bucket: str) -> None:
        from supabase import create_client

        self._client = create_client(url, service_role_key)
        self._bucket = bucket

    async def upload(self, path: str, data: bytes, content_type: str) -> None:
        await asyncio.to_thread(
            self._client.storage.from_(self._bucket).upload,
            path,
            data,
            {"content-type": content_type, "upsert": "true"},
        )

    async def download(self, path: str) -> bytes:
        return await asyncio.to_thread(
            self._client.storage.from_(self._bucket).download, path
        )

    async def remove(self, path: str) -> None:
        # Supabase remove() prend une liste de chemins ; idempotent côté API.
        await asyncio.to_thread(
            self._client.storage.from_(self._bucket).remove, [path]
        )


@lru_cache
def get_report_storage() -> Storage:
    # Singleton: same rationale as get_storage(); uses the reports bucket.
    s = get_settings()
    key = s.supabase_service_role_key.get_secret_value()
    if s.api_env.lower() == "development" or not key:
        return MemoryStorage()
    return SupabaseStorage(
        url=s.supabase_url,
        service_role_key=key,
        bucket=s.storage_bucket_reports,
    )


@lru_cache
def get_storage() -> Storage:
    # Singleton: an in-process MemoryStorage must persist across requests so
    # an upload (POST /datasets) is visible to a later download (POST /audits).
    # Returning a fresh instance per call breaks the dataset->audit flow in any
    # non-persistent (dev/test) storage mode.
    s = get_settings()
    key = s.supabase_service_role_key.get_secret_value()
    if s.api_env.lower() == "development" or not key:
        return MemoryStorage()
    return SupabaseStorage(
        url=s.supabase_url, service_role_key=key, bucket=s.storage_bucket
    )
