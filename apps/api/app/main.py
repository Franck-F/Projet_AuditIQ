from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.routers import audits, auth, datasets, health

API_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    app = FastAPI(
        title="AuditIQ API",
        version="0.1.0",
        docs_url=f"{API_PREFIX}/docs",
        openapi_url=f"{API_PREFIX}/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(health.router, prefix=API_PREFIX)
    app.include_router(auth.router, prefix=API_PREFIX)
    app.include_router(datasets.router, prefix=API_PREFIX)
    app.include_router(audits.router, prefix=API_PREFIX)
    return app


app = create_app()
