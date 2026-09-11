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
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <div className="home-hero-content">
          <div className="hero-topline">
            <p className="home-eyebrow">Your personal music space</p>

            <button
              className="favorites-heart-button"
              type="button"
              onClick={onShowFavorites}
              aria-label={`Open favorites, ${favoriteCount} songs saved`}
            >
              <span aria-hidden="true">♥</span>
              <strong>{favoriteCount}</strong>
            </button>
          </div>

          <h1>
            Listen.
            <br />
            <em>Feel more.</em>
          </h1>

          <p className="home-intro">
            Find the songs you love, build your collection, and keep the music
            moving.
          </p>

          <form className="music-search" onSubmit={onSearch}>
            <div className="search-input-wrapper">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>

              <label className="sr-only" htmlFor="home-search">
                Search songs or artists
              </label>

              <input
                id="home-search"
                type="search"
                value={searchQuery || ""}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search songs, artists or albums..."
                aria-label="Search songs or artists"
              />

              {searchQuery && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={onClearSearch}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <button
              className="search-button"
              type="submit"
              disabled={!searchQuery?.trim() || loading}
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          <div className="hero-meta">
            <span><i /> YouTube powered</span>
            <span>{songCount} songs ready</span>
            <button type="button" onClick={onShowFavorites}>
              ♥ Favorites
            </button>
          </div>

          <a
            className="instagram-link"
            href="https://www.instagram.com/_.p_.a_.p_.u_/"
            target="_blank"
            rel="noreferrer"
          >
            Follow the project <span>@_.p_.a_.p_.u_</span> ↗
          </a>

          {hasSearched && !loading && !error && (
            <button
              className="search-back-button"
              type="button"
              onClick={onClearSearch}
            >
              ← Back to recommendations
            </button>
          )}
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-ring hero-art-ring-one" />
          <div className="hero-art-ring hero-art-ring-two" />
          <div className="hero-art-disc">
            <div className="hero-art-label">M</div>
          </div>
        </div>
      </section>

      <section className="home-library" aria-label="Songs">
        <div className="home-library-heading">
          <div>
            <p className="home-section-label">
              {hasSearched ? "Search results" : "Made for you"}
            </p>
            <h2>{hasSearched ? "Songs" : "Recommended songs"}</h2>
          </div>

          {!loading && !error && songCount > 0 && (
            <span className="song-count">{songCount} songs</span>
          )}
        </div>

        <div className="sleep-timer">
          <div className="sleep-timer-icon" aria-hidden="true">◷</div>
          <div className="sleep-timer-info">
            <strong>Sleep timer</strong>
            <span>
              {sleepRemaining > 0
                ? `Stops in ${formattedSleepTime}`
                : "Music stops automatically when the timer ends"}
            </span>
          </div>

          <select
            value={sleepMinutes}
            onChange={(event) => setSleepMinutes(Number(event.target.value))}
            aria-label="Sleep timer"
          >
            <option value="0">Off</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
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

        {error && (
          <div className="recommendation-error">
            <div className="error-icon">!</div>
            <h3>Couldn't load your music</h3>
            <p>{error}</p>
          </div>
        )}

        {!error && !loading && children}
      </section>
    </main>
  );
}

export default Home;
