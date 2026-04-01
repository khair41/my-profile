from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass
class RssFeedConfig:
    name: str
    url: str
    enabled: bool = True


@dataclass
class YoutubeChannelConfig:
    channel_id: str
    name: str
    max_videos: int = 3
    enabled: bool = True


@dataclass
class GithubConfig:
    max_repos: int = 25
    language: str = ""
    since: str = "daily"
    enabled: bool = True


@dataclass
class ManualUrlEntry:
    url: str
    title: str | None = None
    category: str | None = None
    notes: str | None = None
    enabled: bool = True


@dataclass
class PipelineConfig:
    request_delay: float
    rss_feeds: list[RssFeedConfig]
    youtube_channels: list[YoutubeChannelConfig]
    github: GithubConfig
    manual_urls: list[ManualUrlEntry]
    ollama_url: str
    ollama_summarize_model: str
    ollama_generate_model: str
    ollama_timeout: float


_DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / "sources" / "config.yaml"
_DEFAULT_MANUAL_PATH = Path(__file__).parent.parent / "sources" / "manual.yaml"


def load_config(config_path: str | Path = _DEFAULT_CONFIG_PATH) -> PipelineConfig:
    raw = yaml.safe_load(Path(config_path).read_text(encoding="utf-8"))

    rss_feeds = [
        RssFeedConfig(
            name=f["name"],
            url=f["url"],
            enabled=f.get("enabled", True),
        )
        for f in raw.get("rss_feeds", [])
    ]

    youtube_channels = [
        YoutubeChannelConfig(
            channel_id=ch["channel_id"],
            name=ch["name"],
            max_videos=ch.get("max_videos", 3),
            enabled=ch.get("enabled", True),
        )
        for ch in raw.get("youtube_channels", [])
    ]

    gh_raw = raw.get("github", {})
    github = GithubConfig(
        max_repos=gh_raw.get("max_repos", 25),
        language=gh_raw.get("language", ""),
        since=gh_raw.get("since", "daily"),
        enabled=gh_raw.get("enabled", True),
    )

    manual_urls = _load_manual_urls()

    ollama_raw = raw.get("ollama", {})
    return PipelineConfig(
        request_delay=float(raw.get("request_delay", 1.0)),
        rss_feeds=rss_feeds,
        youtube_channels=youtube_channels,
        github=github,
        manual_urls=manual_urls,
        ollama_url=os.environ.get("OLLAMA_URL", ollama_raw.get("url", "http://localhost:11434")),
        ollama_summarize_model=os.environ.get("OLLAMA_SUMMARIZE_MODEL", ollama_raw.get("summarize_model", "llama3.2:latest")),
        ollama_generate_model=os.environ.get("OLLAMA_GENERATE_MODEL", ollama_raw.get("generate_model", "llama3.2:latest")),
        ollama_timeout=float(os.environ.get("OLLAMA_TIMEOUT", ollama_raw.get("timeout", 300))),
    )


def _load_manual_urls(manual_path: str | Path = _DEFAULT_MANUAL_PATH) -> list[ManualUrlEntry]:
    path = Path(manual_path)
    if not path.exists():
        return []
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    entries = raw.get("urls") or []
    return [
        ManualUrlEntry(
            url=e["url"],
            title=e.get("title"),
            category=e.get("category"),
            notes=e.get("notes"),
            enabled=e.get("enabled", True),
        )
        for e in entries
        if e.get("url")
    ]
