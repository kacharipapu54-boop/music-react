function sameText(left, right) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase())
}

function titleTokens(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(official|audio|video|lyrics?|lyric|music|visualizer|4k|hd|remix|version|full song)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
}

function similarTitle(left, right) {
  const leftTokens = titleTokens(left)
  const rightTokens = titleTokens(right)
  if (!leftTokens.length || !rightTokens.length) return false

  const leftSet = new Set(leftTokens)
  const rightSet = new Set(rightTokens)
  const shared = [...leftSet].filter((token) => rightSet.has(token)).length
  const smallerTitleLength = Math.min(leftSet.size, rightSet.size)
  const largerTitleLength = Math.max(leftSet.size, rightSet.size)

  if (smallerTitleLength < 2) return false

  return (
    shared === smallerTitleLength ||
    (shared >= 2 && shared / smallerTitleLength >= 0.6 && shared / largerTitleLength >= 0.5)
  )
}

export function getNextSong(songs, currentSong, recentlyPlayed = [], mode = 'repeatAll') {
  if (!songs.length || !currentSong) return null
  if (mode === 'repeatOne') return currentSong

  const candidates = songs.filter((song) => song.youtubeVideoId !== currentSong.youtubeVideoId)
  const differentTitles = candidates.filter(
    (song) => !similarTitle(song.trackName, currentSong.trackName)
  )
  if (!differentTitles.length) return null

  const fresh = differentTitles.filter((song) => !recentlyPlayed.includes(song.youtubeVideoId))
  const pool = fresh.length ? fresh : differentTitles
  if (!pool.length) return null

  const sameArtist = pool.find((song) => sameText(song.artistName, currentSong.artistName))
  if (sameArtist) return sameArtist

  const sameLanguage = pool.find((song) => sameText(song.language, currentSong.language))
  if (sameLanguage) return sameLanguage

  const sameGenre = pool.find((song) => sameText(song.genre, currentSong.genre))
  return sameGenre ?? pool[0]
}

export function shuffleSongs(songs) {
  return [...songs].sort(() => Math.random() - 0.5)
}
