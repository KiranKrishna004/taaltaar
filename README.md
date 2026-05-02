# TaalTaar

A guitar learning app for Tamil and Malayalam film songs. Pick up your guitar, play the melody, and get scored in real time.

## What it does

- **Song library** — browse 10 classic Tamil and Malayalam film songs, filterable by language and difficulty
- **Interactive tab viewer** — scrolling canvas tab that shows the melody as fret numbers on string lines, colour-coded by string, with a moving playhead
- **Play-along mode** — synthesised melody plays through your speakers while the app listens via your microphone; notes are scored hit or miss as you play them
- **Live scoring** — percentage score and hit/miss count update while you play; a scorecard shows your final result
- **Gamification** — practice streaks, XP, and badges stored locally

## How the practice mode works

1. Press **Play Along** — the app requests microphone access
2. The melody is synthesised using the **Karplus-Strong** string algorithm, one voice per note, tuned to the exact pitch and string character of each guitar string (brighter on high strings, warmer on low strings)
3. All audio buffers are pre-generated before the clock starts, so the synthesiser and the canvas animation stay perfectly in sync with `AudioContext.currentTime`
4. A **YIN pitch detector** (`pitchfinder`) samples your microphone at 20 Hz and compares the detected note against what should be playing at that moment
5. The canvas tab scrolls in real time at 60 fps via a `requestAnimationFrame` loop reading the live audio clock directly — no React re-render lag

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | Supabase (Postgres + RLS) |
| Audio synthesis | Web Audio API — Karplus-Strong algorithm |
| Pitch detection | YIN via `pitchfinder` |
| Animation | Canvas 2D + `requestAnimationFrame` |
| Backend audio | `@distube/ytdl-core`, `fluent-ffmpeg`, `ffmpeg-static` |

## Project structure

```
src/
  app/
    page.tsx                  # Home — song list with filter/search
    song/[id]/page.tsx        # Song detail page
    api/
      guitar-audio/route.ts   # Streams EQ-filtered audio from YouTube
      detect-offset/route.ts  # Detects audio sync offset for a song
  components/
    PracticeArea.tsx          # Core play-along component (audio + pitch + scoring)
    AlphaTabRenderer.tsx      # Canvas tab scrolling renderer (RAF loop)
    SongCard.tsx              # Song list card
    ScoreCard.tsx             # End-of-session result modal
    FilterBar.tsx / SearchBar.tsx / Leaderboard.tsx / BadgeDisplay.tsx
  lib/
    pitchDetection.ts         # YIN pitch detection + note/frequency utils
    gamification.ts           # XP, streaks, badges (localStorage)
    detectOffset.ts           # Backend YouTube audio sync detection
    supabase.ts / supabase-server.ts
  types/index.ts              # Song, TabNote, Recording, Badge types
```

## Database schema

**songs** — `id`, `title`, `film`, `language` (tamil/malayalam), `composer`, `difficulty`, `bpm`, `tab_data` (JSONB array of `{time, string, fret, note, duration}`), `youtube_url`, `youtube_offset`, `play_count`

**recordings** — `id`, `song_id`, `score`, `audio_url`, `upvotes`, `device_fingerprint`

## Getting started

```bash
npm install
```

Create a `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
