const SEARCH_CACHE_KEY = "youtube_search_cache";
const CACHE_TTL = 12 * 60 * 60 * 1000;

const memorySearchCache = new Map();
const pendingSearches = new Map();

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache must never break playback.
  }
}

export function normalizeQuery(query) {
  return String(query || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCachedSearch(query) {
  const key = normalizeQuery(query);
  const memoryEntry = memorySearchCache.get(key);

  if (
    memoryEntry &&
    Array.isArray(memoryEntry.results) &&
    Date.now() - memoryEntry.timestamp < CACHE_TTL
  ) {
    return memoryEntry.results;
  }

  const cache = readJson(SEARCH_CACHE_KEY, {});
  const entry = cache?.[key];

  if (
    !entry ||
    !Array.isArray(entry.results) ||
    Date.now() - entry.timestamp >= CACHE_TTL
  ) {
    return null;
  }

  memorySearchCache.set(key, entry);
  return entry.results;
}

export function setCachedSearch(query, results) {
  const key = normalizeQuery(query);
  const entry = {
    query: key,
    timestamp: Date.now(),
    results,
  };

  memorySearchCache.set(key, entry);

  const cache = readJson(SEARCH_CACHE_KEY, {});
  cache[key] = entry;
  writeJson(SEARCH_CACHE_KEY, cache);
}

export function getPendingSearch(query) {
  return pendingSearches.get(normalizeQuery(query)) || null;
}

export function setPendingSearch(query, promise) {
  const key = normalizeQuery(query);
  pendingSearches.set(key, promise);

  promise.finally(() => {
    if (pendingSearches.get(key) === promise) {
      pendingSearches.delete(key);
    }
  });

  return promise;
}
