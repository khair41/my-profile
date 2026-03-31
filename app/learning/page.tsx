import { Suspense } from 'react'
import type { Metadata } from 'next'
import type { LearningItem } from '@/lib/types'
import learningData from '@/data/learning.json'
import { LearningContent } from '@/components/learning/LearningContent'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'Learning',
}

export default function LearningPage() {
  const items = learningData as LearningItem[]

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
