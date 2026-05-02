import { createServerSupabaseClient } from '@/lib/supabase-server'
import StreakBanner from '@/components/StreakBanner'
import BadgeDisplay from '@/components/BadgeDisplay'
import HomeClient from '@/components/HomeClient'
import { Song } from '@/types'
import { LANGUAGE_CONFIG } from '@/lib/languageConfig'

export const revalidate = 60

export default async function HomePage() {
  const supabase = createServerSupabaseClient()

  const { data: songs } = await supabase
    .from('songs')
    .select('*')
    .order('play_count', { ascending: false })

  const allSongs = (songs as Song[]) || []
  const langCounts = allSongs.reduce<Record<string, number>>((acc, s) => {
    if (s.language) acc[s.language] = (acc[s.language] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-10">

      {/* Hero */}
      <div className="relative mb-12 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 -top-10 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-40 bg-amber-500/8 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-xs text-amber-400 font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Interactive Guitar Learning
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text">TaalTaar</span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-md mx-auto leading-relaxed">
            Learn Tamil & Malayalam film songs on guitar — with real-time pitch detection
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-7 text-sm flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{allSongs.length}</div>
              <div className="text-zinc-500 text-xs mt-0.5">Songs</div>
            </div>
            {Object.entries(langCounts).map(([lang, count]) => {
              const cfg = LANGUAGE_CONFIG[lang]
              if (!cfg) return null
              return (
                <div key={lang} className="contents">
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${cfg.statText}`}>{count}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">{cfg.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Streak + badges */}
      <div className="mb-8 space-y-3">
        <StreakBanner />
        <BadgeDisplay />
      </div>

      {/* Song grid with search/filter */}
      <HomeClient songs={allSongs} />
    </div>
  )
}
