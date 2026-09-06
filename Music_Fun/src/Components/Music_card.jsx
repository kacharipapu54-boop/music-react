import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./Music_card.css";


// =====================================================
// YouTube API loader
// =====================================================

let youtubeApiPromise = null;

function loadYouTubeApi() {

  if (window.YT?.Player) {
    return Promise.resolve(
      window.YT
    );
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise =
    new Promise((resolve, reject) => {

      const existingScript =
        document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        );

      const oldCallback =
        window.onYouTubeIframeAPIReady;


      window.onYouTubeIframeAPIReady =
        () => {

          oldCallback?.();

          const waitForYouTube =
            () => {

              if (window.YT?.Player) {
                resolve(
                  window.YT
                );

                return;
              }

              setTimeout(
                waitForYouTube,
                50
              );
            };

          waitForYouTube();
        };


      if (!existingScript) {

        const script =
          document.createElement(
            "script"
          );

        script.src =
          "https://www.youtube.com/iframe_api";

        script.async = true;

        script.onerror = () => {
          reject(
            new Error(
              "YouTube API failed to load."
            )
          );
        };

        document.head.appendChild(
          script
        );
      }

    });

  return youtubeApiPromise;
}


// =====================================================
// Extract YouTube ID
// =====================================================

function getYouTubeId(value) {

  if (!value) {
    return "";
  }

  const text =
    String(value).trim();


  // Already an ID
  if (
    /^[a-zA-Z0-9_-]{11}$/.test(
      text
    )
  ) {
    return text;
  }


  try {

    const url =
      new URL(text);


    if (
      url.hostname.includes(
        "youtu.be"
      )
    ) {
      return url.pathname
        .slice(1)
        .split("/")[0];
    }


    const video =
      url.searchParams.get(
        "v"
      );

    if (video) {
      return video;
    }


    const parts =
      url.pathname.split("/");


    const embed =
      parts.indexOf(
        "embed"
      );

    if (embed !== -1) {
      return (
        parts[embed + 1] ||
        ""
      );
    }


    const shorts =
      parts.indexOf(
        "shorts"
      );

    if (shorts !== -1) {
      return (
        parts[shorts + 1] ||
        ""
      );
    }

  } catch {
    return "";
  }

  return "";
}


// =====================================================
// Music Card
// =====================================================

