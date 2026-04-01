from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

_CURSOR_PATH = Path(__file__).parent.parent.parent / "data" / "crawl-cursor.json"


def read_cursor() -> datetime | None:
    """Return last_crawled_at from cursor file, or None if absent/unreadable."""
    try:
        data = json.loads(_CURSOR_PATH.read_text())
        return datetime.fromisoformat(data["last_crawled_at"])
    except (FileNotFoundError, KeyError, ValueError):
        return None


def write_cursor(dt: datetime) -> None:
    """Atomically write cursor — mirrors file_io.py atomic write pattern."""
    _CURSOR_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = _CURSOR_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps({"last_crawled_at": dt.isoformat()}))
    os.replace(tmp, _CURSOR_PATH)
