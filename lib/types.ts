// ─── Layout / Navigation ──────────────────────────────────────────────────────

export interface NavLink {
  label: string
  href: string
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export type SocialIconName = 'github' | 'mail' | 'linkedin' | 'x'

export interface SocialLink {
  label: string
  href: string
  icon: SocialIconName
}

export type StackCategory = 'frontend' | 'language' | 'runtime' | 'ai' | 'infra' | 'db'

export interface StackItem {
  name: string
  category: StackCategory
}

// ─── Content (populated in later phases) ─────────────────────────────────────

export interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  source_name: string
  published_at: string        // ISO 8601
  tags: string[]
  kb_source_ids: string[]
}

export interface IdeaItem {
  id: string
  title: string
  problem: string
  opportunity: string
  suggested_stack: string[]
  tags: string[]
  generated_at: string        // ISO 8601
  kb_source_ids: string[]
}

export interface LearningResource {
  title: string
  url: string
  type: 'article' | 'video' | 'repo'
}

export interface LearningItem {
  id: string
  topic: string
  rationale: string
  resources: LearningResource[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_hours: number
  tags: string[]
  generated_at: string        // ISO 8601
  kb_source_ids: string[]
}
