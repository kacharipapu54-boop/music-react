import { useEffect, useRef, useState } from "react";
import "./Music_card.css";

let youtubeApiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();

      const waitForApi = () => {
        if (window.YT?.Player) {
          resolve(window.YT);
        } else {
          window.setTimeout(waitForApi, 50);
        }
      };

      waitForApi();
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("YouTube API failed to load."));
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

function getYouTubeId(value) {
  if (!value) return "";

  const text = String(value).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  try {
    const url = new URL(text);

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1).split("/")[0];
    }

    const video = url.searchParams.get("v");
    if (video) return video;

    const parts = url.pathname.split("/");
    const embedIndex = parts.indexOf("embed");
    if (embedIndex !== -1) return parts[embedIndex + 1] || "";

    const shortsIndex = parts.indexOf("shorts");
    if (shortsIndex !== -1) return parts[shortsIndex + 1] || "";
  } catch {
    return "";
  }

  return "";
}

function Music_card({
  song,
  isActive,
  onPlay,
  onNext,
  onPrevious,
  isFavorite = false,
  onToggleFavorite,
  showPlayer = true,
}) {
  const cardRef = useRef(null);
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const nextRef = useRef(onNext);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState("");

  const videoId = getYouTubeId(song?.youtubeVideoId);

  useEffect(() => {
    nextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    if (!isActive || !cardRef.current) return;

    const timeout = window.setTimeout(() => {
      cardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [isActive]);

  useEffect(() => {
    let cancelled = false;

    if (!isActive || !videoId || !playerContainerRef.current) return;

    setPlayerReady(false);
    setPlayerError("");

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !playerContainerRef.current) return;

        playerRef.current = new YT.Player(playerContainerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              setPlayerReady(true);
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.ENDED) {
                nextRef.current?.();
              }
            },
            onAutoplayBlocked: () => {
              setPlayerError("Tap the play button inside YouTube to start playback.");
            },
            onError: (event) => {
              const messages = {
                2: "Invalid YouTube video.",
                5: "YouTube player error.",
                100: "This video is unavailable.",
                101: "This video cannot be embedded.",
                150: "This video cannot be embedded.",
                153: "YouTube could not identify this page.",
              };

              setPlayerError(
                messages[event.data] || "This video could not be played."
              );
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setPlayerError("YouTube player could not load.");
      });

    return () => {
      cancelled = true;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore cleanup errors.
        }
        playerRef.current = null;
      }
    };
  }, [isActive, videoId]);

  const handlePlay = (event) => {
    event.stopPropagation();
    onPlay?.();
  };

  return (
    <article
      ref={cardRef}
      className={`music-card ${isActive ? "is-active" : ""}`}
    >
      {!isActive || !showPlayer ? (
        <button
          className="cover-button"
          type="button"
          onClick={handlePlay}
          aria-label={`Play ${song.trackName}`}
        >
          <img
            src={
              song.artworkUrl100 ||
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            }
            alt=""
            loading="lazy"
            decoding="async"
          />
          <span className="cover-shade" />
          <span className="cover-play-icon" aria-hidden="true">▶</span>
        </button>
      ) : (
        <div className="active-player">
          <div
            ref={playerContainerRef}
            className="youtube-player"
            aria-label={`YouTube player for ${song.trackName}`}
          />
          {!playerReady && !playerError && (
            <p className="player-loading">Loading player…</p>
          )}
          {playerError && <p className="player-error">{playerError}</p>}
        </div>
      )}

      <div className="music-info">
        <div className="music-title-row">
          <h3 title={song.trackName}>{song.trackName}</h3>

          <button
            className={`favorite-button ${isFavorite ? "is-favorite" : ""}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite?.();
            }}
            aria-label={
              isFavorite
                ? `Remove ${song.trackName} from favorites`
                : `Add ${song.trackName} to favorites`
            }
            aria-pressed={isFavorite}
          >
            {isFavorite ? "♥" : "♡"}
          </button>
        </div>

        <p title={song.artistName}>{song.artistName}</p>

        {song.durationSeconds ? (
          <span className="track-duration">
            {Math.floor(song.durationSeconds / 60)}:
            {String(song.durationSeconds % 60).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      {isActive && (
        <div className="track-controls" aria-label="Track navigation">
          <button
            className="track-control-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious?.();
            }}
          >
            ← Previous
          </button>
          <button
            className="track-control-button primary"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNext?.();
            }}
          >
            Next →
          </button>
        </div>
      )}
    </article>
  );
}

export default Music_card;
