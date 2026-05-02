const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API_BASE  = 'https://api.spotify.com/v1'

async function getToken(): Promise<string> {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  return data.access_token as string
}

export interface SongMeta {
  composer: string | null
  film:     string | null
  bpm:      number | null
}

export async function lookupSong(title: string): Promise<SongMeta | null> {
  try {
    const token = await getToken()
    const headers = { Authorization: `Bearer ${token}` }

    // Search for the track — bias toward Indian market
    const searchRes = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(title)}&type=track&limit=1&market=IN`,
      { headers }
    )
    const searchData = await searchRes.json()
    const track = searchData?.tracks?.items?.[0]
    if (!track) return null

    const artist = track.artists?.[0]?.name ?? null
    const album  = track.album?.name ?? null

    // Audio features for BPM
    let bpm: number | null = null
    try {
      const featRes  = await fetch(`${API_BASE}/audio-features/${track.id}`, { headers })
      const featData = await featRes.json()
      if (featData?.tempo) bpm = Math.round(featData.tempo)
    } catch { /* non-fatal */ }

    return { composer: artist, film: album, bpm }
  } catch {
    return null
  }
}
