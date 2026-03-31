from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path

from pipeline.config import PipelineConfig
from pipeline.digest import ollama_client
from pipeline.utils.file_io import write_kb
from pipeline.utils.logger import get_logger
from pipeline.utils.schemas import KnowledgeBase, PendingLearningItem, PendingLearningResource

log = get_logger(__name__)

MAX_LEARNING = 6
_MIN_RELEVANCE = 0.5
_MAX_SOURCE_ARTICLES = 20

_PROMPT_TEMPLATE = """\
You are a technical learning path designer. Below are {count} recent articles about software engineering and AI.
Identify recurring topics and create {max_items} structured learning paths for a software engineer.
Where possible, include resources drawn from the articles above.

Articles:
{articles}

Respond with ONLY valid JSON in this exact format:
{{
  "learning_paths": [
    {{
      "topic": "<topic name>",
      "rationale": "<why this topic matters now based on the articles>",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "estimated_hours": <integer>,
      "tags": ["<tag1>", "<tag2>"],
      "kb_source_ids": ["<id1>"],
      "resources": [
        {{
          "title": "<resource title>",
          "url": "<url>",
          "type": "article" | "video" | "repo"
        }}
      ]
    }}
  ]
}}

Rules:
- Include 3 to {max_items} learning paths
- Each path must have 1-5 resources
- Prefer real URLs from the articles above for resources
- difficulty must be exactly one of: beginner, intermediate, advanced
- estimated_hours: realistic integer (e.g. 4, 8, 20)
- tags: 2-5 short lowercase topic tags\
"""


def _build_prompt(articles: list, max_items: int) -> str:
    lines = []
    for i, a in enumerate(articles, start=1):
        lines.append(
            f"{i}. [id:{a.id}] {a.title}\n"
            f"   URL: {a.url} | Type: {a.source_type}\n"
            f"   Tags: {', '.join(a.tags)}\n"
            f"   Summary: {a.summary}\n"
        )
    return _PROMPT_TEMPLATE.format(
        count=len(articles),
        max_items=max_items,
        articles="\n".join(lines),
    )


def _validate_item(item: dict) -> bool:
    if not isinstance(item.get("topic"), str):
        return False
    if not isinstance(item.get("rationale"), str):
        return False
    if item.get("difficulty") not in ("beginner", "intermediate", "advanced"):
        return False
    if not isinstance(item.get("estimated_hours"), (int, float)):
        return False
    if not isinstance(item.get("resources"), list):
        return False
    return True


def _parse_resource(raw: dict) -> PendingLearningResource:
    rtype = raw.get("type", "article")
    if rtype not in ("article", "video", "repo"):
        rtype = "article"
    return PendingLearningResource(
        title=str(raw.get("title", "")),
        url=str(raw.get("url", "")),
        type=rtype,
    )


def run_generate_learning(kb: KnowledgeBase, config: PipelineConfig, kb_path: Path) -> int:
    """
    Generate learning path items from processed KB articles.
    Stages results in kb.pending_learning[]. Returns count of new items added.
    """
    source_articles = [
        a for a in kb.items
        if a.status == "processed" and (a.relevance_score or 0) >= _MIN_RELEVANCE
    ]
    source_articles.sort(key=lambda a: a.relevance_score or 0, reverse=True)
    source_articles = source_articles[:_MAX_SOURCE_ARTICLES]

    if not source_articles:
        log.warning("No processed articles with relevance >= %.1f — skipping learning generation", _MIN_RELEVANCE)
        return 0

    existing_ids = {item.id for item in kb.pending_learning}
    prompt = _build_prompt(source_articles, MAX_LEARNING)

    result: dict | None = None
    for attempt in range(2):
        try:
            data = ollama_client.generate(
                prompt=prompt,
                model=config.ollama_generate_model,
                base_url=config.ollama_url,
            )
            items = data.get("learning_paths", [])
            if not isinstance(items, list) or not items:
                raise ValueError(f"Expected non-empty learning_paths list, got: {data!r}")
            if not all(_validate_item(it) for it in items):
                raise ValueError("One or more items missing required fields")
            result = data
            break
        except ValueError as exc:
            if attempt == 0:
                log.warning("Attempt 1 failed for learning generation: %s — retrying", exc)
            else:
                log.error("Attempt 2 failed for learning generation: %s — aborting", exc)

    if result is None:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    added = 0
    for raw in result["learning_paths"][:MAX_LEARNING]:
        topic = raw["topic"]
        item_id = hashlib.sha256(topic.encode()).hexdigest()[:16]
        if item_id in existing_ids:
            continue
        resources = [_parse_resource(r) for r in raw.get("resources", []) if isinstance(r, dict)]
        kb.pending_learning.append(PendingLearningItem(
            id=item_id,
            topic=topic,
            rationale=raw["rationale"],
            resources=resources,
            difficulty=raw["difficulty"],
            estimated_hours=float(raw["estimated_hours"]),
            tags=[str(t).lower() for t in raw.get("tags", [])],
            generated_at=now,
            kb_source_ids=[str(s) for s in raw.get("kb_source_ids", [])],
        ))
        existing_ids.add(item_id)
        added += 1

    write_kb(kb, kb_path)
    return added
