# Dataset Explorer — Take-Home Exercise

**Option A:** Full-Stack Dataset Explorer with AI Insights
**Candidate:** Matan Jaffe
**Live app:[applied-materials-hw.vercel.app](https://applied-materials-hw.vercel.app/)****API base:[appliedmaterialshw.onrender.com](https://appliedmaterialshw.onrender.com)**

> *Free-tier hosts spin down after inactivity. Allow ~30s for the first request.*

---

## Architecture Overview

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

The backend is a **FastAPI** server with an in-memory **DuckDB** database. Uploaded CSVs become DuckDB tables. The AI pipeline uses **Gemini 2.5 Flash** in three stages: generate SQL from a natural-language question → execute it → interpret results back to plain language.

The frontend is a **React 19 + Vite + Tailwind** single-page app. State is managed via React Context (shared: table list, selection; local: pagination, search, chat history).

---

## API Design

All endpoints use explicit Pydantic request/response models. Every shape is validated at the boundary and documented via auto-generated OpenAPI.

| Method   | Path               | Request                                        | Response                                        | Purpose                 |
| -------- | ------------------ | ---------------------------------------------- | ----------------------------------------------- | ----------------------- |
| `POST` | `/upload`        | multipart CSV                                  | `{table_name, columns[], row_count}`          | Load a dataset          |
| `GET`  | `/tables`        | —                                             | `{tables: [{name, columns[], row_count}]}`    | List all datasets       |
| `GET`  | `/rows`          | `table`, `page`, `per_page`, `search?` | `{rows[], total, page, per_page}`             | Paginated data + search |
| `GET`  | `/schema/{name}` | path param,`?sample=`                        | `{name, columns[], row_count, sample_rows[]}` | Schema + samples        |
| `POST` | `/ask`           | `{question, table_name}`                     | `{answer, sql, row_count, columns[]}`         | NL → SQL → NL         |

**Design decisions:**

- `/rows` uses **query parameters** for stateless, cache-friendly pagination
- `/schema/{name}` is a separate resource (not embedded in `/tables`) so the LLM pipeline can fetch schema independently
- `/ask` returns the **generated SQL** alongside the answer — the frontend shows it in a collapsible detail for transparency
- Error responses consistently return `{detail: string}`

---

## React State Management

State is split between **global context** and **local component state**:

**Global (AppContext):** `tables[]`, `selectedTable`, `loading`, `error`
**Local (per component):** `data`, `page`, `search`, `messages[]`, `loading`

This avoids passing props through intermediate layers while keeping concerns like pagination, search debouncing, and chat history scoped to the components that own them.

**UX details:**

- Search is **debounced at 300ms** to avoid flooding the API on every keystroke
- Pagination resets to page 1 when switching datasets or applying a new search
- Chat history resets per dataset (each dataset has its own conversational context)
- Empty, loading, and error states are handled at every level
- The upload zone supports **click-to-browse** and **drag-and-drop**
- Column headers show **color-coded type badges** (blue=int, green=string, yellow=float, purple=date)

---

## LLM Prompt Structure

The `/ask` endpoint uses a **three-stage pipeline**, each with a focused prompt:

### Stage 1: SQL Generation (`llm.py`)

A system prompt instructs Gemini to produce DuckDB-compatible SQL. The prompt includes:

- Full schema: column names, types, total row count
- Up to 5 random sample rows (to reveal value distributions and formatting quirks)
- Explicit output rules: no markdown, no semicolons, use `ILIKE` for text search
- DuckDB-specific examples to reduce hallucination
- A sentinel fallback: return `SELECT 'Cannot answer from available data' AS response` if the question is unanswerable

### Stage 2: SQL Execution (`database.py`)

The generated SQL is executed against DuckDB. If execution fails (e.g., invalid column reference), the error and the offending SQL are returned to the user for full transparency.

### Stage 3: Result Interpretation (`llm.py`)

The SQL results (up to 20 rows) are fed to a second Gemini call along with the original question. This prompt explicitly tells the model NOT to mention SQL — the answer should read like a human analyst's summary. It also instructs Gemini to call out empty results clearly and reference specific numbers/patterns.

---

## Running Locally

### Prerequisites

- Python 3.10+, Node.js 18+
- A [Gemini API key](https://aistudio.google.com/) (free tier)

### Backend

```bash
cd DatasetExplorer/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GEMINI_API_KEY
python main.py          # → http://localhost:8000
```

### Frontend

```bash
cd DatasetExplorer/frontend
npm install
npm run dev             # → http://localhost:5173
```

Set `VITE_API_URL` to change the backend URL (defaults to `http://localhost:8000`).

---

## Environment Variables

| Variable           | Required | Default                   | Description            |
| ------------------ | -------- | ------------------------- | ---------------------- |
| `GEMINI_API_KEY` | Yes      | —                        | Google Gemini API key  |
| `VITE_API_URL`   | No       | `http://localhost:8000` | Backend URL (frontend) |
| `RELOAD`         | No       | `true`                  | FastAPI auto-reload    |

**Security:** All secrets are stored in `.env` (gitignored) and never committed. In production, variables are set via the deployment dashboard.

---

## Deployment

Backend is on Render

Frontend  is on Vercel

## What I'd Do Next

- **Column-type-aware search and filtering** — Let users filter by specific columns with comparison operators (`age > 30`, `name = 'Smith'`)
- **Visualizations** — Have Gemini generate Plotly/Chart.js configs so answers can include rendered charts inline
- **Session persistence** — Replace `:memory:` DuckDB with a persistent file so datasets survive server restarts
- **Query history** — Show a browsable history of generated SQL with edit and re-run capability
- **Streaming responses** — Stream Gemini's answer token-by-token via Server-Sent Events for a more responsive chat UX
