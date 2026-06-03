import { useEffect, useState } from 'react'
import { Database, RefreshCcw, Settings2, Sigma } from 'lucide-react'

import { useDatasetStore } from '@/store/datasets'
import { getDatasetStats } from '@/services/datasets'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'

import { Sidebar } from './sidebar'
import { TableViewer } from '../viewer/table-viewer'

export function AppShell() {
  const selected = useDatasetStore((s) => s.selected)
  const refresh = useDatasetStore((s) => s.refresh)
  const isLoading = useDatasetStore((s) => s.isLoading)
  const error = useDatasetStore((s) => s.error)

  const [columns, setColumns] = useState<number | null>(null)
  const selectedName = selected?.name ?? null

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setColumns(null)
    })
    if (!selectedName) return () => void (cancelled = true)

    getDatasetStats(selectedName)
      .then((s) => {
        if (cancelled) return
        setColumns(s.columns)
      })
      .catch(() => {
        if (cancelled) return
        setColumns(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedName])

  return (
    <div className="h-dvh w-full bg-slate-50">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-slate-600" />
            hf-style-dataset-viewer
          </div>
          {selected ? (
            <>
              <Separator className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-slate-900">{selected.name}</div>
                <Badge>{selected.format}</Badge>
                <div className="text-xs text-slate-500">{selected.rows.toLocaleString()} rows</div>
                {columns !== null ? (
                  <div className="text-xs text-slate-500">{columns.toLocaleString()} cols</div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Refresh"
            onClick={() => void refresh()}
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Statistics">
            <Sigma className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Settings">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid h-[calc(100dvh-3.5rem)] grid-cols-[280px_1fr]">
        <Sidebar />
        <main className="overflow-auto p-6">
          {error ? (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900">Failed to load</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-red-800">{error}</CardContent>
            </Card>
          ) : null}
          {selected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Rows</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {selected.rows.toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Format</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold uppercase">
                    {selected.format}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Columns</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {columns !== null ? columns.toLocaleString() : '—'}
                  </CardContent>
                </Card>
              </div>

              <TableViewer datasetName={selected.name} />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No dataset selected</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">
                Pick a dataset from the sidebar to begin exploring.
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
