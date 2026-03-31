# Personal Profile + AI Intelligence Engine

A personal profile site backed by a local AI pipeline that ingests dev/AI news, summarizes it with Ollama, and generates derivative content (news digest, startup ideas, learning paths).

**Live:** [your-domain.vercel.app](https://your-domain.vercel.app)

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

```bash
# Crawl all sources (RSS, GitHub Trending, YouTube)
PYTHONPATH=. python3 pipeline/run.py --crawl

# Summarize with Ollama (Ollama must be running)
PYTHONPATH=. python3 pipeline/run.py --digest

# Generate content (news / ideas / learning / all)
PYTHONPATH=. python3 pipeline/run.py --generate all
```

**Sources configured in `sources/config.yaml`:**
- RSS feeds (Hacker News, dev.to, ArXiv CS.AI, newsletters)
- GitHub Trending
- YouTube channels (transcripts via yt-dlp)
- Manual URLs (`sources/manual.yaml`)

**Data flow:**
```
crawl → data/knowledge-base.json → digest → pending items → studio review → data/news.json etc.
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
