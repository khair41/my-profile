import Image from 'next/image'
import { OWNER, SOCIAL_LINKS } from '@/lib/constants'
import { SocialIcon } from '@/components/icons/SocialIcon'

export function Hero() {
  const github = SOCIAL_LINKS.find((l) => l.icon === 'github')

  return (
    <section className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <div className="relative w-20 h-20 shrink-0">
        <Image
          src={OWNER.avatarUrl}
          alt={OWNER.name}
          fill
          sizes="80px"
          className="rounded-full object-cover"
          priority
        />
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {OWNER.name}
        </h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          {OWNER.tagline}
        </p>
        {OWNER.location && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {OWNER.location}
          </p>
        )}
        {github && (
          <div className="mt-4 flex items-center gap-3">
            <a
              href={github.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              <SocialIcon name="github" size={16} />
              GitHub
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
