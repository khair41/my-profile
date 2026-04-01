# Roadmap: Pipeline v2 — Speed, Personalization, Knowledge Graph

> **Status**: Planning — all 6 original phases complete as of 2026-03-30
>
> This roadmap adds four capability layers on top of the existing foundation.
> Each phase is independent and backward-compatible.

---

## Phase 7 — Pipeline Speed

**Goal**: Make a full crawl+digest run significantly faster with no behavior changes.

### 7.1 Async Crawlers
- Rewrite `pipeline/crawler/` with `asyncio` + `httpx.AsyncClient`
- Run all 4 crawlers concurrently via `asyncio.gather()` in `run.py`
- Share a single `AsyncClient` per run (connection pooling)
- Per-feed `request_delay` becomes a non-blocking `asyncio.sleep`
- YouTube: parallelize across configured channels

### 7.2 Concurrent Ollama Digest
- `OLLAMA_CONCURRENCY` env var (default: 3) — parallel digest calls
- `asyncio.Semaphore(n)` to cap concurrency
- Batch KB writes (every N items, default 10) instead of per-item
- Flush partial batch on KeyboardInterrupt (crash-safe)

### 7.3 Concurrent Generation
- `--generate all` runs news/ideas/learning via `asyncio.gather()` instead of sequentially
- Convert `ollama_client` to async interface shared by digest + generators

**Files**: `pipeline/crawler/*.py`, `pipeline/digest/ollama_client.py`, `pipeline/digest/summarizer.py`, `pipeline/config.py`, `pipeline/run.py`

---

## Phase 8 — Personalization Engine

**Goal**: Relevance scores reflect personal interests, not just generic "dev relevance".

### 8.1 Interest Profile (`sources/profile.yaml`)

```yaml
profile:
  name: "default"
  interest_tags:
    # tag: weight (1.0 = neutral, >1.0 = boost, <1.0 = suppress)
    llm: 1.8
    agents: 1.6
    rust: 1.4
    devops: 0.6
    marketing: 0.1
  preferred_sources:
    - "Andrej Karpathy"
    - "Simon Willison's Weblog"
  generation_bias:
    focus: ["ai-agents", "developer-tools", "systems"]
```

### 8.2 Profile-Aware Relevance Augmentation

After Ollama assigns a base `relevance_score`:
- Geometric mean of `interest_tags[tag]` weights across article tags
- Source boost ×1.2 for `preferred_sources`
- Store both `relevance_score` (raw) and `personal_score` (augmented) on `RawArticle`
- Generation pool uses `personal_score` for ranking

### 8.3 Adaptive Learning from Studio Actions

- Approve item → increment weights for its tags (+0.02)
- Reject item → decrement weights (−0.01)
- Persist updates back to `sources/profile.yaml` automatically
- Studio "Profile" tab: per-tag approval rates, source signal quality

### 8.4 Generation Prompt Injection

Inject profile `focus` into all generation prompts:
> "The reader is particularly interested in: {focus}. Prioritize content related to these areas."

**Files**: `pipeline/utils/schemas.py` (add `personal_score`), `pipeline/digest/summarizer.py`, `pipeline/config.py`, `pipeline/generate/*.py`, `app/api/studio/review/route.ts`, `app/api/studio/bucket/route.ts`, new `app/api/studio/profile/route.ts`

---

## Phase 9 — Tendency Detection

**Goal**: Surface recurring patterns and rising topics across knowledge base history.

### 9.1 Tendency Snapshots (`data/tendencies.json`)

Appended after each `--digest` run:

```json
{
  "snapshots": [
    {
      "date": "2026-04-01",
      "tag_counts": { "llm": 24, "agents": 18, "rust": 12 },
      "top_sources": [{ "name": "Hacker News", "count": 45 }],
      "avg_relevance": 0.67,
      "processed_count": 82
    }
  ]
}
```

### 9.2 Trend Scores

`trend_score` per tag = frequency last 30 days ÷ frequency prior 30 days.
Tags with score > 1.5 are "rising" — injected into generation prompts:
> "Currently rising topics: {rising_tags}. Favor content related to these."

### 9.3 Studio "Trends" Tab

