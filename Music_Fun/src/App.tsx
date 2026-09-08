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
};

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const INITIAL_QUERIES = [
  "Hindi songs 2026",
  "Bollywood songs 2026",
  "Arijit Singh songs",
  "Hindi romantic songs",
  "English popular songs 2026",
];

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
    .filter((item: any) => item?.id?.videoId)
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

async function searchYouTube(query: string, maxResults = 12) {
  if (!API_KEY) {
    throw new Error(
      "YouTube API key is missing. Add VITE_YOUTUBE_API_KEY to .env.local"
    );
  }

  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    `?part=snippet` +
    `&q=${encodeURIComponent(query)}` +
    `&type=video` +
    `&videoEmbeddable=true` +
    `&videoSyndicated=true` +
    `&maxResults=${maxResults}` +
    `&key=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error?.message || `YouTube API error: ${response.status}`
    );
  }

  const data = await response.json();
  return data.items || [];
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

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("favoriteSongIds") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
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

  useEffect(() => {
    localStorage.setItem("favoriteSongIds", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

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
        setSongs(uniqueSongs.slice(0, 20));
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
  }, []);

  const favoriteSongs = useMemo(() => {
    const visibleFavorites = songs.filter((song) => favoriteIds.includes(song.youtubeVideoId));
    return shuffleEnabled ? shuffleArray(visibleFavorites) : visibleFavorites;
  }, [songs, favoriteIds, shuffleEnabled, shuffleVersion]);

  const currentSongs = showFavorites ? favoriteSongs : songs;
  const activeIndex = currentSongs.findIndex(
    (song: Song) => song.youtubeVideoId === activeSongId
  );

  const handlePlay = useCallback(
    (index: number) => {
      const song = currentSongs[index];
      if (!song) {
        return;
      }

      setActiveSongId(song.youtubeVideoId);
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
    setAutoPlayIndex(previousIndex);
  }, [activeIndex, currentSongs]);

  const getSimilarSongs = useCallback(async (song: Song) => {
    if (!song) {
      return [];
    }

    const query = `${song.trackName} ${song.artistName} songs`;

    try {
      const items = await searchYouTube(query, 12);
      return convertYouTubeResults(items);
    } catch (err) {
      console.error("Could not load similar songs:", err);
      return [];
    }
  }, []);

  const handleNext = useCallback(async () => {
    if (!currentSongs.length || activeIndex === -1) {
      return;
    }

    let nextIndex = activeIndex + 1;

    if (shuffleEnabled && currentSongs.length > 1) {
      const pool = currentSongs
        .map((_, idx) => idx)
        .filter((idx) => idx !== activeIndex);
      nextIndex = pool[Math.floor(Math.random() * pool.length)];
    } else if (nextIndex >= currentSongs.length) {
      nextIndex = 0;
    }

    const nextSong = currentSongs[nextIndex];

    if (!nextSong) {
      return;
    }

    setActiveSongId(nextSong.youtubeVideoId);
    setAutoPlayIndex(nextIndex);

    if (nextIndex === 0 && currentSongs.length === 1 && !loadingMore) {
      const currentSong = currentSongs[activeIndex];
      if (!currentSong) {
        return;
      }

      try {
        setLoadingMore(true);
        const newSongs = await getSimilarSongs(currentSong);
        if (newSongs.length) {
          setSongs((existingSongs) => removeDuplicateSongs([...existingSongs, ...newSongs]).slice(0, 60));
        }
      } finally {
        setLoadingMore(false);
      }
    }
  }, [activeIndex, currentSongs, getSimilarSongs, loadingMore, shuffleEnabled]);

  const handleToggleFavorite = useCallback((song: Song) => {
    if (!song?.youtubeVideoId) {
      return;
    }

    setFavoriteIds((currentFavorites) =>
      currentFavorites.includes(song.youtubeVideoId)
        ? currentFavorites.filter((id) => id !== song.youtubeVideoId)
        : [...currentFavorites, song.youtubeVideoId]
    );
  }, []);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSearched(Boolean(searchQuery.trim()));
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setHasSearched(false);
  };

  const handleShuffleFavorites = () => {
    setShuffleEnabled(true);
    setShuffleVersion((currentVersion) => currentVersion + 1);
  };

  return showFavorites ? (
    <Favorites
      songs={favoriteSongs}
      activeIndex={activeIndex}
      autoPlayIndex={autoPlayIndex}
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
      sleepRemaining={0}
      formattedSleepTime="0m"
      favoriteCount={favoriteIds.length}
      onShowFavorites={() => setShowFavorites(true)}
    >
      <MusicList
        songs={songs}
        activeIndex={activeIndex}
        autoPlayIndex={autoPlayIndex}
        onPlay={handlePlay}
        onNext={handleNext}
        onPrevious={handlePrevious}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
      />
    </Home>
  );
}

export default App;
