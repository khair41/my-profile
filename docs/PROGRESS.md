# Progress Log

---

## Phase 1: Next.js Scaffold + Public Profile

**Status: Complete (2026-03-30)**

### ✅ Step 0 — Scaffold (2026-03-30)

**Completed:**
- `npx create-next-app@latest` — TypeScript, Tailwind v4, App Router, ESLint, no Turbopack, no React Compiler
- Stack versions: Next.js 16.2.1 · React 19 · Tailwind v4 · `next-themes ^0.4.6`
- Temporarily moved `CLAUDE.md` + `docs/` to `/tmp/` to satisfy create-next-app's non-empty directory check, then restored
- Removed auto-generated `AGENTS.md`
- Created `lib/` and `data/` directories

**Technical notes:**
- Tailwind v4 is CSS-first — no `tailwind.config.ts`. Custom theme tokens go in `@theme {}` blocks inside `globals.css`
- Dark mode with `next-themes` requires `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css` to switch Tailwind's `dark:` variant from media-query-based to class-based
- `suppressHydrationWarning` is needed on `<html>` to prevent next-themes hydration mismatch

---

### ✅ Step 1 — Config & Types (2026-03-30)

**Completed:**
- `lib/constants.ts` — single source of truth for all owner data: `OWNER` (name, tagline, bio[], avatarUrl, location), `SITE` (title, description, url), `NAV_LINKS`, `IDEAS_NAV_LINK` (injected conditionally), `SOCIAL_LINKS`, `STACK`
- `lib/types.ts` — all shared TypeScript interfaces: `NavLink`, `SocialLink`, `SocialIconName`, `StackItem`, `StackCategory`, and the full content types `NewsItem`, `IdeaItem`, `LearningItem`, `LearningResource` (ready for Phase 4)

**Decisions:**
- All profile copy lives in `lib/constants.ts` — no hard-coded strings in JSX (satisfies PRD §1.2 AC)
- `IDEAS_NAV_LINK` is exported separately from `NAV_LINKS` so `Nav.tsx` can conditionally include it server-side based on `process.env.IDEAS_ENABLED`, meaning the link is absent from the Vercel build entirely
- Content types (`NewsItem`, `IdeaItem`, `LearningItem`) are defined now so components in later phases can import from a stable location without refactoring
- `SocialIconName` is a string literal union — adding a new platform requires updating the union and the icon renderer, keeping the type surface explicit

---

### ✅ Steps 2–6 — Layout, Profile, Pages, Verification (2026-03-30)

**Files created:**

| File | Purpose |
|------|---------|
| `app/globals.css` | `@custom-variant dark`, `@theme` accent `#6c5ce7` + font vars |
| `app/layout.tsx` | Metadata from `SITE`, ThemeProvider, Nav, Footer, `suppressHydrationWarning` |
| `app/page.tsx` | Server Component composing Hero + Bio + Stack + SocialLinks |
| `app/news/page.tsx` | Reads `data/news.json`, shows EmptyState if empty |
| `app/learning/page.tsx` | Reads `data/learning.json`, shows EmptyState if empty |
| `components/layout/ThemeProvider.tsx` | `next-themes` wrapper, `attribute="class"`, `defaultTheme="dark"` |
| `components/layout/Nav.tsx` | Server Component; conditional Ideas link via `process.env.IDEAS_ENABLED` |
| `components/layout/NavLinks.tsx` | `'use client'` active-route highlight + theme toggle |
| `components/layout/Footer.tsx` | Social icon links + copyright |
| `components/icons/SocialIcon.tsx` | Inline SVG renderer for github/mail/linkedin/x |
| `components/profile/Hero.tsx` | Avatar, name, tagline, GitHub CTA |
| `components/profile/Bio.tsx` | Bio paragraphs from `OWNER.bio` |
| `components/profile/Stack.tsx` | Category-coloured badge grid from `STACK` |
| `components/profile/SocialLinks.tsx` | Icon + label row from `SOCIAL_LINKS` |
| `components/ui/EmptyState.tsx` | Shared empty-state component |
| `data/news.json` | Seeded `[]` |
| `data/learning.json` | Seeded `[]` |

**Technical notes:**
- Theme toggle uses `suppressHydrationWarning` on the button instead of the `useEffect(() => setMounted(true))` pattern — avoids the `react-hooks/set-state-in-effect` lint error in Next.js 16's stricter ESLint config
- `Nav.tsx` is a Server Component; only `NavLinks.tsx` is `'use client'` (for `usePathname()` + `useTheme()`)
- `lib/constants.ts` bug fixed: bio string used a curly apostrophe in a single-quoted string literal — changed outer quotes to double quotes

