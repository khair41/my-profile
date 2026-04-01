'use client'

import { useEffect, useState } from 'react'
import type {
  SourcesConfig,
  RssFeedEntry,
  YoutubeEntry,
  ManualUrlEntry,
} from '@/app/api/studio/sources/route'

// ── helpers ──────────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        enabled ? 'bg-accent' : 'bg-zinc-700',
      ].join(' ')}
      aria-label={enabled ? 'Disable' : 'Enable'}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5',
          enabled ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      <span className="text-xs text-zinc-500">{count} source{count !== 1 ? 's' : ''}</span>
    </div>
  )
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-zinc-600 hover:text-red-400 transition-colors text-xs px-1"
      title="Remove"
    >
      ✕
    </button>
  )
}

// ── RSS section ───────────────────────────────────────────────────────────────

function RssSection({
  feeds,
  onChange,
}: {
  feeds: RssFeedEntry[]
  onChange: (feeds: RssFeedEntry[]) => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  function toggle(i: number) {
    const next = feeds.map((f, idx) => (idx === i ? { ...f, enabled: !f.enabled } : f))
    onChange(next)
  }

  function remove(i: number) {
    onChange(feeds.filter((_, idx) => idx !== i))
  }

  function add() {
    if (!name.trim() || !url.trim()) return
    onChange([...feeds, { name: name.trim(), url: url.trim(), enabled: true }])
    setName('')
    setUrl('')
  }

  return (
    <div className="space-y-2">
      {feeds.map((f, i) => (
        <div key={i} className="flex items-center gap-3 group">
          <Toggle enabled={f.enabled} onChange={() => toggle(i)} />
          <div className="flex-1 min-w-0">
            <span className={['text-sm', f.enabled ? 'text-zinc-200' : 'text-zinc-600'].join(' ')}>
              {f.name}
            </span>
            <span className="ml-2 text-xs text-zinc-600 truncate">{f.url}</span>
          </div>
          <DeleteButton onClick={() => remove(i)} />
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Feed name"
          className="flex-1 min-w-0 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/feed"
          className="flex-[2] min-w-0 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
        />
        <button
          onClick={add}
          disabled={!name.trim() || !url.trim()}
          className="text-xs px-3 py-1.5 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ── YouTube section ───────────────────────────────────────────────────────────

function YoutubeSection({
  channels,
  onChange,
}: {
  channels: YoutubeEntry[]
  onChange: (channels: YoutubeEntry[]) => void
}) {
  const [name, setName] = useState('')
  const [channelId, setChannelId] = useState('')
  const [maxVideos, setMaxVideos] = useState('3')

  function toggle(i: number) {
    const next = channels.map((ch, idx) => (idx === i ? { ...ch, enabled: !ch.enabled } : ch))
    onChange(next)
  }

  function remove(i: number) {
    onChange(channels.filter((_, idx) => idx !== i))
  }

  function add() {
    if (!name.trim() || !channelId.trim()) return
    onChange([
      ...channels,
      {
        name: name.trim(),
        channel_id: channelId.trim(),
        max_videos: Math.max(1, parseInt(maxVideos) || 3),
        enabled: true,
      },
    ])
    setName('')
    setChannelId('')
    setMaxVideos('3')
  }

  return (
    <div className="space-y-2">
      {channels.map((ch, i) => (
        <div key={i} className="flex items-center gap-3 group">
          <Toggle enabled={ch.enabled} onChange={() => toggle(i)} />
          <div className="flex-1 min-w-0">
            <span
              className={['text-sm', ch.enabled ? 'text-zinc-200' : 'text-zinc-600'].join(' ')}
            >
              {ch.name}
            </span>
            <span className="ml-2 text-xs text-zinc-600">{ch.channel_id}</span>
          </div>
          <span className="text-xs text-zinc-500 shrink-0">{ch.max_videos} videos</span>
          <DeleteButton onClick={() => remove(i)} />
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Channel name"
          className="flex-1 min-w-0 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
        />
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="Channel ID"
          className="flex-[2] min-w-0 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
        />
        <input
          value={maxVideos}
          onChange={(e) => setMaxVideos(e.target.value)}
          type="number"
          min="1"
          max="20"
          className="w-16 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
        />
        <button
          onClick={add}
          disabled={!name.trim() || !channelId.trim()}
          className="text-xs px-3 py-1.5 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ── GitHub section ────────────────────────────────────────────────────────────

function GithubSection({
  github,
  onChange,
}: {
  github: SourcesConfig['github']
  onChange: (g: SourcesConfig['github']) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Toggle enabled={github.enabled} onChange={(v) => onChange({ ...github, enabled: v })} />
        <span className={['text-sm', github.enabled ? 'text-zinc-200' : 'text-zinc-600'].join(' ')}>
          GitHub Trending
        </span>
      </div>
      <div className="flex gap-3 pl-12">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Max repos
          <input
            type="number"
            min="5"
            max="50"
            value={github.max_repos}
            onChange={(e) => onChange({ ...github, max_repos: parseInt(e.target.value) || 25 })}
            className="w-16 bg-zinc-800 text-zinc-200 rounded px-2 py-1 border border-zinc-700 focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Language
          <input
            value={github.language}
            onChange={(e) => onChange({ ...github, language: e.target.value })}
            placeholder="any"
            className="w-24 bg-zinc-800 text-zinc-200 rounded px-2 py-1 border border-zinc-700 focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Since
          <select
            value={github.since}
            onChange={(e) => onChange({ ...github, since: e.target.value })}
            className="bg-zinc-800 text-zinc-200 rounded px-2 py-1 border border-zinc-700 focus:border-accent focus:outline-none"
          >
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
        </label>
      </div>
    </div>
  )
}

// ── Manual URLs section ───────────────────────────────────────────────────────

function ManualSection({
  urls,
  onChange,
}: {
  urls: ManualUrlEntry[]
  onChange: (urls: ManualUrlEntry[]) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  function toggle(i: number) {
    const next = urls.map((u, idx) => (idx === i ? { ...u, enabled: !u.enabled } : u))
    onChange(next)
  }

  function remove(i: number) {
    onChange(urls.filter((_, idx) => idx !== i))
    if (expanded === i) setExpanded(null)
  }

  function add() {
    if (!url.trim()) return
    onChange([
      ...urls,
      {
        url: url.trim(),
        title: title.trim() || undefined,
        category: category.trim() || undefined,
        notes: notes.trim() || undefined,
        enabled: true,
      },
    ])
    setUrl('')
    setTitle('')
    setCategory('')
    setNotes('')
  }

  return (
    <div className="space-y-2">
      {urls.map((u, i) => (
        <div key={i} className="rounded border border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <Toggle enabled={u.enabled} onChange={() => toggle(i)} />
            <div className="flex-1 min-w-0">
              <span
                className={['text-sm truncate block', u.enabled ? 'text-zinc-200' : 'text-zinc-600'].join(' ')}
              >
                {u.title ?? u.url}
              </span>
              {u.title && <span className="text-xs text-zinc-600 truncate block">{u.url}</span>}
            </div>
            {u.category && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300 shrink-0">
                {u.category}
              </span>
            )}
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Details"
            >
              {expanded === i ? '▲' : '▼'}
            </button>
            <DeleteButton onClick={() => remove(i)} />
          </div>
          {expanded === i && (
            <div className="px-3 pb-3 text-xs text-zinc-500 space-y-1 border-t border-zinc-800 pt-2">
              <div><span className="text-zinc-600">URL: </span>{u.url}</div>
              {u.notes && <div><span className="text-zinc-600">Notes: </span>{u.notes}</div>}
            </div>
          )}
        </div>
      ))}
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="flex-[3] min-w-0 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="flex-[2] min-w-0 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="flex-1 min-w-0 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="flex-[2] min-w-0 bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 border border-zinc-700 focus:border-accent focus:outline-none"
          />
          <button
            onClick={add}
            disabled={!url.trim()}
            className="text-xs px-3 py-1.5 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function SourcesPanel() {
  const [config, setConfig] = useState<SourcesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/studio/sources')
      setConfig((await res.json()) as SourcesConfig)
    } finally {
      setLoading(false)
    }
  }

  async function save(next: SourcesConfig) {
    setSaving(true)
    try {
      await fetch('/api/studio/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      setSavedAt(new Date().toLocaleTimeString())
    } finally {
      setSaving(false)
    }
  }

  function update(next: SourcesConfig) {
    setConfig(next)
    void save(next)
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading || !config) {
    return <div className="py-16 text-center text-zinc-500 text-sm">Loading sources…</div>
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Save status */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Changes are saved automatically to <code className="text-zinc-400">sources/</code> on
          each edit.
        </p>
        <span className="text-xs text-zinc-600">
          {saving ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : ''}
        </span>
      </div>

      {/* RSS */}
      <div>
        <SectionHeader title="RSS Feeds" count={config.rss_feeds.length} />
        <RssSection
          feeds={config.rss_feeds}
          onChange={(rss_feeds) => update({ ...config, rss_feeds })}
        />
      </div>

      <div className="border-t border-zinc-800" />

      {/* YouTube */}
      <div>
        <SectionHeader title="YouTube Channels" count={config.youtube_channels.length} />
        <YoutubeSection
          channels={config.youtube_channels}
          onChange={(youtube_channels) => update({ ...config, youtube_channels })}
        />
      </div>

      <div className="border-t border-zinc-800" />

      {/* GitHub */}
      <div>
        <SectionHeader title="GitHub Trending" count={1} />
        <GithubSection
          github={config.github}
          onChange={(github) => update({ ...config, github })}
        />
      </div>

      <div className="border-t border-zinc-800" />

      {/* Manual URLs */}
      <div>
        <SectionHeader title="Manual URLs" count={config.manual_urls.length} />
        <ManualSection
          urls={config.manual_urls}
          onChange={(manual_urls) => update({ ...config, manual_urls })}
        />
      </div>
    </div>
  )
}
