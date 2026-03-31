import { Suspense } from 'react'
import type { Metadata } from 'next'
import type { NewsItem } from '@/lib/types'
import { NewsContent } from '@/components/news/NewsContent'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'News',
}

// news.json is local-only and not committed — read at runtime
export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  let items: NewsItem[] = []
  try {
    const { readDataFile } = await import('@/lib/studio-io')
    items = readDataFile<NewsItem>('news').sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    )
  } catch {
    // file may not exist yet
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No news yet"
        description="Check back after the next pipeline run."
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">News</h1>
      <Suspense>
        <NewsContent items={items} />
      </Suspense>
    </div>
  )
}
