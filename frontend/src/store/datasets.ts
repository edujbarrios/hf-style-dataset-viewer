import { create } from 'zustand'

import type { DatasetSummary } from '@/types/datasets'

type DatasetState = {
  datasets: DatasetSummary[]
  selected: DatasetSummary | null
  selectByName: (name: string) => void
}

const seed: DatasetSummary[] = [
  { name: 'sample.csv', format: 'csv', rows: 2 },
  { name: 'sample.json', format: 'json', rows: 2 },
]

export const useDatasetStore = create<DatasetState>((set, get) => ({
  datasets: seed,
  selected: seed[0] ?? null,
  selectByName: (name) => {
    const next = get().datasets.find((d) => d.name === name) ?? null
    set({ selected: next })
  },
}))

