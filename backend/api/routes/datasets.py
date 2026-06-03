from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from backend.schemas.dataset import (
    DatasetPreviewResponse,
    DatasetSchemaResponse,
    DatasetStatisticsResponse,
    DatasetStatsResponse,
    DatasetSummary,
)
from backend.services.datasets import DatasetService
from backend.services.statistics import DatasetStatisticsService

router = APIRouter(prefix="/datasets", tags=["datasets"])

_ALLOWED_ASSET_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
}


@router.get("", response_model=list[DatasetSummary])
def list_datasets() -> list[DatasetSummary]:
    return DatasetService().list_datasets()


@router.get("/{name}/schema", response_model=DatasetSchemaResponse)
def dataset_schema(name: str) -> DatasetSchemaResponse:
    try:
        return DatasetService().get_schema(name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{name}/stats", response_model=DatasetStatsResponse)
def dataset_stats(name: str) -> DatasetStatsResponse:
    try:
        return DatasetService().get_stats(name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{name}/statistics", response_model=DatasetStatisticsResponse)
def dataset_statistics(name: str) -> DatasetStatisticsResponse:
    try:
        dataset = DatasetService().get_dataset(name)
        return DatasetStatisticsService().compute(dataset)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{name}/preview", response_model=DatasetPreviewResponse)
def dataset_preview(
    name: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
    search: str | None = Query(default=None),
    sort_by: str | None = Query(default=None),
    sort_dir: str = Query(default="asc", pattern="^(asc|desc)$"),
) -> DatasetPreviewResponse:
    try:
        return DatasetService().preview(
            name=name,
            page=page,
            page_size=page_size,
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{name}/asset")
def dataset_asset(name: str, path: str = Query(..., min_length=1)) -> FileResponse:
    """
    Serve image assets referenced by a dataset (e.g. an `image_path` column).

    `path` must be a relative path under the dataset's directory.
    """
    try:
        dataset = DatasetService().get_dataset(name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    requested = Path(path)
    if requested.is_absolute():
        raise HTTPException(status_code=400, detail="Asset path must be relative")

    base = dataset.path.parent.resolve()
    target = (base / requested).resolve()
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Asset path escapes dataset directory") from exc

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Asset not found")

    if target.suffix.lower() not in _ALLOWED_ASSET_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported asset type")

    media_type, _ = mimetypes.guess_type(target.name)
    return FileResponse(path=target, media_type=media_type or "application/octet-stream")
