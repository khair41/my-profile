import { SOCIAL_LINKS } from '@/lib/constants'
import { SocialIcon } from '@/components/icons/SocialIcon'

export function SocialLinks() {
  return (
    <div className="flex items-center gap-4">
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          aria-label={link.label}
          target={link.href.startsWith('mailto:') ? undefined : '_blank'}
          rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <SocialIcon name={link.icon} size={18} />
          <span className="text-sm">{link.label}</span>
        </a>
      ))}
    </div>
  )
}
