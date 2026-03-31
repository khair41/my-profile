# Personal site + AI intelligence engine

## What we're building
A personal profile website + local AI pipeline that ingests dev/AI news,
summarizes it with Ollama, and generates derivative outputs (news digest,
startup ideas, learning paths). Built to showcase full-stack skills.

## Stack
- Next.js 14+ with App Router + TypeScript
- Tailwind CSS
- Vercel deployment
- Python pipeline (crawler + Ollama integration)
- Ollama for local LLM processing

## Architecture
See docs/ARCHITECTURE.md for the full pipeline diagram.

## Pages
- / — public profile / bio
- /news — AI-summarized news digest
- /ideas — startup ideas generated from news
- /learning — learning path suggestions
- /studio — local-only review UI (excluded from public build)

## Pipeline
data/knowledge-base.json — raw digested articles (output of crawler)
data/news.json — approved news items
data/ideas.json — approved startup ideas
data/learning.json — approved learning paths

## Source types supported
- RSS feeds (HN, dev.to, ArXiv, etc.)
- GitHub Trending
- YouTube channel transcripts
- Manual URL list (sources/manual.yaml)

## Design direction
"Opinionated modern" — dark mode default, accent color: #6c5ce7 (indigo),
clean typography (Geist), subtle surfaces, data feels alive.
Think Linear / Vercel aesthetic.

## Definition of done (per feature)
1. Works correctly across described scenarios
2. TypeScript — no `any` types
3. Mobile responsive
4. Dark mode works
5. No lint errors

---

## Current status

All 6 phases complete. Read `docs/PROGRESS.md` before starting any new task.

---

## Common commands

```
npm run dev                                        local dev server
npm run build                                      verify zero TS/ESLint errors
npm run lint                                       lint only
PYTHONPATH=. python3 pipeline/run.py --crawl       crawl all sources
PYTHONPATH=. python3 pipeline/run.py --digest      Ollama summarisation (Ollama must be running)
PYTHONPATH=. python3 pipeline/run.py --generate all  stage generated content
```

Local dev requires `.env.local`:
```
STUDIO_ENABLED=true
IDEAS_ENABLED=true
```

---

## Established patterns

### Content pages (news / learning / ideas)
Server Component reads JSON → passes items to `'use client'` Content component wrapped in `<Suspense>`.
Filter/search state lives in URL (`?tags=llm,rag`) via `useSearchParams` + `useRouter`.
Animations use framer-motion `useReducedMotion()` — always check before adding motion.

Reference: `app/news/page.tsx` → `components/news/NewsContent.tsx` → `components/news/NewsCard.tsx`

### Studio API routes
All routes: `export const dynamic = 'force-dynamic'`
Filesystem writes: write `*.json.tmp` → `fs.renameSync` (atomic — mirrors Python `file_io.py`)

Reference: `app/api/studio/kb/route.ts`, `lib/studio-io.ts`

### Env-gated layouts
Must have `export const dynamic = 'force-dynamic'` or the redirect bakes into the static build.

Reference: `app/studio/layout.tsx`, `app/ideas/layout.tsx`

### New component checklist
- No `any` types
- Dark mode: `dark:` Tailwind variants, not hardcoded colours
- Mobile responsive (studio UI is desktop-only — 1280 px minimum)
- Tag pill: `px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`
- Accent chip: `px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent`

---

## See also

- `docs/CLAUDE_CODE_PRACTICES.md` — session workflow, plan mode guide, pipeline loop, gotchas
