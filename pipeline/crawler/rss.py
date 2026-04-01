from __future__ import annotations

import calendar
import re
import time
from datetime import datetime, timezone

import feedparser

from pipeline.config import PipelineConfig
from pipeline.crawler.base import CrawlerBase
from pipeline.utils.logger import get_logger
from pipeline.utils.schemas import RawArticle

log = get_logger(__name__)

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(text: str) -> str:
    return _HTML_TAG_RE.sub("", text).strip()


class RssCrawler(CrawlerBase):
    def __init__(self, config: PipelineConfig) -> None:
        self._config = config

    def fetch(self, existing_urls: set[str], since: datetime | None = None) -> list[RawArticle]:
        articles: list[RawArticle] = []

        for feed_cfg in self._config.rss_feeds:
            if not feed_cfg.enabled:
                log.info("%s: disabled, skipping", feed_cfg.name)
                continue
            try:
                new = self._fetch_feed(feed_cfg.name, feed_cfg.url, existing_urls, since)
                log.info("%s: %d new article(s)", feed_cfg.name, len(new))
                articles.extend(new)
            except Exception as exc:
                log.error("Feed '%s' failed: %s", feed_cfg.name, exc)

            time.sleep(self._config.request_delay)

        return articles

    def _fetch_feed(
        self,
        name: str,
        url: str,
        existing_urls: set[str],
        since: datetime | None = None,
    ) -> list[RawArticle]:
        parsed = feedparser.parse(url)
        if parsed.get("bozo") and not parsed.entries:
            raise ValueError(f"feedparser bozo error: {parsed.get('bozo_exception')}")

        now = datetime.now(timezone.utc).isoformat()
        results: list[RawArticle] = []

        for entry in parsed.entries:
            entry_url: str = entry.get("link", "")
            if not entry_url or entry_url in existing_urls:
                continue

            # Resolve article publication date from feed metadata
            pub_dt: datetime | None = None
            if entry.get("published_parsed"):
                pub_dt = datetime.fromtimestamp(
                    calendar.timegm(entry.published_parsed), tz=timezone.utc
                )
            elif entry.get("updated_parsed"):
                pub_dt = datetime.fromtimestamp(
                    calendar.timegm(entry.updated_parsed), tz=timezone.utc
                )

            # Skip articles older than the cutoff; allow through if date is unknown
            if since and pub_dt is not None and pub_dt < since:
                continue

            title = _strip_html(entry.get("title", ""))
            summary = _strip_html(
                entry.get("summary", "")
                or entry.get("description", "")
                or entry.get("content", [{}])[0].get("value", "")
            )

            results.append(
                RawArticle(
                    id=self._url_to_id(entry_url),
                    url=entry_url,
                    title=title,
                    body=summary,
                    source_name=name,
                    source_type="rss",
                    fetched_at=now,
                    published_at=pub_dt.isoformat() if pub_dt else None,
                )
            )

        return results
