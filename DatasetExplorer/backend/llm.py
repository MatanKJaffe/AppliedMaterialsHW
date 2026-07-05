import os
from google import genai

# Lazy-initialized singleton client so we don't re-auth on every request
_client: genai.Client | None = None


def get_client() -> genai.Client:
    """Return the authenticated Gemini client. API key loaded from env."""
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=api_key)
    return _client


def _build_schema_text(schema: dict, sample_rows: list[dict]) -> str:
    """Format schema + sample rows into a prompt-friendly text block.

    Sample rows help the LLM understand value distributions and quirks
    (e.g., a 'price' column might be stored as VARCHAR with '$' prefixes).
    """
    cols = "\n".join(
        f"  - {c['name']} ({c['type']})" for c in schema["columns"]
    )
    samples = "\n".join(str(r) for r in sample_rows[:5]) if sample_rows else "(no data)"
    return f"""Table: {schema['name']}
Rows: {schema['row_count']}
Columns:
{cols}

Sample rows:
{samples}"""


# SQL generation prompt. Designed to be explicit about DuckDB syntax,
# output format, and edge cases. Included examples reduce hallucination.
_SQL_PROMPT = """You are a DuckDB SQL expert. Given a table schema and a natural language question, generate a single DuckDB-compatible SQL query.

Rules:
- Return ONLY the SQL query — no explanations, no markdown formatting, no backticks
- Use DuckDB SQL syntax (ILIKE for case-insensitive string matching, DATE_TRUNC for date truncation, etc.)
- Use double quotes for identifiers that contain special characters or spaces
- Limit results to at most 100 rows unless the question explicitly asks for all
- Do not include a trailing semicolon
- If the question cannot be answered with the available data, return: SELECT 'Cannot answer from available data' AS response

Examples:
- "average salary" -> SELECT AVG("salary") FROM "table_name"
- "show me all rows where name contains john" -> SELECT * FROM "table_name" WHERE "name" ILIKE '%john%'
- "count rows grouped by department" -> SELECT "department", COUNT(*) AS cnt FROM "table_name" GROUP BY "department" ORDER BY cnt DESC"""


# Interpretation prompt. Note: the prompt explicitly asks the LLM
# NOT to mention SQL — the answer should read like a human analyst's summary.
_ANSWER_PROMPT = """You are a data analyst. The user asked a question about their dataset. Below is the SQL query that was executed and the results. Answer the user's question in plain, natural language based on these results.

Question: {question}

SQL executed:
{sql}

Results ({row_count} rows):
{results}

Guidelines:
- Provide a concise, helpful answer in plain language
- If the results are empty or the query returned no data, say so clearly
- Reference specific numbers and patterns from the data
- Do not mention SQL or the query unless it adds value
- If the result has a single value, state it directly"""


def generate_sql(schema: dict, sample_rows: list[dict], question: str) -> str:
    """Step 1: Ask Gemini to produce DuckDB SQL from a natural-language question.

    Sanitizes the output in case Gemini wraps it in markdown fences.
    """
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
    """Step 3: Ask Gemini to interpret the SQL results as a plain-language answer.

    Takes the top 20 rows as context to avoid blowing the context window.
    """
    client = get_client()
    results_str = "\n".join(str(r) for r in results[:20])
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=_ANSWER_PROMPT.format(
            question=question, sql=sql, row_count=row_count, results=results_str
        ),
    )
    return response.text.strip()
