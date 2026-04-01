from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class RawArticle(BaseModel):
    id: str                          # SHA256[:16] of URL — stable dedup key
    url: str
    title: str
    body: str                        # plain text, HTML stripped
    source_name: str                 # e.g. "Hacker News", "GitHub Trending"
    source_type: Literal["rss", "github", "youtube", "manual"]
    fetched_at: str                  # ISO 8601 — when WE crawled it
    published_at: Optional[str] = None  # ISO 8601 — article's own publication date (from feed)
    status: Literal["pending_review", "processed", "rejected", "error"] = "pending_review"
    # Populated by digest stage (Phase 3):
    summary: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    relevance_score: Optional[float] = None


class PendingNewsItem(BaseModel):
    id: str                       # SHA256[:16] of title
    title: str
    summary: str
    url: str
    source_name: str
    published_at: str             # ISO 8601
    tags: List[str] = Field(default_factory=list)
    kb_source_ids: List[str] = Field(default_factory=list)


class PendingIdeaItem(BaseModel):
    id: str
    title: str
    problem: str
    opportunity: str
    suggested_stack: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    generated_at: str             # ISO 8601
    kb_source_ids: List[str] = Field(default_factory=list)


class PendingLearningResource(BaseModel):
    title: str
    url: str
    type: Literal["article", "video", "repo"]


class PendingLearningItem(BaseModel):
    id: str
    topic: str
    rationale: str
    resources: List[PendingLearningResource] = Field(default_factory=list)
    difficulty: Literal["beginner", "intermediate", "advanced"]
    estimated_hours: float
    tags: List[str] = Field(default_factory=list)
    generated_at: str             # ISO 8601
    kb_source_ids: List[str] = Field(default_factory=list)


class KnowledgeBase(BaseModel):
    items: List[RawArticle] = Field(default_factory=list)
    pending_news: List[PendingNewsItem] = Field(default_factory=list)
    pending_ideas: List[PendingIdeaItem] = Field(default_factory=list)
    pending_learning: List[PendingLearningItem] = Field(default_factory=list)
