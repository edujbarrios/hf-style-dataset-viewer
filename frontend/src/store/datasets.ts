import { create } from 'zustand'

import type { DatasetSummary } from '@/types/datasets'
import { listDatasets } from '@/services/datasets'

type DatasetState = {
  datasets: DatasetSummary[]
  selected: DatasetSummary | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  selectByName: (name: string) => void
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  datasets: [],
  selected: null,
  isLoading: false,
  error: null,
  refresh: async () => {
    set({ isLoading: true, error: null })
    try {
      const datasets = await listDatasets()
      const nextSelected =
        (get().selected && datasets.find((d) => d.name === get().selected?.name)) ??
        datasets[0] ??
        null
      set({ datasets, selected: nextSelected, isLoading: false })
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load datasets',
      })
    }
  },
  selectByName: (name) => {
    const next = get().datasets.find((d) => d.name === name) ?? null
    set({ selected: next })
  },
}))
