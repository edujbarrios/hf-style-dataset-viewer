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


class NumericSummary(BaseModel):
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    std: float | None = None


class DatasetStatisticsResponse(BaseModel):
    rows: int = Field(ge=0)
    columns: int = Field(ge=0)
    missing_values: dict[str, int]
    unique_values: dict[str, int]
    numeric_summary: dict[str, NumericSummary]


class DatasetPreviewResponse(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_rows: int = Field(ge=0)
    columns: list[DatasetColumn]
    rows: list[dict[str, Any]]


class DatasetQueryRequest(BaseModel):
    sql: str = Field(min_length=1)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=500)
