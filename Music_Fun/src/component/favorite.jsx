import MusicList from "./Components/musicList.jsx";
import "./favorite.css";
import "./Components/home.css";

function Favorites({
  songs = [],
  activeIndex = null,
  onPlay = () => undefined,
  onNext = () => undefined,
  onPrevious = () => undefined,
  favoriteIds = [],
  onToggleFavorite = () => undefined,
  onBack = () => undefined,
  shuffleEnabled = false,
  onToggleShuffle = () => undefined,
  showActivePlayer = true,
  loading = false,
  searchQuery = "",
  setSearchQuery = () => undefined,
  onSearch = () => undefined,
}) {
  return (
    <main className="home-page favorites-page">
      <section className="home-library">
        <div className="favorites-toolbar">
          <form className="search-results-form" onSubmit={onSearch}>
            <label className="sr-only" htmlFor="favorites-search">
              Search songs or artists
            </label>
            <input
              id="favorites-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search songs or artists..."
              aria-label="Search songs or artists"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim() || loading}
              aria-busy={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          <button className="favorites-back" type="button" onClick={onBack}>
            ← Back to songs
          </button>

          <div className="favorites-actions">
            <button
              className="favorites-shuffle"
              type="button"
              onClick={onToggleShuffle}
              aria-pressed={shuffleEnabled}
            >
              {shuffleEnabled ? "Shuffle · On" : "Shuffle favorites"}
            </button>
          </div>
        </div>

        <div className="home-library-heading favorites-heading">
          <div>
            <p className="home-section-label">Your collection</p>
            <h2>Your Favorites</h2>
          </div>
          <span className="song-count">{favoriteIds.length} songs</span>
        </div>

        {songs.length > 0 ? (
          <MusicList
            songs={songs}
            activeIndex={activeIndex}
            onPlay={onPlay}
            onNext={onNext}
            onPrevious={onPrevious}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            showActivePlayer={showActivePlayer}
          />
        ) : (
          <div className="favorites-empty">
            <div className="favorites-empty-icon">♥</div>
            <h2>Your favorites are empty</h2>
            <p>Tap the heart on any song to build your collection.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default Favorites;
