from __future__ import annotations

from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient

from app.core.config import get_settings
from app.core.errors import AuthError

_ALGORITHMS = ["RS256", "ES256"]
_AUDIENCE = "authenticated"


@lru_cache
def get_jwks_client() -> PyJWKClient:
    return PyJWKClient(get_settings().jwks_url)


def resolve_signing_key(token: str, *, jwks_client: PyJWKClient | None = None) -> Any:
    client = jwks_client or get_jwks_client()
    try:
        return client.get_signing_key_from_jwt(token).key
    except jwt.PyJWTError as exc:
        raise AuthError("Jeton invalide (clé de signature introuvable).") from exc


def verify_token(token: str, *, key: Any) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            key,
            algorithms=_ALGORITHMS,
            audience=_AUDIENCE,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthError("Jeton invalide ou expiré.") from exc
