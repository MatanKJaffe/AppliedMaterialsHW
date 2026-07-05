from pydantic import BaseModel
from typing import Optional


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
    answer: str
    sql: str
    row_count: int
    columns: list[str]


class ErrorResponse(BaseModel):
    detail: str
