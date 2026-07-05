import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { TableInfo } from './types'
import { getTables } from './api'

// Global state shared across all route-less views.
// Using Context instead of a heavier lib because the surface area is small.
interface AppState {
  tables: TableInfo[]
  selectedTable: string | null
  loading: boolean
  error: string | null
  refreshTables: () => Promise<void>
  selectTable: (name: string | null) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetches the full table list. Called after uploads and on mount.
  const refreshTables = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getTables()
      setTables(res.tables)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables')
    } finally {
      setLoading(false)
    }
  }, [])

  const selectTable = useCallback((name: string | null) => {
    setSelectedTable(name)
  }, [])

  return (
    <AppContext.Provider value={{ tables, selectedTable, loading, error, refreshTables, selectTable }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
