# Claude Code Capabilities Reference

A comprehensive map of every Claude Code capability and how to use each one in this project (personal site + AI pipeline). Companion to `docs/CLAUDE_CODE_PRACTICES.md`.

---

## 1. Skills (`/skill-name`)

Skills are reusable prompt templates invoked with a slash command. They expand into a full prompt that Claude executes. Skills live in `~/.claude/skills/` (global, available in all projects) or `.claude/skills/` (project-local).

### Built-in skills

These are the actual built-in skills available. Note: `/commit` is a built-in **workflow** (part of Claude's git instructions, not a skill) — just ask Claude to commit and it follows the standard protocol. `/review-pr` does not exist as a built-in skill.

| Skill | What it does | Use in this project |
|-------|-------------|---------------------|
| `/simplify` | Reviews recently changed code for over-engineering, redundancy, reuse | After adding a new content page or pipeline mode — checks for patterns that can be shared |
| `/loop` | Runs a prompt or slash command on a repeating interval | `/loop 30m /pipeline-status` — check KB item counts every 30 minutes while digest runs |
| `/schedule` | Creates a remote trigger that runs on a cron schedule | Schedule a weekly news crawl notification (see §7) |
| `/update-config` | Modifies `settings.json` — adds hooks, permissions, env vars | Adding a new PostToolUse hook without editing the JSON by hand |
| `/keybindings-help` | Customise keyboard shortcuts in `~/.claude/keybindings.json` | Rebinding the submit key or adding chord shortcuts |
| `/claude-api` | Builds apps using the Anthropic SDK / Claude API | If replacing Ollama with the Claude API for generation modes |

### Custom project skills

Create in `.claude/skills/` (project-local) or `~/.claude/skills/` (global). File format:

```markdown
---
description: One-line description shown in /help
---

The prompt Claude will execute when the skill is invoked.
```

**Recommended custom skills for this project:**

#### `/pipeline-status`
`.claude/skills/pipeline-status.md`:
```markdown
---
description: Show knowledge-base pipeline status summary
---

Read data/knowledge-base.json and print a concise summary:
- Total KB items, breakdown by status: pending_review / processed / rejected / error
- Count of items in each pending bucket: pending_news, pending_ideas, pending_learning
- Relevance score distribution across processed items: ≥0.7 (high), 0.4–0.69 (medium), <0.4 (low)
- Date of most recently fetched item (fetched_at field, max value)
```

#### `/data-commit`
`.claude/skills/data-commit.md`:
```markdown
---
description: Commit approved data files with a standard message
---

1. Run git diff --stat data/news.json data/learning.json to see what changed
2. Count the number of items in each file
3. Commit only data/news.json and data/learning.json with message:
   "content: approve <N> news, <M> learning paths (<YYYY-MM-DD>)"
   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Do not commit data/ideas.json or data/knowledge-base.json.
```

#### `/source-check`
`.claude/skills/source-check.md`:
```markdown
---
description: Validate a new RSS or YouTube source before adding it to sources/config.yaml
---

Given a URL argument:
1. Fetch the URL and check it returns valid XML (for RSS) or a valid YouTube channel page
2. For RSS: count available entries, show the most recent 3 titles and dates
3. For YouTube: check if auto-captions are available on the latest video
4. Check robots.txt at the domain root — show whether crawling is allowed
5. Recommend whether to add it, and what name/max_items to use in sources/config.yaml
```

---

## 2. MCP Servers

MCP (Model Context Protocol) servers are external processes that expose additional tools to Claude. They run as subprocesses and communicate via stdin/stdout.

**Configuration location:**
- `~/.claude/settings.json` — global, available in all projects
- `.claude/settings.json` — project-level, committed to git (team-wide)
- `.claude/settings.local.json` — project-level, not committed (personal)

**General setup format:**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-name"],
      "env": { "OPTIONAL_API_KEY": "..." }
    }
  }
}
```

### High-value servers for this project

#### `@modelcontextprotocol/server-filesystem`
Enhanced file operations: directory trees, recursive listing, structured file reads.

**Install:** `npx -y @modelcontextprotocol/server-filesystem <allowed-paths>`

**Use:**
- Browse `data/knowledge-base.json` structure without loading the entire 10k-line file into context
- List all `pipeline/` files and their sizes to understand pipeline scope at a glance
- Compare `data/news.json` and `data/learning.json` sizes after an approval session

#### `@modelcontextprotocol/server-github`
Full GitHub API: repos, issues, PRs, releases, commits, branch management.

**Install:** Requires `GITHUB_TOKEN` env var.

**Use:**
- After `git push`, create a GitHub Release with the approved news items as release notes
- Open a GitHub issue automatically when the pipeline marks more than N items as `error`
- List open PRs to use with `/review-pr`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<token>" }
    }
  }
}
```

