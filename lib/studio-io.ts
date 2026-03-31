import fs from 'fs'
import path from 'path'
import type { NewsItem, IdeaItem, LearningItem } from './types'

// ─── KB types (mirror pipeline/utils/schemas.py) ─────────────────────────────

export interface RawArticle {
  id: string
  url: string
  title: string
  body: string
  source_name: string
  source_type: 'rss' | 'github' | 'youtube' | 'manual'
  fetched_at: string
  status: 'pending_review' | 'processed' | 'rejected' | 'error'
  summary?: string
  tags: string[]
  relevance_score?: number
}

export interface KnowledgeBase {
  items: RawArticle[]
  pending_news: NewsItem[]
  pending_ideas: IdeaItem[]
  pending_learning: LearningItem[]
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data')
const KB_PATH = path.join(DATA_DIR, 'knowledge-base.json')

// ─── KB I/O ───────────────────────────────────────────────────────────────────

export function readKB(): KnowledgeBase {
  const raw = fs.readFileSync(KB_PATH, 'utf-8')
  return JSON.parse(raw) as KnowledgeBase
}

export function writeKB(kb: KnowledgeBase): void {
  const tmp = KB_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(kb, null, 2), 'utf-8')
  fs.renameSync(tmp, KB_PATH)
}

// ─── Data file I/O ────────────────────────────────────────────────────────────

type DataFileName = 'news' | 'ideas' | 'learning'

export function readDataFile<T>(name: DataFileName): T[] {
  const p = path.join(DATA_DIR, `${name}.json`)
  if (!fs.existsSync(p)) return []
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T[]
}

export function writeDataFile<T>(name: DataFileName, items: T[]): void {
  const p = path.join(DATA_DIR, `${name}.json`)
  const tmp = p + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf-8')
  fs.renameSync(tmp, p)
}
