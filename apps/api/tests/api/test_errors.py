import httpx
import pytest
from fastapi import FastAPI

from app.core.errors import AuthError, NotFoundError, register_exception_handlers


@pytest.fixture
def client():
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/missing")
    async def _missing() -> dict[str, str]:
        raise NotFoundError("dataset introuvable")

    @app.get("/secret")
    async def _secret() -> dict[str, str]:
        raise AuthError()

    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://t")


async def test_not_found_problem(client):
    async with client as c:
        r = await c.get("/missing")
    assert r.status_code == 404
    body = r.json()
    assert body["title"] == "Not Found"
    assert body["status"] == 404
    assert body["detail"] == "dataset introuvable"
    assert "fields" not in body


async def test_auth_error_problem(client):
    async with client as c:
        r = await c.get("/secret")
    assert r.status_code == 401
    assert r.json()["title"] == "Unauthorized"


async def test_request_validation_error_maps_to_problem():
    from pydantic import BaseModel

    app = FastAPI()
    register_exception_handlers(app)

    class Body(BaseModel):
        name: str
        age: int

    @app.post("/things")
    async def _create(_: Body) -> dict[str, str]:
        return {"ok": "1"}

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post("/things", json={"name": "x"})
    assert r.status_code == 422
    body = r.json()
    assert body["title"] == "Validation Error"
    assert body["status"] == 422
    assert body["detail"] == "La requête est invalide."
    # leading "body" sentinel stripped -> key is "age", not "body.age"
    assert "age" in body["fields"]
    assert "body" not in body["fields"]
