from __future__ import annotations

import time
from datetime import datetime, timezone
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx
from readability import Document

from pipeline.config import PipelineConfig
from pipeline.crawler.base import CrawlerBase
from pipeline.utils.logger import get_logger
from pipeline.utils.schemas import RawArticle

log = get_logger(__name__)

_USER_AGENT = "Mozilla/5.0 (compatible; my-profile-crawler/1.0)"


def _robots_allowed(url: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = RobotFileParser()
    rp.set_url(robots_url)
    try:
        rp.read()
    except Exception:
        return True  # if robots.txt is unreachable, assume allowed
    return rp.can_fetch(_USER_AGENT, url)


class ManualCrawler(CrawlerBase):
    def __init__(self, config: PipelineConfig) -> None:
        self._config = config

    def fetch(self, existing_urls: set[str], since: datetime | None = None) -> list[RawArticle]:
        entries = self._config.manual_urls

        if since:
            log.debug("Manual crawler: date filtering not applicable (static URLs)")
        if not entries:
            log.info("Manual crawler: no URLs configured")
            return []

        results: list[RawArticle] = []
        now = datetime.now(timezone.utc).isoformat()

        for entry in entries:
            if not entry.enabled:
                log.info("Manual: '%s' disabled, skipping", entry.url)
                continue
            url = entry.url
            if url in existing_urls:
                continue

            if not _robots_allowed(url):
                log.warning("robots.txt disallows '%s', skipping", url)
                continue

            try:
                article = self._fetch_article(url, entry.title, now)
                results.append(article)
                log.info("Manual: fetched '%s'", article.title)
            except Exception as exc:
                log.error("Manual fetch failed for '%s': %s", url, exc)

            time.sleep(self._config.request_delay)

        log.info("Manual crawler: %d new article(s)", len(results))
        return results

    def _fetch_article(self, url: str, title_override: str | None, now: str) -> RawArticle:
        response = httpx.get(
            url,
            headers={"User-Agent": _USER_AGENT},
            follow_redirects=True,
            timeout=15,
        )
        response.raise_for_status()

        doc = Document(response.text)
        title = title_override or doc.title() or url
        body = Document(response.text).summary(html_partial=True)
        # Strip remaining HTML tags
        import re
        body = re.sub(r"<[^>]+>", "", body).strip()

        return RawArticle(
            id=self._url_to_id(url),
            url=url,
            title=title,
            body=body,
            source_name="Manual",
            source_type="manual",
            fetched_at=now,
        )
