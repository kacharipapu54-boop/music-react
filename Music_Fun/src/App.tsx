import { useCallback, useEffect, useMemo, useState } from "react";
import Favorites from "./favorite.jsx";
import Home from "./Components/home.jsx";
import MusicList from "./Components/musicList.jsx";

type Song = {
  trackId: string;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  youtubeVideoId: string;
  previewUrl: string;
  language?: string;
  genre?: string;
};

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const INITIAL_QUERIES = [
  "popular Hindi songs official",
];

const SEARCH_CACHE_PREFIX = "youtube-results:";

function getCachedResults(query: string) {
  try {
    const saved = localStorage.getItem(`${SEARCH_CACHE_PREFIX}${query.trim().toLowerCase()}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function cacheResults(query: string, results: any[]) {
  try {
    localStorage.setItem(
      `${SEARCH_CACHE_PREFIX}${query.trim().toLowerCase()}`,
      JSON.stringify(results)
    );
  } catch {
    // Cached results are optional.
  }
}

function removeDuplicateSongs(songs: Song[]) {
  const seen = new Set<string>();

  return songs.filter((song: Song) => {
    const id = song.youtubeVideoId;

    if (!id) {
      return false;
    }

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

function convertYouTubeResults(items: any[]) {
  return items
    .filter((item: any) => {
      if (!item?.id?.videoId) {
        return false;
      }
      const text = `${item.snippet?.title || ""} ${item.snippet?.description || ""}`.toLowerCase();
      return !text.includes("#shorts") &&
        !text.includes("shorts") &&
        !text.includes("short video");
    })
    .map((item: any) => ({
      trackId: item.id.videoId,
      trackName: item.snippet?.title || "Unknown Song",
      artistName: item.snippet?.channelTitle || "Unknown Artist",
      artworkUrl100:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
      youtubeVideoId: item.id.videoId,
      previewUrl: "",
    }));
}

function parseYouTubeDuration(value: string | undefined) {
  const match = value?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) {
    return 0;
  }

  return Number(match[1] || 0) * 3600 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0);
}

async function removeShortVideos(items: any[], apiKey: string) {
  const videoIds = items
    .map((item: any) => item?.id?.videoId)
    .filter(Boolean);

  if (!videoIds.length) {
    return [];
  }

  const detailsUrl =
    "https://www.googleapis.com/youtube/v3/videos" +
    `?part=contentDetails` +
    `&id=${videoIds.join(",")}` +
    `&key=${apiKey}`;

  try {
    const response = await fetch(detailsUrl);
    if (!response.ok) {
      return items;
    }

    const data = await response.json();
    const durations = new Map<string, number>(
      (data.items || []).map((item: any) => [
        item.id,
        parseYouTubeDuration(item.contentDetails?.duration),
      ])
    );

    return items.filter((item: any) => {
      const duration = durations.get(item.id.videoId);
      return duration === undefined || duration > 60;
    });
  } catch {
    return items;
  }
}

async function searchYouTube(query: string, maxResults = 12) {
  if (!API_KEY) {
    throw new Error(
      "YouTube API key is missing. Add VITE_YOUTUBE_API_KEY to .env.local"
    );
  }

  const cachedResults = getCachedResults(query);
  if (Array.isArray(cachedResults) && cachedResults.length) {
    return cachedResults;
  }

  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    `?part=snippet` +
    `&q=${encodeURIComponent(`${query} -shorts`)}` +
    `&type=video` +
    `&videoEmbeddable=true` +
    `&videoSyndicated=true` +
    `&maxResults=${maxResults}` +
    `&key=${API_KEY}`;

  const response = await fetch(url);

  if (response.ok) {
    const data = await response.json();
    const results = await removeShortVideos(data.items || [], API_KEY);
    cacheResults(query, results);
    return results;
  }

  const errorData = await response.json().catch(() => null);
  const reason = errorData?.error?.errors?.[0]?.reason;
  const isQuotaError =
    reason === "quotaExceeded" ||
    reason === "rateLimitExceeded" ||
    reason === "dailyLimitExceeded" ||
    reason === "userRateLimitExceeded" ||
    errorData?.error?.status === "RESOURCE_EXHAUSTED";

  if (isQuotaError) {
    const cachedResults = getCachedResults(query);
    if (Array.isArray(cachedResults) && cachedResults.length) {
      return cachedResults;
    }
  }

  throw new Error(
    errorData?.error?.message || `YouTube API error: ${response.status}`
  );
}


function shuffleArray(items: Song[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function titleWords(title: string) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
}

function isDifferentSong(candidate: Song, currentSong: Song) {
  if (candidate.youtubeVideoId === currentSong.youtubeVideoId) {
    return false;
  }

  const currentWords = titleWords(currentSong.trackName);
  const candidateWords = titleWords(candidate.trackName);
  const sharedWords = [...currentWords].filter((word) => candidateWords.has(word));

  return sharedWords.length < Math.max(2, Math.ceil(currentWords.size * 0.6));
}

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [storedFavoriteIds] = useState<string[]>(() => {
    try {
      const savedIds = JSON.parse(localStorage.getItem("favoriteSongIds") || "[]");
      const savedSongs = JSON.parse(localStorage.getItem("favoriteSongs") || "[]");
      const ids = Array.isArray(savedIds) ? savedIds : [];
      const songIds = Array.isArray(savedSongs)
        ? savedSongs.map((song) => song?.youtubeVideoId).filter(Boolean)
        : [];
      return [...new Set([...ids, ...songIds])];
    } catch {
      return [];
    }
  });
  const [favoriteLibrary, setFavoriteLibrary] = useState<Song[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("favoriteSongs") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [nowPlayingSong, setNowPlayingSong] = useState<Song | null>(null);
  const [autoPlayIndex, setAutoPlayIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [shuffleVersion, setShuffleVersion] = useState(0);
  const [backgroundPlayEnabled, setBackgroundPlayEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);

  const favoriteIds = useMemo(
    () => favoriteLibrary.map((song) => song.youtubeVideoId).filter(Boolean),
    [favoriteLibrary]
  );

  useEffect(() => {
    localStorage.setItem("favoriteSongIds", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    localStorage.setItem("favoriteSongs", JSON.stringify(favoriteLibrary));
  }, [favoriteLibrary]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialSongs() {
      try {
        setLoading(true);
        setError("");

        const queries = [...INITIAL_QUERIES].sort(() => Math.random() - 0.5);
        const results = await Promise.all(
          queries.map((query) => searchYouTube(query, 12))
        );

        if (cancelled) {
          return;
        }

        const allItems = results.flat();
        const newSongs = convertYouTubeResults(allItems);
        const uniqueSongs = removeDuplicateSongs(newSongs);
        const recommendations = uniqueSongs.slice(0, 20);
        setRecommendedSongs(recommendations);
        setSongs(recommendations);
        setFavoriteLibrary((savedFavorites) =>
          removeDuplicateSongs([
            ...savedFavorites,
            ...recommendations.filter((song) =>
              storedFavoriteIds.includes(song.youtubeVideoId)
            ),
          ])
        );
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError(err instanceof Error ? err.message : "Unable to load songs from YouTube.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialSongs();

    return () => {
      cancelled = true;
    };
  }, [storedFavoriteIds]);

  useEffect(() => {
    if (sleepMinutes <= 0) {
      setSleepRemaining(0);
      return;
    }

    const endTime = Date.now() + sleepMinutes * 60 * 1000;

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setSleepRemaining(remaining);

      if (remaining === 0) {
        setActiveSongId(null);
        setNowPlayingSong(null);
        setAutoPlayIndex(null);
        setSleepMinutes(0);
      }
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(timer);
  }, [sleepMinutes]);

  const favoriteSongs = useMemo(() => {
    return shuffleEnabled ? shuffleArray(favoriteLibrary) : favoriteLibrary;
  }, [favoriteLibrary, shuffleEnabled, shuffleVersion]);

  const currentSongs = showFavorites ? favoriteSongs : songs;
  const activeIndex = currentSongs.findIndex(
    (song: Song) => song.youtubeVideoId === activeSongId
  );
  const activeSong = nowPlayingSong ||
    removeDuplicateSongs([...favoriteLibrary, ...songs]).find(
      (song) => song.youtubeVideoId === activeSongId
    );

  const handlePlay = useCallback(
    (index: number) => {
      const song = currentSongs[index];
      if (!song) {
        return;
      }

      setActiveSongId(song.youtubeVideoId);
      setNowPlayingSong(song);
      setAutoPlayIndex(index);
    },
    [currentSongs]
  );

  const handlePrevious = useCallback(() => {
    if (!currentSongs.length || activeIndex === -1) {
      return;
    }

    const previousIndex = activeIndex > 0 ? activeIndex - 1 : currentSongs.length - 1;
    const nextSong = currentSongs[previousIndex];
    if (!nextSong) {
      return;
    }

    setActiveSongId(nextSong.youtubeVideoId);
    setNowPlayingSong(nextSong);
    setAutoPlayIndex(previousIndex);
  }, [activeIndex, currentSongs]);

  const handleNext = useCallback(async () => {
    if (!currentSongs.length || activeIndex === -1) {
      return;
    }

    const currentSong = currentSongs[activeIndex];
    if (!currentSong) {
      return;
    }

    const relatedSongs = currentSongs.filter(
      (song) =>
        song.youtubeVideoId !== currentSong.youtubeVideoId &&
        (song.artistName.toLowerCase() === currentSong.artistName.toLowerCase() ||
          Boolean(currentSong.genre && song.genre === currentSong.genre) ||
          Boolean(currentSong.language && song.language === currentSong.language))
    );

    let nextIndex = activeIndex + 1;

    if (relatedSongs.length) {
      const nextSong = relatedSongs[Math.floor(Math.random() * relatedSongs.length)];
      nextIndex = currentSongs.findIndex(
        (song) => song.youtubeVideoId === nextSong.youtubeVideoId
      );
    } else if (shuffleEnabled && currentSongs.length > 1) {
      const pool = currentSongs
        .map((_, idx) => idx)
        .filter((idx) => idx !== activeIndex);
      nextIndex = pool[Math.floor(Math.random() * pool.length)];
    }

    if (nextIndex >= currentSongs.length) {
      nextIndex = 0;
    }

    const nextSong = currentSongs[nextIndex];

    if (!nextSong) {
      return;
    }

    setActiveSongId(nextSong.youtubeVideoId);
    setNowPlayingSong(nextSong);
    setAutoPlayIndex(nextIndex);

    if (showFavorites) {
      return;
    }

    if (!relatedSongs.length && !loadingMore) {
      try {
        setLoadingMore(true);
        const items = await searchYouTube(`${currentSong.artistName} songs`, 12);
        const newSongs = removeDuplicateSongs(convertYouTubeResults(items)).filter(
          (song) => isDifferentSong(song, currentSong)
        );

        if (newSongs.length) {
          const nextSong = newSongs[0];
          setSongs((existingSongs) =>
            removeDuplicateSongs([...existingSongs, ...newSongs]).slice(0, 60)
          );
          setActiveSongId(nextSong.youtubeVideoId);
          setNowPlayingSong(nextSong);
          setAutoPlayIndex(currentSongs.length);
        }
      } finally {
        setLoadingMore(false);
      }
    }
  }, [activeIndex, currentSongs, loadingMore, showFavorites, shuffleEnabled]);

  const handleToggleFavorite = useCallback((song: Song) => {
    if (!song?.youtubeVideoId) {
      return;
    }

    setFavoriteLibrary((currentSongs) => {
      const isFavorite = currentSongs.some(
        (savedSong) => savedSong.youtubeVideoId === song.youtubeVideoId
      );

      if (isFavorite) {
        return currentSongs.filter(
          (savedSong) => savedSong.youtubeVideoId !== song.youtubeVideoId
        );
      }

      return [
        ...currentSongs.filter(
          (savedSong) => savedSong.youtubeVideoId !== song.youtubeVideoId
        ),
        song,
      ];
    });
  }, []);

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();

    if (!query) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setHasSearched(true);

      const items = await searchYouTube(query, 20);
      const results = removeDuplicateSongs(convertYouTubeResults(items));
      setSongs(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search YouTube.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setHasSearched(false);
    setError("");
    setSongs(recommendedSongs);
  };

  const handleShuffleFavorites = () => {
    setShuffleEnabled(true);
    setShuffleVersion((currentVersion) => currentVersion + 1);
  };

  const floatingPlayer = activeSong ? (
    <div className="floating-player" aria-label="Now playing">
      <MusicList
        songs={[activeSong]}
        activeIndex={0}
        autoPlayIndex={autoPlayIndex}
        onPlay={() => undefined}
        onNext={handleNext}
        onPrevious={handlePrevious}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        backgroundPlayEnabled={backgroundPlayEnabled}
      />
    </div>
  ) : null;

  const pageContent = hasSearched && !showFavorites ? (
    <main className="search-results-only" aria-label="Search results">
      <div className="search-results-toolbar">
        <form className="search-results-form" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search songs or artists..."
            aria-label="Search songs or artists"
          />
          <button type="submit" disabled={!searchQuery.trim() || loading}>
            Search
          </button>
        </form>

        <select
          className="search-results-sleep"
          value={sleepMinutes}
          onChange={(event) => setSleepMinutes(Number(event.target.value))}
          aria-label="Sleep timer"
        >
          <option value="0">Sleep off</option>
          <option value="15">Sleep 15m</option>
          <option value="30">Sleep 30m</option>
          <option value="45">Sleep 45m</option>
          <option value="60">Sleep 60m</option>
          <option value="90">Sleep 90m</option>
        </select>

        <button
          className="search-results-favorites"
          type="button"
          onClick={() => setShowFavorites(true)}
        >
          Favorites ({favoriteIds.length})
        </button>

        <button
          className="search-results-back"
          type="button"
          onClick={handleClearSearch}
        >
          Back to recommendations
        </button>
      </div>

      {!loading && !error && (
        <MusicList
          songs={songs}
          activeIndex={-1}
          autoPlayIndex={null}
          onPlay={handlePlay}
          onNext={handleNext}
          onPrevious={handlePrevious}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
          backgroundPlayEnabled={backgroundPlayEnabled}
        />
      )}
    </main>
  ) : (
    <>
      {showFavorites ? (
        <Favorites
          songs={favoriteSongs}
          activeIndex={-1}
          autoPlayIndex={null}
          onPlay={handlePlay}
          onNext={handleNext}
          onPrevious={handlePrevious}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
          onBack={() => setShowFavorites(false)}
          shuffleEnabled={shuffleEnabled}
          onToggleShuffle={handleShuffleFavorites}
          backgroundPlayEnabled={backgroundPlayEnabled}
          onToggleBackgroundPlay={() => setBackgroundPlayEnabled((currentValue) => !currentValue)}
        />
      ) : (
        <Home
          loading={loading}
          error={error}
          songCount={songs.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearchSubmit}
          onClearSearch={handleClearSearch}
          hasSearched={hasSearched}
          sleepMinutes={sleepMinutes}
          setSleepMinutes={setSleepMinutes}
          sleepRemaining={sleepRemaining}
          formattedSleepTime={`${Math.ceil(sleepRemaining / 60000)}m`}
          favoriteCount={favoriteIds.length}
          onShowFavorites={() => setShowFavorites(true)}
        >
          <MusicList
            songs={songs}
            activeIndex={-1}
            autoPlayIndex={null}
            onPlay={handlePlay}
            onNext={handleNext}
            onPrevious={handlePrevious}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
          />
        </Home>
      )}
    </>
  );

  return (
    <>
      {pageContent}
      {floatingPlayer}
    </>
  );
}

export default App;
