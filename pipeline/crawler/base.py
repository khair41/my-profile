from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod

from pipeline.utils.schemas import RawArticle


class CrawlerBase(ABC):
    @abstractmethod
    def fetch(self, existing_urls: set[str]) -> list[RawArticle]:
        """Fetch new articles, skipping any whose URL is already in existing_urls."""
        ...

    @staticmethod
    def _url_to_id(url: str) -> str:
        return hashlib.sha256(url.encode()).hexdigest()[:16]
