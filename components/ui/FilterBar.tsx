interface FilterBarProps {
  allTags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  search: string
  onSearch: (q: string) => void
  resultCount: number
  totalCount: number
}

export function FilterBar({
  allTags,
  selectedTags,
  onToggleTag,
  search,
  onSearch,
  resultCount,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="mb-6 space-y-3">
      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => {
            const active = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
                  active
                    ? 'bg-accent text-white'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}
      {resultCount !== totalCount && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Showing {resultCount} of {totalCount} items
        </p>
      )}
    </div>
  )
}
