import { Suspense } from 'react'
import type { Metadata } from 'next'
import type { IdeaItem } from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { IdeasContent } from '@/components/ideas/IdeasContent'

export const metadata: Metadata = {
  title: 'Ideas',
}

// ideas.json is local-only and not committed — read at runtime
export const dynamic = 'force-dynamic'

export default async function IdeasPage() {
  let items: IdeaItem[] = []
  try {
    const { readDataFile } = await import('@/lib/studio-io')
    items = readDataFile<IdeaItem>('ideas')
  } catch {
    // file may not exist yet
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No ideas yet"
        description="Approve ideas from the studio to publish them here."
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Ideas</h1>
      <Suspense>
        <IdeasContent items={items} />
      </Suspense>
    </div>
  )
}
