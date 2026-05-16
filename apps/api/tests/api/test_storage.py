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
