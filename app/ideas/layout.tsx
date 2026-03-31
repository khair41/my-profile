import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function IdeasLayout({ children }: { children: React.ReactNode }) {
  if (process.env.IDEAS_ENABLED !== 'true') redirect('/')
  return <>{children}</>
}
