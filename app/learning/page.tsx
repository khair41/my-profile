import { Suspense } from 'react'
import type { Metadata } from 'next'
import type { LearningItem } from '@/lib/types'
import { LearningContent } from '@/components/learning/LearningContent'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'Learning',
}

// learning.json is local-only and not committed — read at runtime
export const dynamic = 'force-dynamic'

export default async function LearningPage() {
  let items: LearningItem[] = []
  try {
    const { readDataFile } = await import('@/lib/studio-io')
    items = readDataFile<LearningItem>('learning')
  } catch {
    // file may not exist yet
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No learning paths yet"
        description="Check back after the next pipeline run."
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Learning Paths</h1>
      <Suspense>
        <LearningContent items={items} />
      </Suspense>
    </div>
  )
}
