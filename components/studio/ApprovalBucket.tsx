'use client'

import type { NewsItem, IdeaItem, LearningItem } from '@/lib/types'

type BucketType = 'news' | 'ideas' | 'learning'

interface Props {
  type: BucketType
  items: NewsItem[] | IdeaItem[] | LearningItem[]
  onAction: () => void
}

async function doBucket(type: BucketType, id: string, action: 'approve' | 'reject') {
  await fetch('/api/studio/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, id, action }),
  })
}

function ActionButtons({
  onApprove,
  onReject,
}: {
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <button
        onClick={onApprove}
        className="px-3 py-1 rounded text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
      >
        Approve
      </button>
      <button
        onClick={onReject}
        className="px-3 py-1 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
      >
        Reject
      </button>
    </div>
  )
}

function NewsCard({
  item,
  onApprove,
  onReject,
}: {
  item: NewsItem
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <li className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-100 hover:text-accent transition-colors"
          >
            {item.title}
          </a>
          <div className="mt-0.5 text-xs text-zinc-500">{item.source_name}</div>
          <p className="mt-2 text-sm text-zinc-400">{item.summary}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ActionButtons onApprove={onApprove} onReject={onReject} />
      </div>
    </li>
  )
}

function IdeaCard({
  item,
  onApprove,
  onReject,
}: {
  item: IdeaItem
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <li className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-100">{item.title}</p>
          <p className="mt-1 text-sm text-zinc-400">
            <span className="text-zinc-500">Problem: </span>
            {item.problem}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            <span className="text-zinc-500">Opportunity: </span>
            {item.opportunity}
          </p>
          {item.suggested_stack.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.suggested_stack.map((s) => (
                <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-accent/10 text-accent">
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ActionButtons onApprove={onApprove} onReject={onReject} />
      </div>
    </li>
  )
}

function LearningCard({
  item,
  onApprove,
  onReject,
}: {
  item: LearningItem
  onApprove: () => void
  onReject: () => void
}) {
  const difficultyColor =
    item.difficulty === 'beginner'
      ? 'text-green-400 bg-green-500/10'
      : item.difficulty === 'intermediate'
        ? 'text-yellow-400 bg-yellow-500/10'
        : 'text-red-400 bg-red-500/10'

  return (
    <li className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-zinc-100">{item.topic}</p>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${difficultyColor}`}>
              {item.difficulty}
            </span>
            <span className="text-xs text-zinc-500">{item.estimated_hours}h</span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{item.rationale}</p>
          {item.resources.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {item.resources.map((r, i) => (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    {r.title}
                  </a>
                  <span className="ml-1.5 text-xs text-zinc-600">{r.type}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ActionButtons onApprove={onApprove} onReject={onReject} />
      </div>
    </li>
  )
}

export function ApprovalBucket({ type, items, onAction }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-500">
        No pending {type} items. Run generation first.
      </div>
    )
  }

  async function handle(id: string, action: 'approve' | 'reject') {
    await doBucket(type, id, action)
    onAction()
  }

  return (
    <ul className="space-y-3">
      {type === 'news' &&
        (items as NewsItem[]).map((item) => (
          <NewsCard
            key={item.id}
            item={item}
            onApprove={() => void handle(item.id, 'approve')}
            onReject={() => void handle(item.id, 'reject')}
          />
        ))}
      {type === 'ideas' &&
        (items as IdeaItem[]).map((item) => (
          <IdeaCard
            key={item.id}
            item={item}
            onApprove={() => void handle(item.id, 'approve')}
            onReject={() => void handle(item.id, 'reject')}
          />
        ))}
      {type === 'learning' &&
        (items as LearningItem[]).map((item) => (
          <LearningCard
            key={item.id}
            item={item}
            onApprove={() => void handle(item.id, 'approve')}
            onReject={() => void handle(item.id, 'reject')}
          />
        ))}
    </ul>
  )
}
