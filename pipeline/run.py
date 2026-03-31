#!/usr/bin/env python3
"""
pipeline/run.py — CLI entry point for the ingestion pipeline.

Usage:
    python pipeline/run.py --crawl
    python pipeline/run.py --digest
    python pipeline/run.py --crawl --digest
    python pipeline/run.py --generate news|ideas|learning|all
"""
from __future__ import annotations

import argparse
import sys
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
from pipeline.utils.file_io import read_kb, write_kb
from pipeline.utils.logger import get_logger

log = get_logger("pipeline")

KB_PATH = Path(__file__).parent.parent / "data" / "knowledge-base.json"


def run_crawl() -> int:
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
        new_articles = crawler.fetch(existing)
        for article in new_articles:
            existing.add(article.url)
            kb.items.append(article)
        total_new += len(new_articles)

    write_kb(kb, KB_PATH)
    log.info("Crawl complete — %d new article(s) added (total in KB: %d)", total_new, len(kb.items))
    return total_new


def run_digest() -> int:
    config = load_config()
    kb = read_kb(KB_PATH)
    count = summarizer.run_digest(kb, config, KB_PATH)
    log.info("Digest complete — %d article(s) summarised", count)
    return count


def run_generate(mode: str) -> None:
    config = load_config()
    kb = read_kb(KB_PATH)
    modes = ["news", "ideas", "learning"] if mode == "all" else [mode]

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


def main() -> None:
    parser = argparse.ArgumentParser(description="AI profile pipeline")
    parser.add_argument("--crawl", action="store_true", help="Run all crawlers")
    parser.add_argument("--digest", action="store_true", help="Run Ollama digest stage")
    parser.add_argument(
        "--generate",
        metavar="MODE",
        help="Run generation: news | ideas | learning | all",
    )
    args = parser.parse_args()

    if not any([args.crawl, args.digest, args.generate]):
        parser.print_help()
        sys.exit(1)

    try:
        if args.crawl:
            run_crawl()
        if args.digest:
            run_digest()
        if args.generate:
            run_generate(args.generate)
    except Exception as exc:
        log.error("Pipeline failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
