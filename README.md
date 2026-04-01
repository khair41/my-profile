# Personal Profile + AI Intelligence Engine

A personal profile site backed by a local AI pipeline that ingests dev/AI news, summarizes it with Ollama, and generates derivative content (news digest, startup ideas, learning paths).

**Live:** [my-profile-1h96.vercel.app](https://my-profile-1h96.vercel.app/)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14+ App Router, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| Deployment | Vercel |
| Pipeline | Python 3.11+, Ollama (local LLM) |
| LLM models | llama3.2 (summarize), mistral:7b (generate) |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Public profile / bio |
| `/news` | AI-summarized news digest |
| `/ideas` | Startup ideas generated from news |
| `/learning` | Learning path suggestions |
| `/studio` | Local-only review UI (excluded from public build) |

---

## Local Development

**Prerequisites:** Node.js 18+, Python 3.11+, [Ollama](https://ollama.ai) running locally

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Create local env file
echo "STUDIO_ENABLED=true\nIDEAS_ENABLED=true" > .env.local

# Start dev server
npm run dev
```

---

## AI Pipeline

The pipeline runs locally — not on Vercel. Raw data and pipeline code are excluded from the public build via `.vercelignore`.

### Initial seeding (first run)

No cursor exists yet — crawl fetches everything available in each feed.

```bash
# 1. Crawl all sources (no date filter; cursor is written after this step)
PYTHONPATH=. python3 pipeline/run.py --crawl

# 2. Summarize with Ollama (Ollama must be running)
PYTHONPATH=. python3 pipeline/run.py --digest

# 3. Generate content — multiple passes for broad KB coverage
PYTHONPATH=. python3 pipeline/run.py --generate all --passes 5

# 4. Publish all pending items directly to data/*.json (skip Studio review)
PYTHONPATH=. python3 pipeline/run.py --publish all
```

### Ongoing weekly run (curated via Studio)

After the first crawl a cursor is saved. Subsequent `--crawl` calls with no `--since`
flag automatically pick up only articles published since last time.

```bash
# Fetch only new articles (cursor used automatically)
PYTHONPATH=. python3 pipeline/run.py --crawl --digest
PYTHONPATH=. python3 pipeline/run.py --generate all
# Then open /studio to review and approve items individually
```

### Backfill or re-seed a specific window

Use `--since` to override the cursor with an explicit date range.

```bash
# Last 14 days (useful after a gap or to refresh content)
PYTHONPATH=. python3 pipeline/run.py --crawl --since 14d --digest
PYTHONPATH=. python3 pipeline/run.py --generate all --passes 3
PYTHONPATH=. python3 pipeline/run.py --publish all

# Everything since a specific date
PYTHONPATH=. python3 pipeline/run.py --crawl --since 2026-01-01
```

### Pipeline flags

| Flag | When to use |
|------|-------------|
| `--crawl` | Fetch new articles from all configured sources |
| `--since DATE` | Limit crawl to articles published after DATE (`7d`, `30d`, `2026-01-01`). Defaults to last crawl cursor if omitted; no filter on first ever run. |
| `--digest` | Summarize and score crawled articles with Ollama (must be running) |
| `--generate MODE` | Generate candidates: `news`, `ideas`, `learning`, or `all` |
| `--passes N` | Run N generation passes, each with a different random article sample (default: 1) |
| `--publish MODE` | Write all pending items to `data/*.json`, bypassing Studio review |

Each generation pass randomly samples 30 articles from the top-150 by relevance score, so multiple passes produce varied candidates from across the knowledge base.

**Sources configured in `sources/config.yaml`:**
- RSS feeds (Hacker News, dev.to, ArXiv CS.AI, newsletters)
- GitHub Trending
- YouTube channels (transcripts via yt-dlp)
- Manual URLs (`sources/manual.yaml`)

**Data flow:**
```
crawl → data/knowledge-base.json → digest → --generate (--passes N) → pending items
  → --publish (auto-approve) OR /studio (manual review) → data/news.json etc.
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STUDIO_ENABLED` | `false` | Enable `/studio` route |
| `IDEAS_ENABLED` | `false` | Enable `/ideas` route |
| `NEXT_PUBLIC_SITE_URL` | `https://example.com` | Canonical URL |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama base URL |
| `OLLAMA_SUMMARIZE_MODEL` | `llama3.2:latest` | Model for summarization |
| `OLLAMA_GENERATE_MODEL` | `mistral:7b` | Model for generation |

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full pipeline diagram.
