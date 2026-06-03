import type {
  DatasetPreviewResponse,
  DatasetSchemaResponse,
  DatasetStatisticsResponse,
  DatasetStatsResponse,
  DatasetSummary,
} from '@/types/datasets'

import { apiGet } from './api'

export function listDatasets(): Promise<DatasetSummary[]> {
  return apiGet<DatasetSummary[]>('/datasets')
}

export function getDatasetSchema(name: string): Promise<DatasetSchemaResponse> {
  return apiGet<DatasetSchemaResponse>(`/datasets/${encodeURIComponent(name)}/schema`)
}

export function getDatasetStats(name: string): Promise<DatasetStatsResponse> {
  return apiGet<DatasetStatsResponse>(`/datasets/${encodeURIComponent(name)}/stats`)
}

export function getDatasetStatistics(name: string): Promise<DatasetStatisticsResponse> {
  return apiGet<DatasetStatisticsResponse>(`/datasets/${encodeURIComponent(name)}/statistics`)
}

export function previewDataset(
  name: string,
  params: {
    page: number
    page_size: number
    search?: string
    sort_by?: string
    sort_dir?: 'asc' | 'desc'
  },
): Promise<DatasetPreviewResponse> {
  const qp = new URLSearchParams()
  qp.set('page', String(params.page))
  qp.set('page_size', String(params.page_size))
  if (params.search) qp.set('search', params.search)
  if (params.sort_by) qp.set('sort_by', params.sort_by)
  if (params.sort_dir) qp.set('sort_dir', params.sort_dir)
  return apiGet<DatasetPreviewResponse>(
    `/datasets/${encodeURIComponent(name)}/preview?${qp.toString()}`,
  )
}
