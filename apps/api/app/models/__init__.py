"""SQLAlchemy models for AuditIQ.

Conventions:
- Explicit ``nullable=`` is kept on every column (and matches the ``Mapped[...]``
  annotation) to maintain a 1:1 mapping with the hand-written Alembic migration.
- No ORM ``relationship()`` is defined: services issue explicit queries
  (spec §2). TODO(Plan-2B): add relationships only if a service needs
  navigation (e.g. ``audit.results``); FK columns already exist.
"""
from app.core.db import Base
from app.models.audit import Audit
from app.models.audit_result import AuditResult
from app.models.dataset import Dataset
from app.models.organization import Organization
from app.models.report import Report
from app.models.user import User

__all__ = ["Base", "Organization", "User", "Dataset", "Audit", "AuditResult", "Report"]
