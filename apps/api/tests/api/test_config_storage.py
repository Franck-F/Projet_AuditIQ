from app.core.config import Settings


def test_storage_defaults():
    s = Settings(_env_file=None)
    assert s.storage_bucket == "datasets"
    assert s.max_upload_mb == 10
    assert s.retention_days_default == 30
