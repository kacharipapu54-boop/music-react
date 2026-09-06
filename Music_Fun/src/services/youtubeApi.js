// The API key remains in the existing environment-backed configuration module.
import { API_KEY, API_URL, VIDEOS_API_URL } from '../Variables/API_KEY.js'
import {
  getCachedSearch,
  getPendingSearch,
  isQuotaBlocked,
  markQuotaBlocked,
  normalizeQuery,
  setCachedSearch,
  setPendingSearch,
} from './youtubeCache.js'

const MAX_RESULTS = 20
const MINIMUM_SONG_LENGTH = 120

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

async function fetchWithOneRetry(url) {
  try {
    return await fetch(url)
  } catch (error) {
    await wait(2000)
    return fetch(url).catch(() => { throw error })
  }
}

export class YouTubeApiError extends Error {
  constructor(message, reason, status) {
    super(message)
    this.name = 'YouTubeApiError'
    this.reason = reason
    this.status = status
  }
}

async function parseApiError(response, fallback) {
  try {
    const data = await response.json()
    const error = data.error ?? {}
    const reason = error.errors?.[0]?.reason
    const message = error.message ?? fallback
    if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded') markQuotaBlocked()
    return new YouTubeApiError(`${fallback}: ${message}`, reason, response.status)
  } catch {
    return new YouTubeApiError(`${fallback} (HTTP ${response.status})`, undefined, response.status)
  }
}

function parseDuration(value) {
  const match = value?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  return match
    ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
    : 0
}

function uniqueSongs(songs) {
  return [...new Map(songs.filter((song) => song?.youtubeVideoId).map((song) => [song.youtubeVideoId, song])).values()]
}

async function requestSongs(query) {
  if (!API_KEY) throw new YouTubeApiError('Missing VITE_YOUTUBE_API_KEY', 'missingKey')
  if (isQuotaBlocked()) throw new YouTubeApiError('YouTube search quota has been reached. Showing available cached songs.', 'quotaExceeded', 403)

  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoCategoryId: '10',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    maxResults: String(MAX_RESULTS),
    q: `${query} official song`,
    key: API_KEY,
  })
  const searchResponse = await fetchWithOneRetry(`${API_URL}?${searchParams}`)
  if (!searchResponse.ok) throw await parseApiError(searchResponse, 'YouTube search failed')

  const searchData = await searchResponse.json()
  const ids = [...new Set((searchData.items ?? []).map((item) => item.id?.videoId).filter(Boolean))]
  if (ids.length === 0) return []

  const videoParams = new URLSearchParams({
    part: 'contentDetails,snippet',
    id: ids.join(','),
    key: API_KEY,
  })
  const videoResponse = await fetchWithOneRetry(`${VIDEOS_API_URL}?${videoParams}`)
  if (!videoResponse.ok) throw await parseApiError(videoResponse, 'YouTube video lookup failed')

  const videoData = await videoResponse.json()
  const songs = (videoData.items ?? []).map((item) => ({
    trackId: item.id,
    trackName: item.snippet?.title ?? 'Untitled song',
    artistName: item.snippet?.channelTitle ?? 'Unknown artist',
    artworkUrl100:
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.high?.url ??
      item.snippet?.thumbnails?.default?.url ??
      `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    youtubeVideoId: item.id,
    durationSeconds: parseDuration(item.contentDetails?.duration),
    language: query.toLowerCase().includes('hindi') ? 'Hindi' : undefined,
    genre: query.toLowerCase(),
  }))
  return uniqueSongs(songs).filter((song) => song.durationSeconds >= MINIMUM_SONG_LENGTH)
}

export function searchYouTube(query) {
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedQuery) return Promise.resolve([])

  const cached = getCachedSearch(normalizedQuery)
  if (cached) return Promise.resolve(cached)

  const pending = getPendingSearch(normalizedQuery)
  if (pending) return pending

  const request = requestSongs(normalizedQuery).then((results) => {
    setCachedSearch(normalizedQuery, results)
    return results
  })
  setPendingSearch(normalizedQuery, request)
  return request
}
