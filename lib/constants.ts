import type { NavLink, SocialLink, StackItem } from './types'

// ─── Owner ────────────────────────────────────────────────────────────────────

export const OWNER = {
  name: 'Khair Martinez',
  tagline: 'Building full-stack products and AI-powered tools.',
  bio: [
    "I'm a software engineer focused on the intersection of product and AI. I build systems that are fast, observable, and designed to last.",
    'My current work centres on local LLM pipelines, developer tooling, and full-stack web applications. I care about good defaults and clean abstractions.',
    'Outside of engineering I follow the latest in AI research, open-source infrastructure, and early-stage startups.',
  ],
  avatarUrl: '/avatar.png',          // replace with your photo in public/
  location: 'Mexico City, Mexico', // optional
} as const

// ─── Site metadata ─────────────────────────────────────────────────────────────

export const SITE = {
  title: `${OWNER.name} — Engineer & Builder`,
  description: OWNER.tagline,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://my-profile-1h96.vercel.app/',
} as const

// ─── Navigation ───────────────────────────────────────────────────────────────

export const NAV_LINKS: NavLink[] = [
  { label: 'Profile',   href: '/' },
  { label: 'News',      href: '/news' },
  { label: 'Learning',  href: '/learning' },
  { label: 'Projects',  href: '/projects' },
  // /ideas is injected conditionally by Nav.tsx when IDEAS_ENABLED=true
]

export const IDEAS_NAV_LINK: NavLink = { label: 'Ideas', href: '/ideas' }

// ─── Social links ─────────────────────────────────────────────────────────────

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/khair41',     // ← update
    icon: 'github',
  },
  {
    label: 'Email',
    href: 'mailto:khair41ems@gmail.com',       // ← update
    icon: 'mail',
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/khair-martinez', // ← update or remove
    icon: 'linkedin',
  },
]

// ─── Tech stack ───────────────────────────────────────────────────────────────

export const STACK: StackItem[] = [
  { name: 'Next.js',     category: 'frontend' },
  { name: 'TypeScript',  category: 'language' },
  { name: 'Tailwind',    category: 'frontend' },
  { name: 'React',       category: 'frontend' },
  { name: 'Python',      category: 'language' },
  { name: 'Ollama',      category: 'ai' },
  { name: 'Node.js',     category: 'runtime' },
  { name: 'Vercel',      category: 'infra' },
]
