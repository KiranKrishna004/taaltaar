'use client'

import { Badge } from '@/types'

const STORAGE_KEY = 'taal_progress'

interface Progress {
  songsPracticed: Record<string, number> // songId -> best score
  lastPracticeDate: string | null
  streak: number
  totalNotesPlayed: number
  tamilCompleted: string[]  // song IDs with 50%+ score
  malayalamCompleted: string[]
}

function getProgress(): Progress {
  if (typeof window === 'undefined') return {
    songsPracticed: {},
    lastPracticeDate: null,
    streak: 0,
    totalNotesPlayed: 0,
    tamilCompleted: [],
    malayalamCompleted: [],
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return {
    songsPracticed: {},
    lastPracticeDate: null,
    streak: 0,
    totalNotesPlayed: 0,
    tamilCompleted: [],
    malayalamCompleted: [],
  }
  return JSON.parse(stored)
}

function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

export function recordPractice(
  songId: string,
  score: number,
  notesPlayed: number,
  language: 'tamil' | 'malayalam'
) {
  const p = getProgress()

  // Update best score
  if (!p.songsPracticed[songId] || p.songsPracticed[songId] < score) {
    p.songsPracticed[songId] = score
  }

  // Update completed lists
  if (score >= 50) {
    if (language === 'tamil' && !p.tamilCompleted.includes(songId)) {
      p.tamilCompleted.push(songId)
    }
    if (language === 'malayalam' && !p.malayalamCompleted.includes(songId)) {
      p.malayalamCompleted.push(songId)
    }
  }

  // Update streak
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  if (p.lastPracticeDate === today) {
    // already practiced today, no change
  } else if (p.lastPracticeDate === yesterday) {
    p.streak += 1
  } else {
    p.streak = 1
  }
  p.lastPracticeDate = today

  // Update total notes
  p.totalNotesPlayed += notesPlayed

  saveProgress(p)
}

export function getStreak(): number {
  const p = getProgress()
  // Reset streak if last practice was not yesterday or today
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  if (p.lastPracticeDate !== today && p.lastPracticeDate !== yesterday) {
    return 0
  }
  return p.streak
}

export function getBestScore(songId: string): number | null {
  const p = getProgress()
  return p.songsPracticed[songId] ?? null
}

export function computeBadges(): Badge[] {
  const p = getProgress()
  const songIds = Object.keys(p.songsPracticed)
  const ninetyPlusSongs = songIds.filter(id => p.songsPracticed[id] >= 90)

  return [
    {
      id: 'first_note',
      emoji: '🎸',
      name: 'First Note',
      description: 'Played any song once',
      earned: songIds.length > 0,
    },
    {
      id: 'three_star',
      emoji: '🌟',
      name: '3 Star Player',
      description: 'Scored 90%+ on any song',
      earned: ninetyPlusSongs.length > 0,
    },
    {
      id: 'on_fire',
      emoji: '🔥',
      name: 'On Fire',
      description: 'Practiced 3 days in a row',
      earned: p.streak >= 3,
    },
    {
      id: 'tamil_hero',
      emoji: '🎵',
      name: 'Tamil Hero',
      description: 'Completed 3 Tamil songs with 50%+',
      earned: p.tamilCompleted.length >= 3,
    },
    {
      id: 'mollywood_master',
      emoji: '🌴',
      name: 'Mollywood Master',
      description: 'Completed 3 Malayalam songs with 50%+',
      earned: p.malayalamCompleted.length >= 3,
    },
    {
      id: 'taaltaar',
      emoji: '🏆',
      name: 'TaalTaar',
      description: 'Scored 90%+ on 5 different songs',
      earned: ninetyPlusSongs.length >= 5,
    },
  ]
}
