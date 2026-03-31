import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  if (process.env.STUDIO_ENABLED !== 'true') redirect('/')

  return (
    <>
      <div className="border-b border-yellow-500/20 bg-yellow-500/5">
        <div className="max-w-4xl mx-auto px-4 h-9 flex items-center gap-2">
          <span className="text-xs font-mono text-yellow-400 uppercase tracking-widest">
            Studio
          </span>
          <span className="text-xs text-zinc-600">— local only</span>
        </div>
      </div>
      {children}
    </>
  )
}
