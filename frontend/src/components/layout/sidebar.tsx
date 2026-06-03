import { FileText } from 'lucide-react'

import { useDatasetStore } from '@/store/datasets'

import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'

export function Sidebar() {
  const datasets = useDatasetStore((s) => s.datasets)
  const selected = useDatasetStore((s) => s.selected)
  const selectByName = useDatasetStore((s) => s.selectByName)

  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          datasets
        </div>
        <div className="mt-3">
          <Input placeholder="Search datasets…" />
        </div>
      </div>
      <Separator />
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-1">
          {datasets.map((d) => {
            const active = selected?.name === d.name
            return (
              <button
                key={d.name}
                type="button"
                onClick={() => selectByName(d.name)}
                className={[
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
                  active ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-700',
                ].join(' ')}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 flex-none text-slate-500" />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge className="hidden sm:inline-flex">{d.format}</Badge>
                  <span className="hidden text-xs text-slate-400 md:inline">
                    {d.rows.toLocaleString()}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

