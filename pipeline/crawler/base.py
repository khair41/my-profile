from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from datetime import datetime

from pipeline.utils.schemas import RawArticle


class CrawlerBase(ABC):
    @abstractmethod
    def fetch(self, existing_urls: set[str], since: datetime | None = None) -> list[RawArticle]:
        """Fetch new articles, skipping any whose URL is already in existing_urls.

        Args:
            existing_urls: URLs already present in the knowledge base.
            since: Optional cutoff — skip articles published before this datetime.
                   Crawlers that cannot determine a publication date ignore this parameter.
        """
        ...

    @staticmethod
    def _url_to_id(url: str) -> str:
        return hashlib.sha256(url.encode()).hexdigest()[:16]
