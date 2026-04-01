from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List

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


def _write_data_file(data_path: Path, new_items: list) -> int:
    """Append new_items (dicts) to a data JSON file, deduped by 'id'. Returns count added."""
    existing: List[dict] = []
    if data_path.exists():
        existing = json.loads(data_path.read_text(encoding="utf-8"))
    existing_ids = {item["id"] for item in existing}

    to_add = [item for item in new_items if item["id"] not in existing_ids]
    if not to_add:
        return 0

    merged = existing + to_add
    tmp = data_path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, data_path)
    return len(to_add)


def publish_pending(kb: KnowledgeBase, mode: str, data_dir: Path) -> int:
    """
    Move items from kb.pending_{mode} to data/{mode}.json.
    Clears the pending list for published modes. Returns total count published.
    """
    modes = ["news", "ideas", "learning"] if mode == "all" else [mode]
    total = 0

    for m in modes:
        pending_attr = f"pending_{m}"
        pending: list = getattr(kb, pending_attr)
        if not pending:
            continue

        data_path = data_dir / f"{m}.json"
        items_as_dicts = [item.model_dump() for item in pending]
        count = _write_data_file(data_path, items_as_dicts)

        # Clear only the items that were successfully written
        published_ids = {d["id"] for d in items_as_dicts}
        setattr(kb, pending_attr, [item for item in pending if item.id not in published_ids])
        total += count

    return total
