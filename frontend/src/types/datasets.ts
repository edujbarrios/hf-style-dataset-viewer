export type DatasetFormat = 'csv' | 'json' | 'parquet'

export type DatasetSummary = {
  name: string
  format: DatasetFormat
  rows: number
}

