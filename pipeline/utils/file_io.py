from __future__ import annotations

import json
import os
from pathlib import Path

from pipeline.utils.schemas import KnowledgeBase


def read_kb(path: str | Path) -> KnowledgeBase:
    p = Path(path)
    if not p.exists():
        return KnowledgeBase()
    raw = json.loads(p.read_text(encoding="utf-8"))
    return KnowledgeBase.model_validate(raw)


def write_kb(kb: KnowledgeBase, path: str | Path) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".json.tmp")
    tmp.write_text(
        kb.model_dump_json(indent=2, exclude_none=False),
        encoding="utf-8",
    )
    os.replace(tmp, p)   # atomic on POSIX; best-effort on Windows
