import { STACK } from '@/lib/constants'
import type { StackCategory } from '@/lib/types'

const CATEGORY_LABELS: Record<StackCategory, string> = {
  frontend: 'Frontend',
  language: 'Languages',
  runtime: 'Runtime',
  ai: 'AI / ML',
  infra: 'Infrastructure',
  db: 'Database',
}

const CATEGORY_COLORS: Record<StackCategory, string> = {
  frontend: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  language: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  runtime: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  ai: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  infra: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  db: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

export function Stack() {
  const categories = [...new Set(STACK.map((item) => item.category))] as StackCategory[]

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
        Stack
      </h2>
      <div className="space-y-4">
        {categories.map((category) => {
          const items = STACK.filter((item) => item.category === category)
          return (
            <div key={category} className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 w-20 shrink-0">
                {CATEGORY_LABELS[category]}
              </span>
              {items.map((item) => (
                <span
                  key={item.name}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[category]}`}
                >
                  {item.name}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