#### `@modelcontextprotocol/server-fetch`
Fetches arbitrary URLs and returns the page content (HTML or text).

**Use:**
- Test a new RSS feed URL before adding to `sources/config.yaml`
- Check `robots.txt` for a domain before adding it to `sources/manual.yaml`
- Verify an ArXiv category URL returns papers in the right area

#### `@modelcontextprotocol/server-brave-search`
Web search via Brave Search API. Requires `BRAVE_API_KEY`.

**Use:**
- Discover new RSS feeds for a topic area (e.g. "best RSS feeds for AI safety research")
- Find the correct channel ID for a YouTube channel before adding it
- Research whether a new Ollama model would improve idea generation quality

#### `@modelcontextprotocol/server-memory`
Key-value store persisted across sessions. Complementary to the file-based memory system.

**Use:**
- Store pipeline run metadata: `{ last_crawl: "2026-03-30", items_added: 12, errors: 0 }`
- Track which RSS sources have been producing high-relevance content vs. noise
- Save a note without creating a full memory file

#### `@modelcontextprotocol/server-sqlite`
Read/write SQLite databases.

**Use:** Not immediately applicable (project uses JSON files), but relevant if:
- The KB grows beyond ~5k items and JSON read/write becomes slow
- You want to query the KB with SQL (e.g. `SELECT * FROM items WHERE relevance_score > 0.7 ORDER BY fetched_at DESC LIMIT 20`)

#### `@modelcontextprotocol/server-puppeteer`
Headless browser automation via Puppeteer.

**Use:**
- Scrape sources that require JavaScript rendering (GitHub Trending already works with httpx, but some news sources are JS-only)
- Take screenshots of the deployed site for visual regression checks

---

## 3. Subagents

Subagents are specialised sub-processes that Claude spawns via the Agent tool. Each type has a defined tool set. Key benefits: parallelism, context isolation (protecting the main window), and specialisation.

### Available agent types

| Type | Tools available | Best for |
|------|----------------|---------|
| `general-purpose` | All tools | Multi-step tasks, background pipeline runs, anything that needs to act |
| `Explore` | Read/Glob/Grep/WebFetch/WebSearch (no writes) | Codebase searches, reading docs, answering "how does X work" |
| `Plan` | All read-only + plan file write | Designing new features or architecture changes |
| `claude-code-guide` | Glob/Grep/Read/WebFetch/WebSearch | Claude Code feature questions, Next.js docs, Anthropic SDK |

### Parallelism

Run independent searches simultaneously instead of sequentially:

```
// Before adding a new type to lib/types.ts:
Agent(Explore): "Find all files that import from lib/types.ts and list which types they use"
Agent(Explore): "Find all Pydantic models in pipeline/utils/schemas.py and their field names"
// Both run in parallel — combined result in half the time
```

### Background agents

Start a long-running task and continue other work:

```
Agent(general-purpose, run_in_background=true):
  "Run PYTHONPATH=. python3 pipeline/run.py --digest 2>&1 | tail -20.
   Report how many items were processed and how many had errors."
// Claude gets notified when done; continue editing components in the meantime
```

**Useful background tasks for this project:**
- Running `--digest` (each item takes ~2s with llama3.2; 300 items = ~10 min)
- Running `npm run build` as a verification step after a large change
- Checking all data file sizes and structure after a studio session

### Worktree isolation

Isolated experiments that can't corrupt the working tree:

