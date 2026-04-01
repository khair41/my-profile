import { execFile } from 'child_process'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const execFileAsync = promisify(execFile)

export async function POST() {
  if (process.env.STUDIO_ENABLED !== 'true') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      'python3',
      ['pipeline/run.py', '--crawl'],
      {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONPATH: '.' },
        timeout: 300_000,
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
