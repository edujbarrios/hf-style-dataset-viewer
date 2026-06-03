export type DatasetFormat = 'csv' | 'json' | 'parquet'

export type DatasetSummary = {
  name: string
  format: DatasetFormat
  rows: number
}

export type DatasetColumn = {
  name: string
  dtype: string
}

export type DatasetSchemaResponse = {
  columns: DatasetColumn[]
}

export type DatasetStatsResponse = {
  rows: number
  columns: number
}

export type DatasetPreviewResponse = {
  page: number
  page_size: number
  total_rows: number
  columns: DatasetColumn[]
  rows: Record<string, unknown>[]
}

export type NumericSummary = {
  min: number | null
  max: number | null
  mean: number | null
  std: number | null
}

export type DatasetStatisticsResponse = {
  rows: number
  columns: number
  missing_values: Record<string, number>
  unique_values: Record<string, number>
  numeric_summary: Record<string, NumericSummary>
}