```
Agent(general-purpose, isolation="worktree"):
  "Prototype replacing the news page list layout with a card grid using CSS grid.
   Don't worry about pixel-perfect — just see if the structure works."
// If good: returns worktree branch path to review/merge
// If bad: auto-cleaned up, no trace left
```

**Good candidates for worktree isolation in this project:**
- Trying a different KB schema (e.g. adding a `category` field)
- Experimenting with a different Ollama prompt strategy for the digest
- Prototyping a new pipeline generation mode (e.g. `generate/podcast.py`)
- Testing a design change (dark sidebar nav instead of top nav)

### Context protection with Explore agents

Use Explore agents for orientation tasks so the main context window doesn't fill with raw file contents:

```
// Session start — get oriented without loading 20 files
Agent(Explore): "Read docs/PROGRESS.md and CLAUDE.md.
  Tell me: what phases are complete, what the established patterns are,
  and what the next logical task would be."
```

---

## 4. Hooks

Hooks run shell commands at lifecycle events. The current configuration (`PostToolUse[Edit|Write]` → lint) is in `.claude/settings.local.json`.

### Current hooks

| Event | Trigger | Command |
|-------|---------|---------|
| `PostToolUse` | Edit or Write | `npm run lint --quiet 2>&1 \| tail -15` |

### Recommended additions

#### TypeScript type-check on save
Catches type errors immediately — complements lint:
```json
{
  "matcher": "Edit|Write",
  "hooks": [{ "type": "command", "command": "cd /Users/kmzsz/dev/my-profile && npx tsc --noEmit 2>&1 | tail -10" }]
}
```

#### Build verification at session end
Runs `next build` when Claude stops — catches static prerendering issues:
```json
// PostToolUse → Stop event
{
  "matcher": "",
  "hooks": [{ "type": "command", "command": "cd /Users/kmzsz/dev/my-profile && npm run build 2>&1 | tail -20" }]
}
```

#### Pre-compact documentation reminder
Prompts you to update `docs/PROGRESS.md` before compaction:
```json
{
  "matcher": "manual",
  "hooks": [{ "type": "command", "command": "echo '{\"systemMessage\": \"Reminder: update docs/PROGRESS.md before compacting.\"}'" }]
}
```

### Full hook event reference

| Event | When it fires | Can block? |
|-------|--------------|-----------|
| `PreToolUse` | Before a tool call | Yes — `"continue": false` |
| `PostToolUse` | After a successful tool call | No |
| `PostToolUseFailure` | After a tool call fails | No |
| `Stop` | When Claude finishes a response | No |
| `PreCompact` | Before context compaction | Yes |
| `PostCompact` | After compaction (receives summary in stdin) | No |
| `UserPromptSubmit` | When user submits a message | Yes |
| `SessionStart` | At session open | No |

### Hook stdin payload

Every hook receives JSON on stdin:
```json
{
  "session_id": "abc123",
  "tool_name": "Edit",
  "tool_input": { "file_path": "/path/to/file.ts", "old_string": "...", "new_string": "..." },
  "tool_response": { "success": true }
}
```
Use `jq` to extract fields: `jq -r '.tool_input.file_path'`

### Hook output (blocking / messaging)

Return JSON to control behaviour:
```json
{ "continue": false, "stopReason": "Lint errors found — fix before proceeding" }
{ "systemMessage": "Warning: you are editing a pipeline file. Run --digest first." }
```

---

## 5. Memory System

Persistent file-based memory at `~/.claude/projects/-Users-kmzsz-dev-my-profile/memory/`. All files in this directory are automatically loaded into context at session start via `MEMORY.md` (the index).

### Currently saved

| File | Contents |
|------|---------|
| `project_status.md` | All 6 phases complete; next: run full pipeline |
| `feedback_patterns.md` | Content page Server→Client pattern; force-dynamic rule; compact timing |

### Recommended additions

**`user_profile.md`** — preferences that affect how Claude communicates:
```markdown
---
name: user_profile
type: user
description: Owner's engineering background and preferences
---
Full-stack developer. Comfortable with TypeScript, Python, and Next.js App Router.
Prefers concise responses — no summaries at the end of every message.
Cares about: clean abstractions, no premature optimisation, mobile responsiveness.
```

