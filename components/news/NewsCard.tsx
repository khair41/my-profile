import type { NewsItem } from '@/lib/types'

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-accent transition-colors"
        >
          {item.title}
        </a>
        <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-600">
          {item.source_name}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{item.summary}</p>
      {item.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
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
