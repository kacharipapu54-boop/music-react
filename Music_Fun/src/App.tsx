import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// @ts-expect-error JavaScript component without a declaration file.
import MusicList from "./Components/musicList.jsx";
// @ts-expect-error JavaScript component without a declaration file.
import Home from "./Components/home.jsx";
// @ts-expect-error JavaScript component without a declaration file.
import Favorites from "./favorite.jsx";

const API_KEY =
  import.meta.env.VITE_YOUTUBE_API_KEY;


// =====================================================
// TYPES
// =====================================================

type Song = {
  trackId: string;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  youtubeVideoId: string;
  previewUrl: string;
  genre?: string;
  language?: string;
};

type SearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type VideoDetails = {
  id?: string;
  snippet?: {
    categoryId?: string;
    liveBroadcastContent?: string;
  };
  contentDetails?: { duration?: string };
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
  };
};

const RECOMMENDATION_QUERIES = [
  "new released songs 2026",
  "popular songs 2026",
  "new hit songs 2026",
  "trending music 2026",
  "top songs 2026",
];

const FAVORITES_STORAGE_KEY =
  "music-fun-favorite-song-ids";

// WORDS THAT SHOULD NOT APPEAR IN MUSIC RESULTS
// =====================================================

const BLOCKED_WORDS = [
  "#shorts",
  "#short",
  "shorts",
  "short video",

  "reaction",
  "reacting",

  "vlog",
  "vlogging",

  "podcast",

  "interview",

  "news",

  "trailer",
  "teaser",

  "review",

  "explained",

  "gameplay",
  "gaming",

  "prank",

  "challenge",

  "tutorial",

  "how to",

  "behind the scenes",

  "making of",

  "live stream",
  "livestream",
];


// =====================================================
// CHECK NON-MUSIC TITLE
// =====================================================

function isBlockedTitle(
  title: string
) {
  const lower =
    title.toLowerCase();

  return BLOCKED_WORDS.some(
    (word) =>
      lower.includes(word)
  );
}


// =====================================================
// REMOVE DUPLICATES
// =====================================================

function removeDuplicates(
  songs: Song[]
) {
  const seen =
    new Set<string>();

  return songs.filter(
    (song) => {

      const id =
        song.youtubeVideoId;

      if (!id) {
        return false;
      }

      if (seen.has(id)) {
        return false;
      }

      seen.add(id);

      return true;
    }
  );
}

