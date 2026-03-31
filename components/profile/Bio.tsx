import { OWNER } from '@/lib/constants'

export function Bio() {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
        About
      </h2>
      <div className="space-y-4">
        {OWNER.bio.map((paragraph, i) => (
          <p key={i} className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  )
}
