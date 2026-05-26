import io
import uuid as _uuid_mod

import httpx
import numpy as np
import pandas as pd
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.integrations.storage import MemoryStorage
from app.main import create_app
from app.routers.audits import get_report_storage_dep
from app.routers.datasets import get_storage_dep
from app.services import audit_service


def _recruitment_csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["Hommes,oui"] * 100 + ["Hommes,non"] * 100
    rows += ["Femmes,oui"] * 72 + ["Femmes,non"] * 128
    return ("\n".join(rows) + "\n").encode()


def _m2_csv() -> bytes:
    rng = np.random.default_rng(42)
    a = pd.DataFrame({"f1": rng.normal(-5, .5, 120), "f2": rng.normal(-5, .5, 120),
                      "embauche": (["oui"] * 108) + (["non"] * 12)})
    b = pd.DataFrame({"f1": rng.normal(5, .5, 120), "f2": rng.normal(5, .5, 120),
                      "embauche": (["oui"] * 12) + (["non"] * 108)})
    buf = io.BytesIO()
    pd.concat([a, b], ignore_index=True).to_csv(buf, index=False)
    return buf.getvalue()


@pytest.fixture
async def client(tmp_path, monkeypatch):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'r.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    store = MemoryStorage()

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps, "verify_token",
        lambda token, *, key, issuer=None: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "c@acme.fr",
        },
    )
    report_store = MemoryStorage()
    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    app.dependency_overrides[get_storage_dep] = lambda: store
    app.dependency_overrides[get_report_storage_dep] = lambda: report_store
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        yield c
    await eng.dispose()


@pytest.fixture
async def client_with_sm(tmp_path, monkeypatch):
    """Extended fixture: yields (http_client, session_maker, store).

    Patches both the FastAPI dep override (for upload route) and the module-
    level get_storage() singleton (for compute_mX_audit in run_audit_job) so
    they share the same MemoryStorage instance.
    """
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'r.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    store = MemoryStorage()

    # Patch get_storage in audit_service so compute_mX_audit finds test data
    # when run_audit_job calls it out-of-band (not via FastAPI dep injection).
    import app.services.audit_service as _svc
    monkeypatch.setattr(_svc, "get_storage", lambda: store)

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps, "verify_token",
        lambda token, *, key, issuer=None: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "c@acme.fr",
        },
    )
    report_store = MemoryStorage()
    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    app.dependency_overrides[get_storage_dep] = lambda: store
    app.dependency_overrides[get_report_storage_dep] = lambda: report_store
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        yield c, sm, store
    await eng.dispose()


