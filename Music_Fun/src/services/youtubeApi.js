import {
  getCachedSearch,
  getPendingSearch,
  normalizeQuery,
  setCachedSearch,
  setPendingSearch,
} from "./youtubeCache.js";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const MINIMUM_SONG_LENGTH = 30;

const BLOCKED_TERMS = [
  "#shorts",
  "shorts",
  "short video",
  "reaction",
  "review",
  "podcast",
  "interview",
  "trailer",
  "teaser",
  "news",
  "status video",
];

function parseDuration(value) {
  const match = value?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  return (
    Number(match[1] || 0) * 3600 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0)
  );
}

function looksLikeMusic(item) {
  const title = String(item?.snippet?.title || "").toLowerCase();

  return !BLOCKED_TERMS.some((term) => title.includes(term));
}

function uniqueSongs(songs) {
  return [
    ...new Map(
      songs
        .filter((song) => song?.youtubeVideoId)
        .map((song) => [song.youtubeVideoId, song])
    ).values(),
  ];
}

async function requestSongs(query, maxResults = 20) {
  if (!API_KEY) {
    throw new Error(
      "YouTube API key is missing. Add VITE_YOUTUBE_API_KEY to your .env.local file."
    );
  }

    const searchParams = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      maxResults: String(Math.min(maxResults, 50)),
      q: query,
      key: API_KEY,
    });

  const searchResponse = await fetch(`${SEARCH_URL}?${searchParams}`);

  if (!searchResponse.ok) {
    const data = await searchResponse.json().catch(() => null);
    throw new Error(
      data?.error?.message || `YouTube search failed (${searchResponse.status}).`
    );
  }

  const searchData = await searchResponse.json();
  const candidates = (searchData.items || []).filter(looksLikeMusic);

  const ids = [
    ...new Set(
      candidates.map((item) => item?.id?.videoId).filter(Boolean)
    ),
  ];

  if (!ids.length) return [];

  const videoParams = new URLSearchParams({
    part: "contentDetails,snippet,status",
    id: ids.join(","),
    key: API_KEY,
  });

  const videoResponse = await fetch(`${VIDEOS_URL}?${videoParams}`);

  if (!videoResponse.ok) {
    const data = await videoResponse.json().catch(() => null);
    throw new Error(
      data?.error?.message || `YouTube video lookup failed (${videoResponse.status}).`
    );
  }

  const videoData = await videoResponse.json();

  const songs = (videoData.items || [])
    .filter((item) => item?.status?.embeddable !== false)
    .map((item) => ({
      trackId: item.id,
      trackName: item.snippet?.title || "Untitled song",
      artistName: item.snippet?.channelTitle || "Unknown artist",
      artworkUrl100:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
      youtubeVideoId: item.id,
      previewUrl: "",
      durationSeconds: parseDuration(item.contentDetails?.duration),
      language: query.toLowerCase().includes("hindi") ? "Hindi" : undefined,
      genre: query.toLowerCase(),
    }))
    .filter((song) => song.durationSeconds >= MINIMUM_SONG_LENGTH);

  return uniqueSongs(songs);
}

export function searchYouTube(query, maxResults = 20) {
  const normalized = normalizeQuery(query);
  if (!normalized) return Promise.resolve([]);

    const cached = getCachedSearch(normalized);
    if (cached?.length) return Promise.resolve(cached);

  const pending = getPendingSearch(normalized);
  if (pending) return pending;

  const request = requestSongs(normalized, maxResults)
    .then((results) => {
      setCachedSearch(normalized, results);
      return results;
    })
    .catch((error) => {
      throw error;
    });

  setPendingSearch(normalized, request);
  return request;
}
