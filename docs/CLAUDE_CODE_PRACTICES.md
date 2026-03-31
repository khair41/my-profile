# Claude Code Practices

How to work with Claude Code effectively on this project. Keep this updated as new patterns emerge.

---

## Session start ritual

Every session should begin with:

1. **Read `docs/PROGRESS.md`** — understand which phases are complete and what's pending before any planning
2. **Read `CLAUDE.md`** — the established patterns section saves re-deriving conventions from source
3. **State the goal** — be specific about what phase or feature you're working on

If Claude doesn't orient itself with PROGRESS.md first, explicitly say: _"Check docs/PROGRESS.md before we start."_

---

## Plan mode

Use plan mode (`/plan`) for any task that:
- Touches more than 2–3 files
- Introduces a new architectural pattern
- Has unclear scope or multiple valid approaches

Skip plan mode for:
- Single-file bug fixes
- Typo/copy changes
- Obvious one-line additions

### What makes a good plan

- **Context section first** — why this change exists, what problem it solves
- **File table** — every file to create/modify, one-line purpose each
- **Reuse existing patterns** — reference the exact file that establishes the pattern (e.g. `app/news/page.tsx` for content page layout)
- **Verification steps** — how to confirm it worked end-to-end (build output, browser behaviour)
- **No alternatives** — the plan file should contain only the chosen approach

---

## Context management

### When to `/compact`

Compact **immediately after updating `docs/PROGRESS.md`** at the end of each phase — while the work is fresh and the summary will be complete. Do not wait until context runs out mid-task.

Signs you're approaching the limit:
- Responses start omitting detail
- Claude re-asks questions already answered
- Tool results start getting truncated

### What survives compaction

The compaction summary captures decisions and outcomes well. What it can miss:
- Exact error messages and their fixes
- Small file contents that weren't recently read
- The full state of work in progress

Mitigate by: keeping PROGRESS.md and CLAUDE.md current — they're always re-readable from disk.

---

## Adding a new content page

Follow this recipe exactly. Deviating from it requires explicitly noting why.

### 1. Server Component page (`app/{name}/page.tsx`)

```tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import type { YourItem } from '@/lib/types'
import data from '@/data/{name}.json'      // or readDataFile for dynamic pages
import { YourContent } from '@/components/{name}/YourContent'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = { title: 'Page Name' }

export default function YourPage() {
  const items = data as YourItem[]
  if (items.length === 0) return <EmptyState title="..." description="..." />
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Page Name</h1>
      <Suspense><YourContent items={items} /></Suspense>
    </div>
  )
}
```

### 2. Client content component (`components/{name}/YourContent.tsx`)

```tsx
'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { FilterBar } from '@/components/ui/FilterBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { YourCard } from './YourCard'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

export function YourContent({ items }: { items: YourItem[] }) {
  const prefersReduced = useReducedMotion()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState('')

  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) ?? []
  const allTags = [...new Set(items.flatMap(i => i.tags))].sort()

  const filtered = items.filter(i => {
    const matchesTags = selectedTags.length === 0 || selectedTags.some(t => i.tags.includes(t))
    const q = search.toLowerCase()
    const matchesSearch = !q || /* search your fields */
    return matchesTags && matchesSearch
  })

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag]
    const params = new URLSearchParams(searchParams.toString())
    next.length > 0 ? params.set('tags', next.join(',')) : params.delete('tags')
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <FilterBar allTags={allTags} selectedTags={selectedTags} onToggleTag={toggleTag}
        search={search} onSearch={setSearch} resultCount={filtered.length} totalCount={items.length} />
      {filtered.length === 0 ? <EmptyState title="No results" description="..." /> : (
        <motion.ul variants={prefersReduced ? undefined : container}
          initial={prefersReduced ? false : 'hidden'} animate="show" className="space-y-4">
          {filtered.map(i => (
            <motion.li key={i.id} variants={prefersReduced ? undefined : item}>
              <YourCard item={i} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </>
  )
}
```

### 3. Card component (`components/{name}/YourCard.tsx`)

Pure presentational — no state, no hooks. Props: `{ item: YourItem }`.

Tag pill class: `px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`
Accent chip class: `px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent`

### 4. Add to nav

In `lib/constants.ts`, add to `NAV_LINKS`:
```typescript
{ label: 'Your Page', href: '/your-page' }
```

---

## Pipeline workflow

The full loop from raw sources to published content:

```
1. Crawl
   PYTHONPATH=. python3 pipeline/run.py --crawl
   → adds items to data/knowledge-base.json (status: pending_review)

2. Digest (requires Ollama running)
   PYTHONPATH=. python3 pipeline/run.py --digest
   → processes pending_review items: fills summary, tags, relevance_score
   → re-run safe: skips already-processed items

3. Generate (requires Ollama running)
   PYTHONPATH=. python3 pipeline/run.py --generate all
   → reads processed items, stages content in pending_news[], pending_ideas[], pending_learning[]

4. Review in Studio
   npm run dev  (with STUDIO_ENABLED=true IDEAS_ENABLED=true in .env.local)
   → /studio — approve/reject queue items (sets status: processed/rejected)
   → /studio — approve/reject generated buckets (writes to data/*.json)

5. Commit approved data
   git add data/news.json data/learning.json
   git commit -m "content: approve N news items, M learning paths"
   git push  → triggers Vercel redeploy
```

Note: `data/ideas.json` is never committed (`data/ideas.json` is in `.gitignore`).

---

## Common gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| `/studio` always redirects even with `STUDIO_ENABLED=true` | Layout missing `force-dynamic` | Add `export const dynamic = 'force-dynamic'` to `app/studio/layout.tsx` |
| `useSearchParams` causes build error | Missing `<Suspense>` boundary | Wrap the client component in `<Suspense>` in the server page |
| Filter state lost on page refresh | Tags not in URL | Use `useSearchParams`/`useRouter` pattern, not `useState` alone |
| Ollama returns non-JSON | Model didn't follow instruction | Pipeline retries once automatically; check `status: "error"` items in KB |
| Vercel build fails with `fs` errors | Studio/pipeline code imported in static route | Check that `readKB`/`writeKB` are only called from `force-dynamic` routes or Server Components in dynamic segments |

---

## Files to know

| File | What it is |
|------|-----------|
| `CLAUDE.md` | Always-loaded project context — keep current |
| `docs/PROGRESS.md` | Phase-by-phase log — update at end of every phase |
| `docs/PRD.md` | Original product requirements — reference for acceptance criteria |
| `docs/ARCHITECTURE.md` | Full pipeline + component diagram |
| `lib/types.ts` | All shared TypeScript interfaces |
| `lib/constants.ts` | Owner data, nav links, stack — single source of truth |
| `lib/studio-io.ts` | Typed KB I/O helpers (readKB, writeKB, readDataFile, writeDataFile) |
| `data/knowledge-base.json` | Local only — full pipeline state |
| `data/news.json` / `data/learning.json` | Committed — read at Vercel build time |
| `data/ideas.json` | Local only — never committed, never deployed |
