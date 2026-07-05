// Mirrors the backend Pydantic models exactly so the frontend
// always knows the shape of API responses at compile time.

export interface ColumnInfo {
  name: string
  type: string
}

export interface TableInfo {
  name: string
  columns: ColumnInfo[]
  row_count: number
}

export interface UploadResponse {
  table_name: string
  columns: ColumnInfo[]
  row_count: number
}

export interface RowQueryResponse {
  rows: Record<string, unknown>[]
  total: number
  page: number
  per_page: number
}

export interface AskResponse {
  answer: string
  sql: string
  row_count: number
  columns: string[]
}

export interface TablesResponse {
  tables: TableInfo[]
}
