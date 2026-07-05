# Dataset Explorer

Upload CSV datasets, browse their contents, and ask natural-language questions answered by Gemini.

## Architecture

```
Frontend (Vite + React + Tailwind)     Backend (FastAPI + DuckDB)
┌──────────────────────────────┐      ┌──────────────────────────────┐
│  POST /upload  ─────────────►│      │  In-memory DuckDB            │
│  GET  /tables  ◄─────────────│      │  (multi-table, resets on     │
│  GET  /rows    ◄─────────────│      │   restart)                   │
│  POST /ask     ─────────────►│      │                              │
│                              │      │  ┌────────────────────────┐  │
│  - UploadDataset            │      │  │  Gemini 2.5 Flash       │  │
│  - SchemaPanel (sidebar)    │      │  │  ├─ generate SQL        │  │
│  - DataTable (paginated)    │      │  │  ├─ execute SQL         │  │
│  - AskQuestion (chat)       │      │  │  └─ format NL answer    │  │
└──────────────────────────────┘      └──────────────────────────────┘
```

**Backend:** FastAPI with an in-memory DuckDB. Each uploaded CSV becomes a named table. The `/ask` endpoint uses Gemini to generate SQL, executes it, then formats the results as plain language.

**Frontend:** Thin React client. All data operations go through the API — no direct database access in the browser.

## Prerequisites

- Python 3.10+
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/) (free tier available)

## Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GEMINI_API_KEY
python main.py
```

Runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. The API URL defaults to `http://localhost:8000` — set `VITE_API_URL` in the environment to change it.

## Environment Variables

| Variable           | Required | Default                   | Description                 |
| ------------------ | -------- | ------------------------- | --------------------------- |
| `GEMINI_API_KEY` | Yes      | —                        | Google Gemini API key       |
| `VITE_API_URL`   | No       | `http://localhost:8000` | Backend URL (frontend only) |

## Deployment

### Backend — Render

1. Push your repo to GitHub.
2. Go to [render.com](https://render.com) → New → Web Service → connect your repo.
3. Select the `DatasetExplorer/backend` directory as the root.
4. Set:
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/tables`
5. Add environment variable:
   - `GEMINI_API_KEY` — your Gemini API key
6. Deploy. Once live, note the URL (e.g., `https://dataset-explorer-api.onrender.com`).

A `render.yaml` file is included for Blueprint-based deployment.

### Frontend — Vercel

1. Push your repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → Add New Project → import your repo.
3. Set:
   - **Framework Preset:** Vite
   - **Root Directory:** `DatasetExplorer/frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable:
   - `VITE_API_URL` — your Render backend URL (e.g., `https://dataset-explorer-api.onrender.com`)
5. Deploy.

### Connecting Them

Set `VITE_API_URL` on Vercel to your Render backend URL. The frontend will use that as the API base for all requests. No CORS issues — the backend already allows all origins.

### Staying Awake

Render's free tier spins down after 15 minutes of inactivity. The first request after idle takes ~30s to wake up. For demo purposes this is fine. To keep it warm:

- Set up a free cron job (e.g., cron-job.org) to ping `/tables` every 10 minutes.
- Or upgrade to Render's $7/mo Starter plan (no sleep).

## API Endpoints

| Method   | Path                                              | Description                                                                                            |
| -------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `POST` | `/upload`                                       | Upload a CSV file (multipart form). Returns`table_name`, `columns`, `row_count`.                 |
| `GET`  | `/tables`                                       | List all loaded tables with column info and row counts.                                                |
| `GET`  | `/rows?table=...&page=1&per_page=50&search=...` | Paginated row data with optional text search.                                                          |
| `POST` | `/ask`                                          | `{question, table_name}` → Gemini generates SQL, executes it, returns `{answer, sql, row_count}`. |

## What I'd Do Next

- **Column-type-aware search:** Let users filter by column and use comparison operators (e.g., `age > 30`).
- **Visualizations:** Allow Gemini to generate Plotly/Chart.js configs so the answer can include charts.
- **Session persistence:** Replace in-memory DuckDB with a persistent SQLite/DuckDB file so datasets survive restarts.
- **Query history:** Show a history of generated SQL queries with the ability to re-run or edit them.
- **Async streaming:** Stream the Gemini response token-by-token for a more responsive chat experience.
