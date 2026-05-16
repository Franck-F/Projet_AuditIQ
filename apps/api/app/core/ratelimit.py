from __future__ import annotations

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.errors import Problem

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[lambda: get_settings().api_rate_limit_default],
)


def rate_limit_handler(_: Request, exc: Exception) -> Response:
    detail = exc.detail if isinstance(exc, RateLimitExceeded) else "limite atteinte"
    problem = Problem(
        title="Too Many Requests",
        status=429,
        detail=f"Limite de débit dépassée ({detail}).",
    )
    return JSONResponse(
        status_code=429,
        content=problem.model_dump(exclude_none=True),
        media_type="application/problem+json",
    )
