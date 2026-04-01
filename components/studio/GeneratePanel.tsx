'use client'

import { useState } from 'react'

type GenerateMode = 'news' | 'ideas' | 'learning' | 'all'
type PipelineStep = 'crawl' | 'digest'

interface Result {
  label: string
  ok: boolean
  output: string
}

const GENERATE_MODES: { mode: GenerateMode; label: string }[] = [
  { mode: 'news', label: 'News' },
  { mode: 'ideas', label: 'Ideas' },
  { mode: 'learning', label: 'Learning' },
  { mode: 'all', label: 'All' },
]

const PIPELINE_STEPS: { step: PipelineStep; label: string }[] = [
  { step: 'crawl', label: 'Crawl' },
  { step: 'digest', label: 'Digest' },
]

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

export function GeneratePanel() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Result[]>([])

  async function runStep(step: PipelineStep) {
    setRunning(true)
    try {
      const res = await fetch(`/api/studio/${step}`, { method: 'POST' })
      const data = (await res.json()) as { ok: boolean; stdout: string; stderr: string }
      const output = data.ok
        ? data.stdout.trim().split('\n').at(-1) ?? 'Done'
        : data.stderr.trim().split('\n').at(-1) ?? 'Error'
      setResults((prev) => [{ label: step, ok: data.ok, output }, ...prev])
    } catch (e) {
      setResults((prev) => [
        { label: step, ok: false, output: e instanceof Error ? e.message : 'Unknown error' },
        ...prev,
      ])
    } finally {
      setRunning(false)
    }
  }

  async function runGenerate(mode: GenerateMode) {
    setRunning(true)
    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const data = (await res.json()) as { ok: boolean; stdout: string; stderr: string }
      const output = data.ok
        ? data.stdout.trim().split('\n').at(-1) ?? 'Done'
        : data.stderr.trim().split('\n').at(-1) ?? 'Error'
      setResults((prev) => [{ label: mode, ok: data.ok, output }, ...prev])
    } catch (e) {
      setResults((prev) => [
        { label: mode, ok: false, output: e instanceof Error ? e.message : 'Unknown error' },
        ...prev,
      ])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Pipeline section */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pipeline</p>
        <div className="grid grid-cols-2 gap-3">
          {PIPELINE_STEPS.map(({ step, label }) => (
            <button
              key={step}
              onClick={() => void runStep(step)}
              disabled={running}
              className={[
                'px-4 py-3 rounded-lg border text-sm font-medium transition-colors',
                'border-zinc-700 text-zinc-300 hover:bg-zinc-800',
                running ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  {label}
                </span>
              ) : (
                label
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Generate section */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Generate</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GENERATE_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => void runGenerate(mode)}
              disabled={running}
              className={[
                'px-4 py-3 rounded-lg border text-sm font-medium transition-colors',
                mode === 'all'
                  ? 'border-accent/50 text-accent hover:bg-accent/10'
                  : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800',
                running ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  {label}
                </span>
              ) : (
                label
              )}
            </button>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={[
                'rounded-lg px-3 py-2 text-sm font-mono',
                r.ok
                  ? 'bg-green-500/5 border border-green-500/20 text-green-400'
                  : 'bg-red-500/5 border border-red-500/20 text-red-400',
              ].join(' ')}
            >
              <span className="text-zinc-500 mr-2">[{r.label}]</span>
              {r.output}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
