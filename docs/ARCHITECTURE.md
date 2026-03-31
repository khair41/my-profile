# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LOCAL MACHINE                                 │
│                                                                         │
│  ┌─────────────────┐   ┌──────────────────────────────────────────┐    │
│  │    Sources       │   │            Python Pipeline               │    │
│  │                  │   │                                          │    │
│  │  RSS Feeds       │──▶│  crawler/rss.py                          │    │
│  │  GitHub Trending │──▶│  crawler/github.py   ──▶  digest/        │    │
│  │  YouTube         │──▶│  crawler/youtube.py       summarizer.py  │    │
│  │  Manual URLs     │──▶│  crawler/manual.py         ollama_       │    │
│  │                  │   │                             client.py    │    │
│  │  sources/        │   │                                          │    │
│  │  config.yaml     │   │  generate/news.py                        │    │
│  │  manual.yaml     │   │  generate/ideas.py                       │    │
│  └─────────────────┘   │  generate/learning.py                    │    │
│                         └──────────────┬─────────────────────────┘    │
│                                        │                               │
│                                        ▼                               │
│                         ┌──────────────────────────┐                   │
│                         │         data/             │                   │
│                         │  knowledge-base.json  ◀───┤ pipeline output  │
│                         │  news.json            ◀───┤ studio approvals │
│                         │  ideas.json           ◀───┤ studio approvals │
│                         │  learning.json        ◀───┤ studio approvals │
│                         └─────────────┬────────────┘                   │
│                                       │                                │
│                         ┌─────────────▼────────────┐                   │
│                         │  Next.js Dev Server       │                   │
│                         │  localhost:3000           │                   │
│                         │  /studio  (local only)    │                   │
│                         │  /ideas   (local only)    │                   │
│                         └──────────────────────────┘                   │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │    Ollama     │  llama3.2:3b  (summarization)                        │
│  │  :11434       │  mistral:7b   (generation)                           │
│  └──────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    │  git commit data/news.json
                    │             data/learning.json
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              VERCEL                                     │
│                                                                         │
│   next build  (STUDIO_ENABLED not set → /studio redirects to /)        │
│               (IDEAS_ENABLED not set  → /ideas  redirects to /)        │
│                                                                         │
│   /          /news          /learning                                   │
│   (reads data/*.json at build time — fully static)                      │
│                                                                         │
│   /ideas and /studio are inaccessible (env vars absent)                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Next.js Site Structure

### App Router Layout

```
app/
├── layout.tsx              # Root: Geist font, ThemeProvider, Nav, Footer
├── globals.css             # Tailwind base + CSS custom properties
├── page.tsx                # / — profile / bio
├── news/
│   └── page.tsx            # /news — approved news digest
├── ideas/
│   ├── layout.tsx          # Guard: redirects if IDEAS_ENABLED !== 'true'
│   └── page.tsx            # /ideas — approved startup ideas (local only)
├── learning/
│   └── page.tsx            # /learning — approved learning paths
├── projects/
│   └── page.tsx            # /projects — static project showcase (Phase 6)
├── studio/
│   ├── layout.tsx          # Guard: redirects if STUDIO_ENABLED !== 'true'
│   └── page.tsx            # /studio — local review UI
└── api/
    └── studio/
        ├── queue/route.ts      # GET  — pending KB items
        ├── approve/route.ts    # POST — approve item → write to data/*.json
        ├── reject/route.ts     # POST — reject item → update KB status
        └── generate/route.ts  # POST — shell out to pipeline generate mode
```

### Component Hierarchy

```
app/layout.tsx
└── components/layout/
    ├── Nav.tsx             # Top nav, active route highlight
    ├── Footer.tsx          # Minimal footer
    └── ThemeProvider.tsx   # next-themes, dark mode default

app/page.tsx  (/  profile)
└── components/profile/
    ├── Hero.tsx            # Name, tagline, avatar, CTA links
    ├── Bio.tsx             # 2–3 paragraph bio
    ├── Stack.tsx           # Tech stack icon grid
    └── SocialLinks.tsx     # GitHub, LinkedIn, X, email

app/news/page.tsx
└── components/news/
    ├── NewsGrid.tsx        # Responsive grid
    ├── NewsCard.tsx        # Title, source, date, summary, link
    └── NewsFilter.tsx      # Tag/source filter bar (Phase 6)

app/ideas/page.tsx
└── components/ideas/
    ├── IdeasGrid.tsx
    ├── IdeaCard.tsx        # Title, problem, opportunity, tags
    └── IdeaFilter.tsx      # Phase 6

app/learning/page.tsx
└── components/learning/
    ├── LearningGrid.tsx
    ├── LearningCard.tsx    # Topic, resources, difficulty badge
    └── LearningFilter.tsx  # Phase 6

app/studio/page.tsx
└── components/studio/
    ├── ReviewQueue.tsx     # Pending KB items, sorted by relevance
    ├── ReviewItem.tsx      # Card with approve/reject controls
    ├── GeneratePanel.tsx   # Trigger generation modes
    ├── ApprovalBucket.tsx  # Preview approved items per output file
    └── StudioNav.tsx       # Tabs: Queue | News | Ideas | Learning

components/ui/              # Shared primitives
    ├── Badge.tsx
    ├── Button.tsx
    ├── Card.tsx
    ├── EmptyState.tsx
    ├── Separator.tsx
    └── Spinner.tsx
```

### Data Access Layer (`lib/`)

```
lib/
├── types.ts        # All shared TypeScript interfaces
├── data.ts         # readNewsItems() / readIdeas() / readLearningPaths()
├── constants.ts    # Route paths, env flags, site metadata
└── projects.ts     # Static project array (Phase 6)
```

Data reads use `fs.readFileSync` inside async Server Components. `/news` and `/learning` are statically generated on Vercel. `/ideas` is local-only (gated by `IDEAS_ENABLED`) and its data file is never deployed.

---

## Python Pipeline Architecture

### Directory Layout

```
pipeline/
├── requirements.txt
├── requirements-dev.txt        # pytest, black, ruff, mypy
├── pyproject.toml
├── __init__.py
├── config.py                   # Load sources/config.yaml + env vars
├── run.py                      # CLI: --crawl | --digest | --generate
├── crawler/
│   ├── __init__.py
│   ├── base.py                 # Abstract CrawlerBase: fetch() -> list[RawArticle]
│   ├── rss.py                  # RSSCrawler (feedparser)
│   ├── github.py               # GitHubTrendingCrawler
│   ├── youtube.py              # YouTubeCrawler (yt-dlp)
│   └── manual.py               # ManualCrawler (httpx + readability-lxml)
├── digest/
│   ├── __init__.py
│   ├── ollama_client.py        # HTTP client for Ollama /api/chat
│   ├── summarizer.py           # Prompt builder + Pydantic response parser
│   └── dedup.py                # URL-hash deduplication
├── generate/
│   ├── __init__.py
│   ├── news.py                 # Generate pending NewsItem[] from KB
│   ├── ideas.py                # Generate pending IdeaItem[] from KB
│   └── learning.py             # Generate pending LearningItem[] from KB
└── utils/
    ├── __init__.py
    ├── logger.py
    ├── schemas.py              # Pydantic models for all data types
    └── file_io.py              # Atomic JSON read/write helpers
```

### Processing Stages

**Stage 1 — CRAWL**

Each `CrawlerBase` subclass implements `fetch() -> list[RawArticle]`.

```
RawArticle:
  url: str
  title: str
  raw_text: str        # HTML stripped, truncated to model context limit
  source_type: Literal['rss', 'github', 'youtube', 'manual']
  source_name: str
  fetched_at: datetime
```

All crawlers run in sequence; results are URL-deduplicated against existing knowledge-base items before moving to Stage 2.

**Stage 2 — DIGEST**

For each new `RawArticle` not already in `knowledge-base.json`:

1. Build prompt (system + user) targeting `KnowledgeBaseItem` schema
2. POST to `Ollama /api/chat` with `stream: false`
3. Parse and validate response via Pydantic; retry once on failure
4. Append resulting `KnowledgeBaseItem` (status: `pending_review`) to `data/knowledge-base.json`

**Stage 3 — GENERATE**

Reads all `KnowledgeBaseItem` records with `status: processed`. Sends a batch of recent summaries to Ollama with mode-specific prompts. Writes candidate items into the `pending_news`, `pending_ideas`, or `pending_learning` arrays inside `knowledge-base.json`. Items in these arrays are not written to `data/*.json` until the studio approves them.

### Crawler Modules

**`crawler/rss.py` (RSSCrawler)**
- Parses any RSS/Atom URL via `feedparser`
- Strips HTML from entry content; truncates to 4000 chars
- Sources defined under `rss:` key in `sources/config.yaml`
- Configurable per-request delay (default 1 s)

**`crawler/github.py` (GitHubTrendingCrawler)**
- Scrapes `https://github.com/trending?since=daily`
- Extracts: repo name, description, language, stars, URL
- Synthesizes blurb: `"{repo}: {description} ({stars} stars, {language})"`
- No auth required; 2 s crawl delay

**`crawler/youtube.py` (YouTubeCrawler)**
- Channel IDs configured under `youtube:` in `sources/config.yaml`
- Uses `yt-dlp --skip-download --write-auto-sub` to fetch auto-captions
- Falls back to YouTube Data API v3 if `YOUTUBE_API_KEY` is set
- Transcript chunked to 6000 chars; skips videos with no captions

**`crawler/manual.py` (ManualCrawler)**
- Reads flat URL list from `sources/manual.yaml`
- Fetches with `httpx`; extracts body via `readability-lxml`
- Checks `robots.txt` via `urllib.robotparser`; skips disallowed URLs

---

## Data Flow

```
sources/config.yaml
sources/manual.yaml
        │
        ▼
[pipeline/crawler/*]  ──────────────────────────────────────────────┐
        │ list[RawArticle]                                           │
        ▼                                                            │
[pipeline/digest/dedup.py]  ◀── data/knowledge-base.json (existing) │
        │ new articles only                                          │
        ▼                                                            │
[pipeline/digest/summarizer.py]                                      │
        │ structured prompt                                          │
        ▼                                                            │
[Ollama :11434]                                                      │
        │ JSON response                                              │
        ▼                                                            │
data/knowledge-base.json  (append KnowledgeBaseItem, status=pending_review)
        │
        │  (after studio marks items status=processed)
        ▼
[pipeline/generate/news.py]      ──▶ pending_news[]     ┐
[pipeline/generate/ideas.py]     ──▶ pending_ideas[]    ├── stored in
[pipeline/generate/learning.py]  ──▶ pending_learning[] ┘  knowledge-base.json
        │
        ▼
/studio  (local Next.js, STUDIO_ENABLED=true)
        │  user reviews + approves / rejects each item
        ▼
data/news.json            (approved NewsItem[])
data/ideas.json           (approved IdeaItem[])     ← local only, not deployed
data/learning.json        (approved LearningItem[])
        │
        ▼
git commit data/news.json
          data/learning.json
          (data/ideas.json excluded from git / .vercelignore)
        │
        ▼
Vercel build (next build)
        │  reads JSON at build time via fs.readFileSync
        ▼
/news   /learning   (statically rendered, zero runtime latency)
/ideas              (IDEAS_ENABLED not set → immediate redirect to /)
```

---

## Local Studio Review Loop

`/studio` runs exclusively on the local dev server when `STUDIO_ENABLED=true`.

**Layout guard (`app/studio/layout.tsx`)**

```typescript
import { redirect } from 'next/navigation'

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  if (process.env.STUDIO_ENABLED !== 'true') redirect('/')
  return <>{children}</>
}
```

This variable is never set in Vercel project settings, so the route is permanently inaccessible on the deployed site.

**Read path**
- `GET /api/studio/queue` — reads `knowledge-base.json`, returns all items where `status === "pending_review"` plus the three `pending_*` arrays.

**Write paths (route handlers, each checks `STUDIO_ENABLED`)**

| Endpoint | Action |
|---|---|
| `POST /api/studio/approve` | Moves item from `pending_*[]` in KB → `data/*.json` |
| `POST /api/studio/reject` | Sets `status: "rejected"` in KB, removes from pending array |
| `POST /api/studio/generate` | Shells out to `python pipeline/run.py --generate {mode}` |

All file writes use atomic pattern: write to `*.json.tmp` then `fs.renameSync` to prevent corruption from partial writes.

---

## Ollama Integration

### Models

| Task | Model | Rationale |
|---|---|---|
| Article summarization | `llama3.2:3b` | Fast, low memory, sufficient for extraction |
| News digest generation | `llama3.2:3b` | Concise structured output |
| Idea generation | `mistral:7b` | Better creative synthesis |
| Learning path generation | `mistral:7b` | Better structured curriculum output |

Overridable via `OLLAMA_SUMMARIZE_MODEL` and `OLLAMA_GENERATE_MODEL` env vars.

### HTTP API Call Structure

```
POST http://localhost:11434/api/chat
Content-Type: application/json

{
  "model": "llama3.2:3b",
  "stream": false,
  "messages": [
    { "role": "system", "content": "<schema instruction>" },
    { "role": "user",   "content": "<article text>" }
  ]
}
```

The pipeline uses the raw HTTP API (not the Ollama Python SDK) for portability.

### Prompt Strategy

**Summarization (`digest/summarizer.py`)**
- System prompt: instructs model to return strict JSON matching `KnowledgeBaseItem` schema; no preamble or commentary
- User prompt: raw article text (truncated to model context limit)
- On parse failure: retry once with an explicit "return only JSON" reminder; on second failure mark item `status: "error"`

**Generation (`generate/*.py`)**
- System prompt: role description + target JSON array schema
- User prompt: concatenated summaries from N most recent processed KB items (N configurable, default 20)
- Each generator returns a JSON array of candidate items

---

## Data Schemas

### `KnowledgeBaseItem`

```typescript
interface KnowledgeBaseItem {
  id: string;                    // SHA-256 of URL, first 16 chars
  url: string;
  title: string;
  source_type: 'rss' | 'github' | 'youtube' | 'manual';
  source_name: string;           // e.g. "Hacker News", "dev.to"
  fetched_at: string;            // ISO 8601
  summary: string;               // 2–4 sentence Ollama summary
  tags: string[];                // 3–6 topic tags
  relevance_score: number;       // 0.0–1.0
  status: 'pending_review' | 'processed' | 'rejected' | 'error';
}
```

`knowledge-base.json` top-level structure:

```typescript
interface KnowledgeBase {
  items: KnowledgeBaseItem[];
  pending_news: NewsItem[];
  pending_ideas: IdeaItem[];
  pending_learning: LearningItem[];
}
```

### `NewsItem`

```typescript
interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source_name: string;
  published_at: string;          // ISO 8601
  tags: string[];
  kb_source_ids: string[];       // KB item IDs that contributed
}
```

### `IdeaItem`

```typescript
interface IdeaItem {
  id: string;
  title: string;
  problem: string;
  opportunity: string;
  suggested_stack: string[];
  tags: string[];
  generated_at: string;          // ISO 8601
  kb_source_ids: string[];
}
```

### `LearningItem`

```typescript
interface LearningItem {
  id: string;
  topic: string;
  rationale: string;
  resources: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'repo';
  }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  tags: string[];
  generated_at: string;          // ISO 8601
  kb_source_ids: string[];
}
```

All interfaces in `lib/types.ts` are mirrored as Pydantic models in `pipeline/utils/schemas.py`.

---

## Vercel Deployment

### Included in build

- `app/`, `components/`, `lib/` — all Next.js source
- `data/news.json`, `data/learning.json` — committed to git, read at build time
- `public/` — static assets

### Excluded (`.vercelignore`)

```
pipeline/
sources/
data/knowledge-base.json
data/ideas.json
.env.local
scripts/
```

### Build command

```
next build
```

No custom build script needed. Server Components read JSON files with `fs.readFileSync` at build time; output is fully static HTML.

### Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `STUDIO_ENABLED` | Local `.env.local` only | Enables `/studio`; never set on Vercel |
| `IDEAS_ENABLED` | Local `.env.local` only | Enables `/ideas`; never set on Vercel |
| `OLLAMA_BASE_URL` | Local `.env.local` | Ollama URL (default: `http://localhost:11434`) |
| `OLLAMA_SUMMARIZE_MODEL` | Local `.env.local` | Summarization model (default: `llama3.2:3b`) |
| `OLLAMA_GENERATE_MODEL` | Local `.env.local` | Generation model (default: `mistral:7b`) |
| `YOUTUBE_API_KEY` | Local `.env.local` | Optional; enables caption API fallback |
| `GITHUB_TOKEN` | Local `.env.local` | Optional; raises GitHub scrape rate limit |
| `NEXT_PUBLIC_SITE_URL` | Vercel + local | Canonical URL for OG meta tags |
| `NEXT_PUBLIC_OWNER_NAME` | Vercel + local | Owner name rendered in profile |

---

## Key Design Decisions

### JSON files over a database

The pipeline runs locally; outputs are small (hundreds of items). Committing JSON to git provides full history of every approved item, zero infrastructure dependency on Vercel, instant rollback by reverting a commit, and straightforward CI diffing. A database would add operational overhead with no benefit at this scale.

### Static generation over runtime data fetching

`/news`, `/ideas`, and `/learning` have zero cold-start latency and no runtime API calls. Data freshness is controlled by the pipeline run + git commit cadence — intentionally human-curated, not live. This also means the site works with a free Vercel plan.

### Ollama over a hosted LLM API

Runs entirely offline. No API costs, no data privacy concerns with article content, no rate limits. The tradeoff is that the pipeline must run on a machine with Ollama installed — always the developer's local machine.

### `/studio` and `/ideas` as private Next.js routes

Both routes use the same env-var guard pattern (`STUDIO_ENABLED` / `IDEAS_ENABLED`). `/studio` is the admin review tool; `/ideas` is a content display page kept private because startup ideas are considered proprietary. Neither variable is set on Vercel, so both routes redirect immediately to `/`. The approach reuses the full TypeScript and Tailwind stack with no second app or separate dev server port. `data/ideas.json` is excluded from git via `.vercelignore` — it never leaves the local machine.

### `mistral:7b` for generation, `llama3.2:3b` for summarization

Summarization is a simple extraction task; `3b` handles it well and is ~3× faster. Idea and learning path generation requires creative synthesis and structured multi-field output; `7b` produces noticeably better results for those tasks.

### Route handlers over Server Actions for studio write operations

Studio approve/reject/generate operations involve filesystem writes and subprocess calls. Route handlers make these operations callable from Client Components with explicit loading state management, and the API surface is independently testable.