- Top 10 tags over recent snapshots (count bars)
- Rising vs declining tag list
- Per-source approval rate (signal quality indicator)
- Pipeline stats: crawled / digested / approved / rejected

**Files**: new `pipeline/utils/tendencies.py`, new `components/studio/TrendsPanel.tsx`, new `app/api/studio/trends/route.ts`, `app/studio/page.tsx`

---

## Phase 10 — Knowledge Graph + Idea Connection

**Goal**: Articles and ideas reference, cluster, and build on each other instead of being isolated.

### 10.1 Article Similarity Edges

After digest, compute Jaccard similarity on `tags[]` between new and existing articles.
Store top-3 similar article IDs as `related_ids: string[]` on `RawArticle`.
Pure tag-set math — no embeddings required.

### 10.2 Studio: Related Articles Panel

Expand any `ReviewQueue` item to see its `related_ids` as a sidebar.
Shows linked articles + summaries. Helps reviewers: "These 4 articles cover the same story — reject duplicates."

### 10.3 Idea Chains

In `ApprovalBucket` (Ideas tab), ideas that share KB sources are "connected".
Render a cluster badge on each idea showing how many others share its lineage.

### 10.4 Merge Flow in Studio

1. Select two pending items (checkbox) → "Merge" toolbar appears
2. POST `/api/studio/merge` → shells to `python pipeline/run.py --merge {id1} {id2} --mode {type}`
3. Python prompts Ollama to synthesize a single item from both
4. Merged item replaces both in `pending_*[]`

### 10.5 Complementary Generation

Ideas generator receives existing approved idea titles:
> "Existing ideas: {titles}. Generate ideas that are complementary — not duplicates."

**Files**: new `pipeline/utils/similarity.py`, new `pipeline/generate/merge.py`, new `app/api/studio/merge/route.ts`, `components/studio/ReviewQueue.tsx`, `components/studio/ApprovalBucket.tsx`, `app/api/studio/kb/route.ts`

---

## Phase 11 — Persona Support

**Goal**: Multiple named interest profiles; separate KB and outputs per persona.

### 11.1 Persona Directory (`sources/personas/`)

```
sources/personas/
  default.yaml        ← current profile
  frontend-dev.yaml   ← React/CSS/UX focus
  ai-researcher.yaml  ← deep AI papers focus
```

Each file is a full `profile.yaml`-compatible config.

### 11.2 Pipeline `--persona` Flag

```bash
PYTHONPATH=. python3 pipeline/run.py --crawl --persona ai-researcher
PYTHONPATH=. python3 pipeline/run.py --generate all --persona frontend-dev
```

- Loads `sources/personas/{name}.yaml` as the active profile
- Persona-scoped KB: `data/kb-{persona}.json`
- Persona-scoped outputs: `data/news-{persona}.json`, `data/ideas-{persona}.json`, `data/learning-{persona}.json`

### 11.3 Studio Persona Switcher

Dropdown in Studio header. All Studio operations (review, approve, generate) target the selected persona's files.

**Files**: `pipeline/config.py`, `pipeline/run.py`, `app/api/studio/*.ts`, `app/studio/page.tsx`

---

## Priority Order

| # | Phase | Effort | Impact |
|---|-------|--------|--------|
| 1 | 7 — Speed | Medium | High — immediate daily use improvement |
| 2 | 8 — Personalization | Medium | High — output quality |
| 3 | 9 — Tendencies | Small | Medium — insight layer |
| 4 | 10 — Knowledge graph | Large | High — differentiator feature |
| 5 | 11 — Personas | Medium | Medium — multi-angle exploration |

---

## Verification Checklist

- **Phase 7**: `time python3 pipeline/run.py --crawl` before/after; same article count, lower wall time
- **Phase 8**: Inspect `personal_score` in KB after digest; approve 5 items in Studio, confirm `profile.yaml` weights update
- **Phase 9**: Run `--digest` twice, confirm two snapshots in `tendencies.json`; Trends tab renders
- **Phase 10**: Check `related_ids` on digested articles; test merge flow with two similar pending ideas
- **Phase 11**: `--crawl --persona frontend-dev` creates `data/kb-frontend-dev.json`
