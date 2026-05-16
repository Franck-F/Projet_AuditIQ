from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    filename: str
    row_count: int
    columns: list[str]
    status: str
    created_at: datetime.datetime
    expires_at: datetime.datetime | None
