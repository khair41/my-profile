from __future__ import annotations

import hashlib
import random
from datetime import datetime, timezone
from pathlib import Path

from pipeline.config import PipelineConfig
from pipeline.digest import ollama_client
from pipeline.utils.file_io import write_kb
from pipeline.utils.logger import get_logger
from pipeline.utils.schemas import KnowledgeBase, PendingIdeaItem

log = get_logger(__name__)

MAX_IDEAS = 8
_MIN_RELEVANCE = 0.5
_MAX_SOURCE_ARTICLES = 30
_POOL_SIZE = 150  # sample from top-N by relevance to add variety across runs

_PROMPT_TEMPLATE = """\
You are a startup idea generator. Below are {count} recent articles about software engineering, AI, and developer tools.
Synthesise {max_items} startup ideas that are meaningfully inspired by patterns or gaps you observe across these articles.

Articles:
{articles}

Respond with ONLY valid JSON in this exact format:
{{
  "ideas": [
    {{
      "title": "<concise idea name>",
      "problem": "<problem this solves>",
      "opportunity": "<market opportunity / why now>",
      "suggested_stack": ["<tech1>", "<tech2>"],
      "tags": ["<tag1>", "<tag2>"],
      "kb_source_ids": ["<id1>", "<id2>"]
    }}
  ]
}}

Rules:
- Include 3 to {max_items} ideas
- Ideas must be grounded in the articles — kb_source_ids must reference real article ids above
- suggested_stack: 2-5 specific technologies
- tags: 2-5 short lowercase topic tags\
"""


def _build_prompt(articles: list, max_items: int) -> str:
    lines = []
    for i, a in enumerate(articles, start=1):
        lines.append(
            f"{i}. [id:{a.id}] {a.title}\n"
            f"   Tags: {', '.join(a.tags)}\n"
            f"   Summary: {a.summary}\n"
        )
    return _PROMPT_TEMPLATE.format(
        count=len(articles),
        max_items=max_items,
        articles="\n".join(lines),
    )


def _validate_item(item: dict) -> bool:
    return (
        isinstance(item.get("title"), str)
        and isinstance(item.get("problem"), str)
        and isinstance(item.get("opportunity"), str)
        and isinstance(item.get("suggested_stack"), list)
        and isinstance(item.get("tags"), list)
    )


def run_generate_ideas(kb: KnowledgeBase, config: PipelineConfig, kb_path: Path) -> int:
    """
    Generate startup idea items from processed KB articles.
    Stages results in kb.pending_ideas[]. Returns count of new items added.
    """
    pool = [
        a for a in kb.items
        if a.status == "processed" and (a.relevance_score or 0) >= _MIN_RELEVANCE
    ]
    pool.sort(key=lambda a: a.relevance_score or 0, reverse=True)
    pool = pool[:_POOL_SIZE]
    source_articles = random.sample(pool, min(_MAX_SOURCE_ARTICLES, len(pool)))

    if not source_articles:
        log.warning("No processed articles with relevance >= %.1f — skipping ideas generation", _MIN_RELEVANCE)
        return 0

    existing_ids = {item.id for item in kb.pending_ideas}
    prompt = _build_prompt(source_articles, MAX_IDEAS)

    result: dict | None = None
    for attempt in range(2):
        try:
            data = ollama_client.generate(
                prompt=prompt,
                model=config.ollama_generate_model,
                base_url=config.ollama_url,
                timeout=config.ollama_timeout,
            )
            items = data.get("ideas", [])
            if not isinstance(items, list) or not items:
                raise ValueError(f"Expected non-empty ideas list, got: {data!r}")
            if not all(_validate_item(it) for it in items):
                raise ValueError("One or more items missing required fields")
            result = data
            break
        except ValueError as exc:
            if attempt == 0:
                log.warning("Attempt 1 failed for ideas generation: %s — retrying", exc)
            else:
                log.error("Attempt 2 failed for ideas generation: %s — aborting", exc)

    if result is None:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    added = 0
    for raw in result["ideas"][:MAX_IDEAS]:
        title = raw["title"]
        item_id = hashlib.sha256(title.encode()).hexdigest()[:16]
        if item_id in existing_ids:
            continue
        kb.pending_ideas.append(PendingIdeaItem(
            id=item_id,
            title=title,
            problem=raw["problem"],
            opportunity=raw["opportunity"],
            suggested_stack=[str(s) for s in raw.get("suggested_stack", [])],
            tags=[str(t).lower() for t in raw.get("tags", [])],
            generated_at=now,
            kb_source_ids=[str(s) for s in raw.get("kb_source_ids", [])],
        ))
        existing_ids.add(item_id)
        added += 1

    write_kb(kb, kb_path)
    return added
