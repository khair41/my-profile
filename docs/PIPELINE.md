# Pipeline Data Flow

How the files in `data/` get populated when you run pipeline commands.

---

## Data files

| File | Contents | Written by | Read by |
|------|----------|------------|---------|
| `data/knowledge-base.json` | All crawled articles + pending curated items (internal working state) | Every stage | Every stage; never by the frontend |
| `data/crawl-cursor.json` | `last_crawled_at` timestamp — date filter baseline for next `--crawl` | `--crawl` (after each run) | `--crawl` (auto, when `--since` is absent) |
| `data/news.json` | Published news digest items | `--publish news\|all` or Studio approval | `/news` Next.js page |
| `data/ideas.json` | Published startup idea items | `--publish ideas\|all` or Studio approval | `/ideas` Next.js page |
| `data/learning.json` | Published learning path items | `--publish learning\|all` or Studio approval | `/learning` Next.js page |

All writes use an atomic `.json.tmp` → rename pattern (crash-safe on POSIX).

---

## Pipeline overview

```
sources/config.yaml
sources/manual.yaml
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1 — Crawl  (--crawl)                                     │
│  RssCrawler · GithubCrawler · YoutubeCrawler · ManualCrawler    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ appends RawArticle objects
                            ▼
             data/knowledge-base.json
             items[].status = "pending_review"
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2 — Digest  (--digest)                                   │
│  summarizer.py → ollama_client.py → llama3.2:latest             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ updates each article in place
                            ▼
             data/knowledge-base.json
             items[].status = "processed"
             items[].summary, .tags, .relevance_score populated
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 3 — Generate  (--generate MODE [--passes N])             │
│  news.py · ideas.py · learning.py → mistral:7b                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ stages curated items
                            ▼
             data/knowledge-base.json
             pending_news[], pending_ideas[], pending_learning[]
                            │
               ┌────────────┴─────────────┐
               ▼                          ▼
      --publish MODE               /studio review
      (bulk auto-approve)          (manual approve/reject)
               │                          │
               └────────────┬─────────────┘
                            ▼
             data/news.json
             data/ideas.json
             data/learning.json
```

---

## Stage 1 — Crawl (`--crawl`)

**Script:** `pipeline/run.py` → `run_crawl()`

Runs all four crawlers in sequence. Each crawler fetches its source type, skips URLs already
in the KB, and appends new `RawArticle` objects to `kb.items[]`. After all crawlers finish,
the KB is written once to disk, and a cursor is saved to `data/crawl-cursor.json`.

### Date filtering (`--since`)

Each crawl can be scoped to a date window:

```bash
--crawl                      # no filter on first ever run; uses cursor on subsequent runs
--crawl --since 7d           # only articles published in the last 7 days
--crawl --since 30d          # only articles published in the last 30 days
--crawl --since 2026-01-01   # only articles published after this ISO date
```

**Resolution order:**
1. If `--since` is given → use that value (overrides cursor)
2. Else if `data/crawl-cursor.json` exists → use `last_crawled_at` from cursor
3. Else → no filter (fetch everything)

The cursor is always written after a successful crawl regardless of which path was taken.

**Per-source behaviour:**

