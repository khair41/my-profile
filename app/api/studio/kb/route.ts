import { readKB } from '@/lib/studio-io'

export const dynamic = 'force-dynamic'

export function GET() {
  const kb = readKB()
  return Response.json({
    queue: kb.items
      .filter((i) => i.status === 'pending_review')
      .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)),
    pending_news: kb.pending_news,
    pending_ideas: kb.pending_ideas,
    pending_learning: kb.pending_learning,
  })
}
