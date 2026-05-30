from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.errors import APIError
from app.integrations.storage import Storage, get_storage
from app.schemas.auth import CurrentUser
from app.schemas.dataset import DatasetAnalysisOut, DatasetOut
from app.services import dataset_service

router = APIRouter(prefix="/datasets", tags=["datasets"])


def get_storage_dep() -> Storage:
    return get_storage()


@router.post("", response_model=DatasetOut, status_code=201)
async def upload_dataset(
    file: UploadFile,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
) -> DatasetOut:
    raw = await file.read()
    max_bytes = get_settings().max_upload_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise APIError(
            f"Fichier trop volumineux (max {get_settings().max_upload_mb} Mo).",
            title="Payload Too Large",
            status=413,
        )
    dataset = await dataset_service.create_dataset(
        session,
        storage,
        org_id=user.org_id,
        user_id=user.id,
        filename=file.filename or "dataset.csv",
        raw=raw,
        retention_days=get_settings().retention_days_default,
    )
    return DatasetOut.model_validate(dataset)


@router.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(
    dataset_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> DatasetOut:
    dataset = await dataset_service.get_dataset(
        session, dataset_id, org_id=user.org_id
    )
    return DatasetOut.model_validate(dataset)


@router.post("/{dataset_id}/analyze", response_model=DatasetAnalysisOut)
async def analyze_dataset(
    dataset_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
) -> DatasetAnalysisOut:
    return await dataset_service.get_or_build_analysis(
        session, storage, dataset_id, org_id=user.org_id
    )
