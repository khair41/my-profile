import Link from 'next/link'
import { NAV_LINKS, IDEAS_NAV_LINK, OWNER } from '@/lib/constants'
import { NavLinks } from './NavLinks'
import type { NavLink } from '@/lib/types'

export function Nav() {
  const links: NavLink[] = process.env.IDEAS_ENABLED === '1'
    ? [...NAV_LINKS, IDEAS_NAV_LINK]
    : [...NAV_LINKS]

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-accent transition-colors"
        >
          {OWNER.name}
        </Link>
        <NavLinks links={links} />
      </div>
    </header>
  )
}
