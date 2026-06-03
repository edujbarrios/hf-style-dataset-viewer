from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import duckdb

from backend.core.config import datasets_dir
from backend.schemas.dataset import (
    DatasetColumn,
    DatasetFormat,
    DatasetPreviewResponse,
    DatasetSchemaResponse,
    DatasetStatsResponse,
    DatasetSummary,
)


@dataclass(frozen=True)
class DatasetRef:
    name: str
    format: DatasetFormat
    path: Path


class DatasetService:
    def list_datasets(self) -> list[DatasetSummary]:
        summaries: list[DatasetSummary] = []
        for dataset in self._discover():
            rows = self._count_rows(dataset)
            summaries.append(DatasetSummary(name=dataset.name, format=dataset.format, rows=rows))
        return sorted(summaries, key=lambda d: d.name)

    def get_schema(self, name: str) -> DatasetSchemaResponse:
        dataset = self._get_by_name(name)
        columns = self._schema_columns(dataset)
        return DatasetSchemaResponse(columns=columns)

    def get_stats(self, name: str) -> DatasetStatsResponse:
        dataset = self._get_by_name(name)
        rows = self._count_rows(dataset)
        columns = len(self._schema_columns(dataset))
        return DatasetStatsResponse(rows=rows, columns=columns)

    def preview(
        self,
        *,
        name: str,
        page: int,
        page_size: int,
        search: str | None,
        sort_by: str | None,
        sort_dir: str,
    ) -> DatasetPreviewResponse:
        dataset = self._get_by_name(name)
        all_columns = self._schema_columns(dataset)

        sort_column = None
        if sort_by is not None:
            allowed = {c.name for c in all_columns}
            if sort_by not in allowed:
                raise ValueError(f"Unknown sort_by column: {sort_by}")
            sort_column = sort_by

        offset = (page - 1) * page_size
        from_clause = self._from_clause(dataset)
        where_clause = self._where_search(all_columns, search)
        order_clause = ""
        if sort_column:
            order_clause = f" ORDER BY {_quote_ident(sort_column)} {sort_dir.upper()}"

        con = duckdb.connect(database=":memory:")
        try:
            count_sql = f"SELECT COUNT(*) AS count FROM {from_clause}{where_clause}"
            total_rows = int(con.execute(count_sql).fetchone()[0])

            data_sql = (
                f"SELECT * FROM {from_clause}{where_clause}{order_clause} LIMIT {page_size} OFFSET {offset}"
            )
            rows = _fetch_dicts(con, data_sql)
        finally:
            con.close()

        return DatasetPreviewResponse(
            page=page,
            page_size=page_size,
            total_rows=total_rows,
            columns=all_columns,
            rows=rows,
        )

    def _discover(self) -> Iterable[DatasetRef]:
        base = datasets_dir()
        if not base.exists():
            return []
        if not base.is_dir():
            return []

        candidates: list[tuple[Path, DatasetFormat]] = []
        for path in sorted(base.iterdir()):
            if not path.is_file():
                continue
            fmt = _format_from_path(path)
            if fmt is None:
                continue
            candidates.append((path, fmt))

        stem_counts: dict[str, int] = {}
        for path, _ in candidates:
            stem_counts[path.stem] = stem_counts.get(path.stem, 0) + 1

        for path, fmt in candidates:
            name = path.stem if stem_counts[path.stem] == 1 else path.name
            yield DatasetRef(name=name, format=fmt, path=path)

    def _get_by_name(self, name: str) -> DatasetRef:
        for dataset in self._discover():
            if dataset.name == name:
                return dataset
        raise FileNotFoundError(f"Dataset not found: {name}")

    def _from_clause(self, dataset: DatasetRef) -> str:
        p = str(dataset.path)
        if dataset.format == DatasetFormat.csv:
            return f"read_csv_auto('{_escape_string(p)}')"
        if dataset.format == DatasetFormat.json:
            return f"read_json_auto('{_escape_string(p)}')"
        if dataset.format == DatasetFormat.parquet:
            return f"read_parquet('{_escape_string(p)}')"
        raise ValueError(f"Unsupported dataset format: {dataset.format}")

    def _schema_columns(self, dataset: DatasetRef) -> list[DatasetColumn]:
        con = duckdb.connect(database=":memory:")
        try:
            cursor = con.execute(f"SELECT * FROM {self._from_clause(dataset)} LIMIT 0")
            return [DatasetColumn(name=col[0], dtype=str(col[1])) for col in cursor.description]
        finally:
            con.close()

    def _count_rows(self, dataset: DatasetRef) -> int:
        con = duckdb.connect(database=":memory:")
        try:
            cursor = con.execute(f"SELECT COUNT(*) AS count FROM {self._from_clause(dataset)}")
            return int(cursor.fetchone()[0])
        finally:
            con.close()

    def _where_search(self, columns: list[DatasetColumn], search: str | None) -> str:
        if search is None or search.strip() == "":
            return ""

        pattern = f"%{_escape_string(search)}%"
        terms: list[str] = []
        for col in columns:
            terms.append(f"CAST({_quote_ident(col.name)} AS VARCHAR) ILIKE '{pattern}'")
        return f" WHERE ({' OR '.join(terms)})"


def _format_from_path(path: Path) -> DatasetFormat | None:
    ext = path.suffix.lower().lstrip(".")
    if ext == "csv":
        return DatasetFormat.csv
    if ext == "json":
        return DatasetFormat.json
    if ext == "parquet":
        return DatasetFormat.parquet
    return None


def _quote_ident(value: str) -> str:
    return f'"{value.replace(chr(34), chr(34) * 2)}"'


def _escape_string(value: str) -> str:
    return value.replace("'", "''")


def _fetch_dicts(con: duckdb.DuckDBPyConnection, sql: str) -> list[dict[str, Any]]:
    cursor = con.execute(sql)
    colnames = [col[0] for col in cursor.description]
    return [dict(zip(colnames, row, strict=True)) for row in cursor.fetchall()]