**`pipeline_run_log.md`** — updated after each pipeline session:
```markdown
---
name: pipeline_run_log
type: project
description: Log of pipeline runs with item counts
---
Last crawl: 2026-03-30 — 311 items added
Last digest: pending (308 items still pending_review)
Last generate: never run successfully end-to-end
```

**`sources_notes.md`** — evolves as you learn which sources are valuable:
```markdown
---
name: sources_notes
type: project
description: Notes on RSS/YouTube source quality
---
ArXiv cs.AI: high volume (200+/run), very high relevance_score average (~0.75)
Hacker News: good variety, ~30/run, mixed relevance (0.4–0.8)
GitHub Trending: low text quality (blurbs only), relevance usually 0.3–0.5 — useful for stack discovery
dev.to: moderate quality, some SEO spam — consider reducing max_items
```

### Memory types

| Type | Purpose | Update frequency |
|------|---------|-----------------|
| `user` | Role, expertise, communication preferences | Rarely — only when something significant changes |
| `feedback` | What worked / didn't in past sessions | After any correction or confirmed approach |
| `project` | Phase status, decisions, active work | After each session |
| `reference` | Locations of external resources | When discovered |

---

## 6. Tasks

In-session task tracking via `TaskCreate` / `TaskUpdate`. Tasks appear in the Claude Code UI as a checklist and provide visibility into multi-step work.

### When to use

Tasks are valuable for sessions with 4+ discrete steps where losing track of progress is a real risk. They're overkill for single-file edits.

### Pattern for a full pipeline session

```
TaskCreate: "Check KB status"              → in_progress
  → Read KB, print counts
TaskUpdate: "Check KB status"              → completed

TaskCreate: "Run --digest"                 → in_progress
  → Run pipeline in background
TaskUpdate: "Run --digest"                 → completed (N processed)

TaskCreate: "Generate all content"         → in_progress
TaskCreate: "Review queue in studio"       → pending
TaskCreate: "Approve news + learning"      → pending
TaskCreate: "Commit data files"            → pending
```

### Tasks vs. memory

- **Tasks** → in-session progress tracking. Ephemeral. Never save to memory.
- **Memory** → cross-session persistence. For facts that matter next week.

---

## 7. Remote Triggers & Scheduling (`/schedule`)

Scheduled agents run on a cron schedule in the cloud — no local session needed.

### How to create

```
/schedule
```
Claude opens an interactive prompt to define the trigger name, cron expression, and what to do.

### Limitations for this project

The pipeline requires:
1. Local filesystem (`data/knowledge-base.json`)
2. Local Ollama instance

Scheduled remote agents have neither. They **cannot** run the Python pipeline directly.

### What remote schedules CAN do for this project

**Notification trigger** — runs daily, checks nothing locally, just sends a reminder:
```
Name: "Daily pipeline reminder"
Cron: 0 9 * * *
Task: Send a notification that it's time to run the local pipeline
```

**GitHub issue creator** — if the project is on GitHub, check for stale data:
```
Name: "Weekly freshness check"
Cron: 0 8 * * 1
Task: Check if data/news.json was committed in the past 7 days via GitHub API.
      If not, open an issue: "Weekly content refresh needed"
```

**Vercel deployment monitor** — check the deployed site is healthy:
```
Name: "Daily site health"
Cron: 0 10 * * *
Task: Fetch https://your-site.vercel.app and https://your-site.vercel.app/news.
      If either returns non-200, open a GitHub issue.
```

---

## 8. Plan Mode (`/plan`)

Plan mode locks Claude to read-only + plan file writes. Implementation only begins after you explicitly approve.

### Trigger

Type `/plan` before describing the task, or Claude enters plan mode automatically for complex requests.

### When plan mode adds the most value in this project

| Situation | Why plan mode helps |
|-----------|-------------------|
| KB schema change | Touches both `lib/types.ts` (TypeScript) and `pipeline/utils/schemas.py` (Python Pydantic) simultaneously — easy to miss one side |
| New public page | Need to verify the Vercel build stays `○ (Static)` — a wrong `force-dynamic` export breaks this |
| New pipeline mode | Python code that writes to `knowledge-base.json` — a bug corrupts the KB |
| Multi-file refactor | E.g. extracting a shared `ContentPage` wrapper — need to see all callsites before touching anything |
| Architectural decisions | Adding a database, switching from Ollama to a hosted API — irreversible choices |

