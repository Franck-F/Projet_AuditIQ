from __future__ import annotations

import datetime
import io
import json
import uuid

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_engine import run_dataset_analysis
from app.core.errors import APIError, NotFoundError
from app.integrations.storage import Storage
from app.models import Dataset
from app.schemas.dataset import DatasetAnalysisOut


def _parse_csv(raw: bytes) -> tuple[list[str], int]:
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:  # pandas raises many types for bad input  # noqa: BLE001
        raise APIError(
            "Fichier CSV illisible.",
            title="Invalid Dataset",
            status=422,
        ) from exc
    if df.shape[1] == 0 or df.empty:
        raise APIError(
            "Le CSV ne contient aucune donnée exploitable.",
            title="Invalid Dataset",
            status=422,
        )
    return [str(c) for c in df.columns], int(len(df))


async def create_dataset(
    session: AsyncSession,
    storage: Storage,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    filename: str,
    raw: bytes,
    retention_days: int,
) -> Dataset:
    columns, row_count = _parse_csv(raw)
    dataset_id = uuid.uuid4()
    storage_path = f"{org_id}/{dataset_id}.csv"
    await storage.upload(storage_path, raw, "text/csv")
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    dataset = Dataset(
        id=dataset_id,
        org_id=org_id,
        uploaded_by=user_id,
        filename=filename,
        storage_path=storage_path,
        row_count=row_count,
        columns=columns,
        status="ready",
        expires_at=now + datetime.timedelta(days=retention_days),
    )
    session.add(dataset)
    await session.commit()
    return dataset


async def get_dataset(
    session: AsyncSession, dataset_id: uuid.UUID, *, org_id: uuid.UUID
) -> Dataset:
    dataset = (
        await session.execute(
            select(Dataset).where(
                Dataset.id == dataset_id, Dataset.org_id == org_id
            )
        )
    ).scalar_one_or_none()
    if dataset is None:
        raise NotFoundError("Jeu de données introuvable.")
    return dataset


async def get_or_build_analysis(
    session: AsyncSession,
    storage: Storage,
    dataset_id: uuid.UUID,
    *,
    org_id: uuid.UUID,
) -> DatasetAnalysisOut:
    """Return cached analysis or compute, cache, and return it.

    RLS enforced via org_id scope. Raises NotFoundError for cross-org access.
    """
    dataset = await get_dataset(session, dataset_id, org_id=org_id)
    if dataset.analysis_cache:
        return DatasetAnalysisOut.model_validate(dataset.analysis_cache)
    raw = await storage.download(dataset.storage_path)
    df = pd.read_csv(io.BytesIO(raw))
    analysis = run_dataset_analysis(df)
    out = DatasetAnalysisOut.from_engine(analysis)
    dataset.analysis_cache = json.loads(out.model_dump_json())
    await session.commit()
    return out
