from __future__ import annotations

from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

from pipeline.config import PipelineConfig
from pipeline.crawler.base import CrawlerBase
from pipeline.utils.logger import get_logger
from pipeline.utils.schemas import RawArticle

log = get_logger(__name__)

_TRENDING_URL = "https://github.com/trending"


class GithubCrawler(CrawlerBase):
    def __init__(self, config: PipelineConfig) -> None:
        self._config = config

    def fetch(self, existing_urls: set[str]) -> list[RawArticle]:
        if not self._config.github.enabled:
            log.info("GitHub Trending: disabled, skipping")
            return []
        params: dict[str, str] = {"since": self._config.github.since}
        if self._config.github.language:
            params["l"] = self._config.github.language

        try:
            response = httpx.get(
                _TRENDING_URL,
                params=params,
                headers={"User-Agent": "Mozilla/5.0 (compatible; my-profile-crawler/1.0)"},
                follow_redirects=True,
                timeout=15,
            )
            response.raise_for_status()
        except Exception as exc:
            log.error("GitHub trending fetch failed: %s", exc)
            return []

        articles = self._parse(response.text, existing_urls)
        log.info("GitHub Trending: %d new repo(s)", len(articles))
        return articles

    def _parse(self, html: str, existing_urls: set[str]) -> list[RawArticle]:
        soup = BeautifulSoup(html, "lxml")
        now = datetime.now(timezone.utc).isoformat()
        results: list[RawArticle] = []

        for row in soup.select("article.Box-row")[: self._config.github.max_repos]:
            h2 = row.select_one("h2 a")
            if not h2:
                continue

            repo_path = h2.get("href", "").strip().lstrip("/")
            url = f"https://github.com/{repo_path}"
            if not repo_path or url in existing_urls:
                continue

            title = repo_path.replace("/", " / ")

            desc_el = row.select_one("p")
            description = desc_el.get_text(strip=True) if desc_el else ""

            lang_el = row.select_one("[itemprop='programmingLanguage']")
            language = lang_el.get_text(strip=True) if lang_el else ""

            stars_el = row.select_one("a[href$='/stargazers']")
            stars = stars_el.get_text(strip=True).replace(",", "") if stars_el else ""

            body_parts = [description]
            if language:
                body_parts.append(f"Language: {language}.")
            if stars:
                body_parts.append(f"Stars: {stars}.")
            body = " ".join(filter(None, body_parts))

            results.append(
                RawArticle(
                    id=self._url_to_id(url),
                    url=url,
                    title=title,
                    body=body,
                    source_name="GitHub Trending",
                    source_type="github",
                    fetched_at=now,
                )
            )

        return results
