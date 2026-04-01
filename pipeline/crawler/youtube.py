from __future__ import annotations

import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import yt_dlp

from pipeline.config import PipelineConfig
from pipeline.crawler.base import CrawlerBase
from pipeline.utils.logger import get_logger
from pipeline.utils.schemas import RawArticle

log = get_logger(__name__)

_MAX_TRANSCRIPT_CHARS = 6000
_VTT_TAG_RE = re.compile(r"<[^>]+>")
_VTT_TIMESTAMP_RE = re.compile(
    r"^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*$", re.MULTILINE
)


def _vtt_to_text(vtt: str) -> str:
    # Remove timestamps and XML-style tags, collapse whitespace
    text = _VTT_TIMESTAMP_RE.sub("", vtt)
    text = _VTT_TAG_RE.sub("", text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    # Deduplicate consecutive identical lines (VTT overlap artefact)
    deduped: list[str] = []
    for ln in lines:
        if not deduped or ln != deduped[-1]:
            deduped.append(ln)
    return " ".join(deduped)


class YoutubeCrawler(CrawlerBase):
    def __init__(self, config: PipelineConfig) -> None:
        self._config = config

    def fetch(self, existing_urls: set[str]) -> list[RawArticle]:
        articles: list[RawArticle] = []

        for ch in self._config.youtube_channels:
            if not ch.enabled:
                log.info("%s: disabled, skipping", ch.name)
                continue
            channel_url = f"https://www.youtube.com/channel/{ch.channel_id}/videos"
            try:
                new = self._fetch_channel(ch.name, channel_url, ch.max_videos, existing_urls)
                log.info("%s: %d new video(s)", ch.name, len(new))
                articles.extend(new)
            except Exception as exc:
                log.error("YouTube channel '%s' failed: %s", ch.name, exc)

        return articles

    def _fetch_channel(
        self,
        channel_name: str,
        channel_url: str,
        max_videos: int,
        existing_urls: set[str],
    ) -> list[RawArticle]:
        results: list[RawArticle] = []
        now = datetime.now(timezone.utc).isoformat()

        with tempfile.TemporaryDirectory() as tmpdir:
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "skip_download": True,
                "writeautomaticsub": True,
                "subtitlesformat": "vtt",
                "subtitleslangs": ["en"],
                "outtmpl": str(Path(tmpdir) / "%(id)s.%(ext)s"),
                "playlistend": max_videos,
                "ignoreerrors": True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(channel_url, download=True)

            if not info or "entries" not in info:
                return results

            for entry in (info.get("entries") or []):
                if not entry:
                    continue
                video_url = f"https://www.youtube.com/watch?v={entry.get('id', '')}"
                if video_url in existing_urls:
                    continue

                vtt_files = list(Path(tmpdir).glob(f"{entry.get('id', '')}*.vtt"))
                if not vtt_files:
                    log.warning("No captions for '%s', skipping", entry.get("title", video_url))
                    continue

                raw_vtt = vtt_files[0].read_text(encoding="utf-8", errors="replace")
                transcript = _vtt_to_text(raw_vtt)[:_MAX_TRANSCRIPT_CHARS]

                results.append(
                    RawArticle(
                        id=self._url_to_id(video_url),
                        url=video_url,
                        title=entry.get("title", video_url),
                        body=transcript,
                        source_name=channel_name,
                        source_type="youtube",
                        fetched_at=now,
                    )
                )

        return results
