'use client'

import type { RawArticle } from '@/lib/studio-io'

interface Props {
  items: RawArticle[]
  onAction: () => void
}

async function doReview(id: string, action: 'approve' | 'reject') {
  await fetch('/api/studio/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action }),
  })
}

function ScoreBar({ score }: { score?: number }) {
  const pct = Math.round((score ?? 0) * 100)
  const color =
    (score ?? 0) >= 0.7
      ? 'bg-green-500'
      : (score ?? 0) >= 0.4
        ? 'bg-yellow-500'
        : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500">{pct}%</span>
    </div>
  )
}

export function ReviewQueue({ items, onAction }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-500">
        No items pending review. Run the digest pipeline first.
      </div>
    )
  }

  async function handle(id: string, action: 'approve' | 'reject') {
    await doReview(id, action)
    onAction()
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-zinc-100 hover:text-accent transition-colors line-clamp-2"
              >
                {item.title}
              </a>
              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                <span>{item.source_name}</span>
                <span>{new Date(item.fetched_at).toLocaleDateString()}</span>
                <ScoreBar score={item.relevance_score} />
              </div>
              {item.summary && (
                <p className="mt-2 text-sm text-zinc-400 line-clamp-3">{item.summary}</p>
              )}
              {item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => void handle(item.id, 'approve')}
                className="px-3 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => void handle(item.id, 'reject')}
                className="px-3 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
