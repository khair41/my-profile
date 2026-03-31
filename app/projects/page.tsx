import type { Metadata } from 'next'
import { PROJECTS } from '@/lib/projects'
import { ProjectCard } from '@/components/projects/ProjectCard'

export const metadata: Metadata = {
  title: 'Projects',
}

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Projects</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  )
}
