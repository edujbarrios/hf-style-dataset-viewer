from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import duckdb
import polars as pl

from backend.schemas.dataset import DatasetFormat, DatasetStatisticsResponse, NumericSummary
from backend.services.datasets import DatasetRef, _escape_string, _quote_ident


@dataclass(frozen=True)
class DatasetStatisticsService:
    def compute(self, dataset: DatasetRef) -> DatasetStatisticsResponse:
        if dataset.format in (DatasetFormat.csv, DatasetFormat.parquet):
            return self._compute_polars(dataset)
        if dataset.format == DatasetFormat.json:
            return self._compute_duckdb(dataset)
        raise ValueError(f"Unsupported dataset format: {dataset.format}")

    def _compute_polars(self, dataset: DatasetRef) -> DatasetStatisticsResponse:
        path = str(dataset.path)
        if dataset.format == DatasetFormat.csv:
            lf = pl.scan_csv(path)
        elif dataset.format == DatasetFormat.parquet:
            lf = pl.scan_parquet(path)
        else:
            raise ValueError(f"Unsupported polars dataset format: {dataset.format}")

        schema = lf.collect_schema()
        columns = list(schema.keys())
        rows_df = lf.select(pl.len().alias("rows")).collect(streaming=True)
        rows = int(rows_df.item(0, 0))

        missing_row = (
            lf.select([pl.col(c).null_count().cast(pl.Int64).alias(c) for c in columns])
            .collect(streaming=True)
            .row(0)
        )
        missing_values = {col: int(v) for col, v in zip(columns, missing_row, strict=True)}

        unique_row = (
            lf.select([pl.col(c).n_unique().cast(pl.Int64).alias(c) for c in columns])
            .collect(streaming=True)
            .row(0)
        )
        unique_values = {col: int(v) for col, v in zip(columns, unique_row, strict=True)}

        numeric_cols = [name for name, dtype in schema.items() if dtype.is_numeric()]
        numeric_summary: dict[str, NumericSummary] = {}
        if numeric_cols:
            exprs: list[pl.Expr] = []
            for col in numeric_cols:
                exprs.extend(
                    [
                        pl.col(col).min().cast(pl.Float64).alias(f"{col}__min"),
                        pl.col(col).max().cast(pl.Float64).alias(f"{col}__max"),
                        pl.col(col).mean().cast(pl.Float64).alias(f"{col}__mean"),
                        pl.col(col).std().cast(pl.Float64).alias(f"{col}__std"),
                    ]
                )
            stats = lf.select(exprs).collect(streaming=True).row(0)
            names = [e.meta.output_name() for e in exprs]
            kv: dict[str, Any] = dict(zip(names, stats, strict=True))
            for col in numeric_cols:
                numeric_summary[col] = NumericSummary(
                    min=_as_float_or_none(kv.get(f"{col}__min")),
                    max=_as_float_or_none(kv.get(f"{col}__max")),
                    mean=_as_float_or_none(kv.get(f"{col}__mean")),
                    std=_as_float_or_none(kv.get(f"{col}__std")),
                )

        return DatasetStatisticsResponse(
            rows=rows,
            columns=len(columns),
            missing_values=missing_values,
            unique_values=unique_values,
            numeric_summary=numeric_summary,
        )

    def _compute_duckdb(self, dataset: DatasetRef) -> DatasetStatisticsResponse:
        con = duckdb.connect(database=":memory:")
        try:
            from_clause = f"read_json_auto('{_escape_string(str(dataset.path))}')"
            schema_cursor = con.execute(f"SELECT * FROM {from_clause} LIMIT 0")
            columns = [col[0] for col in schema_cursor.description]

            rows = int(con.execute(f"SELECT COUNT(*) FROM {from_clause}").fetchone()[0])

            missing_values: dict[str, int] = {}
            unique_values: dict[str, int] = {}
            for col in columns:
                col_ident = _quote_ident(col)
                missing_values[col] = int(
                    con.execute(f"SELECT COUNT(*) FROM {from_clause} WHERE {col_ident} IS NULL").fetchone()[
                        0
                    ]
                )
                unique_values[col] = int(
                    con.execute(f"SELECT COUNT(DISTINCT {col_ident}) FROM {from_clause}").fetchone()[0]
                )

            return DatasetStatisticsResponse(
                rows=rows,
                columns=len(columns),
                missing_values=missing_values,
                unique_values=unique_values,
                numeric_summary={},
            )
        finally:
            con.close()


def _as_float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except Exception:
        return None
