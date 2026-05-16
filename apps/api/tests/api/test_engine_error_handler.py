import httpx
import pytest
from fastapi import FastAPI

from app.audit_engine import DatasetValidationError
from app.core.errors import register_exception_handlers


@pytest.fixture
def client():
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    async def _boom() -> dict[str, str]:
        raise DatasetValidationError(
            "Colonne « x » absente.", field="protected_attribute"
        )

    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://t")


async def test_dataset_validation_error_maps_to_422_problem(client):
    async with client as c:
        r = await c.get("/boom")
    assert r.status_code == 422
    body = r.json()
    assert body["title"] == "Dataset Validation Error"
    assert body["status"] == 422
    assert body["detail"] == "Colonne « x » absente."
    assert body["fields"] == {"protected_attribute": "Colonne « x » absente."}
    assert r.headers["content-type"].startswith("application/problem+json")
