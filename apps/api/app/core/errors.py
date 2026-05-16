from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class Problem(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    fields: dict[str, str] | None = None


class APIError(Exception):
    status: int = 500
    title: str = "Internal Server Error"

    def __init__(
        self,
        detail: str | None = None,
        *,
        fields: dict[str, str] | None = None,
        title: str | None = None,
        status: int | None = None,
    ) -> None:
        self.detail = detail
        self.fields = fields
        if title is not None:
            self.title = title
        if status is not None:
            self.status = status
        super().__init__(detail or self.title)

    def to_problem(self) -> Problem:
        return Problem(
            title=self.title,
            status=self.status,
            detail=self.detail,
            fields=self.fields,
        )


class NotFoundError(APIError):
    status = 404
    title = "Not Found"


class AuthError(APIError):
    status = 401
    title = "Unauthorized"


class ValidationError(APIError):
    status = 422
    title = "Validation Error"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def _api_error(_: Request, exc: APIError) -> JSONResponse:
        problem = exc.to_problem()
        return JSONResponse(
            status_code=problem.status,
            content=problem.model_dump(exclude_none=True),
            media_type="application/problem+json",
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = {
            ".".join(str(p) for p in e["loc"] if p != "body"): e["msg"]
            for e in exc.errors()
        }
        problem = Problem(
            title="Validation Error",
            status=422,
            detail="La requête est invalide.",
            fields=fields,
        )
        return JSONResponse(
            status_code=422,
            content=problem.model_dump(exclude_none=True),
            media_type="application/problem+json",
        )
