import duckdb
import tempfile
import os
from typing import Optional

# In-memory DuckDB instance. Data is lost on restart — this is acceptable
# for the exercise scope. A persistent file could replace ":memory:".
_db: duckdb.DuckDBPyConnection | None = None


def get_db() -> duckdb.DuckDBPyConnection:
    """Return the singleton DuckDB connection."""
    global _db
    if _db is None:
        _db = duckdb.connect(":memory:")
    return _db


def load_csv(table_name: str, file_bytes: bytes) -> int:
    """Write uploaded bytes to a temp file, then instruct DuckDB to read it.

    DuckDB's read_csv_auto handles type inference, header detection, etc.
    """
    db = get_db()
    fd, path = tempfile.mkstemp(suffix=".csv")
    try:
        os.write(fd, file_bytes)
        os.close(fd)
        db.execute(
            f'CREATE OR REPLACE TABLE "{table_name}" AS SELECT * FROM read_csv_auto(?)',
            [path],
        )
    finally:
        os.unlink(path)
    result = db.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()
    return result[0]


def table_exists(table_name: str) -> bool:
    """Check whether the table exists in the main schema."""
    db = get_db()
    result = db.execute(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ? AND table_schema = 'main'",
        [table_name]
    ).fetchone()
    return result[0] > 0


def get_tables() -> list[dict]:
    """Return all loaded tables with their column definitions."""
    db = get_db()
    rows = db.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name"
    ).fetchall()
    tables = []
    for (name,) in rows:
        cols = db.execute(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name = ? AND table_schema = 'main' ORDER BY ordinal_position",
            [name]
        ).fetchall()
        tables.append({
            "name": name,
            "columns": [{"name": c[0], "type": c[1]} for c in cols],
        })
    return tables


def get_rows(table_name: str, page: int = 1, per_page: int = 50, search: Optional[str] = None) -> dict:
    """Paginated row retrieval with optional cross-column ILIKE search."""
    db = get_db()
    if not table_exists(table_name):
        return {"rows": [], "total": 0, "page": page, "per_page": per_page}

    columns = [c[0] for c in db.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = ? AND table_schema = 'main' ORDER BY ordinal_position",
        [table_name]
    ).fetchall()]

    if search:
        # Apply the search term across all columns via ILIKE
        conditions = " OR ".join(f"CAST(\"{c}\" AS VARCHAR) ILIKE '%' || ? || '%'" for c in columns)
        params = [search] * len(columns)
        count_result = db.execute(f"SELECT COUNT(*) FROM \"{table_name}\" WHERE {conditions}", params).fetchone()
        total = count_result[0]
        params.extend([per_page, (page - 1) * per_page])
        rows = db.execute(
            f"SELECT * FROM \"{table_name}\" WHERE {conditions} LIMIT ? OFFSET ?",
            params
        ).fetchall()
    else:
        total = db.execute(f"SELECT COUNT(*) FROM \"{table_name}\"").fetchone()[0]
        rows = db.execute(
            f"SELECT * FROM \"{table_name}\" LIMIT ? OFFSET ?",
            [per_page, (page - 1) * per_page]
        ).fetchall()

    return {
        "rows": [dict(zip(columns, row)) for row in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def get_sample_rows(table_name: str, n: int = 5) -> list[dict]:
    """Return a random sample of rows for LLM context."""
    db = get_db()
    if not table_exists(table_name):
        return []
    columns = [c[0] for c in db.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = ? AND table_schema = 'main' ORDER BY ordinal_position",
        [table_name]
    ).fetchall()]
    rows = db.execute(f"SELECT * FROM \"{table_name}\" USING SAMPLE {n}").fetchall()
    return [dict(zip(columns, row)) for row in rows]


def execute_sql(sql: str) -> dict:
    """Execute an arbitrary SQL statement and return results with column metadata."""
    db = get_db()
    result = db.execute(sql)
    if result.description:
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        return {
            "columns": columns,
            "rows": [dict(zip(columns, r)) for r in rows],
            "row_count": len(rows),
        }
    return {"columns": [], "rows": [], "row_count": 0}


def get_table_schema(table_name: str) -> dict | None:
    """Return full schema for a table, or None if it doesn't exist."""
    db = get_db()
    if not table_exists(table_name):
        return None
    cols = db.execute(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name = ? AND table_schema = 'main' ORDER BY ordinal_position",
        [table_name]
    ).fetchall()
    count = db.execute(f"SELECT COUNT(*) FROM \"{table_name}\"").fetchone()[0]
    return {
        "name": table_name,
        "columns": [{"name": c[0], "type": c[1]} for c in cols],
        "row_count": count,
    }
