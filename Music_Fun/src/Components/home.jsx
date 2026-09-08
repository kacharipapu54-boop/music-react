import "./home.css";

function Home({
  children,
  loading,
  error,
  songCount = 0,

  searchQuery,
  setSearchQuery,
  onSearch,
  onClearSearch,
  hasSearched,

  sleepMinutes,
  setSleepMinutes,
  sleepRemaining,
  formattedSleepTime,
  favoriteCount = 0,
  onShowFavorites,
}) {
  if (hasSearched && !loading && !error) {
    return (
      <main className="home-page search-results-only">
        <section className="home-library" aria-label="Search results">
          {children}
        </section>
      </main>
    );
  }

  return (
    <main className="home-page">

      {/* =========================================
          HERO
      ========================================= */}

      <section className="home-hero">

        <div className="home-hero-content">

          <p className="home-eyebrow">
            Your personal music space
          </p>

          <h1>
            Listen,
            <br />
            your way.
          </h1>

          <p className="home-intro">
            Search for songs, discover artists,
            and let the music keep playing.
          </p>

          <p className="ad-free-message">
            Here you can listen to ad-free songs.
          </p>

          <button
            className="favorites-heart-button"
            type="button"
            onClick={onShowFavorites}
            aria-label={`Open favorites, ${favoriteCount} songs saved`}
          >
            <span aria-hidden="true">♥</span>
            <strong>{favoriteCount}</strong>
          </button>

          <a
            className="instagram-link"
            href="https://www.instagram.com/_.p_.a_.p_.u_/"
            target="_blank"
            rel="noreferrer"
          >
            Follow me on Instagram <span aria-hidden="true">@_.p_.a_.p_.u_</span>
          </a>


          {/* =====================================
              SEARCH BAR
          ===================================== */}

          <form
            className="music-search"
            onSubmit={onSearch}
          >

            <div className="search-input-wrapper">

              <span className="search-icon">
                🔍
              </span>

              <input
                type="search"
                value={
                  searchQuery || ""
                }
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search songs or artists..."
                aria-label="Search songs or artists"
              />


              {searchQuery && (

                <button
                  type="button"
                  className="clear-search"
                  onClick={
                    onClearSearch
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>

              )}

            </div>


            <button
              className="search-button"
              type="submit"
              disabled={
                !searchQuery?.trim() ||
                loading
              }
            >
              Search
            </button>

          </form>

          {hasSearched && !loading && !error && (
            <button
              className="search-back-button"
              type="button"
              onClick={onClearSearch}
            >
              Back to recommendations
            </button>
          )}

        </div>

      </section>


      {/* =========================================
          LIBRARY
      ========================================= */}

      <section
        className="home-library"
        aria-label="Songs"
      >

        <div className="home-library-heading">

          <div>

            <p className="home-section-label">

              {hasSearched
                ? "Search results"
                : "For you"}

            </p>

            <h2>

              {hasSearched
                ? "Songs"
                : "Recommended songs"}

            </h2>

          </div>


          {!loading &&
            !error &&
            songCount > 0 && (

              <span className="song-count">
                {songCount} songs
              </span>

            )}

        </div>


        {/* =====================================
            SLEEP TIMER
        ===================================== */}

        <div className="sleep-timer">

          <div className="sleep-timer-icon">
            😴
          </div>

          <div className="sleep-timer-info">

            <strong>
              Sleep timer
            </strong>

            {sleepRemaining > 0 && (
              <span>
                Stops in {formattedSleepTime}
              </span>
            )}

          </div>


          <select
            value={
              sleepMinutes
            }
            onChange={(event) =>
              setSleepMinutes(
                Number(
                  event.target.value
                )
              )
            }
            aria-label="Sleep timer"
          >

            <option value="0">
              Off
            </option>

            <option value="15">
              15 minutes
            </option>

            <option value="30">
              30 minutes
            </option>

            <option value="45">
              45 minutes
            </option>

            <option value="60">
              60 minutes
            </option>

            <option value="90">
              90 minutes
            </option>

          </select>

        </div>


        {/* =====================================
            LOADING
        ===================================== */}

        {loading && (

          <div className="recommendation-loading">

            <div className="loading-spinner" />

            <p>
              Finding songs...
            </p>

          </div>

        )}


        {/* =====================================
            ERROR
        ===================================== */}

        {error && (

          <div className="recommendation-error">

            <div className="error-icon">
              !
            </div>

            <h3>
              Couldn't find songs
            </h3>

            <p>
              {error}
            </p>

          </div>

        )}


        {/* =====================================
            SONG LIST
        ===================================== */}

        {!error && children}

      </section>

    </main>
  );
}

export default Home;