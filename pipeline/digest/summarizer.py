from __future__ import annotations

from pathlib import Path

from pipeline.config import PipelineConfig
from pipeline.digest import ollama_client
from pipeline.utils.file_io import write_kb
from pipeline.utils.logger import get_logger
from pipeline.utils.schemas import KnowledgeBase

log = get_logger(__name__)

_PROMPT_TEMPLATE = """\
You are a technical content analyst. Summarise the following article for a software engineer.

Title: {title}
Source: {source_name}
Body: {body}

Respond with ONLY valid JSON in this exact format:
{{
  "summary": "<2-4 sentence summary>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "relevance_score": <float 0.0-1.0>
}}

relevance_score: how relevant this is to software engineering, AI/ML, and developer tools (1.0 = highly relevant, 0.0 = not relevant).
tags: 3-6 short lowercase topic tags (e.g. "llm", "rust", "devops").\
"""


def _build_prompt(title: str, source_name: str, body: str) -> str:
    return _PROMPT_TEMPLATE.format(
        title=title,
        source_name=source_name,
        body=body[:3000],
    )


def _validate_response(data: dict) -> bool:
    """Return True if the response has all required fields with correct types."""
    if not isinstance(data.get("summary"), str):
        return False
    if not isinstance(data.get("tags"), list):
        return False
    score = data.get("relevance_score")
    if not isinstance(score, (int, float)):
        return False
    if not (0.0 <= float(score) <= 1.0):
        return False
    return True


def run_digest(kb: KnowledgeBase, config: PipelineConfig, kb_path: Path) -> int:
    """
    Summarise all pending_review items using Ollama.
    Writes KB to disk after each item for crash safety.
    Returns the count of successfully processed items.
    """
    pending = [item for item in kb.items if item.status == "pending_review"]

    if not pending:
        log.info("No pending items to digest")
        return 0

    total = len(pending)
    processed = 0

    for i, item in enumerate(pending, start=1):
        prompt = _build_prompt(item.title, item.source_name, item.body)

        result: dict | None = None
        for attempt in range(2):
            try:
                data = ollama_client.generate(
                    prompt=prompt,
                    model=config.ollama_summarize_model,
                    base_url=config.ollama_url,
                )
                if _validate_response(data):
                    result = data
                    break
                else:
                    raise ValueError(f"Response missing required fields: {data}")
            except ValueError as exc:
                if attempt == 0:
                    log.warning("Attempt 1 failed for '%s': %s — retrying", item.title[:60], exc)
                else:
                    log.warning("Attempt 2 failed for '%s': %s — marking error", item.title[:60], exc)

        if result is not None:
            item.summary = result["summary"]
            item.tags = [str(t).lower() for t in result["tags"]]
            item.relevance_score = round(float(result["relevance_score"]), 3)
            item.status = "processed"
            processed += 1
        else:
            item.status = "error"

        write_kb(kb, kb_path)
        log.info("Digested %d / %d — %s", i, total, item.title[:60])

    return processed
