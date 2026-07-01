import os
from google import genai

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=api_key)
    return _client


def _build_schema_text(schema: dict, sample_rows: list[dict]) -> str:
    cols = "\n".join(f"  - {c['name']} ({c['type']})" for c in schema["columns"])
    samples = "\n".join(str(r) for r in sample_rows[:5]) if sample_rows else "(no data)"
    return f"""Table: {schema['name']}
Rows: {schema['row_count']}
Columns:
{cols}

Sample rows:
{samples}"""


_SQL_PROMPT = """You are a DuckDB SQL expert. Given a table schema and a natural language question, generate a single DuckDB-compatible SQL query.

Rules:
- Return ONLY the SQL query, no explanations, no markdown formatting
- Use proper DuckDB SQL syntax
- Use double quotes for table/column names if they contain special characters
- Limit results to at most 100 rows unless the question asks for all
- Do not include trailing semicolon
- If the question cannot be answered with the available data, return: SELECT 'Cannot answer from available data' AS response"""

_ANSWER_PROMPT = """You are a data analyst. The user asked a question about their dataset. Below is the SQL query that was executed and the results. Answer the user's question in plain, natural language based on these results.

Question: {question}

SQL executed:
{sql}

Results ({row_count} rows):
{results}

Provide a concise, helpful answer. If the results are empty or the query returned no data, say so clearly."""


def generate_sql(schema: dict, sample_rows: list[dict], question: str) -> str:
    client = get_client()
    schema_text = _build_schema_text(schema, sample_rows)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"{_SQL_PROMPT}\n\n{schema_text}\n\nQuestion: {question}",
    )
    sql = response.text.strip()
    if sql.startswith("```sql"):
        sql = sql[6:]
    if sql.startswith("```"):
        sql = sql[3:]
    if sql.endswith("```"):
        sql = sql[:-3]
    if sql.endswith(";"):
        sql = sql[:-1]
    return sql.strip()


def interpret_results(question: str, sql: str, results: list[dict], row_count: int) -> str:
    client = get_client()
    results_str = "\n".join(str(r) for r in results[:20])
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=_ANSWER_PROMPT.format(
            question=question, sql=sql, row_count=row_count, results=results_str
        ),
    )
    return response.text.strip()