function normalizeArtistName(
  value?: string
) {
  return (value || "")
    .toLowerCase()
    .replace(/official|vevo|music|records|record label|topic/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function sameArtist(
  left?: string,
  right?: string
) {
  const normalizedLeft =
    normalizeArtistName(left);
  const normalizedRight =
    normalizeArtistName(right);

  return Boolean(
    normalizedLeft &&
    normalizedRight &&
    (normalizedLeft === normalizedRight ||
      normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  );
}

function findRelatedSong(
  songs: Song[],
  currentSong: Song,
  excludedIds = new Set<string>()
) {
  const candidates = songs.filter(
    (song) =>
      song.youtubeVideoId !==
        currentSong.youtubeVideoId &&
      !excludedIds.has(song.youtubeVideoId)
  );

  return candidates.find((song) =>
    sameArtist(song.artistName, currentSong.artistName)
  );
}


// =====================================================
// CONVERT YOUTUBE RESULT
// =====================================================

function convertResults(
  items: SearchItem[]
): Song[] {

  const songs: Song[] = [];

  for (
    const item of items
  ) {

    const videoId =
      item.id?.videoId;

    if (!videoId) {
      continue;
    }


    const title =
      item.snippet?.title ||
      "Unknown Song";


    if (
      isBlockedTitle(title)
    ) {
      continue;
    }


    songs.push({

      trackId: videoId,

      trackName: title,

      artistName:
        item.snippet?.channelTitle ||
        "Unknown Artist",

      artworkUrl100:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

      youtubeVideoId:
        videoId,

      previewUrl: "",
    });
  }


  return removeDuplicates(
    songs
  );
}


// =====================================================
// DURATION CONVERTER
// PT3M45S → 225
// =====================================================

function getDurationSeconds(
  duration: string
) {

  const match =
    duration.match(
      /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
    );

  if (!match) {
    return 0;
  }


  const hours =
    Number(match[1] || 0);

  const minutes =
    Number(match[2] || 0);

  const seconds =
    Number(match[3] || 0);


  return (
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}


// =====================================================
// SEARCH YOUTUBE
// =====================================================

async function searchYouTube(
  query: string,
  maxResults = 25
): Promise<Song[]> {

  if (!API_KEY) {
    throw new Error(
      "YouTube API key is missing. Check .env.local."
    );
  }


  // ---------------------------------------------------
  // Search
  // ---------------------------------------------------

  const searchParams =
    new URLSearchParams({

      part: "snippet",

      q: query,

      type: "video",

      // YouTube Music category
      videoCategoryId: "10",

      // Only videos that can be embedded
      videoEmbeddable: "true",

      videoSyndicated: "true",

      maxResults:
        String(maxResults),

      key: API_KEY,
    });


  const searchResponse =
    await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`
    );


  const searchData =
    await searchResponse.json();


  if (!searchResponse.ok) {

    throw new Error(
      searchData?.error?.message ||
      "YouTube search failed."
    );
  }


  const initialSongs =
    convertResults(
      searchData.items || []
    );


  if (
    initialSongs.length === 0
  ) {
    return [];
  }


  // ---------------------------------------------------
  // Get detailed information
  // ---------------------------------------------------

  const ids =
    initialSongs
      .map(
        (song) =>
          song.youtubeVideoId
      )
      .join(",");


  const detailsParams =
    new URLSearchParams({

      part:
        "snippet,contentDetails,status",

      id: ids,

      key: API_KEY,
    });


  const detailsResponse =
    await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailsParams}`
    );


  const detailsData =
    await detailsResponse.json();


  if (!detailsResponse.ok) {

    throw new Error(
      detailsData?.error?.message ||
      "Could not get video information."
    );
  }


  const details:
    VideoDetails[] =
      detailsData.items || [];


  const detailsMap =
    new Map(
      details.map(
        (video) => [
          video.id,
          video,
        ]
      )
    );


  // ---------------------------------------------------
  // STRICT MUSIC FILTER
  // ---------------------------------------------------

  const musicOnly =
    initialSongs.filter(
      (song) => {

        const video =
          detailsMap.get(
            song.youtubeVideoId
          );


        if (!video) {
          return false;
        }


        // Music category only
        if (
          video.snippet?.categoryId !==
          "10"
        ) {
          return false;
        }


        // Must be embeddable
        if (
          video.status?.embeddable ===
          false
        ) {
          return false;
        }


        // Must be public
        if (
          video.status?.privacyStatus &&
          video.status.privacyStatus !==
            "public"
        ) {
          return false;
        }


        // No live videos
        if (
          video.snippet
            ?.liveBroadcastContent ===
          "live"
        ) {
          return false;
        }


        // ---------------------------------------------
        // Duration
        //
        // Shorts can be up to a few minutes,
        // so don't rely only on YouTube's search filter.
        //
        // We allow songs from 90 seconds to 15 minutes.
        // ---------------------------------------------

        const duration =
          getDurationSeconds(
            video.contentDetails
              ?.duration || ""
          );


        if (
          duration < 90
        ) {
          return false;
        }


        if (
          duration > 900
        ) {
          return false;
        }


        // Final title filter
        if (
          isBlockedTitle(
            song.trackName
          )
        ) {
          return false;
        }


        return true;
      }
    );


  return removeDuplicates(
    musicOnly
  );
}


// =====================================================
// APP
// =====================================================

function App() {

  const [songs, setSongs] =
    useState<Song[]>([]);


  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);


  const [autoPlayIndex, setAutoPlayIndex] =
    useState<number | null>(null);


  const [favoriteSongs, setFavoriteSongs] =
    useState<Song[]>(() => {
      try {
        const saved =
          localStorage.getItem(
            FAVORITES_STORAGE_KEY
          );

        const parsed =
          saved ? JSON.parse(saved) : [];

        return Array.isArray(parsed)
          ? parsed.filter(
              (song) =>
                song &&
                typeof song === "object" &&
                typeof song.youtubeVideoId === "string"
            )
          : [];
      } catch {
        return [];
      }
    });


  const [showFavorites, setShowFavorites] =
    useState(false);


  const [favoriteActiveIndex, setFavoriteActiveIndex] =
    useState<number | null>(null);


  const [loading, setLoading] =
    useState(true);


  const [loadingMore, setLoadingMore] =
    useState(false);


  const [error, setError] =
    useState("");


  // Search
  const [searchQuery, setSearchQuery] =
    useState("");


  const [hasSearched, setHasSearched] =
    useState(false);


  // Sleep timer
  const [sleepMinutes, setSleepMinutes] =
    useState(0);


  const [sleepRemaining, setSleepRemaining] =
    useState(0);


  const loadingNext =
    useRef(false);

  const nextPlayedIds =
    useRef<Set<string>>(new Set());

  const recommendationQueryIndex =
    useRef(0);


  const favoriteIds =
    favoriteSongs.map(
      (song) => song.youtubeVideoId
    );


  useEffect(() => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favoriteSongs)
    );
  }, [favoriteSongs]);


  const toggleFavorite =
    useCallback(
      (song: Song) => {
        setFavoriteSongs((previousSongs) =>
          previousSongs.some(
            (favoriteSong) =>
              favoriteSong.youtubeVideoId ===
              song.youtubeVideoId
          )
            ? previousSongs.filter(
                (favoriteSong) =>
                  favoriteSong.youtubeVideoId !==
                  song.youtubeVideoId
              )
            : [...previousSongs, song]
        );
      },
      []
    );


  // ===================================================
  // LOAD INITIAL SONGS
  // ===================================================

  useEffect(() => {

    let cancelled = false;


    async function loadInitialSongs() {

      try {

        setLoading(true);

        setError("");


        const randomQuery =
          RECOMMENDATION_QUERIES[
            Math.floor(Math.random() * RECOMMENDATION_QUERIES.length)
          ];

        const results =
          await searchYouTube(
            randomQuery,
            50
          );


        if (
          cancelled
        ) {
          return;
        }


        setSongs(
          removeDuplicates(
            results
          ).slice(0, 25)
        );


      } catch (caught) {

        if (
          cancelled
        ) {
          return;
        }


        console.error(
          caught
        );


        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load songs."
        );


      } finally {

        if (
          !cancelled
        ) {
          setLoading(false);
        }

      }
    }


    void loadInitialSongs();


    return () => {
      cancelled = true;
    };

  }, []);


  // ===================================================
  // SEARCH SONGS
  // ===================================================

  const handleSearch =
    useCallback(
      async (
        event: React.FormEvent
      ) => {

        event.preventDefault();


        const query =
          searchQuery.trim();


        if (!query) {
          return;
        }


        try {

          setLoading(true);

          setError("");

          setHasSearched(true);

          const currentSong =
            activeIndex === null
              ? null
              : songs[activeIndex] || null;


          /*
            Adding "official song" makes
            YouTube prioritize music instead
            of random videos.
          */

          const results =
            await searchYouTube(
              `${query} official song`,
              25
            );


          const nextSongs = removeDuplicates(
            currentSong
              ? [currentSong, ...results]
              : results
          ).slice(0, 25);

          setSongs(nextSongs);

          if (currentSong) {
            setActiveIndex(
              nextSongs.findIndex(
                (song) =>
                  song.youtubeVideoId ===
                  currentSong.youtubeVideoId
              )
            );
          }


        } catch (caught) {

          console.error(
            caught
          );


          setSongs([]);


          setError(
            caught instanceof Error
              ? caught.message
              : "Search failed."
          );


        } finally {

          setLoading(false);
        }

      },
      [activeIndex, searchQuery, songs]
    );


  // ===================================================
  // CLEAR SEARCH
  // ===================================================

  const clearSearch =
    useCallback(
      async () => {

        setSearchQuery("");

        setHasSearched(false);

        const currentSong =
          activeIndex === null
            ? null
            : songs[activeIndex] || null;

        setError("");

        setLoading(true);


        try {

          recommendationQueryIndex.current =
            Math.floor(Math.random() * RECOMMENDATION_QUERIES.length);

          const recommendationQuery =
            RECOMMENDATION_QUERIES[
              recommendationQueryIndex.current
            ];

          const results =
            await searchYouTube(
              recommendationQuery,
                50
            );


          const nextSongs = removeDuplicates(
            currentSong
              ? [currentSong, ...results]
              : results
          ).slice(0, 25);

          setSongs(nextSongs);

          if (currentSong) {
            setActiveIndex(
              nextSongs.findIndex(
                (song) =>
                  song.youtubeVideoId ===
                  currentSong.youtubeVideoId
              )
            );
          }


        } catch (caught) {

          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load songs."
          );


        } finally {

          setLoading(false);
        }

      },
      [activeIndex, songs]
    );


  // ===================================================
  // PLAY
  // ===================================================

  const handlePlay =
    useCallback(
      (index: number) => {

        if (
          index < 0 ||
          index >= songs.length
        ) {
          return;
        }


        setActiveIndex(index);

        setAutoPlayIndex(index);

        setFavoriteActiveIndex(null);

      },
      [songs.length]
    );


  // ===================================================
  // FIND SIMILAR SONGS
  // ===================================================

  const findSimilarSongs =
    useCallback(
      async (
        song: Song
      ) => {

        try {

          const results =
            await searchYouTube(
              `${song.artistName} official songs`,
              25
            );


          return results.filter(
            (item) =>
              item.youtubeVideoId !== song.youtubeVideoId
          );

        } catch (caught) {

          console.error(
            "Similar song error:",
            caught
          );

          return [];
        }

      },
      []
    );


  // ===================================================
  // NEXT SONG
  // ===================================================

  const handleNext =
    useCallback(
      async () => {
        if (
          activeIndex === null ||
          songs.length === 0 ||
          loadingNext.current
        ) {
          return;
        }

        const currentSong = songs[activeIndex];

        if (!currentSong) {
          return;
        }

        nextPlayedIds.current.add(currentSong.youtubeVideoId);

        const relatedSong = findRelatedSong(
          songs,
          currentSong,
          nextPlayedIds.current
        );

        if (relatedSong) {
          const relatedIndex = songs.indexOf(relatedSong);
          setActiveIndex(relatedIndex);
          setAutoPlayIndex(relatedIndex);
          return;
        }

        loadingNext.current = true;
        setLoadingMore(true);

        try {
          const similar = await findSimilarSongs(currentSong);
          const existingIds = new Set(
            songs.map((song) => song.youtubeVideoId)
          );
          const newSongs = removeDuplicates(similar)
            .filter(
              (song) =>
                !existingIds.has(song.youtubeVideoId) &&
                !nextPlayedIds.current.has(song.youtubeVideoId)
            )
            .sort(
              (left, right) =>
                Number(
                  sameArtist(
                    right.artistName,
                    currentSong.artistName
                  )
                ) -
                Number(
                  sameArtist(
                    left.artistName,
                    currentSong.artistName
                  )
                )
            );

          if (newSongs.length === 0) {
            nextPlayedIds.current.clear();
            nextPlayedIds.current.add(currentSong.youtubeVideoId);

            const fallbackSong = findRelatedSong(
              songs,
              currentSong,
              nextPlayedIds.current
            );

            if (fallbackSong) {
              const fallbackIndex = songs.indexOf(fallbackSong);
              setActiveIndex(fallbackIndex);
              setAutoPlayIndex(fallbackIndex);
              return;
            }

            setActiveIndex(0);
            setAutoPlayIndex(0);
            return;
          }

          const firstNewIndex = songs.length;

          setSongs((previousSongs) =>
            removeDuplicates([
              ...previousSongs,
              ...newSongs,
            ])
          );
          setActiveIndex(firstNewIndex);
          setAutoPlayIndex(firstNewIndex);
        } finally {
          loadingNext.current = false;
          setLoadingMore(false);
        }
      },
      [activeIndex, songs, findSimilarSongs]
    );


  // ===================================================
  // PREVIOUS SONG
  // ===================================================

  const handlePrevious =
    useCallback(
      () => {
        if (
          activeIndex === null ||
          songs.length === 0
        ) {
          return;
        }

        const previousIndex =
          activeIndex === 0
            ? songs.length - 1
            : activeIndex - 1;

        setActiveIndex(previousIndex);
        setAutoPlayIndex(previousIndex);
      },
      [activeIndex, songs.length]
    );


  const handleFavoritePlay =
    useCallback(
      (index: number) => {
        if (
          index < 0 ||
          index >= favoriteSongs.length
        ) {
          return;
        }

        setFavoriteActiveIndex(index);
      },
      [favoriteSongs.length]
    );


  const handleFavoriteNext =
    useCallback(
      () => {
        if (favoriteSongs.length === 0) {
          return;
        }

        setFavoriteActiveIndex((previousIndex) =>
          previousIndex === null ||
          previousIndex >= favoriteSongs.length - 1
            ? 0
            : previousIndex + 1
        );
      },
      [favoriteSongs.length]
    );


  const handleFavoritePrevious =
    useCallback(
      () => {
        if (favoriteSongs.length === 0) {
          return;
        }

        setFavoriteActiveIndex((previousIndex) =>
          previousIndex === null || previousIndex === 0
            ? favoriteSongs.length - 1
            : previousIndex - 1
        );
      },
      [favoriteSongs.length]
    );


  // ===================================================
  // SLEEP TIMER
  // ===================================================

  useEffect(() => {

    if (
      sleepMinutes <= 0
    ) {

      setSleepRemaining(0);

      return;
    }


    const endTime =
      Date.now() +
      sleepMinutes * 60 * 1000;


    function updateTimer() {

      const remaining =
        Math.max(
          0,
          endTime - Date.now()
        );


      setSleepRemaining(
        Math.ceil(
          remaining / 1000
        )
      );


      if (
        remaining <= 0
      ) {

        /*
          Destroy the active player.
          This stops playback.
        */

        setActiveIndex(null);

        setAutoPlayIndex(null);

        setSleepMinutes(0);
      }
    }


    updateTimer();


    const interval =
      window.setInterval(
        updateTimer,
        1000
      );


    return () => {
      window.clearInterval(
        interval
      );
    };

  }, [sleepMinutes]);


  // ===================================================
  // FORMAT TIMER
  // ===================================================

  const formattedSleepTime =
    `${Math.floor(
      sleepRemaining / 60
    )
      .toString()
      .padStart(2, "0")}:${(
      sleepRemaining % 60
    )
      .toString()
      .padStart(2, "0")}`;


  // ===================================================
  // RENDER
  // ===================================================

  return (
    <>
      <div className={showFavorites ? "view-hidden" : ""}>
        <Home

      loading={
        loading || loadingMore
      }

      error={
        error
      }

      songCount={
        songs.length
      }

      searchQuery={
        searchQuery
      }

      setSearchQuery={
        setSearchQuery
      }

      onSearch={
        handleSearch
      }

      onClearSearch={
        clearSearch
      }

      hasSearched={
        hasSearched
      }

      sleepMinutes={
        sleepMinutes
      }

      setSleepMinutes={
        setSleepMinutes
      }

      sleepRemaining={
        sleepRemaining
      }

      formattedSleepTime={
        formattedSleepTime
      }

      favoriteCount={
        favoriteIds.length
      }

      onShowFavorites={() => {
        setShowFavorites(true);
      }}

        >

          {!error && (

            <MusicList

            songs={
              songs
            }

            activeIndex={
              activeIndex
            }

            autoPlayIndex={
              autoPlayIndex
            }

            onPlay={
              handlePlay
            }

            onNext={
              handleNext
            }

            onPrevious={
              handlePrevious
            }

            favoriteIds={
              favoriteIds
            }

            onToggleFavorite={
              toggleFavorite
            }

            />

          )}

        </Home>
      </div>

      <div className={showFavorites ? "" : "view-hidden"}>
        <Favorites
          songs={favoriteSongs}
          activeIndex={favoriteActiveIndex}
          onPlay={(index: number) => {
            setActiveIndex(null);
            setAutoPlayIndex(null);
            handleFavoritePlay(index);
          }}
          onNext={handleFavoriteNext}
          onPrevious={handleFavoritePrevious}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onBack={() => {
            setShowFavorites(false);
            void clearSearch();
          }}
        />
      </div>
    </>
  );
}

export default App;