'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import type { IdeaItem } from '@/lib/types'
import { IdeaCard } from './IdeaCard'
import { FilterBar } from '@/components/ui/FilterBar'
import { EmptyState } from '@/components/ui/EmptyState'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function IdeasContent({ items }: { items: IdeaItem[] }) {
  const prefersReduced = useReducedMotion()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState('')

  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) ?? []

  const filtered = items.filter((i) => {
    const matchesTags =
      selectedTags.length === 0 || selectedTags.some((t) => i.tags.includes(t))
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      i.title.toLowerCase().includes(q) ||
      i.problem.toLowerCase().includes(q) ||
      i.opportunity.toLowerCase().includes(q) ||
      i.tags.some((t) => t.toLowerCase().includes(q))
    return matchesTags && matchesSearch
  })

  const allTags = [...new Set(items.flatMap((i) => i.tags))].sort()

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag]
    const params = new URLSearchParams(searchParams.toString())
    if (next.length > 0) {
      params.set('tags', next.join(','))
    } else {
      params.delete('tags')
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <FilterBar
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        search={search}
        onSearch={setSearch}
        resultCount={filtered.length}
        totalCount={items.length}
      />
      {filtered.length === 0 ? (
        <EmptyState title="No results" description="Try adjusting your search or filters." />
      ) : (
        <motion.ul
          variants={prefersReduced ? undefined : container}
          initial={prefersReduced ? false : 'hidden'}
          animate="show"
          className="space-y-4"
        >
          {filtered.map((i) => (
            <motion.li key={i.id} variants={prefersReduced ? undefined : item}>
              <IdeaCard item={i} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </>
  )
}
