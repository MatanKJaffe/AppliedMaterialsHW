import { useEffect } from 'react'
import UploadDataset from './components/UploadDataset'
import DataTable from './components/DataTable'
import AskQuestion from './components/AskQuestion'
import SchemaPanel from './components/SchemaPanel'
import { AppProvider, useAppState } from './context'
import { getTables } from './api'

function AppContent() {
  const { tables, selectedTable, selectTable } = useAppState()

  // On mount, auto-select the first dataset if one exists (e.g. from deploy test data)
  useEffect(() => {
    getTables().then((res) => {
      if (res.tables.length > 0 && !selectedTable) {
        selectTable(res.tables[0].name)
      }
    })
  }, [selectedTable, selectTable])

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased">
      <header className="border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-red-500">
              <path d="m 4.2968449,11.533241 -2.6102621,-1.4922 2.64e-4,-3.0247004 2.61e-4,-3.0246 2.6558259,-1.4959 2.6558285,-1.4958 2.655829,1.4958 2.6558258,1.4959 0.0015,3.0246 0.0015,3.0247004 -2.6034928,1.4665 c -1.431921,0.8065 -2.648285,1.478 -2.703032,1.4922 -0.05475,0.014 -1.274156,-0.6457 -2.7098014,-1.4665 z m 5.1052963,-0.6215 2.1762628,-1.2373004 0,-2.6581 0,-2.658 -2.1762628,-1.2373 c -1.196945,-0.6806 -2.278466,-1.2374 -2.403379,-1.2374 -0.124912,0 -1.206433,0.5568 -2.4033783,1.2374 l -2.1762636,1.2373 2.376e-4,2.658 2.376e-4,2.6581 2.1520929,1.2320004 c 1.1836498,0.6777 2.2650588,1.2345 2.4031318,1.2374 0.138073,0 1.230361,-0.5516 2.427303,-1.2321 z m -4.186409,-0.8313 -1.6913749,-0.9560004 -2.493e-4,-2.1081 -2.493e-4,-2.108 1.7374515,-0.9721 1.737452,-0.972 1.737452,0.972 1.7374518,0.9721 0,2.108 0,2.1081 -1.7204018,0.9624004 c -0.94622,0.5293 -1.748694,0.9595 -1.78328,0.956 -0.03458,0 -0.823997,-0.4366 -1.754252,-0.9624 z m 3.299333,-0.6480004 1.416675,-0.792 0,-1.6174 0,-1.6174 -1.466489,-0.8308 -1.466489,-0.8309 -1.466489,0.8309 -1.4664883,0.8308 0,1.6119 0,1.6118 1.4206613,0.8242 c 0.781363,0.4533 1.463699,0.8122004 1.516302,0.7975004 0.0526,-0.015 0.733145,-0.3831004 1.512317,-0.8186004 z m -2.616169,-1.3162 c -0.201643,-0.2016 -0.366623,-0.4424 -0.366623,-0.5349 0,-0.093 -0.05168,-0.303 -0.11484,-0.4676 -0.09227,-0.2405 -0.02921,-0.2779 0.320794,-0.1902 0.584226,0.1464 1.123052,-0.2777 1.123052,-0.8838 0,-0.6068 0.435048,-0.6495 1.120972,-0.1099 0.64515,0.5075 0.674286,1.5762 0.05874,2.1544 -0.554432,0.5209 -1.637033,0.5371 -2.142091,0.032 z"/>
            </svg>
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
          // Landing state: no datasets uploaded yet
          <div className="flex flex-col items-center justify-center min-h-[70vh] relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <svg width="320" height="320" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-600/5 w-80 h-80">
                <path d="m 4.2968449,11.533241 -2.6102621,-1.4922 2.64e-4,-3.0247004 2.61e-4,-3.0246 2.6558259,-1.4959 2.6558285,-1.4958 2.655829,1.4958 2.6558258,1.4959 0.0015,3.0246 0.0015,3.0247004 -2.6034928,1.4665 c -1.431921,0.8065 -2.648285,1.478 -2.703032,1.4922 -0.05475,0.014 -1.274156,-0.6457 -2.7098014,-1.4665 z m 5.1052963,-0.6215 2.1762628,-1.2373004 0,-2.6581 0,-2.658 -2.1762628,-1.2373 c -1.196945,-0.6806 -2.278466,-1.2374 -2.403379,-1.2374 -0.124912,0 -1.206433,0.5568 -2.4033783,1.2374 l -2.1762636,1.2373 2.376e-4,2.658 2.376e-4,2.6581 2.1520929,1.2320004 c 1.1836498,0.6777 2.2650588,1.2345 2.4031318,1.2374 0.138073,0 1.230361,-0.5516 2.427303,-1.2321 z m -4.186409,-0.8313 -1.6913749,-0.9560004 -2.493e-4,-2.1081 -2.493e-4,-2.108 1.7374515,-0.9721 1.737452,-0.972 1.737452,0.972 1.7374518,0.9721 0,2.108 0,2.1081 -1.7204018,0.9624004 c -0.94622,0.5293 -1.748694,0.9595 -1.78328,0.956 -0.03458,0 -0.823997,-0.4366 -1.754252,-0.9624 z m 3.299333,-0.6480004 1.416675,-0.792 0,-1.6174 0,-1.6174 -1.466489,-0.8308 -1.466489,-0.8309 -1.466489,0.8309 -1.4664883,0.8308 0,1.6119 0,1.6118 1.4206613,0.8242 c 0.781363,0.4533 1.463699,0.8122004 1.516302,0.7975004 0.0526,-0.015 0.733145,-0.3831004 1.512317,-0.8186004 z m -2.616169,-1.3162 c -0.201643,-0.2016 -0.366623,-0.4424 -0.366623,-0.5349 0,-0.093 -0.05168,-0.303 -0.11484,-0.4676 -0.09227,-0.2405 -0.02921,-0.2779 0.320794,-0.1902 0.584226,0.1464 1.123052,-0.2777 1.123052,-0.8838 0,-0.6068 0.435048,-0.6495 1.120972,-0.1099 0.64515,0.5075 0.674286,1.5762 0.05874,2.1544 -0.554432,0.5209 -1.637033,0.5371 -2.142091,0.032 z" stroke="currentColor" fill="none" strokeWidth="0.3"/>
              </svg>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent relative">
              Unlock AI Data Insights
            </h2>
            <p className="text-zinc-400 mb-10 max-w-lg text-center relative">
              Upload a CSV dataset to explore its contents and ask natural-language questions.
            </p>
            <UploadDataset />
          </div>
        ) : (
          // Data view: sidebar, table, AI chat side by side
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
