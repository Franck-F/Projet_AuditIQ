import pytest

from app.integrations.storage import MemoryStorage


async def test_memory_storage_roundtrip():
    s = MemoryStorage()
    await s.upload("org/x.csv", b"a,b\n1,2\n", "text/csv")
    assert await s.download("org/x.csv") == b"a,b\n1,2\n"


async def test_memory_storage_missing_raises_keyerror():
    s = MemoryStorage()
    with pytest.raises(KeyError):
        await s.download("nope")


def test_memory_storage_satisfies_protocol():
    from app.integrations.storage import MemoryStorage, Storage

    assert isinstance(MemoryStorage(), Storage)


async def test_get_storage_is_cached_singleton(monkeypatch: pytest.MonkeyPatch):
    # Regression: get_storage() must return the same instance across calls,
    # otherwise an upload in one request and a download in the next hit
    # different MemoryStorage dicts and the dataset->audit flow KeyErrors.
    from app.core.config import get_settings
    from app.integrations.storage import MemoryStorage, get_storage

    monkeypatch.setenv("API_ENV", "development")  # -> MemoryStorage branch
    get_settings.cache_clear()
    get_storage.cache_clear()
    try:
        store = get_storage()
        assert isinstance(store, MemoryStorage)
        assert get_storage() is store
        await store.upload("o/d.csv", b"x,y\n1,2\n", "text/csv")
        # A later call (simulating a separate request) sees the blob.
        assert await get_storage().download("o/d.csv") == b"x,y\n1,2\n"
    finally:
        get_storage.cache_clear()
        get_settings.cache_clear()
