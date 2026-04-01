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
