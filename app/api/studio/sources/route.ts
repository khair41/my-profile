import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

export const dynamic = 'force-dynamic'

const CONFIG_PATH = path.join(process.cwd(), 'sources', 'config.yaml')
const MANUAL_PATH = path.join(process.cwd(), 'sources', 'manual.yaml')

export interface RssFeedEntry {
  name: string
  url: string
  enabled: boolean
}

export interface YoutubeEntry {
  channel_id: string
  name: string
  max_videos: number
  enabled: boolean
}

export interface GithubEntry {
  enabled: boolean
  max_repos: number
  language: string
  since: string
}

export interface ManualUrlEntry {
  url: string
  title?: string
  category?: string
  notes?: string
  enabled: boolean
}

export interface SourcesConfig {
  request_delay: number
  rss_feeds: RssFeedEntry[]
  youtube_channels: YoutubeEntry[]
  github: GithubEntry
  manual_urls: ManualUrlEntry[]
}

function readSources(): SourcesConfig {
  const raw = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) as Record<string, unknown>

  const ghRaw = (raw.github ?? {}) as Record<string, unknown>

  const manualRaw = fs.existsSync(MANUAL_PATH)
    ? (yaml.load(fs.readFileSync(MANUAL_PATH, 'utf8')) as Record<string, unknown> | null) ?? {}
    : {}
  const manualEntries = ((manualRaw.urls ?? []) as Array<Record<string, unknown>>).map((e) => ({
    url: String(e.url ?? ''),
    title: e.title != null ? String(e.title) : undefined,
    category: e.category != null ? String(e.category) : undefined,
    notes: e.notes != null ? String(e.notes) : undefined,
    enabled: e.enabled !== false,
  }))

  return {
    request_delay: Number(raw.request_delay ?? 1.0),
    rss_feeds: ((raw.rss_feeds ?? []) as Array<Record<string, unknown>>).map((f) => ({
      name: String(f.name ?? ''),
      url: String(f.url ?? ''),
      enabled: f.enabled !== false,
    })),
    youtube_channels: ((raw.youtube_channels ?? []) as Array<Record<string, unknown>>).map((ch) => ({
      channel_id: String(ch.channel_id ?? ''),
      name: String(ch.name ?? ''),
      max_videos: Number(ch.max_videos ?? 3),
      enabled: ch.enabled !== false,
    })),
    github: {
      enabled: ghRaw.enabled !== false,
      max_repos: Number(ghRaw.max_repos ?? 25),
      language: String(ghRaw.language ?? ''),
      since: String(ghRaw.since ?? 'daily'),
    },
    manual_urls: manualEntries,
  }
}

function writeSources(config: SourcesConfig): void {
  // Write config.yaml (preserve comments is not possible with js-yaml; structure is maintained)
  const configData = {
    request_delay: config.request_delay,
    rss_feeds: config.rss_feeds,
    youtube_channels: config.youtube_channels,
    github: config.github,
  }
  const configYaml = yaml.dump(configData, { lineWidth: 120 })
  const configTmp = CONFIG_PATH + '.tmp'
  fs.writeFileSync(configTmp, configYaml, 'utf8')
  fs.renameSync(configTmp, CONFIG_PATH)

  // Write manual.yaml
  const manualData = { urls: config.manual_urls.length > 0 ? config.manual_urls : [] }
  const manualHeader =
    '# One-off URLs to crawl.\n' +
    '# Add entries as needed — an empty list produces no error.\n' +
    '#\n' +
    '# Full format:\n' +
    '#   urls:\n' +
    '#     - url: "https://example.com/some-article"\n' +
    '#       title: "Optional override title"   # omit to use the page\'s <title>\n' +
    '#       category: "AI"                     # optional label for organisation\n' +
    '#       notes: "Why I added this"          # optional reminder to yourself\n' +
    '#       enabled: true                      # set false to skip without deleting\n' +
    '#\n'
  const manualYaml = manualHeader + yaml.dump(manualData, { lineWidth: 120 })
  const manualTmp = MANUAL_PATH + '.tmp'
  fs.writeFileSync(manualTmp, manualYaml, 'utf8')
  fs.renameSync(manualTmp, MANUAL_PATH)
}

export function GET() {
  if (process.env.STUDIO_ENABLED !== 'true') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return Response.json(readSources())
}

export async function POST(req: NextRequest) {
  if (process.env.STUDIO_ENABLED !== 'true') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = (await req.json()) as SourcesConfig
  writeSources(body)
  return Response.json({ ok: true })
}
