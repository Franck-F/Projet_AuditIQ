from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0008_adds_org_fields_and_invitations_and_reverses(tmp_path, monkeypatch):
    db = tmp_path / "e.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))

    org_cols = {c["name"] for c in insp.get_columns("organizations")}
    for col in ("siren", "sector", "country", "company_size", "dpo_name"):
        assert col in org_cols

    inv_cols = {c["name"] for c in insp.get_columns("invitations")}
    assert {
        "id",
        "org_id",
        "email",
        "role",
        "token",
        "status",
        "invited_by",
        "created_at",
        "expires_at",
    } <= inv_cols

    index_names = {i["name"] for i in insp.get_indexes("invitations")}
    assert "ix_invitations_email_status" in index_names
    assert "ix_invitations_token" in index_names

    command.downgrade(cfg, "0007")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    assert "invitations" not in insp2.get_table_names()
    org_cols2 = {c["name"] for c in insp2.get_columns("organizations")}
    assert "siren" not in org_cols2
