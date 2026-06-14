from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.errors import AuthError
from app.core.security import resolve_signing_key, verify_token
from app.models import Invitation, Organization, User
from app.schemas.auth import CurrentUser


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("En-tête Authorization Bearer manquant ou invalide.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise AuthError("En-tête Authorization Bearer manquant ou invalide.")
    return token


async def _find_pending_invitation(
    session: AsyncSession, email: str
) -> Invitation | None:
    """Return the most recent non-expired ``pending`` invitation for ``email``.

    The expiry check is done in Python so the comparison is timezone-aware and
    portable across SQLite (tests) and PostgreSQL.
    """
    now = datetime.now(timezone.utc)
    rows = (
        await session.execute(
            select(Invitation)
            .where(Invitation.email == email, Invitation.status == "pending")
            .order_by(Invitation.created_at.desc())
        )
    ).scalars()
    for inv in rows:
        expires = inv.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires > now:
            return inv
    return None


async def _provision(session: AsyncSession, uid: uuid.UUID, email: str) -> User:
    invitation = await _find_pending_invitation(session, email)
    if invitation is not None:
        user = User(
            id=uid,
            org_id=invitation.org_id,
            email=email,
            role=invitation.role,
        )
        session.add(user)
        invitation.status = "accepted"
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            existing = (
                await session.execute(select(User).where(User.id == uid))
            ).scalar_one_or_none()
            if existing is None:
                raise
            return existing
        return user

    domain = email.split("@")[-1] if "@" in email else "organisation"
    org = Organization(name=domain)
    session.add(org)
    await session.flush()
    user = User(id=uid, org_id=org.id, email=email, role="owner")
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        # A concurrent first-request already created this user; the orphan
        # org from this losing transaction is discarded by the rollback.
        await session.rollback()
        existing = (
            await session.execute(select(User).where(User.id == uid))
        ).scalar_one_or_none()
        if existing is None:
            raise
        return existing
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
    try:
        uid = uuid.UUID(str(sub))
    except ValueError as exc:
        raise AuthError("Jeton avec 'sub' invalide (UUID attendu).") from exc
    user = (
        await session.execute(select(User).where(User.id == uid))
    ).scalar_one_or_none()
    if user is None:
        user = await _provision(session, uid, str(email))
    return CurrentUser.model_validate(user)
