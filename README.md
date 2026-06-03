# hf-style-dataset-viewer

A local-first dataset explorer inspired by the Hugging Face Dataset Viewer.

`hf-style-dataset-viewer` is a self-hosted dataset explorer for browsing datasets stored on disk without uploading them to the cloud.

- No accounts
- No auth
- No telemetry
- No external APIs
- Runs entirely on `localhost`

## Features

- Local dataset discovery (`./datasets`)
- Fast backend preview with DuckDB
- Table viewer with sticky header + horizontal scroll
- Server-side pagination, sorting, and global search
- Row virtualization for smooth scrolling
- Dataset statistics endpoint (missing/unique/numeric summaries)

## Architecture

```
hf-style-dataset-viewer/
  datasets/
  backend/   (FastAPI + DuckDB + Polars)
  frontend/  (React + Vite + Tailwind + TanStack Table/Virtual + Zustand)
```

Frontend (`http://localhost:5173`) talks only to the local backend (`http://localhost:8000`).

## Screenshots

- `TODO`: header + sidebar
- `TODO`: table preview
- `TODO`: statistics modal

## Getting Started

### Prerequisites

- Node.js 20+ (works with newer versions)
- Python 3.12+

### 1) Add datasets

Drop files into `./datasets`:

- `*.csv`
- `*.json` (array of objects)
- `*.parquet`

Sample datasets are included in `datasets/`.

### 2) Start the backend

From the repo root:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.api.main:app --reload --port 8000
```

Optional:

- `HF_STYLE_DATASETS_DIR=/absolute/path/to/datasets` (defaults to `./datasets`)

### 3) Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Optional:

- `VITE_API_BASE_URL=http://localhost:8000`

### 4) Open the UI

Visit `http://localhost:5173`.

## Backend API

- `GET /datasets`
- `GET /datasets/{name}/schema`
- `GET /datasets/{name}/stats`
- `GET /datasets/{name}/preview?page=1&page_size=100&search=...&sort_by=...&sort_dir=asc|desc`
- `GET /datasets/{name}/statistics`

## Roadmap

- JSONL / Arrow / HF Datasets support
- Better schema + type rendering (nested values)
- Column statistics UI (not just JSON output)
- Semantic search + embeddings (local-first)
- Dataset annotations and versioning

## Contributing

See `CONTRIBUTING.md`.

## License

MIT — see `LICENSE`.
