from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class DatasetFormat(StrEnum):
    csv = "csv"
    json = "json"
    parquet = "parquet"


class DatasetSummary(BaseModel):
    name: str
    format: DatasetFormat
    rows: int = Field(ge=0)


class DatasetColumn(BaseModel):
    name: str
    dtype: str


class DatasetSchemaResponse(BaseModel):
    columns: list[DatasetColumn]


class DatasetStatsResponse(BaseModel):
    rows: int = Field(ge=0)
    columns: int = Field(ge=0)


class DatasetPreviewResponse(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_rows: int = Field(ge=0)
    columns: list[DatasetColumn]
    rows: list[dict[str, Any]]

