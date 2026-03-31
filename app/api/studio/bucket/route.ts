import { readKB, writeKB, readDataFile, writeDataFile } from '@/lib/studio-io'
import type { NewsItem, IdeaItem, LearningItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface BucketBody {
  type: 'news' | 'ideas' | 'learning'
  id: string
  action: 'approve' | 'reject'
}

export async function POST(request: Request) {
  const body = (await request.json()) as BucketBody
  const { type, id, action } = body

  const kb = readKB()

  if (type === 'news') {
    const idx = kb.pending_news.findIndex((i) => i.id === id)
    if (idx === -1) return Response.json({ error: 'Item not found' }, { status: 404 })
    if (action === 'approve') {
      const item = kb.pending_news[idx]
      const existing = readDataFile<NewsItem>('news')
      writeDataFile('news', [...existing, item])
    }
    kb.pending_news.splice(idx, 1)
  } else if (type === 'ideas') {
    const idx = kb.pending_ideas.findIndex((i) => i.id === id)
    if (idx === -1) return Response.json({ error: 'Item not found' }, { status: 404 })
    if (action === 'approve') {
      const item = kb.pending_ideas[idx]
      const existing = readDataFile<IdeaItem>('ideas')
      writeDataFile('ideas', [...existing, item])
    }
    kb.pending_ideas.splice(idx, 1)
  } else {
    const idx = kb.pending_learning.findIndex((i) => i.id === id)
    if (idx === -1) return Response.json({ error: 'Item not found' }, { status: 404 })
    if (action === 'approve') {
      const item = kb.pending_learning[idx]
      const existing = readDataFile<LearningItem>('learning')
      writeDataFile('learning', [...existing, item])
    }
    kb.pending_learning.splice(idx, 1)
  }

  writeKB(kb)
  return Response.json({ ok: true })
}
