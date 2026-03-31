export interface Project {
  id: string
  name: string
  description: string
  url: string
  tags: string[]
  screenshot?: string // optional path under /public, e.g. '/projects/foo.png'
}

export const PROJECTS: Project[] = [
  {
    id: 'my-profile',
    name: 'Personal Site + AI Engine',
    description:
      'Next.js personal profile with a local Python/Ollama pipeline that crawls, summarises, and generates dev/AI content — reviewed through a private studio interface before publishing.',
    url: 'https://github.com/kmzsz/my-profile',
    tags: ['Next.js', 'TypeScript', 'Python', 'Ollama', 'Tailwind'],
  },
]