| Source | Date field used | When no date available |
|--------|-----------------|------------------------|
| RSS | `<pubDate>` / `<updated>` from feed entry | Article allowed through (not filtered) |
| YouTube | Video upload date (via yt_dlp `dateafter`) | N/A — yt_dlp handles it |
| GitHub Trending | None (snapshot of today's trending repos) | Always fetched; URL dedup prevents duplicates |
| Manual URLs | None (static, user-defined URLs) | Always fetched; URL dedup prevents duplicates |

### Cursor file

`data/crawl-cursor.json` — written atomically after every successful `--crawl`:

```json
{"last_crawled_at": "2026-04-01T01:17:34.916308+00:00"}
```

Lives in `data/` which is gitignored. Delete it to force an unconstrained crawl next run.

### Crawlers

**`pipeline/crawler/rss.py` — RssCrawler**
- Reads enabled RSS feed entries from `sources/config.yaml`
- Fetches each feed with `feedparser`; strips HTML from title and description
- Creates one `RawArticle` per entry with `source_type="rss"`, `status="pending_review"`

**`pipeline/crawler/github.py` — GithubCrawler**
- Fetches the GitHub Trending page (configurable language + timespan)
- Scrapes with BeautifulSoup: repo name, description, language, star count
- Creates `RawArticle` with `source_type="github"`, up to `max_repos` entries (default 25)

**`pipeline/crawler/youtube.py` — YoutubeCrawler**
- Fetches recent videos from configured channels (default 3 per channel)
- Extracts captions via `yt-dlp` (VTT format → plain text, truncated to 6 000 chars)
- Skips videos without available captions
- Creates `RawArticle` with `source_type="youtube"`

**`pipeline/crawler/manual.py` — ManualCrawler**
- Reads URLs from `sources/manual.yaml`
- Checks `robots.txt` before fetching; skips disallowed URLs
- Extracts main article body using the `readability` library, then strips remaining HTML
- Creates `RawArticle` with `source_type="manual"`

**`pipeline/crawler/base.py`** — Abstract base class defining the `fetch(existing_urls)` interface.

### Deduplication

**`pipeline/digest/dedup.py` — `existing_url_set(kb)`**
Returns a `set` of all URLs already in the KB. Each crawler receives this set before
fetching and skips any URL already present. Article IDs are `SHA256(url)[:16]`.

### Output

- `data/knowledge-base.json` — new articles appended to `items[]`
- New articles have `status="pending_review"` and no summary, tags, or relevance score yet

---

## Stage 2 — Digest (`--digest`)

**Script:** `pipeline/run.py` → `run_digest()` → `pipeline/digest/summarizer.py`

Processes every article in `kb.items[]` with `status="pending_review"` by calling Ollama.
The KB is written to disk after **each article** (incremental crash safety).

### Scripts

**`pipeline/digest/summarizer.py` — `run_digest(kb, config, kb_path)`**
- Iterates `pending_review` articles
- Builds a prompt containing the article title, URL, and body
- Calls Ollama; expects JSON back: `{ summary, tags, relevance_score }`
- Validates types and score range (0.0–1.0); retries once on failure
- Sets `article.status = "processed"` on success, `"error"` on double failure
- Writes KB after each article

**`pipeline/digest/ollama_client.py` — `generate(prompt, model, base_url)`**
- POSTs to `{ollama_url}/api/generate` with `format: "json"`
- Returns the parsed JSON response dict
- Used by both the digest and generate stages

### Article status lifecycle

```
"pending_review"  →  (Ollama success)  →  "processed"
                  →  (Ollama failure × 2)  →  "error"
```

### Output

- `data/knowledge-base.json` — each processed article gains:
  - `status = "processed"`
  - `summary` — 2–4 sentence plain-text summary
  - `tags` — 3–6 lowercase topic tags (e.g. `["llm", "rust", "inference"]`)
  - `relevance_score` — float 0.0–1.0 (relevance to AI/software engineering)

---

## Stage 3 — Generate (`--generate MODE [--passes N]`)

**Script:** `pipeline/run.py` → `run_generate(mode, passes)`

Selects a sample of processed articles and asks Ollama to generate curated content.
Results land in `kb.pending_*[]` arrays inside the KB — they are not visible on the site yet.

### Sampling strategy

All three generators use the same approach:

1. Filter: articles with `status=="processed"` AND `relevance_score >= 0.5`
2. Sort by relevance descending
3. Take the top-N as a pool (top-150 for news/ideas, top-100 for learning)
4. Randomly sample M articles from that pool (30 for news/ideas, 20 for learning)

This means every `--generate` call uses a **different random subset**, producing variety
across runs without repeating the same top articles every time.

### `--passes N` (multi-pass accumulation)

When `--passes N` is given, the generate loop runs N times. Each pass draws a fresh
random sample from the pool. Results accumulate in the `pending_*` arrays with
deduplication by ID (`SHA256(title or topic)[:16]`), so duplicate candidates are never
staged twice regardless of how many passes run.

Example: `--generate all --passes 5` runs five independent generation calls per mode,
potentially staging up to `5 × 15 = 75` unique news items.

### Generator scripts

**`pipeline/generate/news.py` — `run_generate_news(kb, config, kb_path)`**
- Prompt: select and rewrite the most notable articles as concise news digest entries
- Max output: 15 items per pass
- Staged as `PendingNewsItem`: `id, title, summary, url, source_name, published_at, tags, kb_source_ids`

**`pipeline/generate/ideas.py` — `run_generate_ideas(kb, config, kb_path)`**
- Prompt: synthesise startup ideas inspired by patterns across the articles
- Max output: 8 items per pass
- Staged as `PendingIdeaItem`: `id, title, problem, opportunity, suggested_stack, tags, generated_at, kb_source_ids`

**`pipeline/generate/learning.py` — `run_generate_learning(kb, config, kb_path)`**
- Prompt: identify recurring topics and create structured learning paths
- Max output: 6 items per pass
- Staged as `PendingLearningItem`: `id, topic, rationale, difficulty, estimated_hours, resources[], tags, generated_at, kb_source_ids`
- `resources[]` each have `title, url, type` (`"article" | "video" | "repo"`)

All generators retry the Ollama call once on schema validation failure, then abort the
pass gracefully (accumulated items from prior passes are preserved).

### Output

- `data/knowledge-base.json` — `pending_news[]`, `pending_ideas[]`, `pending_learning[]` populated
- Frontend data files (`news.json` etc.) are **not yet updated** at this stage

---

## Stage 4 — Publish

Pending items must go through one of two paths before they appear on the site.

### Path A — Bulk publish (`--publish MODE`)

**Script:** `pipeline/run.py` → `run_publish(mode)` → `pipeline/utils/file_io.py` → `publish_pending()`

Moves all pending items for the given mode directly to the frontend data files. No human
review. Suitable for initial seeding or periodic re-seeding.

`MODE` is one of: `news`, `ideas`, `learning`, `all`.

**What `publish_pending()` does:**

1. Reads current `data/{mode}.json` (treats missing file as empty array)
2. Deduplicates by `id` — only items not already in the file are added
3. Writes merged array atomically (`.json.tmp` → rename)
4. Removes published items from `kb.pending_{mode}[]`
5. Writes updated KB

### Path B — Studio review (`/studio`)

Opens the local Studio UI (requires `STUDIO_ENABLED=true` in `.env.local`). Each pending
item can be approved (written to `data/*.json`) or rejected (removed from KB) individually.

Studio API routes use the same `publish_pending()` helper from `pipeline/utils/file_io.py`
for consistency.

### Output

- `data/news.json` — new news items appended
- `data/ideas.json` — new idea items appended
- `data/learning.json` — new learning path items appended
- `data/knowledge-base.json` — `pending_*[]` arrays cleared for published items

---

## Workflows

### Initial seeding (first run)

No cursor exists yet — `--crawl` fetches everything available in each feed. A cursor is written
after this step so all future runs pick up only new content automatically.

```bash
# 1. Crawl all configured sources (no date filter; cursor written after)
PYTHONPATH=. python3 pipeline/run.py --crawl

# 2. Summarise with Ollama (Ollama must be running)
PYTHONPATH=. python3 pipeline/run.py --digest

# 3. Generate candidates — 5 passes for broad KB coverage
PYTHONPATH=. python3 pipeline/run.py --generate all --passes 5

# 4. Publish everything directly to data/*.json
PYTHONPATH=. python3 pipeline/run.py --publish all
```

Or via npm shortcut:
```bash
npm run seed    # steps 3+4 only (assumes KB already crawled+digested)
```

### Ongoing weekly run (curated via Studio)

Cursor was written during initial seeding. Omitting `--since` automatically uses it,
so only articles published since last week are fetched.

```bash
# 1. Fetch only new content (cursor used automatically — no --since needed)
PYTHONPATH=. python3 pipeline/run.py --crawl --digest

# 2. Generate one pass of candidates
PYTHONPATH=. python3 pipeline/run.py --generate all

# 3. Open Studio to review and approve/reject each item
# (requires STUDIO_ENABLED=true in .env.local)
npm run dev
# → visit http://localhost:3000/studio
```

### Backfill after a gap (e.g. missed 2 weeks)

Use `--since` to override the cursor with an explicit window.

```bash
# Fetch articles from the last 14 days regardless of cursor
PYTHONPATH=. python3 pipeline/run.py --crawl --since 14d
PYTHONPATH=. python3 pipeline/run.py --digest
PYTHONPATH=. python3 pipeline/run.py --generate all --passes 3
PYTHONPATH=. python3 pipeline/run.py --publish all
```

### Periodic re-seed (after months of inactivity)

```bash
# Fetch everything from the past 60 days, then generate and publish
PYTHONPATH=. python3 pipeline/run.py --crawl --since 60d
PYTHONPATH=. python3 pipeline/run.py --digest
PYTHONPATH=. python3 pipeline/run.py --generate all --passes 10
PYTHONPATH=. python3 pipeline/run.py --publish all
```

### Force a full unconstrained crawl

Delete the cursor file to remove all date filtering on the next run:

```bash
rm data/crawl-cursor.json
PYTHONPATH=. python3 pipeline/run.py --crawl
```

---

## Script reference

| File | Purpose |
|------|---------|
| `pipeline/run.py` | CLI entry point — parses args and chains the four stages |
| `pipeline/config.py` | Loads `sources/config.yaml` + `sources/manual.yaml` into `PipelineConfig` |
| `pipeline/crawler/base.py` | Abstract base class for all crawlers (`fetch(existing_urls)`) |
| `pipeline/crawler/rss.py` | Fetches RSS/Atom feeds via `feedparser` |
| `pipeline/crawler/github.py` | Scrapes GitHub Trending for trending repos |
| `pipeline/crawler/youtube.py` | Downloads captions from YouTube channels via `yt-dlp` |
| `pipeline/crawler/manual.py` | Fetches user-defined URLs via `readability` |
| `pipeline/digest/dedup.py` | `existing_url_set(kb)` — returns set of known URLs for dedup |
| `pipeline/digest/ollama_client.py` | `generate(prompt, model, base_url)` — HTTP client for Ollama API |
| `pipeline/digest/summarizer.py` | `run_digest()` — summarise + score articles with Ollama |
| `pipeline/generate/news.py` | `run_generate_news()` — generate news digest candidates |
| `pipeline/generate/ideas.py` | `run_generate_ideas()` — generate startup idea candidates |
| `pipeline/generate/learning.py` | `run_generate_learning()` — generate learning path candidates |
| `pipeline/utils/schemas.py` | Pydantic models — `KnowledgeBase`, `RawArticle`, `Pending*Item` |
| `pipeline/utils/file_io.py` | `read_kb`, `write_kb`, `publish_pending` — all filesystem I/O |
| `pipeline/utils/crawl_cursor.py` | `read_cursor`, `write_cursor` — atomic read/write of `data/crawl-cursor.json` |
| `pipeline/utils/logger.py` | Structured logger factory (`get_logger(name)`) |