**Verified (2026-03-30):**
- `npm run lint` — clean
- `npm run build` — zero TS errors, zero ESLint errors; all 4 routes statically prerendered (`/`, `/_not-found`, `/news`, `/learning`)

---

## Phase 2: Python Crawler _(complete — 2026-03-31)_

All work in `pipeline/` and `sources/`. No Next.js changes.

### Files created

| File | Purpose |
|------|---------|
| `pyproject.toml` + `requirements.txt` | Python 3.9+ dependencies (pydantic, feedparser, httpx, readability-lxml, yt-dlp, pyyaml, beautifulsoup4, lxml) |
| `sources/config.yaml` | RSS feeds, YouTube channels, GitHub trending config |
| `sources/manual.yaml` | One-off URL list (empty seed) |
| `pipeline/__init__.py` | Package root |
| `pipeline/utils/logger.py` | `get_logger(name)` — structured console logger |
| `pipeline/utils/schemas.py` | Pydantic v2 models: `RawArticle`, `KnowledgeBase` |
| `pipeline/utils/file_io.py` | `read_kb` / `write_kb` — atomic JSON read/write |
| `pipeline/config.py` | `load_config()` → `PipelineConfig` dataclass; reads `sources/config.yaml` + env vars |
| `pipeline/crawler/base.py` | `CrawlerBase(ABC)` — `fetch(existing_urls)` + `_url_to_id` (SHA256[:16]) |
| `pipeline/digest/dedup.py` | `existing_url_set(kb)` helper |
| `pipeline/crawler/rss.py` | `feedparser`, per-feed error isolation, configurable delay |
| `pipeline/crawler/github.py` | `httpx` + BS4 scrape of `github.com/trending` |
| `pipeline/crawler/youtube.py` | `yt-dlp` auto-captions, VTT→plaintext, 6000-char truncation |
| `pipeline/crawler/manual.py` | `httpx` + `readability-lxml`, `robots.txt` compliance |
| `pipeline/run.py` | CLI: `--crawl`, `--digest` (stub), `--generate` (stub) |
| `data/knowledge-base.json` | Seeded with empty `items[]`, `pending_*[]` arrays |

### Technical notes

