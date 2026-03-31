import { readKB, writeKB } from '@/lib/studio-io'

export const dynamic = 'force-dynamic'

interface ReviewBody {
  id: string
  action: 'approve' | 'reject'
}

export async function POST(request: Request) {
  const body = (await request.json()) as ReviewBody
  const { id, action } = body

  const kb = readKB()
  const item = kb.items.find((i) => i.id === id)
  if (!item) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  item.status = action === 'approve' ? 'processed' : 'rejected'
  writeKB(kb)

  return Response.json({ ok: true })
}
