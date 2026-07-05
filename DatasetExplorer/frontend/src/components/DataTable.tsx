import { useState, useEffect, useCallback } from 'react'
import { getRows } from '../api'
import { useAppState } from '../context'
import type { RowQueryResponse, ColumnInfo } from '../types'

const perPage = 25

// Maps DuckDB types to color-coded badges.
// Helps users quickly identify column types at a glance.
function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    INTEGER: 'text-blue-400 bg-blue-500/10',
    BIGINT: 'text-blue-400 bg-blue-500/10',
    VARCHAR: 'text-emerald-400 bg-emerald-500/10',
    DOUBLE: 'text-yellow-400 bg-yellow-500/10',
    FLOAT: 'text-yellow-400 bg-yellow-500/10',
    DATE: 'text-purple-400 bg-purple-500/10',
    TIMESTAMP: 'text-purple-400 bg-purple-500/10',
    BOOLEAN: 'text-rose-400 bg-rose-500/10',
  }
  const cls = colorMap[type.toUpperCase()] ?? 'text-zinc-400 bg-zinc-500/10'
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${cls}`}>
      {type}
    </span>
  )
}

export default function DataTable() {
  const { selectedTable, tables } = useAppState()
  const [data, setData] = useState<RowQueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // Build a lookup from column name → type using the schema from context
  const selectedSchema = tables.find((t) => t.name === selectedTable)
  const colTypes = new Map<string, string>(
    (selectedSchema?.columns ?? []).map((c: ColumnInfo) => [c.name, c.type])
  )

  const fetchData = useCallback(async () => {
    if (!selectedTable) return
    setLoading(true)
    try {
      const result = await getRows(selectedTable, page, perPage, search || undefined)
      setData(result)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedTable, page, search])

  // Reset pagination and search when switching datasets
  useEffect(() => {
    setPage(1)
    setSearch('')
    setData(null)
  }, [selectedTable])

  // Debounce search input by 300ms to avoid hammering the API
  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300)
    return () => clearTimeout(timer)
  }, [fetchData])

  const columns = data && data.rows.length > 0 ? Object.keys(data.rows[0]) : []
  const totalPages = data ? Math.ceil(data.total / perPage) : 0

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Select a dataset to view its data
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold">{selectedTable}</h2>
        <div className="relative">
          {search && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
          )}
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 w-56"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && !data ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            {search ? 'No matching rows' : 'No data'}
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-800/50 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-2.5 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{col}</span>
                      <TypeBadge type={colTypes.get(col) ?? ''} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2 whitespace-nowrap text-zinc-300">
                      {row[col]?.toString() ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-sm text-zinc-400">
          <span>
            {data.total > 0 ? (page - 1) * perPage + 1 : 0}
            &ndash;{Math.min(page * perPage, data.total)} of {data.total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
