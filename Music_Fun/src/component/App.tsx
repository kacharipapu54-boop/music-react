import { useCallback, useEffect, useMemo, useState } from "react";
import Favorites from "./favorite.jsx";
import Home from "./Components/home.jsx";
import MusicList from "./Components/musicList.jsx";
import { searchYouTube } from "./services/youtubeApi.js";
import { getNextSong } from "../utils/recommendations.js";

type Song = {
  trackId: string;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  youtubeVideoId: string;
  previewUrl: string;
  durationSeconds?: number;
  language?: string;
  genre?: string;
};

const INITIAL_QUERY = "popular Hindi songs official audio";
const FAVORITE_IDS_KEY = "favoriteSongIds";
const FAVORITE_SONGS_KEY = "favoriteSongs";

function removeDuplicateSongs(songs: Song[]) {
  const seen = new Set<string>();
  return songs.filter((song) => {
    const id = song?.youtubeVideoId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeSong(song: any): Song {
  return {
    trackId: song.youtubeVideoId,
    trackName: song.trackName || "Unknown Song",
    artistName: song.artistName || "Unknown Artist",
    artworkUrl100: song.artworkUrl100 || "",
    youtubeVideoId: song.youtubeVideoId,
    previewUrl: "",
    durationSeconds: song.durationSeconds,
    language: song.language,
    genre: song.genre,
  };
}

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [favoriteLibrary, setFavoriteLibrary] = useState<Song[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITE_SONGS_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [nowPlayingSong, setNowPlayingSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [shuffleVersion, setShuffleVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);

  const favoriteIds = useMemo(
    () => favoriteLibrary.map((song) => song.youtubeVideoId).filter(Boolean),
    [favoriteLibrary]
  );

  useEffect(() => {
    localStorage.setItem(FAVORITE_IDS_KEY, JSON.stringify(favoriteIds));
    localStorage.setItem(FAVORITE_SONGS_KEY, JSON.stringify(favoriteLibrary));
  }, [favoriteIds, favoriteLibrary]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialSongs() {
      try {
        setLoading(true);
        setError("");

        const results = await searchYouTube(INITIAL_QUERY, 20);
        if (cancelled) return;

        const unique = removeDuplicateSongs(results.map(normalizeSong)).slice(0, 20);
        setRecommendedSongs(unique);
        setSongs(unique);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load songs from YouTube.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialSongs();
    return () => {
      cancelled = true;
    };
  }, []);

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
        setSleepMinutes(0);
      }
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [sleepMinutes]);

  const favoriteSongs = useMemo(
    () => (shuffleEnabled ? shuffleArray(favoriteLibrary) : favoriteLibrary),
    [favoriteLibrary, shuffleEnabled, shuffleVersion]
  );

  const currentSongs = showFavorites ? favoriteSongs : songs;
  const activeIndex = currentSongs.findIndex(
    (song) => song.youtubeVideoId === activeSongId
  );

  const activeSong =
    nowPlayingSong ||
    [...favoriteLibrary, ...songs].find(
      (song) => song.youtubeVideoId === activeSongId
    ) ||
    null;

  const handlePlay = useCallback(
    (index: number) => {
      const song = currentSongs[index];
      if (!song) return;

      setActiveSongId(song.youtubeVideoId);
      setNowPlayingSong(song);
    },
    [currentSongs]
  );

  const handlePrevious = useCallback(() => {
    if (!currentSongs.length) return;

    const index = activeIndex >= 0 ? activeIndex : 0;
    const previousIndex = index > 0 ? index - 1 : currentSongs.length - 1;
    const song = currentSongs[previousIndex];

    if (!song) return;
    setActiveSongId(song.youtubeVideoId);
    setNowPlayingSong(song);
  }, [activeIndex, currentSongs]);

  const handleNext = useCallback(async () => {
    if (!currentSongs.length) return;

    const index = activeIndex >= 0 ? activeIndex : 0;
    const currentSong = currentSongs[index];

    if (!currentSong) {
      const first = currentSongs[0];
      setActiveSongId(first.youtubeVideoId);
      setNowPlayingSong(first);
      return;
    }

    if (shuffleEnabled && currentSongs.length > 1) {
      const candidates = currentSongs.filter(
        (song) => song.youtubeVideoId !== currentSong.youtubeVideoId
      );
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      if (next) {
        setActiveSongId(next.youtubeVideoId);
        setNowPlayingSong(next);
        return;
      }
    }

    const nextSong = getNextSong(currentSongs, currentSong);

    if (nextSong) {
      setActiveSongId(nextSong.youtubeVideoId);
      setNowPlayingSong(nextSong);
      return;
    }

    if (!showFavorites && !loadingMore) {
      try {
        setLoadingMore(true);
        const more = await searchYouTube(`${currentSong.artistName} official songs`, 12);
        const newSongs = removeDuplicateSongs(more.map(normalizeSong)).filter(
          (song) => song.youtubeVideoId !== currentSong.youtubeVideoId
        );

        if (newSongs.length) {
          setSongs((existing) =>
            removeDuplicateSongs([...existing, ...newSongs]).slice(0, 60)
          );
          setActiveSongId(newSongs[0].youtubeVideoId);
          setNowPlayingSong(newSongs[0]);
        }
      } finally {
        setLoadingMore(false);
      }
    }
  }, [activeIndex, currentSongs, loadingMore, showFavorites, shuffleEnabled]);

  const handleToggleFavorite = useCallback((song: Song) => {
    if (!song?.youtubeVideoId) return;

    setFavoriteLibrary((current) => {
      const exists = current.some(
        (saved) => saved.youtubeVideoId === song.youtubeVideoId
      );

      return exists
        ? current.filter((saved) => saved.youtubeVideoId !== song.youtubeVideoId)
        : [...current, song];
    });
  }, []);

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    try {
      setLoading(true);
      setError("");
      setHasSearched(true);
      setShowFavorites(false);

      const results = await searchYouTube(query, 20);
      setSongs(removeDuplicateSongs(results.map(normalizeSong)));
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
    setShowFavorites(false);
  };

  const handleShuffleFavorites = () => {
    setShuffleEnabled((value) => !value);
    setShuffleVersion((value) => value + 1);
  };

  const pageContent = showFavorites ? (
    <Favorites
      songs={favoriteSongs}
      activeIndex={activeIndex}
      onPlay={handlePlay}
      onNext={handleNext}
      onPrevious={handlePrevious}
      favoriteIds={favoriteIds}
      onToggleFavorite={handleToggleFavorite}
      onBack={() => setShowFavorites(false)}
      shuffleEnabled={shuffleEnabled}
      onToggleShuffle={handleShuffleFavorites}
      showActivePlayer={false}
    />
  ) : hasSearched ? (
    <main className="search-results-only" aria-label="Search results">
      <div className="search-results-toolbar">
        <form className="search-results-form" onSubmit={handleSearchSubmit}>
          <label className="sr-only" htmlFor="results-search">
            Search songs or artists
          </label>
          <input
            id="results-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search songs or artists..."
            aria-label="Search songs or artists"
          />
          <button type="submit" disabled={!searchQuery.trim() || loading}>
            {loading ? "Searching…" : "Search"}
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
          Favorites · {favoriteIds.length}
        </button>

        <button
          className="search-results-back"
          type="button"
          onClick={handleClearSearch}
        >
          Back
        </button>
      </div>

      {loading && (
        <div className="results-skeleton" aria-label="Loading songs">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <span />
              <b />
              <i />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="recommendation-error">
          <div className="error-icon">!</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <MusicList
          songs={songs}
          activeIndex={activeIndex}
          onPlay={handlePlay}
          onNext={handleNext}
          onPrevious={handlePrevious}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
          showActivePlayer={false}
        />
      )}
    </main>
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
        activeIndex={activeIndex}
        onPlay={handlePlay}
        onNext={handleNext}
        onPrevious={handlePrevious}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        showActivePlayer={false}
      />
    </Home>
  );

  const floatingPlayer = activeSong ? (
    <div className="floating-player" aria-label="Now playing">
      <MusicList
        songs={[activeSong]}
        activeIndex={0}
        onPlay={() => undefined}
        onNext={handleNext}
        onPrevious={handlePrevious}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  ) : null;

  return (
    <>
      {pageContent}
      {floatingPlayer}
    </>
  );
}

export default App;
