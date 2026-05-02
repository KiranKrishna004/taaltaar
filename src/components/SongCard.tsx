import Link from 'next/link'
import { Song } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getLanguage } from '@/lib/languageConfig'
import { getDifficulty } from '@/lib/difficultyConfig'

export default function SongCard({ song }: { song: Song }) {
  const lang = getLanguage(song.language)
  const diff = getDifficulty(song.difficulty)

  return (
    <Link href={`/song/${song.id}`} className="group">
      <div className="relative bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300 card-hover hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 h-full">

        {/* Language accent bar */}
        <div className={cn('h-0.5 w-full opacity-60', lang.bar)} />

        {/* Language gradient wash */}
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none', lang.accent)} />

        <div className="relative p-6 flex flex-col gap-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-white transition-colors text-base leading-snug truncate ${lang.hoverText}`}>
                {song.title}
              </h3>
              <p className="text-zinc-400 text-sm mt-1 truncate">{song.film}</p>
              <p className="text-zinc-600 text-xs mt-1 truncate">by {song.composer}</p>
            </div>
            <Badge variant={lang.variant} className="shrink-0">{lang.label}</Badge>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between mt-auto pt-1">
            <Badge variant={diff.variant} className="flex items-center gap-1.5">
              <span className="flex gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn('w-1 h-1 rounded-full', i < diff.dots ? 'bg-current' : 'bg-current opacity-20')}
                  />
                ))}
              </span>
              {diff.label}
            </Badge>

            <div className="flex items-center gap-3 text-xs text-zinc-600">
              {song.bpm && <span><span className="text-zinc-400 font-medium">{song.bpm}</span> BPM</span>}
              {song.bpm && <span className="w-px h-3 bg-zinc-800" />}
              <span>{song.play_count} plays</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