function Music_card({
  song,
  isActive,
  onPlay,
  onNext,
  onPrevious,
  isFavorite = false,
  onToggleFavorite,
}) {

  const cardRef =
    useRef(null);

  const playerContainerRef =
    useRef(null);

  const playerRef =
    useRef(null);

  const nextRef =
    useRef(onNext);


  const [playerReady, setPlayerReady] =
    useState(false);

  const [playerError, setPlayerError] =
    useState("");


  const videoId =
    getYouTubeId(
      song?.youtubeVideoId
    );


  // Always keep latest callback
  useEffect(() => {
    nextRef.current =
      onNext;
  }, [onNext]);


  // ===================================================
  // Auto-scroll to active card
  // ===================================================

  useEffect(() => {

    if (
      !isActive ||
      !cardRef.current
    ) {
      return;
    }

    // Small delay so the DOM has settled
    // (e.g. new songs appended) before scrolling.
    const timeout =
      setTimeout(() => {

        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      }, 300);

    return () =>
      clearTimeout(timeout);

  }, [isActive]);


  // ===================================================
  // Create player only for active card
  // ===================================================

  useEffect(() => {

    let cancelled = false;


    if (
      !isActive ||
      !videoId ||
      !playerContainerRef.current
    ) {
      return;
    }


    setPlayerReady(false);
    setPlayerError("");


    loadYouTubeApi()
      .then((YT) => {

        if (
          cancelled ||
          !playerContainerRef.current
        ) {
          return;
        }


        playerRef.current =
          new YT.Player(
            playerContainerRef.current,
            {

              videoId,

              playerVars: {
                autoplay: 1,
                controls: 1,
                playsinline: 1,
                rel: 0,
                modestbranding: 1,
                enablejsapi: 1,
                origin:
                  window.location.origin,
              },


              events: {

                // -------------------------------------
                // Ready
                // -------------------------------------

                onReady: (event) => {

                  if (cancelled) {
                    return;
                  }

                  setPlayerReady(true);

                  // User clicked the cover,
                  // so start immediately.
                  event.target.playVideo();
                },


                // -------------------------------------
                // State changes
                // -------------------------------------

                onStateChange: (event) => {

                  if (
                    event.data ===
                    YT.PlayerState.ENDED
                  ) {

                    nextRef.current?.();
                  }
                },


                // -------------------------------------
                // Autoplay blocked
                // -------------------------------------

                onAutoplayBlocked: () => {

                  setPlayerError(
                    "Tap the YouTube play button to start playback."
                  );
                },


                // -------------------------------------
                // Errors
                // -------------------------------------

                onError: (event) => {

                  console.error(
                    "YouTube error:",
                    event.data
                  );


                  const messages = {
                    2: "Invalid YouTube video.",
                    5: "YouTube HTML5 player error.",
                    100: "This video is unavailable.",
                    101: "This video cannot be embedded.",
                    150: "This video cannot be embedded.",
                    153: "YouTube could not identify this page.",
                  };


                  setPlayerError(
                    messages[
                      event.data
                    ] ||
                    "This video could not be played."
                  );
                },

              },

            }
          );

      })

      .catch((error) => {

        console.error(
          "YouTube player error:",
          error
        );

        if (!cancelled) {

          setPlayerError(
            "YouTube player could not load."
          );
        }
      });


    // =================================================
    // Cleanup
    // =================================================

    return () => {

      cancelled = true;


      if (
        playerRef.current
      ) {

        try {
          playerRef.current.destroy();
        } catch {
          // Ignore
        }

        playerRef.current =
          null;
      }
    };

  }, [
    isActive,
    videoId,
  ]);


  // ===================================================
  // Cover click
  // ===================================================

  const handlePlay =
    (event) => {

      event.stopPropagation();

      onPlay?.();
    };


  return (
    <article
      ref={cardRef}
      className={
        `music-card ${
          isActive
            ? "is-active scroll-highlight"
            : ""
        }`
      }
    >

      {/* ==============================================
          COVER
      ============================================== */}

      {!isActive && (

        <button
          className="cover-button"
          type="button"
          onClick={
            handlePlay
          }
          aria-label={
            `Play ${song.trackName}`
          }
        >

          <img
            src={
              song.artworkUrl100 ||
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            }
            alt={
              song.trackName
            }
            loading="lazy"
          />

          <span className="cover-overlay">
            <span className="cover-play-icon">
              ▶
            </span>
          </span>

        </button>

      )}


      {/* ==============================================
          ACTIVE YOUTUBE PLAYER
      ============================================== */}

      {isActive && videoId && (

        <div className="active-player">

          <div
            ref={
              playerContainerRef
            }
            className="youtube-player"
          />

          {!playerReady &&
            !playerError && (
              <p className="player-loading">
                Loading player...
              </p>
            )}

          {playerError && (
            <p className="player-error">
              {playerError}
            </p>
          )}

        </div>

      )}


      {/* ==============================================
          SONG INFORMATION
      ============================================== */}

      <div className="music-info">

        <h3
          title={
            song.trackName
          }
        >
          {song.trackName}
        </h3>

        <p
          title={
            song.artistName
          }
        >
          {song.artistName}
        </p>

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


      {/* ==============================================
          CONTROLS
      ============================================== */}

      {isActive && (
        <div className="track-controls" aria-label="Track navigation">
          <button
            className="track-control-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious?.();
            }}
            aria-label="Play previous song"
          >
            Previous
          </button>

          <button
            className="track-control-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNext?.();
            }}
            aria-label="Play next song"
          >
            Next
          </button>
        </div>
      )}
      

    </article>
  );
}

export default Music_card;