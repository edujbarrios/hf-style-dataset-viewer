from __future__ import annotations

from fastapi import FastAPI

from backend.api.routes.datasets import router as datasets_router

app = FastAPI(title="hf-style-dataset-viewer", version="0.1.0")

app.include_router(datasets_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
