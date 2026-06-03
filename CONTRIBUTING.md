# Contributing

Thanks for helping improve `hf-style-dataset-viewer`!

## Dev Setup

### Backend

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Useful Commands

### Frontend

- `npm run lint`
- `npm run build`

## Project Principles

- Local-first: no cloud dependencies
- Avoid loading full datasets into memory for preview
- Keep UI fast and responsive (virtualization for large tables)

## Pull Requests

- Keep changes focused and incremental
- Include validation steps (lint/build/tests where applicable)
