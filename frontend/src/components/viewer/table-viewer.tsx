import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable,
} from '@tanstack/react-table'

import { previewDataset } from '@/services/datasets'
import type { DatasetColumn, DatasetPreviewResponse } from '@/types/datasets'

import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

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

export function TableViewer({ datasetName }: { datasetName: string }) {
  const [data, setData] = useState<DatasetPreviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setData(null)

    previewDataset(datasetName, { page: 1, page_size: 50 })
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
  }, [datasetName])

  const columns = useMemo((): ColumnDef<Record<string, unknown>>[] => {
    const cols: DatasetColumn[] = data?.columns ?? []
    return cols.map((c) => ({
      accessorKey: c.name,
      header: () => (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-900">{c.name}</div>
          <div className="text-[11px] text-slate-500">{c.dtype.toLowerCase()}</div>
        </div>
      ),
      cell: ({ getValue }) => <ExpandableCell value={getValue()} />,
    }))
  }, [data?.columns])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Preview</CardTitle>
          <div className="text-xs text-slate-500">
            First {Math.min(50, data?.total_rows ?? 0).toLocaleString()} rows
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="subtle">{datasetName}</Badge>
          {isLoading ? <Badge>loading</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-red-700">{error}</div> : null}
        <div className="overflow-auto rounded-md border border-slate-200">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-slate-200 px-3 py-2 text-left align-bottom"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-b border-slate-100 px-3 py-2 align-top text-sm text-slate-800"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && !isLoading ? (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={999}>
                    No rows to display.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