- Python 3.9 compatibility: Pydantic v2 can't evaluate `str | None` at class construction time even with `from __future__ import annotations`. Fix: use `Optional[str]` from `typing` in model fields.
- Run command: `PYTHONPATH=. python3 pipeline/run.py --crawl`
- GitHub trending scraper returns 10 repos (GitHub's current server-rendered limit); `max_repos` in config is an upper bound.
- YouTube crawler: channel IDs in `sources/config.yaml` may need updating; Fireship and similar channels often disable auto-captions on recent videos.

### Decisions

- `RawArticle.id` is `SHA256[:16]` of the URL — stable across runs, no collision risk for this dataset size
- Atomic write: `write_kb` writes to `.json.tmp` then `os.replace()` — safe on POSIX, best-effort on Windows
- `--digest` and `--generate` are stubbed (log "not yet implemented") — wired up in Phases 3 and 4
- `KnowledgeBase.pending_*` fields typed as `list[dict]` until Phase 4 defines their full schemas

### Verified (2026-03-31)

- `PYTHONPATH=. python3 pipeline/run.py --crawl` → 311 articles added (HN·30, dev.to·12, ArXiv·209, Simon Willison·30, Pragmatic Engineer·20, GitHub·10), exits 0
- Second run → 0 new articles (dedup works)
- `data/knowledge-base.json` — all items `status: "pending_review"`, valid JSON

---

## Phase 3: Ollama Digest Pipeline _(complete — 2026-03-31)_

### Files created / modified

| File | Purpose |
|------|---------|
| `pipeline/digest/ollama_client.py` | `generate(prompt, model, base_url) -> dict` — raw `httpx` POST to `/api/generate`, parses `response` field as JSON |
| `pipeline/digest/summarizer.py` | `run_digest(kb, config, kb_path) -> int` — loops `pending_review` items, calls Ollama, writes after each item |
| `pipeline/run.py` | `run_digest()` stub replaced with real implementation |
| `pipeline/config.py` | Default summarize model updated to `llama3.2:latest` (matches local install) |

### Technical notes

- Ollama API: `POST /api/generate` with `{"format": "json", "stream": false}` — response JSON is in `body["response"]` as an escaped string
- Writes KB after every item — safe to interrupt; re-run resumes from where it left off (skips `processed` and `error` items)
- Body truncated to 3000 chars in prompt (Ollama context window headroom)

### Decisions

- One retry on parse failure or validation failure before marking `status: "error"` — matches PRD §3.1 AC
- Response validation checks: `summary` is str, `tags` is list, `relevance_score` is numeric in [0, 1]
- Tags lowercased on ingest for consistent filtering in Phase 6

### Verified (2026-03-31)

- Smoke test: 3 items processed correctly — `summary`, `tags`, `relevance_score` populated, `status: "processed"`
- Re-run after processing → "No pending items to digest", exits 0
- Full run command: `PYTHONPATH=. python3 pipeline/run.py --digest` (~2 s/item with `llama3.2:latest`)

---

## Phase 4: Generation Modes _(complete — 2026-03-30)_

### Files created / modified

| File | Purpose |
|------|---------|
| `pipeline/utils/schemas.py` | Added `PendingNewsItem`, `PendingIdeaItem`, `PendingLearningResource`, `PendingLearningItem` Pydantic models; updated `KnowledgeBase.pending_*` from `List[dict]` to typed lists |
| `pipeline/generate/__init__.py` | Package marker |
| `pipeline/generate/news.py` | `run_generate_news()` — top 30 processed articles → Ollama → up to 15 `PendingNewsItem` staged in `kb.pending_news[]` |
| `pipeline/generate/ideas.py` | `run_generate_ideas()` — top 30 processed articles → Ollama → up to 8 `PendingIdeaItem` staged in `kb.pending_ideas[]` |
| `pipeline/generate/learning.py` | `run_generate_learning()` — top 20 processed articles → Ollama → up to 6 `PendingLearningItem` staged in `kb.pending_learning[]` |
| `pipeline/run.py` | `run_generate()` stub replaced with real dispatch for `news\|ideas\|learning\|all` |

### Technical notes

- All generators filter `status == "processed"` and `relevance_score >= 0.5`, sort descending by score, take top N
- Dedup: before appending, checked against existing `pending_*` id sets (SHA256[:16] of title/topic)
- `--generate all` runs news → ideas → learning in sequence; one mode failure doesn't abort others
- `kb` object shared in-memory across all three modes in `--generate all` so each generator sees previously staged items
- Each generator calls `write_kb()` once at the end (not per-item like digest — generation is a single Ollama call)
- One retry on Ollama parse/validation failure, then abort that mode gracefully

### Decisions

- `PendingLearningResource.type` defaults to `"article"` if Ollama returns an unrecognised value — defensive parse instead of validation failure
- IDs for news/ideas use `SHA256[:16]` of `title`; learning uses `topic` — matches the TypeScript `id` field in `lib/types.ts`
- Source articles capped at 30 (20 for learning) to stay within Ollama context window headroom

### Verified (2026-03-30)

- `PYTHONPATH=. python3 -c "from pipeline.generate import news, ideas, learning; ..."` → imports OK
- `PYTHONPATH=. python3 pipeline/run.py --generate news` with Ollama offline → retries once, logs error, exits 0 with "0 item(s) staged" — error isolation works
- `KB loaded OK — 311 items, 3 processed` — existing KB parses correctly with updated typed schemas
- Run command (requires Ollama running): `PYTHONPATH=. python3 pipeline/run.py --generate all`

---

## Phase 5: Studio Review UI _(complete — 2026-03-30)_

### Files created / modified

| File | Purpose |
|------|---------|
| `lib/studio-io.ts` | TypeScript KB I/O helpers: `RawArticle`, `KnowledgeBase` interfaces + `readKB`, `writeKB`, `readDataFile`, `writeDataFile` (atomic via `.json.tmp` → `renameSync`) |
| `app/api/studio/kb/route.ts` | `GET` — returns `{ queue, pending_news, pending_ideas, pending_learning }` sorted by relevance score |
| `app/api/studio/review/route.ts` | `POST { id, action }` — sets `status: 'processed'` or `'rejected'` on a raw KB article |
| `app/api/studio/bucket/route.ts` | `POST { type, id, action }` — approve appends to `data/{type}.json`; reject discards; both remove from `kb.pending_{type}[]` |
| `app/api/studio/generate/route.ts` | `POST { mode }` — runs `python3 pipeline/run.py --generate {mode}` via `execFile`; returns `{ stdout, stderr }` |
| `app/studio/layout.tsx` | `STUDIO_ENABLED` guard (`force-dynamic`) + yellow "Studio — local only" banner |
| `app/studio/page.tsx` | `'use client'` — tab bar (Queue / News / Ideas / Learning / Generate) with badge counts; refreshes on every action |
| `app/ideas/layout.tsx` | `IDEAS_ENABLED` guard (`force-dynamic`) |
| `app/ideas/page.tsx` | Reads `data/ideas.json`, renders `IdeaItem` cards (title, problem, opportunity, suggested_stack chips, tags) |
| `components/studio/ReviewQueue.tsx` | Lists `pending_review` articles with relevance score bar (green ≥0.7 / yellow ≥0.4 / red), summary, tags, approve/reject |
| `components/studio/ApprovalBucket.tsx` | Generic bucket for all three types; renders type-appropriate card (NewsCard / IdeaCard / LearningCard) |
| `components/studio/GeneratePanel.tsx` | Four mode buttons with spinner, disables during run, shows trimmed stdout/stderr result |
| `data/ideas.json` | Seeded `[]` |
| `.vercelignore` | Created — excludes `data/ideas.json`, `data/knowledge-base.json`, `pipeline/`, `sources/` |
| `.gitignore` | Added `data/ideas.json` entry |

### Technical notes

- All studio API routes use `export const dynamic = 'force-dynamic'` to prevent static caching
- `export const dynamic = 'force-dynamic'` is also required in `app/studio/layout.tsx` and `app/ideas/layout.tsx` so the `STUDIO_ENABLED`/`IDEAS_ENABLED` env var gates are evaluated at request time, not build time — without this, `/studio` bakes a permanent redirect into the static output
- Studio layout is nested inside `app/layout.tsx` (root), so Nav/Footer still render; the yellow "Studio" banner provides visual distinction
- `lib/studio-io.ts` mirrors Python `pipeline/utils/schemas.py` + `file_io.py` — same atomic write pattern, same `RawArticle` field names

### Verified (2026-03-30)

- `npm run build` — zero TS/ESLint errors; `/studio` and `/ideas` show as `ƒ (Dynamic)`, all 4 API routes show as `ƒ (Dynamic)`
- Without `STUDIO_ENABLED=true` — `/studio` redirects to `/` at request time (not baked at build time)

---

## Phase 6: Polish _(complete — 2026-03-30)_

### Files created / modified

| File | Purpose |
|------|---------|
| `lib/projects.ts` | `Project` interface + `PROJECTS` static array |
| `app/projects/page.tsx` | Static `/projects` page — renders `ProjectCard` grid |
| `components/projects/ProjectCard.tsx` | Project card: name, description, tags, link, optional screenshot |
| `components/ui/FilterBar.tsx` | Shared tag filter pills + search input; shows "Showing N of M" when filtered |
| `components/news/NewsCard.tsx` | Presentational news card (extracted from inline page rendering) |
| `components/news/NewsContent.tsx` | `'use client'` — filter/search state via URL (`?tags=`), framer-motion staggered list |
| `components/learning/LearningCard.tsx` | Presentational learning card with difficulty colour badge + resource type icons |
| `components/learning/LearningContent.tsx` | `'use client'` — same filter/search/animation pattern |
| `components/ideas/IdeaCard.tsx` | Presentational idea card |
| `components/ideas/IdeasContent.tsx` | `'use client'` — same filter/search/animation pattern |
| `app/news/page.tsx` | Refactored: sorts by date, wraps `<NewsContent>` in `<Suspense>` |
| `app/learning/page.tsx` | Refactored: wraps `<LearningContent>` in `<Suspense>` |
| `app/ideas/page.tsx` | Refactored: wraps `<IdeasContent>` in `<Suspense>` |
| `lib/constants.ts` | Added `{ label: 'Projects', href: '/projects' }` to `NAV_LINKS` |

### Technical notes

- `useSearchParams` requires a `<Suspense>` boundary in the parent Server Component — without it Next.js throws at build time
- `useReducedMotion()` from framer-motion — when true, `variants` and `initial` are set to `undefined`/`false` so cards appear instantly with no animation
- Tag filter uses OR logic — an item matches if it has any of the selected tags
- URL state (`?tags=llm,rag`) allows sharing filtered views; filter state survives page refresh
- Static import pattern for news/learning preserved — pages remain `○ (Static)` despite having client-side interactivity (filter/search state lives entirely in the browser)

### Verified (2026-03-30)

- `npm run build` — zero TS/ESLint errors
- `/projects` → `○ (Static)`, `/news` → `○ (Static)`, `/learning` → `○ (Static)`, `/ideas` → `ƒ (Dynamic)`, `/studio` → `ƒ (Dynamic)`
