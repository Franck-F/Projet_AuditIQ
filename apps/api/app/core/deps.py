from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.errors import AuthError
from app.core.security import resolve_signing_key, verify_token
from app.models import Organization, User
from app.schemas.auth import CurrentUser


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("En-tête Authorization Bearer manquant ou invalide.")
    return authorization.split(" ", 1)[1].strip()


async def _provision(session: AsyncSession, uid: uuid.UUID, email: str) -> User:
    domain = email.split("@")[-1] if "@" in email else "organisation"
    org = Organization(name=domain)
    session.add(org)
    await session.flush()
    user = User(id=uid, org_id=org.id, email=email, role="owner")
    session.add(user)
    await session.commit()
    return user


def _issuer() -> str:
    return f"{get_settings().supabase_url.rstrip('/')}/auth/v1"


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> CurrentUser:
    token = _bearer(authorization)
    key = resolve_signing_key(token)
    claims = verify_token(token, key=key, issuer=_issuer())
    sub = claims.get("sub")
    email = claims.get("email")
    if not sub or not email:
        raise AuthError("Jeton sans 'sub' ou 'email'.")
    uid = uuid.UUID(str(sub))
    user = (
        await session.execute(select(User).where(User.id == uid))
    ).scalar_one_or_none()
    if user is None:
        user = await _provision(session, uid, str(email))
    return CurrentUser.model_validate(user)
