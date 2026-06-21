from __future__ import annotations

import datetime
import uuid
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Role(str, Enum):
    owner = "owner"
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


# Roles that can be assigned through invitations / role changes. ``owner`` is
# never assignable via the API (it is granted only to the org creator).
ASSIGNABLE_ROLES = {Role.admin, Role.editor, Role.viewer}
# Roles with administration rights.
ADMIN_ROLES = {Role.owner.value, Role.admin.value}


class InvitableRole(str, Enum):
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


# --- Organization -----------------------------------------------------------


class OrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    name: str
    siren: str | None = None
    sector: str | None = None
    country: str | None = None
    company_size: str | None = None
    dpo_name: str | None = None
    settings: dict[str, object]


class OrgUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    siren: str | None = Field(default=None, max_length=32)
    sector: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    company_size: str | None = Field(default=None, max_length=64)
    dpo_name: str | None = Field(default=None, max_length=255)


class OrgSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    llm_provider: str | None = None
    di_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    retention_days: int | None = Field(default=None, ge=1, le=3650)
    report_options: dict[str, object] | None = None


# --- Profile (me) -----------------------------------------------------------


class MeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    email: str
    first_name: str | None = None
    role: str
    org_id: uuid.UUID


class MeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_name: str | None = Field(default=None, max_length=120)


# --- Members ----------------------------------------------------------------


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    email: str
    first_name: str | None = None
    role: str
    created_at: datetime.datetime


class MemberRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Role


# --- Invitations ------------------------------------------------------------


class InvitationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    role: InvitableRole


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    email: str
    role: str
    status: str
    created_at: datetime.datetime
    expires_at: datetime.datetime


class InvitationCreateOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    invitation: InvitationOut
    invite_url: str
    email_sent: bool
