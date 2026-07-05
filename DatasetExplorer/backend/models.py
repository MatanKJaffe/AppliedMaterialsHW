from pydantic import BaseModel
from typing import Optional

# All request/response shapes are explicit Pydantic models.
# This makes API contracts self-documenting and provides
# automatic validation + OpenAPI schema generation.


class ColumnInfo(BaseModel):
    name: str
    type: str


class TableInfo(BaseModel):
    name: str
    columns: list[ColumnInfo]
    row_count: int


class UploadResponse(BaseModel):
    table_name: str
    columns: list[ColumnInfo]
    row_count: int


class TablesResponse(BaseModel):
    tables: list[TableInfo]


class SchemaResponse(BaseModel):
    name: str
    columns: list[ColumnInfo]
    row_count: int
    sample_rows: list[dict]


class RowQueryParams(BaseModel):
    table: str
    page: int = 1
    per_page: int = 50
    search: Optional[str] = None


class RowQueryResponse(BaseModel):
    rows: list[dict]
    total: int
    page: int
    per_page: int


class AskRequest(BaseModel):
    question: str
    table_name: str


class AskResponse(BaseModel):
    answer: str       # Natural-language answer from Gemini
    sql: str          # The generated SQL for transparency
    row_count: int    # How many rows the SQL returned
    columns: list[str]  # Column names from the result set


class ErrorResponse(BaseModel):
    detail: str
