import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { TableInfo } from './types'
import { getTables } from './api'

interface AppState {
  tables: TableInfo[]
  selectedTable: string | null
  loading: boolean
  refreshTables: () => Promise<void>
  selectTable: (name: string | null) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshTables = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getTables()
      setTables(res.tables)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const selectTable = useCallback((name: string | null) => {
    setSelectedTable(name)
  }, [])

  return (
    <AppContext.Provider value={{ tables, selectedTable, loading, refreshTables, selectTable }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
