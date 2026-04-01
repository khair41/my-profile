#!/usr/bin/env python3
"""
pipeline/run.py — CLI entry point for the ingestion pipeline.

Usage:
    python pipeline/run.py --crawl
    python pipeline/run.py --crawl --since 7d
    python pipeline/run.py --crawl --since 2026-01-01
    python pipeline/run.py --digest
    python pipeline/run.py --crawl --digest
    python pipeline/run.py --generate news|ideas|learning|all
    python pipeline/run.py --generate all --passes 5
    python pipeline/run.py --publish news|ideas|learning|all
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pipeline.config import load_config
from pipeline.crawler.github import GithubCrawler
from pipeline.crawler.manual import ManualCrawler
from pipeline.crawler.rss import RssCrawler
from pipeline.crawler.youtube import YoutubeCrawler
from pipeline.digest import summarizer
from pipeline.digest.dedup import existing_url_set
from pipeline.generate import ideas as ideas_gen
from pipeline.generate import learning as learning_gen
from pipeline.generate import news as news_gen
from pipeline.utils.crawl_cursor import read_cursor, write_cursor
from pipeline.utils.file_io import publish_pending, read_kb, write_kb
from pipeline.utils.logger import get_logger

log = get_logger("pipeline")

KB_PATH = Path(__file__).parent.parent / "data" / "knowledge-base.json"
DATA_DIR = Path(__file__).parent.parent / "data"


def _parse_since(value: str | None) -> datetime | None:
    """Parse --since flag value into a timezone-aware datetime.

    Accepts:
      - "7d", "30d"  — relative (N days ago from now)
      - "2026-01-01" — ISO date (interpreted as UTC midnight)
    """
    if value is None:
        return None
    if re.match(r"^\d+d$", value):
        return datetime.now(timezone.utc) - timedelta(days=int(value[:-1]))
    return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)


def run_crawl(since: datetime | None = None) -> int:
    if since:
        log.info("Crawl since: %s", since.isoformat())
    else:
        log.info("Crawl since: no limit (fetching all available articles)")

    config = load_config()
    kb = read_kb(KB_PATH)
    existing = existing_url_set(kb)

    crawlers = [
        RssCrawler(config),
        GithubCrawler(config),
        YoutubeCrawler(config),
        ManualCrawler(config),
    ]

    total_new = 0
    for crawler in crawlers:
        new_articles = crawler.fetch(existing, since=since)
        for article in new_articles:
            existing.add(article.url)
            kb.items.append(article)
        total_new += len(new_articles)

    write_kb(kb, KB_PATH)
    write_cursor(datetime.now(timezone.utc))
    log.info("Crawl complete — %d new article(s) added (total in KB: %d)", total_new, len(kb.items))
    return total_new


def run_digest() -> int:
    config = load_config()
    kb = read_kb(KB_PATH)
    count = summarizer.run_digest(kb, config, KB_PATH)
    log.info("Digest complete — %d article(s) summarised", count)
    return count


def run_generate(mode: str, passes: int = 1) -> None:
    config = load_config()
    kb = read_kb(KB_PATH)
    modes = ["news", "ideas", "learning"] if mode == "all" else [mode]

    if passes > 1:
        log.info("Running %d pass(es) of generation for: %s", passes, ", ".join(modes))

    for pass_num in range(1, passes + 1):
        if passes > 1:
            log.info("--- Pass %d / %d ---", pass_num, passes)
        for m in modes:
            try:
                if m == "news":
                    count = news_gen.run_generate_news(kb, config, KB_PATH)
                    log.info("News generation complete — %d item(s) staged", count)
                elif m == "ideas":
                    count = ideas_gen.run_generate_ideas(kb, config, KB_PATH)
                    log.info("Ideas generation complete — %d item(s) staged", count)
                elif m == "learning":
                    count = learning_gen.run_generate_learning(kb, config, KB_PATH)
                    log.info("Learning generation complete — %d item(s) staged", count)
                else:
                    log.error("Unknown mode: %s (must be news|ideas|learning|all)", m)
            except Exception as exc:
                log.error("Generation failed for '%s': %s", m, exc)
                if mode != "all":
                    raise

    total = (
        len(kb.pending_news) + len(kb.pending_ideas) + len(kb.pending_learning)
    )
    log.info(
        "Generation done — pending: %d news, %d ideas, %d learning (%d total)",
        len(kb.pending_news), len(kb.pending_ideas), len(kb.pending_learning), total,
    )


def run_publish(mode: str) -> None:
    kb = read_kb(KB_PATH)
    count = publish_pending(kb, mode, DATA_DIR)
    write_kb(kb, KB_PATH)
    log.info("Publish complete — %d item(s) written to data/*.json", count)


def main() -> None:
    parser = argparse.ArgumentParser(description="AI profile pipeline")
    parser.add_argument("--crawl", action="store_true", help="Run all crawlers")
    parser.add_argument(
        "--since",
        metavar="DATE",
        help=(
            "Only crawl articles published after DATE. "
            "Accepts '7d', '30d' (relative) or '2026-01-01' (ISO date). "
            "Defaults to the last crawl cursor when not set."
        ),
    )
    parser.add_argument("--digest", action="store_true", help="Run Ollama digest stage")
    parser.add_argument(
        "--generate",
        metavar="MODE",
        help="Run generation: news | ideas | learning | all",
    )
    parser.add_argument(
        "--passes",
        type=int,
        default=1,
        metavar="N",
        help="Number of generation passes (default: 1); each pass uses a different random article sample",
    )
    parser.add_argument(
        "--publish",
        metavar="MODE",
        help="Publish pending items to data/*.json: news | ideas | learning | all",
    )
    args = parser.parse_args()

    if not any([args.crawl, args.digest, args.generate, args.publish]):
        parser.print_help()
        sys.exit(1)

    try:
        if args.crawl:
            since_dt = _parse_since(args.since) if args.since else read_cursor()
            run_crawl(since=since_dt)
        if args.digest:
            run_digest()
        if args.generate:
            run_generate(args.generate, passes=args.passes)
        if args.publish:
            run_publish(args.publish)
    except Exception as exc:
        log.error("Pipeline failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
