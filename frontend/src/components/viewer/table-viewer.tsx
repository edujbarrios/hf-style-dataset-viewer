import { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import { previewDataset, queryDataset } from '@/services/datasets'
import { API_BASE_URL } from '@/services/api'
import type { DatasetColumn, DatasetPreviewResponse } from '@/types/datasets'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SqlEditor } from './sql-editor'

function defaultSql(): string {
  return 'SELECT * FROM dataset'
}

function isLikelyImagePath(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (v.length === 0) return false
  return (
    v.endsWith('.png') ||
    v.endsWith('.jpg') ||
    v.endsWith('.jpeg') ||
    v.endsWith('.gif') ||
    v.endsWith('.webp')
  )
}

function stringifyCell(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function ExpandableCell({ value }: { value: unknown }) {
  const text = stringifyCell(value)
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 180

  if (!isLong) {
    return <span className="whitespace-pre-wrap break-words">{text}</span>
  }

  return (
    <div className="space-y-1">
      <div className="whitespace-pre-wrap break-words">
        {expanded ? text : `${text.slice(0, 180)}…`}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Less' : 'More'}
      </Button>
    </div>
  )
}

function PreviewCell({ datasetName, value }: { datasetName: string; value: unknown }) {
  if (typeof value === 'string' && isLikelyImagePath(value)) {
    const assetUrl = `${API_BASE_URL}/datasets/${encodeURIComponent(datasetName)}/asset?path=${encodeURIComponent(value)}`
    return (
      <a
        href={assetUrl}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2"
        title={value}
      >
        <img
          src={assetUrl}
          alt={value}
          loading="lazy"
          decoding="async"
          className="h-10 w-10 shrink-0 rounded border border-slate-200 bg-white object-cover dark:border-slate-700 dark:bg-slate-900"
        />
        <div className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">{value}</div>
      </a>
    )
  }

  return <ExpandableCell value={value} />
}

export function TableViewer({ datasetName }: { datasetName: string }) {
  const [mode, setMode] = useState<'preview' | 'sql'>('sql')

  const [data, setData] = useState<DatasetPreviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [previewPage, setPreviewPage] = useState(1)
  const [previewPageSize, setPreviewPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const [sorting, setSorting] = useState<{ sortBy: string; sortDir: 'asc' | 'desc' } | null>(
    null,
  )

  const [sqlPage, setSqlPage] = useState(1)
  const [sqlPageSize, setSqlPageSize] = useState(50)
  const [sqlText, setSqlText] = useState(defaultSql)
  const [submittedSql, setSubmittedSql] = useState(defaultSql)

  useEffect(() => {
    if (mode !== 'preview') return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setData(null)

    previewDataset(datasetName, {
      page: previewPage,
      page_size: previewPageSize,
      search: debouncedSearch.trim() || undefined,
      sort_by: sorting?.sortBy,
      sort_dir: sorting?.sortDir,
    })
      .then((resp) => {
        if (cancelled) return
        setData(resp)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load preview')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode, datasetName, previewPage, previewPageSize, debouncedSearch, sorting])

  useEffect(() => {
    if (mode !== 'preview') return
    setPreviewPage(1)
  }, [mode, datasetName, previewPageSize, debouncedSearch, sorting])

  useEffect(() => {
    if (mode !== 'sql') return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setData(null)

    queryDataset(datasetName, {
      sql: submittedSql,
      page: sqlPage,
      page_size: sqlPageSize,
    })
      .then((resp) => {
        if (cancelled) return
        setData(resp)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to run SQL query')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode, datasetName, sqlPage, sqlPageSize, submittedSql])

  useEffect(() => {
    setSearch('')
    setSorting(null)
    setPreviewPage(1)

    const next = defaultSql()
    setSqlText(next)
    setSubmittedSql(next)
    setSqlPage(1)
  }, [datasetName])

  const columns = useMemo((): ColumnDef<Record<string, unknown>>[] => {
    const cols: DatasetColumn[] = data?.columns ?? []
    return cols.map((c) => ({
      accessorKey: c.name,
      header: () => <ColumnHeader name={c.name} dtype={c.dtype} />,
      cell: ({ getValue }) => <PreviewCell datasetName={datasetName} value={getValue()} />,
    }))
  }, [data?.columns, datasetName])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const gridTemplateColumns = useMemo(() => {
    const count = data?.columns.length ?? 0
    return Array.from({ length: count }, () => 'minmax(220px, 1fr)').join(' ')
  }, [data?.columns.length])

  const parentRef = useRef<HTMLDivElement | null>(null)
  const rows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  const totalRows = data?.total_rows ?? 0
  const activePage = mode === 'preview' ? previewPage : sqlPage
  const activePageSize = mode === 'preview' ? previewPageSize : sqlPageSize
  const totalPages = Math.max(1, Math.ceil(totalRows / (data?.page_size ?? activePageSize)))
  const canPrev = activePage > 1
  const canNext = activePage < totalPages

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>{mode === 'sql' ? 'SQL Results' : 'Preview'}</CardTitle>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {totalRows.toLocaleString()} rows • page {data?.page ?? activePage} / {totalPages}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="subtle">{datasetName}</Badge>
          <div className="flex items-center overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              className={
                mode === 'sql'
                  ? 'h-8 bg-slate-900 px-2 text-xs font-medium text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'h-8 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
              }
              onClick={() => setMode('sql')}
            >
              SQL
            </button>
            <button
              type="button"
              className={
                mode === 'preview'
                  ? 'h-8 bg-slate-900 px-2 text-xs font-medium text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'h-8 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
              }
              onClick={() => setMode('preview')}
            >
              Preview
            </button>
          </div>
          {isLoading ? <Badge>loading</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-red-700">{error}</div> : null}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {mode === 'preview' ? (
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search in rows…"
                className="w-[260px]"
              />
              {sorting ? (
                <Badge variant="subtle">
                  sort: {sorting.sortBy} {sorting.sortDir}
                </Badge>
              ) : (
                <Badge variant="subtle">sort: none</Badge>
              )}
            </div>
          ) : (
            <div className="flex min-w-[320px] flex-1 items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  SQL (table: <span className="font-mono">dataset</span>)
                </div>
                <SqlEditor
                  value={sqlText}
                  onChange={setSqlText}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      setSubmittedSql(sqlText.trim() || defaultSql())
                      setSqlPage(1)
                    }
                  }}
                  rows={3}
                  placeholder="SELECT * FROM dataset WHERE ..."
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={isLoading}
                onClick={() => {
                  setSubmittedSql(sqlText.trim() || defaultSql())
                  setSqlPage(1)
                }}
              >
                Run
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!canPrev || isLoading}
              onClick={() =>
                mode === 'preview'
                  ? setPreviewPage((p) => Math.max(1, p - 1))
                  : setSqlPage((p) => Math.max(1, p - 1))
              }
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!canNext || isLoading}
              onClick={() =>
                mode === 'preview' ? setPreviewPage((p) => p + 1) : setSqlPage((p) => p + 1)
              }
            >
              Next
            </Button>
            <div className="text-xs text-slate-500 dark:text-slate-400">page size</div>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={activePageSize}
              onChange={(e) =>
                mode === 'preview'
                  ? setPreviewPageSize(Number(e.target.value))
                  : setSqlPageSize(Number(e.target.value))
              }
            >
              {[25, 50, 100, 200].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          ref={parentRef}
          className="h-[60vh] overflow-auto rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            {table.getHeaderGroups().map((hg) => (
              <div
                key={hg.id}
                className="grid"
                style={{ gridTemplateColumns }}
              >
                {hg.headers.map((header) => (
                  <button
                    key={header.id}
                    type="button"
                    disabled={mode !== 'preview'}
                    className={
                      mode === 'preview'
                        ? 'border-r border-slate-100 px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed dark:border-slate-800 dark:hover:bg-slate-900'
                        : 'cursor-default border-r border-slate-100 px-3 py-2 text-left dark:border-slate-800'
                    }
                    onClick={() => {
                      if (mode !== 'preview') return
                      if (header.isPlaceholder) return
                      const col = String(header.column.id)
                      setSorting((prev) => {
                        if (!prev || prev.sortBy !== col) return { sortBy: col, sortDir: 'asc' }
                        return { sortBy: col, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }
                      })
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                      {mode === 'preview' && sorting?.sortBy === header.column.id
                        ? sorting.sortDir === 'asc'
                          ? '↑'
                          : '↓'
                        : ' '}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              return (
                <div
                  key={row.id}
                  className="grid border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  style={{
                    gridTemplateColumns,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="border-r border-slate-100 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:text-slate-100"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              )
            })}
            {rows.length === 0 && !isLoading ? (
              <div className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No rows to display.
              </div>
            ) : null}
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                Loading preview…
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ColumnHeader({ name, dtype }: { name: string; dtype: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{name}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{dtype.toLowerCase()}</div>
    </div>
  )
}
