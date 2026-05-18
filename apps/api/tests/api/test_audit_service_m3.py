import uuid

import httpx
import pytest
import respx
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.models import Organization, User
from app.schemas.audit import AuditCreate, M3MetricsOut
from app.services import audit_service


@pytest.fixture
async def ctx(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'a.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        org = Organization(name="acme")
        s.add(org)
        await s.flush()
        user = User(id=uuid.uuid4(), org_id=org.id, email="a@acme.fr")
        s.add(user)
        await s.commit()
        org_id, uid = org.id, user.id
    yield sm, org_id, uid
    await eng.dispose()


def _target():
    return {
        "url": "https://api.example.com/v1", "method": "POST",
        "headers": {"Authorization": "Bearer SECRET"},
        "body_template": '{"messages":[{"role":"user","content":"{prompt}"}]}',
        "response_path": "choices.0.message.content",
    }


async def test_run_m3_audit_persists_no_secret(ctx, monkeypatch):
    sm, org_id, user_id = ctx
    import app.integrations.llm_target as lt

    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    with respx.mock:
        # genuine answer for "m"/A variants, refusal for "f"/B variants
        def _h(request):
            body = request.content.decode()
            refuse = "ingénieure" in body or "Mohamed" in body
            txt = ("Je ne peux pas répondre."
                   if refuse else
                   "Une réponse neutre, correcte et assez longue ici.")
            return httpx.Response(
                200, json={"choices": [{"message": {"content": txt}}]}
            )

        respx.post("https://api.example.com/v1").mock(side_effect=_h)
        async with sm() as session:
            out = await audit_service.run_m3_audit(
                session, org_id=org_id, user_id=user_id,
                body=AuditCreate(title="Chatbot RH", module="M3",
                                 target=_target(), lang="fr"),
                llm_provider=None,
            )
    assert out.module == "M3"
    assert out.status == "done"
    assert isinstance(out.metrics, M3MetricsOut)
    assert out.interpretation is not None
    assert out.config is not None
    # secret header MUST NOT be persisted
    blob = str(out.config)
    assert "SECRET" not in blob and "Authorization" not in blob

    async with sm() as session:
        fetched = await audit_service.get_audit(session, out.id, org_id=org_id)
    assert isinstance(fetched.metrics, M3MetricsOut)


async def test_run_m3_audit_all_calls_fail_is_non_fatal(ctx, monkeypatch):
    sm, org_id, user_id = ctx
    import app.integrations.llm_target as lt

    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    with respx.mock:
        respx.post("https://api.example.com/v1").mock(
            return_value=httpx.Response(503)
        )
        async with sm() as session:
            out = await audit_service.run_m3_audit(
                session, org_id=org_id, user_id=user_id,
                body=AuditCreate(title="M3 fail", module="M3",
                                 target=_target(), lang="fr"),
                llm_provider=None,
            )
    assert out.status == "done"
    assert isinstance(out.metrics, M3MetricsOut)
    assert out.metrics.n_calls_failed == out.metrics.n_pairs * 2 \
        or out.metrics.n_calls_failed > 0
    assert out.metrics.verdict in ("pass", "warn", "fail")


async def test_run_m3_audit_deadline_zero_partial(ctx, monkeypatch):
    sm, org_id, user_id = ctx
    import app.integrations.llm_target as lt
    from app.core.config import get_settings

    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    monkeypatch.setenv("LLM_AUDIT_DEADLINE_S", "0")
    get_settings.cache_clear()
    try:
        with respx.mock:
            respx.post("https://api.example.com/v1").mock(
                return_value=httpx.Response(
                    200,
                    json={"choices": [{"message": {"content": "ok"}}]},
                )
            )
            async with sm() as session:
                out = await audit_service.run_m3_audit(
                    session, org_id=org_id, user_id=user_id,
                    body=AuditCreate(title="M3 deadline", module="M3",
                                     target=_target(), lang="fr"),
                    llm_provider=None,
                )
        assert out.status == "done"
        assert isinstance(out.metrics, M3MetricsOut)
        assert out.metrics.n_calls_failed >= 1  # deadline cancelled calls
    finally:
        get_settings.cache_clear()
