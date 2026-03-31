import type { LearningItem } from '@/lib/types'

const difficultyColour = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
} as const

const resourceIcon = {
  article: '📄',
  video: '🎥',
  repo: '📦',
} as const

export function LearningCard({ item }: { item: LearningItem }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">{item.topic}</h2>
        <div className="shrink-0 flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColour[item.difficulty]}`}
          >
            {item.difficulty}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-600">{item.estimated_hours}h</span>
        </div>
      </div>
      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{item.rationale}</p>
      {item.resources.length > 0 && (
        <ul className="mt-3 space-y-1">
          {item.resources.map((r, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="text-sm">{resourceIcon[r.type] ?? '🔗'}</span>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {r.title}
              </a>
            </li>
          ))}
        </ul>
      )}
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
