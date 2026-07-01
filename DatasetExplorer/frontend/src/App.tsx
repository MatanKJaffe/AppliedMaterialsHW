import { useEffect } from 'react'
import UploadDataset from './components/UploadDataset'
import DataTable from './components/DataTable'
import AskQuestion from './components/AskQuestion'
import SchemaPanel from './components/SchemaPanel'
import { AppProvider, useAppState } from './context'
import { getTables } from './api'

function AppContent() {
  const { tables, selectedTable, selectTable } = useAppState()

  useEffect(() => {
    getTables().then((res) => {
      if (res.tables.length > 0 && !selectedTable) {
        selectTable(res.tables[0].name)
      }
    })
  }, [selectedTable, selectTable])

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-lg">
              DE
            </div>
            <h1 className="text-lg font-bold tracking-tight">Dataset Explorer</h1>
          </div>
          {tables.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {tables.length} dataset{tables.length > 1 ? 's' : ''} loaded
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <h2 className="text-4xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Unlock AI Data Insights
            </h2>
            <p className="text-zinc-400 mb-10 max-w-lg text-center">
              Upload a CSV dataset to explore its contents and ask natural-language questions.
            </p>
            <UploadDataset />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
            <aside className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
              <UploadDataset />
              <SchemaPanel />
            </aside>
            <div className="lg:col-span-2 flex flex-col min-h-0">
              <DataTable />
            </div>
            <div className="lg:col-span-1 flex flex-col min-h-0">
              <AskQuestion />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
