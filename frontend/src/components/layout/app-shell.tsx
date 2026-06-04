/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Database, Moon, RefreshCcw, Sigma, Sun } from 'lucide-react'

import { useDatasetStore } from '@/store/datasets'
import { getDatasetStats, getDatasetStatistics } from '@/services/datasets'
import type { DatasetStatisticsResponse } from '@/types/datasets'
import { useTheme } from '@/hooks/use-theme'

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
  const { theme, toggleTheme } = useTheme()

  const [columns, setColumns] = useState<number | null>(null)
  const selectedName = selected?.name ?? null
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState<DatasetStatisticsResponse | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(false)

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

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setStats(null)
      setStatsError(null)
    })
    if (!showStats || !selectedName) return () => void (cancelled = true)

    setIsStatsLoading(true)
    getDatasetStatistics(selectedName)
      .then((s) => {
        if (cancelled) return
        setStats(s)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setStatsError(e instanceof Error ? e.message : 'Failed to load statistics')
      })
      .finally(() => {
        if (cancelled) return
        setIsStatsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showStats, selectedName])

  return (
    <div className="h-dvh w-full bg-slate-50 dark:bg-[#0b0f19]">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            hf-style-dataset-viewer
          </div>
          {selected ? (
            <>
              <Separator className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {selected.name}
                </div>
                <Badge>{selected.format}</Badge>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {selected.rows.toLocaleString()} rows
                </div>
                {columns !== null ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {columns.toLocaleString()} cols
                  </div>
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
          <Button
            size="icon"
            variant="ghost"
            aria-label="Statistics"
            onClick={() => setShowStats(true)}
            disabled={!selectedName}
          >
            <Sigma className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
              <CardContent className="text-sm text-slate-500 dark:text-slate-400">
                Pick a dataset from the sidebar to begin exploring.
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {showStats ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 dark:bg-black/60">
          <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Statistics
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedName ?? '—'}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowStats(false)}>
                Close
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4 text-sm text-slate-900 dark:text-slate-100">
              {isStatsLoading ? (
                <div className="text-slate-500 dark:text-slate-400">Loading…</div>
              ) : null}
              {statsError ? <div className="text-red-700">{statsError}</div> : null}
              {stats ? (
                <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
