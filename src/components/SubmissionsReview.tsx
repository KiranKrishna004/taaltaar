'use client'

import { useState, useEffect } from 'react'
import SubmissionPreview from './SubmissionPreview'
import AudioPlayer from './AudioPlayer'

interface TabNote { time: number; string: number; fret: number; note: string; duration: number; midi?: number }
interface Submission {
  id: string
  song_name: string | null
  note_count: number
  status: string
  submitted_by: string | null
  created_at: string
  tab_data: TabNote[]
  audio_url: string | null
  vocal_url: string | null
  extraction_mode: string | null
}

type StatusFilter = 'pending' | 'approved'
type PreviewTab  = 'vocal' | 'melody'

export default function SubmissionsReview() {
  const [filter, setFilter]           = useState<StatusFilter>('pending')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)
  const [acting, setActing]           = useState<string | null>(null)
  const [extracting, setExtracting]   = useState<string | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState<Record<string, PreviewTab>>({})
  const [localData, setLocalData]     = useState<Record<string, Partial<Submission>>>({})

  async function load(status: StatusFilter = filter) {
    setLoading(true)
    const res  = await fetch(`/api/submissions?status=${status}`)
    const data = await res.json()
    setSubmissions(data.submissions ?? [])
    setLocalData({})
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  function merged(s: Submission): Submission {
    return { ...s, ...localData[s.id] }
  }

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id)
    await fetch(`/api/submissions/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActing(null)
    load(filter)
  }

  async function extractMelody(id: string) {
    setExtracting(id)
    setExtractError(null)
    setActiveTab(prev => ({ ...prev, [id]: 'vocal' }))
    try {
      const res  = await fetch(`/api/submissions/${id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'vocal' }),
      })
      const text = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(text) } catch { /* non-JSON body */ }
      if (!res.ok) throw new Error((data.error as string) ?? `extraction failed (${res.status}): ${text.slice(0, 200)}`)
      if (data.tabData) {
        setLocalData(prev => ({
          ...prev,
          [id]: { tab_data: data.tabData as TabNote[], note_count: data.noteCount as number, vocal_url: data.vocalUrl as string | null, extraction_mode: 'vocal' },
        }))
      }
    } catch (e) {
      setExtractError(String(e))
    }
    setExtracting(null)
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-zinc-300">Song Submissions</p>
          {/* Status filter tabs */}
          <div className="flex rounded-md border border-zinc-800 overflow-hidden">
            {(['pending', 'approved'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  filter === s
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {!loading && submissions.length > 0 && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-medium text-amber-400">
              {submissions.length}
            </span>
          )}
        </div>
        <button onClick={() => load(filter)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          Refresh
        </button>
      </div>

      {extractError && (
        <div className="px-4 py-3 border-b border-red-900/40 bg-red-950/20 flex items-start justify-between gap-3">
          <p className="text-xs text-red-400 font-mono break-all">{extractError}</p>
          <button onClick={() => setExtractError(null)} className="text-xs text-zinc-600 hover:text-zinc-400 shrink-0">Dismiss</button>
        </div>
      )}

      <div className="divide-y divide-zinc-800/60">
        {loading && (
          <div className="px-4 py-6 text-center">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin mx-auto" />
          </div>
        )}
        {!loading && submissions.length === 0 && (
          <div className="px-4 py-8 text-center space-y-1">
            <p className="text-sm text-zinc-500">No {filter} submissions</p>
            <p className="text-xs text-zinc-700">
              {filter === 'pending' ? 'New submissions from users will appear here' : 'Approved submissions will appear here'}
            </p>
          </div>
        )}

        {submissions.map(sub => {
          const s            = merged(sub)
          const hasTab       = s.tab_data && s.tab_data.length > 0
          const isExtracting = extracting === s.id
          const tab          = activeTab[s.id] ?? 'vocal'
          const isPending    = s.status === 'pending'

          return (
            <div key={s.id} className="p-4 space-y-3">

              {/* Title + actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{s.song_name ?? 'Untitled'}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {s.submitted_by ? ` · ${s.submitted_by}` : ''}
                    {hasTab ? ` · ${s.note_count} notes` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isPending && !hasTab && !isExtracting && (
                    <button
                      onClick={() => extractMelody(s.id)}
                      className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                    >
                      Extract melody
                    </button>
                  )}
                  {isExtracting && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <div className="w-3 h-3 rounded-full border-2 border-zinc-700 border-t-amber-400 animate-spin" />
                      Extracting…
                    </div>
                  )}

                  {/* Pending: approve + reject once tab exists */}
                  {isPending && hasTab && (
                    <>
                      <button
                        disabled={!!acting}
                        onClick={() => act(s.id, 'reject')}
                        className="rounded-md border border-red-900/50 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-40 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        disabled={acting === s.id}
                        onClick={() => act(s.id, 'approve')}
                        className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-40 transition-colors"
                      >
                        {acting === s.id ? '…' : 'Approve'}
                      </button>
                    </>
                  )}

                  {/* Approved: only reject (disapprove) */}
                  {!isPending && (
                    <button
                      disabled={acting === s.id}
                      onClick={() => act(s.id, 'reject')}
                      className="rounded-md border border-red-900/50 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-40 transition-colors"
                    >
                      {acting === s.id ? '…' : 'Disapprove'}
                    </button>
                  )}
                </div>
              </div>

              {/* Tabbed preview — shown once tab data exists */}
              {hasTab && (
                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                  <div className="flex border-b border-zinc-800">
                    {(['vocal', 'melody'] as PreviewTab[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveTab(prev => ({ ...prev, [s.id]: t }))}
                        className={`px-4 py-2 text-xs font-medium transition-colors ${
                          tab === t
                            ? 'text-zinc-200 border-b-2 border-amber-500 -mb-px bg-zinc-900/60'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {t === 'vocal' ? 'Extracted vocal' : 'Melody tab'}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-zinc-900/30">
                    {tab === 'vocal' && (
                      s.vocal_url
                        ? <AudioPlayer src={s.vocal_url} />
                        : <p className="text-xs text-zinc-600 py-1">Vocal stem not available</p>
                    )}
                    {tab === 'melody' && (
                      <SubmissionPreview tabData={s.tab_data} />
                    )}
                  </div>
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
