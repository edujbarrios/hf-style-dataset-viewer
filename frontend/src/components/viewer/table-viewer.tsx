import { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import { previewDataset } from '@/services/datasets'
import { API_BASE_URL } from '@/services/api'
import type { DatasetColumn, DatasetPreviewResponse } from '@/types/datasets'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

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
          className="h-10 w-10 shrink-0 rounded border border-slate-200 bg-white object-cover"
        />
        <div className="min-w-0 truncate text-xs text-slate-500">{value}</div>
      </a>
    )
  }

  return <ExpandableCell value={value} />
}

export function TableViewer({ datasetName }: { datasetName: string }) {
  const [data, setData] = useState<DatasetPreviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const [sorting, setSorting] = useState<{ sortBy: string; sortDir: 'asc' | 'desc' } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setData(null)

    previewDataset(datasetName, {
      page,
      page_size: pageSize,
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
  }, [datasetName, page, pageSize, debouncedSearch, sorting])

  useEffect(() => {
    setPage(1)
  }, [datasetName, pageSize, debouncedSearch, sorting])

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
  const totalPages = Math.max(1, Math.ceil(totalRows / (data?.page_size ?? pageSize)))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Preview</CardTitle>
          <div className="text-xs text-slate-500">
            {totalRows.toLocaleString()} rows • page {data?.page ?? page} / {totalPages}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="subtle">{datasetName}</Badge>
          {isLoading ? <Badge>loading</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-red-700">{error}</div> : null}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!canPrev || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!canNext || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
            <div className="text-xs text-slate-500">page size</div>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
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
          className="h-[60vh] overflow-auto rounded-md border border-slate-200 bg-white"
        >
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
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
                    className="border-r border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() => {
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
                    <div className="mt-1 text-[10px] text-slate-400">
                      {sorting?.sortBy === header.column.id ? (sorting.sortDir === 'asc' ? '↑' : '↓') : ' '}
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
                  className="grid border-b border-slate-100 hover:bg-slate-50"
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
                      className="border-r border-slate-100 px-3 py-2 text-sm text-slate-800"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              )
            })}
            {rows.length === 0 && !isLoading ? (
              <div className="px-3 py-10 text-center text-sm text-slate-500">
                No rows to display.
              </div>
            ) : null}
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-500">
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
      <div className="text-xs font-semibold text-slate-900">{name}</div>
      <div className="text-[11px] text-slate-500">{dtype.toLowerCase()}</div>
    </div>
  )
}
