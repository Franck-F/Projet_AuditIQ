from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.errors import APIError, NotFoundError
from app.integrations.email import send_invitation_email
from app.models import Invitation, Organization, User
from app.schemas.auth import CurrentUser
from app.schemas.org import (
    ADMIN_ROLES,
    InvitationCreate,
    InvitationCreateOut,
    InvitationOut,
    MemberOut,
    MemberRoleUpdate,
    MeOut,
    MeUpdate,
    OrgOut,
    OrgSettingsUpdate,
    OrgUpdate,
    Role,
)

router = APIRouter(tags=["org"])

_ROLE_LABELS = {
    "owner": "Propriétaire",
    "admin": "Administrateur",
    "editor": "Éditeur",
    "viewer": "Lecture seule",
}
_INVITATION_TTL = timedelta(days=14)


class ForbiddenError(APIError):
    status = 403
    title = "Forbidden"


def _require_admin(user: CurrentUser) -> None:
    if user.role not in ADMIN_ROLES:
        raise ForbiddenError(
            "Action réservée aux administrateurs de l'organisation."
        )


async def _get_org(session: AsyncSession, org_id: uuid.UUID) -> Organization:
    org = (
        await session.execute(
            select(Organization).where(Organization.id == org_id)
        )
    ).scalar_one_or_none()
    if org is None:
        raise NotFoundError("Organisation introuvable.")
    return org


# --- Organization -----------------------------------------------------------


@router.get("/org", response_model=OrgOut)
async def get_org(
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Organization:
    return await _get_org(session, user.org_id)


@router.patch("/org", response_model=OrgOut)
async def update_org(
    body: OrgUpdate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Organization:
    _require_admin(user)
    org = await _get_org(session, user.org_id)
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(org, key, value)
    await session.commit()
    await session.refresh(org)
    return org


@router.patch("/org/settings", response_model=OrgOut)
async def update_org_settings(
    body: OrgSettingsUpdate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Organization:
    _require_admin(user)
    org = await _get_org(session, user.org_id)
    # Merge onto a copy so SQLAlchemy detects the JSON column change.
    settings = dict(org.settings or {})
    settings.update(body.model_dump(exclude_unset=True))
    org.settings = settings
    await session.commit()
    await session.refresh(org)
    return org


# --- Profile (me) -----------------------------------------------------------


async def _load_user(session: AsyncSession, uid: uuid.UUID) -> User:
    db_user = (
        await session.execute(select(User).where(User.id == uid))
    ).scalar_one_or_none()
    if db_user is None:
        raise NotFoundError("Utilisateur introuvable.")
    return db_user


@router.get("/me", response_model=MeOut)
async def get_me(
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> User:
    return await _load_user(session, user.id)


@router.patch("/me", response_model=MeOut)
async def update_me(
    body: MeUpdate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> User:
    db_user = await _load_user(session, user.id)
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_user, key, value)
    await session.commit()
    await session.refresh(db_user)
    return db_user


# --- Members ----------------------------------------------------------------


@router.get("/org/members", response_model=list[MemberOut])
async def list_members(
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> list[User]:
    rows = (
        await session.execute(
            select(User)
            .where(User.org_id == user.org_id)
            .order_by(User.created_at.asc())
        )
    ).scalars()
    return list(rows)


@router.patch("/org/members/{user_id}", response_model=MemberOut)
async def update_member_role(
    user_id: uuid.UUID,
    body: MemberRoleUpdate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> User:
    _require_admin(user)
    target = (
        await session.execute(
            select(User).where(
                User.id == user_id, User.org_id == user.org_id
            )
        )
    ).scalar_one_or_none()
    if target is None:
        raise NotFoundError("Membre introuvable dans cette organisation.")

    new_role = body.role.value

    # A non-owner cannot modify an owner.
    if target.role == Role.owner.value and user.role != Role.owner.value:
        raise ForbiddenError("Seul un propriétaire peut modifier un propriétaire.")

    # Forbid removing the last admin/owner of the org.
    if target.role in ADMIN_ROLES and new_role not in ADMIN_ROLES:
        admin_count = (
            await session.execute(
                select(func.count())
                .select_from(User)
                .where(
                    User.org_id == user.org_id,
                    User.role.in_(tuple(ADMIN_ROLES)),
                )
            )
        ).scalar_one()
        if admin_count <= 1:
            raise ForbiddenError(
                "Impossible de rétrograder le dernier administrateur de "
                "l'organisation."
            )

    target.role = new_role
    await session.commit()
    await session.refresh(target)
    return target


# --- Invitations ------------------------------------------------------------


def _invite_url(token: str) -> str:
    base = get_settings().app_base_url.rstrip("/")
    return f"{base}/invitations/{token}"


@router.post("/org/invitations", response_model=InvitationCreateOut)
async def create_invitation(
    body: InvitationCreate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> InvitationCreateOut:
    _require_admin(user)
    email = body.email.lower()

    # Reject if the person is already a member of the org.
    existing_member = (
        await session.execute(
            select(User).where(
                User.org_id == user.org_id, User.email == email
            )
        )
    ).scalar_one_or_none()
    if existing_member is not None:
        raise APIError(
            "Cette personne est déjà membre de l'organisation.",
            status=409,
            title="Conflict",
        )

    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        org_id=user.org_id,
        email=email,
        role=body.role.value,
        token=token,
        status="pending",
        invited_by=user.id,
        expires_at=datetime.now(timezone.utc) + _INVITATION_TTL,
    )
    session.add(invitation)
    await session.commit()
    await session.refresh(invitation)

    org = await _get_org(session, user.org_id)
    invite_url = _invite_url(token)
    email_sent = await send_invitation_email(
        to_email=email,
        org_name=org.name,
        role_label=_ROLE_LABELS.get(body.role.value, body.role.value),
        invite_url=invite_url,
    )
    return InvitationCreateOut(
        invitation=InvitationOut.model_validate(invitation),
        invite_url=invite_url,
        email_sent=email_sent,
    )


@router.get("/org/invitations", response_model=list[InvitationOut])
async def list_invitations(
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> list[Invitation]:
    rows = (
        await session.execute(
            select(Invitation)
            .where(
                Invitation.org_id == user.org_id,
                Invitation.status == "pending",
            )
            .order_by(Invitation.created_at.desc())
        )
    ).scalars()
    return list(rows)


@router.delete(
    "/org/invitations/{invitation_id}", status_code=204, response_class=Response
)
async def revoke_invitation(
    invitation_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Response:
    _require_admin(user)
    invitation = (
        await session.execute(
            select(Invitation).where(
                Invitation.id == invitation_id,
                Invitation.org_id == user.org_id,
            )
        )
    ).scalar_one_or_none()
    if invitation is None:
        raise NotFoundError("Invitation introuvable.")
    invitation.status = "revoked"
    await session.commit()
    return Response(status_code=204)
