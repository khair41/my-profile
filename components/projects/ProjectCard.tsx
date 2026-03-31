import Image from 'next/image'
import type { Project } from '@/lib/projects'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex flex-col">
      {project.screenshot && (
        <div className="relative h-40 w-full bg-zinc-100 dark:bg-zinc-900">
          <Image
            src={project.screenshot}
            alt={project.name}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">{project.name}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-1">{project.description}</p>
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm text-accent hover:underline"
        >
          View project →
        </a>
      </div>
    </div>
  )
}
