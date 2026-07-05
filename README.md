# Dataset Explorer

Upload CSV datasets, browse their contents, and ask natural-language questions answered by Gemini 2.5 Flash.

**Live app:** [https://dataset-explorer.vercel.app](https://dataset-explorer.vercel.app)  
**API:** [https://dataset-explorer-api.onrender.com](https://dataset-explorer-api.onrender.com)  
*(Free-tier hosts may need ~30s to wake from sleep)*

---

## Architecture

```
Frontend (Vite + React 19 + Tailwind)     Backend (FastAPI + DuckDB)
┌──────────────────────────────┐      ┌──────────────────────────────┐
│  POST /upload  ─────────────►│      │  In-memory DuckDB            │
│  GET  /tables  ◄─────────────│      │  (multi-table, resets on     │
│  GET  /rows    ◄─────────────│      │   restart)                   │
│  GET  /schema/* ◄────────────│      │                              │
│  POST /ask     ─────────────►│      │  ┌────────────────────────┐  │
│                              │      │  │  Gemini 2.5 Flash       │  │
│  UploadDataset (drag & drop) │      │  │  ├─ generate SQL        │  │
│  SchemaPanel  (sidebar)      │      │  │  ├─ execute SQL         │  │
│  DataTable    (paginated)    │      │  │  └─ format NL answer    │  │
│  AskQuestion  (chat)         │      └──────────────────────────────┘
└──────────────────────────────┘
```

### Design decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Database** | DuckDB (`:memory:`) | CSV-native analytics engine; no schema setup; ideal for ad-hoc querying |
| **LLM pipeline** | SQL generation → execution → NL interpretation | Separates concerns: each step has a focused prompt, errors are traceable |
| **Frontend state** | React Context | Appropriate scale (no global state lib needed); co-locates table/schema state |
| **Styling** | Tailwind + dark theme | Rapid iteration; consistent with modern data tool aesthetics |

---

## LLM Prompt Design

The `/ask` endpoint uses a three-stage pipeline:

### 1. SQL generation (`llm.py`)
A system prompt instructs Gemini 2.5 Flash to produce DuckDB-compatible SQL. The prompt includes:
- The table schema (column names + types + row count)
- Up to 5 sample rows for value distribution awareness
- Explicit formatting rules (no backticks, no semicolons, `ILIKE` for text search)
- Guardrails: returns a sentinel value if the question can't be answered from available data

### 2. SQL execution
The generated SQL runs against DuckDB. If execution fails, the error and SQL are returned to the user for transparency.

### 3. Result interpretation (`llm.py`)
A second prompt asks Gemini to summarize the results in plain language. The prompt includes:
- The original question for context
- The SQL that was executed
- Up to 20 result rows
- A directive to mention specific numbers/patterns, and to clearly state if results are empty

---

## API

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| `POST` | `/upload` | multipart CSV file | `{table_name, columns[], row_count}` | Creates/replaces a DuckDB table |
| `GET` | `/tables` | — | `{tables: [{name, columns[], row_count}]}` | All loaded datasets |
| `GET` | `/rows` | `table`, `page`, `per_page`, `search?` | `{rows[], total, page, per_page}` | Paginated with optional ILIKE search |
| `GET` | `/schema/{name}` | path param, `?sample=true` | `{name, columns[], row_count, sample_rows[]}` | Schema + optional sample data |
| `POST` | `/ask` | `{question, table_name}` | `{answer, sql, row_count, columns[]}` | NL → SQL → NL pipeline |

All responses use Pydantic models for consistent shapes. Errors return `{detail: string}`.

---

## React State Management

The frontend uses a lightweight **Context + hooks** pattern:

- **`AppContext`** holds `tables[]`, `selectedTable`, `loading`, and `error` — the global state that multiple components need
- Each data-fetching component manages its own **local state** (`data`, `loading`, `error`, `page`, `search`) — keeping local concerns scoped
- `DataTable` debounces search input (300ms) and resets pagination on dataset change
- `AskQuestion` preserves chat history per dataset, scrolled into view automatically
- `UploadDataset` supports click-to-browse and **drag-and-drop**

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/) (free tier available)
- Never commit real API keys — use `.env` (gitignored)

### Backend

```bash
cd DatasetExplorer/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GEMINI_API_KEY
python main.py          # runs on http://localhost:8000
```

### Frontend

```bash
cd DatasetExplorer/frontend
npm install
npm run dev             # runs on http://localhost:5173
```

Set `VITE_API_URL` to change the backend URL (defaults to `http://localhost:8000`).

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key (get one at [aistudio.google.com](https://aistudio.google.com)) |
| `VITE_API_URL` | No | `http://localhost:8000` | Backend URL (frontend only) |
| `RELOAD` | No | `true` | Enable/disable FastAPI auto-reload |

---

## Deployment

### Backend — Render

1. Push repo to GitHub
2. [Render](https://render.com) → New Web Service → connect repo
3. Root directory: `DatasetExplorer/backend`
4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add env var: `GEMINI_API_KEY`
7. Deploy

A `render.yaml` is included for Blueprint-based deployment.

### Frontend — Vercel

1. [Vercel](https://vercel.com) → Add New Project → import repo
2. Framework: Vite; Root: `DatasetExplorer/frontend`
3. Add env var: `VITE_API_URL` (your Render URL)
4. Deploy

---

## Security

- API keys are stored in `.env` (gitignored) — never committed
- Environment variables are set via the deployment dashboard, never baked into images
- No authentication layer (data is session-local; no PII expected)

---

## What I'd Do Next

- **Column-type-aware search:** Allow filtering by column and comparison operators (`age > 30`, `name = 'foo'`)
- **Visualizations:** Have Gemini generate Plotly/Chart.js configs so answers can include charts
- **Session persistence:** Replace in-memory DuckDB with a persistent file so datasets survive restarts
- **Query history:** Show a history of generated SQL queries with edit/re-run capability
- **Async streaming:** Stream Gemini's response token-by-token for a more responsive chat experience
