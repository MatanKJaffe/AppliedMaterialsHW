import { useEffect, useState } from 'react'
import { useAppState } from '../context'

// Sidebar panel: lists all loaded datasets and shows the selected table's columns.
// Long table names are truncated by default with a toggle to expand/collapse.
export default function SchemaPanel() {
  const { tables, selectedTable, selectTable, refreshTables, loading, error } = useAppState()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    refreshTables()
  }, [refreshTables])

  const active = tables.find((t) => t.name === selectedTable)

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Datasets</h2>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {tables.length === 0 && !loading && !error && (
        <p className="text-xs text-zinc-500">No datasets loaded yet.</p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-zinc-400" />
          Loading...
        </div>
      )}

      <div className="flex flex-col gap-1">
        {tables.map((t) => (
          <button
            key={t.name}
            onClick={() => selectTable(t.name)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              t.name === selectedTable
                ? 'bg-red-600/15 text-red-400 border border-red-600/30'
                : 'text-zinc-300 hover:bg-zinc-800 border border-transparent'
            }`}
          >
            <div className="flex items-start gap-1.5">
              <span
                className={`font-medium min-w-0 ${expanded.has(t.name) ? '' : 'truncate'}`}
                style={expanded.has(t.name) ? {} : { display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {t.name}
              </span>
              {t.name.length > 20 && (
                <span
                  onClick={(e) => { e.stopPropagation(); toggleExpand(t.name) }}
                  className="shrink-0 mt-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {expanded.has(t.name)
                      ? <><line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" /></>
                      : <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.04.04A10 10 0 0 0 12 17.5a10 10 0 0 0 5.36-1.5Z" /><path d="m2 2 20 20" /></>
                    }
                  </svg>
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {t.columns.length} columns · {t.row_count.toLocaleString()} rows
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-2 pt-3 border-t border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Columns</h3>
          <div className="flex flex-col gap-1">
            {active.columns.map((c) => (
              <div key={c.name} className="flex justify-between text-xs px-1">
                <span className="text-zinc-300">{c.name}</span>
                <span className="text-zinc-500 font-mono">{c.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
