from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class RssFeedConfig:
    name: str
    url: str


@dataclass
class YoutubeChannelConfig:
    channel_id: str
    name: str
    max_videos: int = 3


@dataclass
class GithubConfig:
    max_repos: int = 25
    language: str = ""
    since: str = "daily"


@dataclass
class PipelineConfig:
    request_delay: float
    rss_feeds: list[RssFeedConfig]
    youtube_channels: list[YoutubeChannelConfig]
    github: GithubConfig
    ollama_url: str
    ollama_summarize_model: str
    ollama_generate_model: str


_DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / "sources" / "config.yaml"


def load_config(config_path: str | Path = _DEFAULT_CONFIG_PATH) -> PipelineConfig:
    raw = yaml.safe_load(Path(config_path).read_text(encoding="utf-8"))

    rss_feeds = [
        RssFeedConfig(name=f["name"], url=f["url"])
        for f in raw.get("rss_feeds", [])
    ]

    youtube_channels = [
        YoutubeChannelConfig(
            channel_id=ch["channel_id"],
            name=ch["name"],
            max_videos=ch.get("max_videos", 3),
        )
        for ch in raw.get("youtube_channels", [])
    ]

    gh_raw = raw.get("github", {})
    github = GithubConfig(
        max_repos=gh_raw.get("max_repos", 25),
        language=gh_raw.get("language", ""),
        since=gh_raw.get("since", "daily"),
    )

    return PipelineConfig(
        request_delay=float(raw.get("request_delay", 1.0)),
        rss_feeds=rss_feeds,
        youtube_channels=youtube_channels,
        github=github,
        ollama_url=os.environ.get("OLLAMA_URL", "http://localhost:11434"),
        ollama_summarize_model=os.environ.get("OLLAMA_SUMMARIZE_MODEL", "llama3.2:latest"),
        ollama_generate_model=os.environ.get("OLLAMA_GENERATE_MODEL", "mistral:7b"),
    )
