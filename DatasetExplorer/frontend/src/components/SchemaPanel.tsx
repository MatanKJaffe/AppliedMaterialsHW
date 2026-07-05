import { useEffect } from 'react'
import { useAppState } from '../context'

export default function SchemaPanel() {
  const { tables, selectedTable, selectTable, refreshTables, loading } = useAppState()

  useEffect(() => {
    refreshTables()
  }, [refreshTables])

  const active = tables.find((t) => t.name === selectedTable)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Datasets</h2>

      {tables.length === 0 && !loading && (
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
            <div className="font-medium">{t.name}</div>
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