### When to skip plan mode

- Fixing a typo in `lib/constants.ts`
- Adding a CSS class to a component
- Updating `docs/PROGRESS.md`
- Single-function bug fixes with obvious scope

### Plan file location

`~/.claude/plans/synthetic-yawning-frog.md` (current project). The plan file persists across sessions — re-entering plan mode reads it first.

---

## 9. Web Tools (WebFetch / WebSearch)

Built-in tools available in the main session and in general-purpose / claude-code-guide agents.

### WebFetch

Fetches a URL and returns the page content.

**Project uses:**
- Validate a new RSS feed: `WebFetch("https://hnrss.org/frontpage")` — check it returns valid XML with recent entries
- Check robots.txt before adding a manual URL: `WebFetch("https://example.com/robots.txt")`
- Read a specific ArXiv paper abstract before deciding if a source is valuable
- Preview what `readability-lxml` would extract from a page (compare raw HTML to what the crawler will see)

### WebSearch

Searches the web and returns results.

**Project uses:**
- Find RSS feeds for a new topic: `WebSearch("LLM safety RSS feed filetype:xml")`
- Discover new YouTube channels covering AI topics
- Research the best Ollama models for structured JSON generation
- Look up Next.js App Router docs for a specific feature

### Best practice: protect main context

For documentation lookups, spawn a `claude-code-guide` agent instead of using WebFetch/Search in the main session. This keeps the main context clean:

```
Agent(claude-code-guide):
  "How does useSearchParams work with Suspense in Next.js 16 App Router?
   Specifically: does the Suspense boundary need to be in the page.tsx or can it be in the layout?"
```

---

## 10. Worktrees (`isolation: "worktree"`)

Worktrees create a temporary git branch + isolated working directory. Changes are safe to experiment with because they can't affect the main branch.

**Behaviour:**
- If the agent makes **no changes**: worktree is auto-cleaned up
- If the agent **makes changes**: the worktree path and branch name are returned for review/merge

### Project uses

| Experiment | Why use worktree |
|-----------|-----------------|
| Try a masonry card grid for `/news` | Visual change — easy to accept or discard |
| Add `category` field to `KnowledgeBase` | Schema change cascades through TS + Python — risky without isolation |
| Prototype a `/podcast` generation mode | New pipeline module — don't want half-finished code in main |
| Try Tailwind v5 (when available) | Major dependency upgrade — can test build without risk |
| Add a dark sidebar nav layout | Layout restructure touching `app/layout.tsx` — high blast radius |

### Usage

```
Agent(general-purpose, isolation="worktree"):
  "Prototype adding a 'category' field to RawArticle in both lib/types.ts
   and pipeline/utils/schemas.py. Make it optional (category?: string).
   Update all existing usages. Run npm run build to verify."
```

---

## Quick reference

| Capability | Invoke with | Best for |
|-----------|-------------|---------|
| Skills | `/skill-name` | Repeatable workflows (commit, status check, code review) |
| Custom skills | `.claude/skills/*.md` | Project-specific shortcuts |
| MCP servers | Settings JSON | Persistent new tools (GitHub, search, fetch) |
| Explore agent | `Agent(Explore)` | Read-only research without consuming main context |
| Background agent | `Agent(..., run_in_background=true)` | Long tasks (digest, build) while continuing work |
| Worktree agent | `Agent(..., isolation="worktree")` | Risky experiments that need isolation |
| Hooks | Settings JSON | Automated reactions to tool calls / session events |
| Memory | `~/.claude/projects/.../memory/` | Cross-session persistence |
| Tasks | TaskCreate/TaskUpdate | In-session multi-step progress tracking |
| Plan mode | `/plan` | Complex changes requiring upfront design |
| Schedule | `/schedule` | Remote cron jobs (notifications, site health) |
| WebFetch/Search | Built-in | Validating sources, looking up docs |
