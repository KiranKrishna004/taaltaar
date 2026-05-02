'use client'

import { useState, useMemo } from 'react'
import { Song } from '@/types'
import SongCard from './SongCard'
import SearchBar from './SearchBar'
import FilterBar from './FilterBar'

type Filter = 'all' | 'tamil' | 'malayalam' | 'beginner' | 'intermediate' | 'advanced'

interface Props { songs: Song[] }

export default function HomeClient({ songs }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    return songs.filter(song => {
      const matchesQuery = !query || [song.title, song.film, song.composer]
        .join(' ').toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'all' || song.language === filter || song.difficulty === filter
      return matchesQuery && matchesFilter
    })
  }, [songs, query, filter])

  return (
    <div className="space-y-5">
      <SearchBar onSearch={setQuery} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <FilterBar active={filter} onChange={setFilter} />
        {filtered.length < songs.length && (
          <span className="text-xs text-zinc-600">
            {filtered.length} of {songs.length} songs
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🎸</div>
          <p className="text-zinc-400 font-medium">No songs found</p>
          <p className="text-zinc-600 text-sm mt-1.5">Try a different search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(song => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  )
}
