import { execFile } from 'child_process'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execFileAsync = promisify(execFile)

interface GenerateBody {
  mode: 'news' | 'ideas' | 'learning' | 'all'
}

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateBody
  const { mode } = body

  try {
    const { stdout, stderr } = await execFileAsync(
      'python3',
      ['pipeline/run.py', '--generate', mode],
      {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONPATH: '.' },
        timeout: 120_000,
      },
    )
    return Response.json({ ok: true, stdout, stderr })
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    return Response.json(
      { ok: false, stdout: e.stdout ?? '', stderr: e.stderr ?? e.message ?? 'Unknown error' },
      { status: 500 },
    )
  }
}
