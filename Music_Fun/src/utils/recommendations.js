function sameText(left, right) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase())
}

export function getNextSong(songs, currentSong, recentlyPlayed = [], mode = 'repeatAll') {
  if (!songs.length || !currentSong) return null
  if (mode === 'repeatOne') return currentSong

  const candidates = songs.filter((song) => song.youtubeVideoId !== currentSong.youtubeVideoId)
  const fresh = candidates.filter((song) => !recentlyPlayed.includes(song.youtubeVideoId))
  const pool = fresh.length ? fresh : candidates
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
