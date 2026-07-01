from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from database import load_csv, get_tables, get_rows, get_table_schema, execute_sql, get_sample_rows
from models import UploadResponse, TablesResponse, RowQueryResponse, AskRequest, AskResponse
from llm import generate_sql, interpret_results

load_dotenv()

app = FastAPI(title="Dataset Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    contents = await file.read()
    table_name = os.path.splitext(file.filename)[0]

    try:
        row_count = load_csv(table_name, contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load CSV: {str(e)}")

    schema = get_table_schema(table_name)
    return UploadResponse(
        table_name=table_name,
        columns=schema["columns"] if schema else [],
        row_count=row_count,
    )


@app.get("/tables", response_model=TablesResponse)
async def list_tables():
    tables_data = get_tables()
    enriched = []
    for t in tables_data:
        schema = get_table_schema(t["name"])
        enriched.append({
            "name": t["name"],
            "columns": t["columns"],
            "row_count": schema["row_count"] if schema else 0,
        })
    return TablesResponse(tables=enriched)


@app.get("/rows", response_model=RowQueryResponse)
async def query_rows(
    table: str = Query(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
    search: str = Query(None),
):
    result = get_rows(table, page, per_page, search)
    return RowQueryResponse(**result)


@app.post("/ask", response_model=AskResponse)
async def ask_question(req: AskRequest):
    schema = get_table_schema(req.table_name)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Table '{req.table_name}' not found")

    sample_rows = get_sample_rows(req.table_name)

    try:
        sql = generate_sql(schema, sample_rows, req.question)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    try:
        exec_result = execute_sql(sql)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Generated SQL failed: {str(e)}\nSQL: {sql}",
        )

    try:
        answer = interpret_results(req.question, sql, exec_result["rows"], exec_result["row_count"])
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return AskResponse(
        answer=answer,
        sql=sql,
        row_count=exec_result["row_count"],
    )


if __name__ == "__main__":
    import uvicorn
    reload_enabled = os.environ.get("RELOAD", "true").lower() == "true"
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload_enabled)
