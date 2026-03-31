from __future__ import annotations

import json

import httpx

from pipeline.utils.logger import get_logger

log = get_logger(__name__)


def generate(prompt: str, model: str, base_url: str) -> dict:
    """
    Call Ollama /api/generate with JSON mode.

    Returns the parsed dict from the response's `response` field.
    Raises ValueError on HTTP error or JSON parse failure.
    """
    url = base_url.rstrip("/") + "/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "format": "json",
        "stream": False,
    }

    try:
        resp = httpx.post(url, json=payload, timeout=120)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise ValueError(f"Ollama HTTP error: {exc}") from exc

    body = resp.json()
    raw_response = body.get("response", "")

    try:
        return json.loads(raw_response)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Ollama returned invalid JSON: {raw_response!r}") from exc
