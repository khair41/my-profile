interface EmptyStateProps {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-xl font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">{description}</p>
      )}
    </div>
  )
}
