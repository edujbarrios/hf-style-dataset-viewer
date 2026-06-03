from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.schemas.dataset import DatasetPreviewResponse, DatasetSchemaResponse, DatasetStatsResponse, DatasetSummary
from backend.services.datasets import DatasetService

router = APIRouter(prefix="/datasets", tags=["datasets"])


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

