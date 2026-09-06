const SEARCH_CACHE_KEY = 'youtube_search_cache'
const LIBRARY_CACHE_KEY = 'music_library_cache'
const RECENTLY_PLAYED_KEY = 'recently_played'
const QUOTA_ERROR_KEY = 'youtube_quota_error'
const CACHE_TTL = 12 * 60 * 60 * 1000

const memorySearchCache = new Map()
const pendingSearches = new Map()

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage may be unavailable in private browsing.
    }
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Caching is optional and must never break playback.
  }
}

export function normalizeQuery(query) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function getCachedSearch(query) {
  const normalizedQuery = normalizeQuery(query)
  const memoryEntry = memorySearchCache.get(normalizedQuery)
  if (memoryEntry && Array.isArray(memoryEntry.results) && Date.now() - memoryEntry.timestamp < CACHE_TTL) {
    const playableResults = memoryEntry.results.filter((song) => song?.youtubeVideoId || song?.previewUrl)
    return playableResults.length ? playableResults : null
  }

  const cache = readJson(SEARCH_CACHE_KEY, {})
  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) return null
  const entry = cache[normalizedQuery]
  if (!entry || !Array.isArray(entry.results) || Date.now() - entry.timestamp >= CACHE_TTL) return null

  memorySearchCache.set(normalizedQuery, entry)
  const playableResults = entry.results.filter((song) => song?.youtubeVideoId || song?.previewUrl)
  return playableResults.length ? playableResults : null
}

export function setCachedSearch(query, results) {
  const normalizedQuery = normalizeQuery(query)
  const entry = { query: normalizedQuery, timestamp: Date.now(), results }
  memorySearchCache.set(normalizedQuery, entry)
  const cache = readJson(SEARCH_CACHE_KEY, {})
  cache[normalizedQuery] = entry
  writeJson(SEARCH_CACHE_KEY, cache)
}

export function getCachedLibrary() {
  const entry = readJson(LIBRARY_CACHE_KEY, null)
  if (!entry || !Array.isArray(entry.results)) return null
  if (Date.now() - entry.timestamp >= CACHE_TTL) return null
  const playableSongs = entry.results.filter((song) => song?.youtubeVideoId || song?.previewUrl)
  return playableSongs.length ? playableSongs : null
}

export function setCachedLibrary(results) {
  writeJson(LIBRARY_CACHE_KEY, { timestamp: Date.now(), results })
}

export function getRecentlyPlayed() {
  const recent = readJson(RECENTLY_PLAYED_KEY, [])
  return Array.isArray(recent) ? recent.filter(Boolean) : []
}

export function rememberPlayed(trackId) {
  const recent = [trackId, ...getRecentlyPlayed().filter((id) => id !== trackId)].slice(0, 20)
  writeJson(RECENTLY_PLAYED_KEY, recent)
  return recent
}

export function isQuotaBlocked() {
  const timestamp = Number(readSessionValue(QUOTA_ERROR_KEY, 0))
  return timestamp > 0 && Date.now() - timestamp < CACHE_TTL
}

export function markQuotaBlocked() {
  writeSessionValue(QUOTA_ERROR_KEY, Date.now())
}

function readSessionValue(key, fallback) {
  try {
    const value = sessionStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    sessionStorage.removeItem(key)
    return fallback
  }
}

function writeSessionValue(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Session storage is optional and must never break playback.
  }
}

export function getPendingSearch(query) {
  return pendingSearches.get(normalizeQuery(query))
}

export function setPendingSearch(query, promise) {
  pendingSearches.set(normalizeQuery(query), promise)
  promise.then(
    () => pendingSearches.delete(normalizeQuery(query)),
    () => pendingSearches.delete(normalizeQuery(query)),
  )
}

export function clearExpiredCache() {
  const cache = readJson(SEARCH_CACHE_KEY, {})
  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) {
    writeJson(SEARCH_CACHE_KEY, {})
    return
  }
  const validEntries = Object.fromEntries(
    Object.entries(cache).filter(([, entry]) => entry && Array.isArray(entry.results) && Date.now() - entry.timestamp < CACHE_TTL),
  )
  writeJson(SEARCH_CACHE_KEY, validEntries)
}
