import type { UploadResponse, RowQueryResponse, AskResponse, TablesResponse } from './types'

// Backend URL — configurable at build time via VITE_API_URL or defaults to localhost
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Generic fetch wrapper: injects JSON headers unless the body is FormData,
// and surfaces API error messages from the {detail} response shape.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

export function uploadCSV(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return request('/upload', { method: 'POST', body: formData })
}

export function getTables(): Promise<TablesResponse> {
  return request('/tables')
}

export function getRows(
  table: string,
  page: number = 1,
  perPage: number = 50,
  search?: string,
): Promise<RowQueryResponse> {
  const params = new URLSearchParams({ table, page: String(page), per_page: String(perPage) })
  if (search) params.set('search', search)
  return request(`/rows?${params}`)
}

export function askQuestion(question: string, tableName: string): Promise<AskResponse> {
  return request('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, table_name: tableName }),
  })
}