async def _upload(client) -> str:
    files = {"file": ("r.csv", _recruitment_csv(), "text/csv")}
    r = await client.post(
        "/api/v1/datasets", files=files, headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 201
    return r.json()["id"]


async def _upload_m2(client) -> str:
    files = {"file": ("m2.csv", _m2_csv(), "text/csv")}
    r = await client.post(
        "/api/v1/datasets", files=files, headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 201
    return r.json()["id"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _patch_create_task(monkeypatch):
    """Replace asyncio.create_task in the router module with a capture shim.

    Returns a list; each call to create_task appends the coroutine. The router
    still gets a real (no-op) Task back so FastAPI is happy. The test then
    awaits each captured coroutine deterministically.
    """
    import app.routers.audits as _r

    captured: list = []
    _real = _r.asyncio.create_task

    async def _noop() -> None:
        return None

    def _shim(coro):  # type: ignore[override]
        captured.append(coro)
        return _real(_noop())

    monkeypatch.setattr(_r.asyncio, "create_task", _shim)
    return captured


async def _drive_jobs(captured, audit_id_str, body_obj, sm):
    """Run all captured coroutines deterministically via run_audit_job.

    ``audit_id_str`` is the UUID from the JSON response (a plain str); it is
    converted to a ``uuid.UUID`` so SQLAlchemy receives the correct type.

    Resets the module-level audit semaphore so it binds to the current event
    loop (the semaphore persists across test functions which each have their own
    loop; using a stale semaphore causes a silent hang/failure in run_audit_job).
    """
    import uuid as _uuid

    import app.services.audit_service as _svc

    _svc._audit_semaphore = None  # force re-creation on current event loop
    for coro in captured:
        coro.close()  # discard — we re-run via run_audit_job with the test sm
    await audit_service.run_audit_job(
        _uuid.UUID(audit_id_str), body_obj, None, session_maker=sm
    )


# ---------------------------------------------------------------------------
# M1 tests
# ---------------------------------------------------------------------------

async def test_run_audit_end_to_end(client_with_sm, monkeypatch):
    from app.schemas.audit import AuditCreate

    client, sm, _store = client_with_sm
    did = await _upload(client)
    captured = _patch_create_task(monkeypatch)

    post_json = {
        "dataset_id": did,
        "title": "Recrutement Q2",
        "protected_attribute": "genre",
        "decision_column": "decision",
        "favorable_value": "oui",
    }
    r = await client.post(
        "/api/v1/audits", json=post_json, headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 202
    body = r.json()
    assert body["status"] == "pending"
    assert body["metrics"] is None

    await _drive_jobs(captured, body["id"], AuditCreate(**post_json), sm)

    g = await client.get(
        f"/api/v1/audits/{body['id']}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["status"] == "done"
    assert g.json()["metrics"]["verdict"] == "fail"
    assert g.json()["metrics"]["disparate_impact"] == 0.72
    assert g.json()["metrics"]["risk_score"] == 55
    assert g.json()["metrics"]["worst_group"] == "Femmes"
    assert "pre_check" in g.json()


async def test_run_audit_bad_mapping_sets_failed(client_with_sm, monkeypatch):
    """A bad column mapping no longer raises 422 at POST time — it surfaces as
    status='failed' once the background job runs.
    """
    from app.schemas.audit import AuditCreate

    client, sm, _store = client_with_sm
    did = await _upload(client)
    captured = _patch_create_task(monkeypatch)

    post_json = {
        "dataset_id": did,
        "title": "Bad",
        "protected_attribute": "ABSENT",
        "decision_column": "decision",
        "favorable_value": "oui",
    }
    r = await client.post(
        "/api/v1/audits", json=post_json, headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 202
    body = r.json()
    assert body["status"] == "pending"

    await _drive_jobs(captured, body["id"], AuditCreate(**post_json), sm)

    g = await client.get(
        f"/api/v1/audits/{body['id']}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["status"] == "failed"
    assert g.json()["error"] is not None


# ---------------------------------------------------------------------------
# M2 tests
# ---------------------------------------------------------------------------

@pytest.fixture
async def m2_dataset_id(client):
    return await _upload_m2(client)


async def test_post_audits_m2_path(client_with_sm, monkeypatch):
    from app.schemas.audit import AuditCreate

    client, sm, _store = client_with_sm
    m2_did = await _upload_m2(client)
    captured = _patch_create_task(monkeypatch)

    post_json = {
        "dataset_id": str(m2_did),
        "title": "M2 via API",
        "module": "M2",
        "decision_column": "embauche",
        "favorable_value": "oui",
        "config": {"k": 2},
    }
    r = await client.post(
        "/api/v1/audits", json=post_json, headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["module"] == "M2"
    assert body["status"] == "pending"
    assert body["metrics"] is None

    await _drive_jobs(captured, body["id"], AuditCreate(**post_json), sm)

    g = await client.get(
        f"/api/v1/audits/{body['id']}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["status"] == "done"
    assert g.json()["metrics"]["verdict"] in ("fail", "warn", "pass")
    assert "pre_check" in g.json()


async def test_post_audits_m2_bad_config_sets_failed(client_with_sm, monkeypatch):
    """k=999 is valid at submission time; the engine rejects it at compute
    time, surfacing as status='failed'.
    """
    from app.schemas.audit import AuditCreate

    client, sm, _store = client_with_sm
    m2_did = await _upload_m2(client)
    captured = _patch_create_task(monkeypatch)

    post_json = {
        "dataset_id": str(m2_did),
        "title": "bad",
        "module": "M2",
        "decision_column": "embauche",
        "favorable_value": "oui",
        "config": {"k": 999},
    }
    r = await client.post(
        "/api/v1/audits", json=post_json, headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 202, r.text
    body = r.json()

    await _drive_jobs(captured, body["id"], AuditCreate(**post_json), sm)

    g = await client.get(
        f"/api/v1/audits/{body['id']}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["status"] == "failed"


# ---------------------------------------------------------------------------
# Report tests (require a completed M1 audit)
# ---------------------------------------------------------------------------

async def _post_and_complete_m1(client, sm, monkeypatch, did: str) -> str:
    """POST an M1 audit, drive its background job, return the audit id."""
    from app.schemas.audit import AuditCreate

    captured = _patch_create_task(monkeypatch)
    post_json = {
        "dataset_id": did,
        "title": "Recrutement Q2 report",
        "protected_attribute": "genre",
        "decision_column": "decision",
        "favorable_value": "oui",
    }
    r = await client.post(
        "/api/v1/audits", json=post_json, headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["status"] == "pending"

    await _drive_jobs(captured, body["id"], AuditCreate(**post_json), sm)
    return body["id"]


async def test_get_audit_report_xlsx(client_with_sm, monkeypatch):
    client, sm, _store = client_with_sm
    did = await _upload(client)
    audit_id = await _post_and_complete_m1(client, sm, monkeypatch, did)

    r = await client.get(
        f"/api/v1/audits/{audit_id}/report.xlsx",
        headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 200, r.text
    assert (
        r.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert "attachment" in r.headers["content-disposition"]
    assert r.content[:2] == b"PK"


async def test_get_audit_report_unknown_is_404(client):
    r = await client.get(
        f"/api/v1/audits/{_uuid_mod.uuid4()}/report.xlsx",
        headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 404


async def test_get_audit_report_pdf(client_with_sm, monkeypatch):
    import httpx as _hx
    import respx as _rx

    client, sm, _store = client_with_sm

    monkeypatch.setenv("PDF_SERVICE_URL", "http://pdf:8080")
    monkeypatch.setenv("PDF_SERVICE_SECRET", "shh")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        did = await _upload(client)
        audit_id = await _post_and_complete_m1(client, sm, monkeypatch, did)

        with _rx.mock:
            _rx.post("http://pdf:8080/render").mock(
                return_value=_hx.Response(200, content=b"%PDF-1.7 ok")
            )
            r = await client.get(
                f"/api/v1/audits/{audit_id}/report.pdf",
                headers={"Authorization": "Bearer x"},
            )
        assert r.status_code == 200, r.text
        assert r.headers["content-type"] == "application/pdf"
        assert "attachment" in r.headers["content-disposition"]
        assert r.content[:4] == b"%PDF"
    finally:
        get_settings.cache_clear()


async def test_get_audit_report_pdf_unknown_is_404(client):
    r = await client.get(
        f"/api/v1/audits/{_uuid_mod.uuid4()}/report.pdf",
        headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# M3 tests
# ---------------------------------------------------------------------------

async def test_post_audits_m3(client_with_sm, monkeypatch):
    import httpx as _hx
    import respx as _rx

    import app.integrations.llm_target as lt
    from app.schemas.audit import AuditCreate

    client, sm, _store = client_with_sm
    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    captured = _patch_create_task(monkeypatch)

    m3_json = {
        "title": "Chatbot", "module": "M3",
        "target": {"url": "https://api.example.com/v1", "method": "POST",
                   "headers": {}, "body_template":
                   '{"messages":[{"role":"user","content":"{prompt}"}]}',
                   "response_path": "choices.0.message.content"},
        "lang": "fr",
    }

    _mock_resp = {"choices": [{"message": {"content":
        "Une réponse neutre et suffisamment longue pour le test."}}]}

    with _rx.mock:
        _rx.post("https://api.example.com/v1").mock(
            return_value=_hx.Response(200, json=_mock_resp)
        )
        r = await client.post("/api/v1/audits", json=m3_json,
                              headers={"Authorization": "Bearer x"})

    assert r.status_code == 202, r.text
    body = r.json()
    assert body["module"] == "M3"
    assert body["status"] == "pending"
    assert body["metrics"] is None

    # Close the captured noop coro; re-run via run_audit_job with test sm
    import uuid as _uuid

    import app.services.audit_service as _svc
    _svc._audit_semaphore = None  # reset for current event loop

    for coro in captured:
        coro.close()

    with _rx.mock:
        _rx.post("https://api.example.com/v1").mock(
            return_value=_hx.Response(200, json=_mock_resp)
        )
        await audit_service.run_audit_job(
            _uuid.UUID(body["id"]), AuditCreate(**m3_json), None,
            session_maker=sm,
        )

    g = await client.get(
        f"/api/v1/audits/{body['id']}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["module"] == "M3"
    assert g.json()["metrics"]["verdict"] in ("pass", "warn", "fail")


async def test_post_audits_m3_ssrf_is_422(client):
    r = await client.post("/api/v1/audits", json={
        "title": "bad", "module": "M3",
        "target": {"url": "http://169.254.169.254/latest", "method": "POST",
                   "headers": {}, "body_template": "{prompt}",
                   "response_path": "a"},
        "lang": "fr",
    }, headers={"Authorization": "Bearer x"})
    assert r.status_code == 422
