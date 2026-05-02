import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Song } from '@/types'
import Leaderboard from '@/components/Leaderboard'
import RecordingFeed from '@/components/RecordingFeed'
import PracticeArea from '@/components/PracticeArea'
import TabExtractButton from '@/components/TabExtractButton'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

const difficultyConfig = {
  beginner:     { label: 'Beginner',     variant: 'emerald' as const, dots: 1 },
  intermediate: { label: 'Intermediate', variant: 'amber'   as const, dots: 2 },
  advanced:     { label: 'Advanced',     variant: 'red'     as const, dots: 3 },
}

const languageConfig = {
  tamil:     { label: 'Tamil',     variant: 'orange' as const, hero: 'from-orange-900/20 via-zinc-900/0 to-transparent' },
  malayalam: { label: 'Malayalam', variant: 'green'  as const, hero: 'from-green-900/20 via-zinc-900/0 to-transparent'  },
}

export default async function SongPage({ params }: Props) {
  const { id } = await params
  const supabase = createServerSupabaseClient()

  const { data: song } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single()

  if (!song) notFound()

  await supabase
    .from('songs')
    .update({ play_count: (song.play_count || 0) + 1 })
    .eq('id', song.id)

  const s = song as Song
  const lang = languageConfig[s.language]
  const diff = difficultyConfig[s.difficulty]

  return (
    <div className="w-full">
      {/* Hero header */}
      <div className={`relative border-b border-zinc-800/60 bg-gradient-to-br ${lang.hero}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#09090b]/60 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-8 pb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to songs
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant={lang.variant}>{lang.label}</Badge>
                <Badge variant={diff.variant} className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {[1, 2, 3].map(i => (
                      <span key={i} className={`w-1 h-1 rounded-full ${i <= diff.dots ? 'bg-current' : 'bg-current opacity-20'}`} />
                    ))}
                  </span>
                  {diff.label}
                </Badge>
              </div>

              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">{s.title}</h1>
              <p className="text-zinc-300 text-lg mb-1">{s.film}</p>
              <p className="text-zinc-500 text-sm">by {s.composer}</p>
            </div>

            {/* Stats */}
            <div className="flex sm:flex-col gap-4 sm:gap-4 sm:text-right shrink-0">
              <div className="flex sm:flex-row-reverse items-center gap-2 text-sm text-zinc-500">
                <span>🎵</span>
                <span><span className="text-white font-semibold">{s.bpm}</span> BPM</span>
              </div>
              <div className="flex sm:flex-row-reverse items-center gap-2 text-sm text-zinc-500">
                <span>👁</span>
                <span><span className="text-white font-semibold">{s.play_count}</span> plays</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* Practice section */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-base font-semibold text-white">Practice</h2>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">Real-time pitch detection</span>
          </div>
          <PracticeArea song={s} />
        </section>

        {/* Tab extraction (developer tool) */}
        {s.youtube_url && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-base font-semibold text-white">Tab Extraction</h2>
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-600">Developer tool</span>
            </div>
            <TabExtractButton songId={s.id} />
          </section>
        )}

        {/* Leaderboard + Community */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <span className="text-base">🏆</span>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Leaderboard songId={s.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <span className="text-base">🎵</span>
              <CardTitle>Community Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <RecordingFeed songId={s.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
