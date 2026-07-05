import { useState, useEffect, useCallback } from 'react'
import { getRows } from '../api'
import { useAppState } from '../context'
import type { RowQueryResponse } from '../types'

export default function DataTable() {
  const { selectedTable } = useAppState()
  const [data, setData] = useState<RowQueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const perPage = 25

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

  useEffect(() => {
    setPage(1)
    setSearch('')
    setData(null)
  }, [selectedTable])

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
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 w-56"
        />
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
                    {col}
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
