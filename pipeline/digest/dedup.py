from __future__ import annotations

from pipeline.utils.schemas import KnowledgeBase


def existing_url_set(kb: KnowledgeBase) -> set[str]:
    """Return the set of all URLs already stored in the knowledge base."""
    return {item.url for item in kb.items}
