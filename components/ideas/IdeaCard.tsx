import type { IdeaItem } from '@/lib/types'

export function IdeaCard({ item }: { item: IdeaItem }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
      <h2 className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}</h2>
      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-400 dark:text-zinc-500">Problem: </span>
        {item.problem}
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-400 dark:text-zinc-500">Opportunity: </span>
        {item.opportunity}
      </p>
      {item.suggested_stack.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {item.suggested_stack.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
