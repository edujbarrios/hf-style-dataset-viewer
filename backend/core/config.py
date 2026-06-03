from __future__ import annotations

import os
from pathlib import Path


def repo_root() -> Path:
    # backend/core/config.py -> backend/core -> backend -> repo root
    return Path(__file__).resolve().parents[2]


def datasets_dir() -> Path:
    env = os.getenv("HF_STYLE_DATASETS_DIR")
    if env:
        return Path(env).expanduser().resolve()
    return (repo_root() / "datasets").resolve()

