from pydantic import BaseModel
from typing import Optional


class TableInfo(BaseModel):
    name: str
    columns: list[dict]
    row_count: int


class UploadResponse(BaseModel):
    table_name: str
    columns: list[dict]
    row_count: int


class TablesResponse(BaseModel):
    tables: list[TableInfo]


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


class ErrorResponse(BaseModel):
    detail: str
