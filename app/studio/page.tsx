'use client'

import { useEffect, useState } from 'react'
import { ReviewQueue } from '@/components/studio/ReviewQueue'
import { ApprovalBucket } from '@/components/studio/ApprovalBucket'
import { GeneratePanel } from '@/components/studio/GeneratePanel'
import { SourcesPanel } from '@/components/studio/SourcesPanel'
import type { RawArticle } from '@/lib/studio-io'
import type { NewsItem, IdeaItem, LearningItem } from '@/lib/types'

type Tab = 'queue' | 'news' | 'ideas' | 'learning' | 'generate' | 'sources'

interface StudioData {
  queue: RawArticle[]
  pending_news: NewsItem[]
  pending_ideas: IdeaItem[]
  pending_learning: LearningItem[]
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'queue', label: 'Queue' },
  { id: 'news', label: 'News' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'learning', label: 'Learning' },
  { id: 'generate', label: 'Generate' },
  { id: 'sources', label: 'Sources' },
]

export default function StudioPage() {
  const [tab, setTab] = useState<Tab>('queue')
  const [data, setData] = useState<StudioData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/studio/kb')
      setData((await res.json()) as StudioData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function counts() {
    if (!data) return {}
    return {
      queue: data.queue.length,
      news: data.pending_news.length,
      ideas: data.pending_ideas.length,
      learning: data.pending_learning.length,
    }
  }

  const c = counts()

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-zinc-800 pb-0">
        {TABS.map(({ id, label }) => {
          const count = c[id as keyof typeof c]
          const isActive = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className={[
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isActive ? 'bg-accent/20 text-accent' : 'bg-zinc-800 text-zinc-400',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {tab === 'sources' ? (
        <SourcesPanel />
      ) : tab === 'generate' ? (
        <GeneratePanel />
      ) : loading ? (
        <div className="py-16 text-center text-zinc-500 text-sm">Loading…</div>
      ) : (
        <>
          {tab === 'queue' && (
            <ReviewQueue items={data?.queue ?? []} onAction={() => void load()} />
          )}
          {tab === 'news' && (
            <ApprovalBucket
              type="news"
              items={data?.pending_news ?? []}
              onAction={() => void load()}
            />
          )}
          {tab === 'ideas' && (
            <ApprovalBucket
              type="ideas"
              items={data?.pending_ideas ?? []}
              onAction={() => void load()}
            />
          )}
          {tab === 'learning' && (
            <ApprovalBucket
              type="learning"
              items={data?.pending_learning ?? []}
              onAction={() => void load()}
            />
          )}
        </>
      )}
    </div>
  )
}
