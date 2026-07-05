import { useState, useRef } from 'react'
import { uploadCSV } from '../api'
import { useAppState } from '../context'

export default function UploadDataset() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { refreshTables, selectTable } = useAppState()

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await uploadCSV(file)
      setSuccess(`"${res.table_name}" loaded (${res.row_count.toLocaleString()} rows)`)
      await refreshTables()
      selectTable(res.table_name)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg w-full max-w-md mx-auto">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center cursor-pointer w-full"
      >
        <div className="text-4xl mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
            <path d="M12 16V4m0 0L8 8m4-4l4 4" />
            <path d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Upload CSV</h2>
        <p className="text-zinc-400 mb-6 text-center text-sm">Click to browse or drag a CSV file</p>

        <span className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-full transition-all text-sm disabled:opacity-50 shadow-lg shadow-red-600/20" role="button">
          {loading ? 'Uploading...' : 'Browse Files'}
        </span>
      </div>

      <input
        type="file"
        accept=".csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleChange}
      />

      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
      {success && <p className="mt-4 text-green-400 text-sm">{success}</p>}
    </div>
  )
}
