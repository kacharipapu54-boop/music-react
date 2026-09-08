/**
 * @typedef {{
 *   songs?: any[];
 *   activeIndex?: number | null;
 *   autoPlayIndex?: number | null;
 *   onPlay?: (index: number) => void;
 *   onNext?: () => void | Promise<void>;
 *   onPrevious?: () => void;
 *   favoriteIds?: string[];
 *   onToggleFavorite?: (song: any) => void;
 *   onBack?: () => void;
 *   shuffleEnabled?: boolean;
 *   onToggleShuffle?: () => void;
 *   backgroundPlayEnabled?: boolean;
 *   onToggleBackgroundPlay?: () => void;
 * }} FavoritesProps
 */

import MusicList from "./Components/musicList.jsx";

/**
 * @param {FavoritesProps} props
 */
function Favorites({
  songs = [],
  activeIndex = null,
  autoPlayIndex = null,
  onPlay = () => undefined,
  onNext = () => undefined,
  onPrevious = () => undefined,
  favoriteIds = [],
  onToggleFavorite = () => undefined,
  onBack = () => undefined,
  shuffleEnabled = false,
  onToggleShuffle = () => undefined,
  backgroundPlayEnabled = true,
  onToggleBackgroundPlay = () => undefined,
}) {
  return (
    <main className="home-page favorites-page">
      <section className="home-library">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <button className="favorites-back" type="button" onClick={onBack}>
            Back to songs
          </button>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onToggleShuffle}
              aria-pressed={shuffleEnabled}
              style={{
                border: "1px solid rgba(25, 51, 47, 0.2)",
                borderRadius: 999,
                background: shuffleEnabled ? "#19332f" : "#fffdf9",
                color: shuffleEnabled ? "#fffdf9" : "#19332f",
                padding: "0.7rem 1rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {shuffleEnabled ? "Shuffle: On" : "Shuffle"}
            </button>

            <button
              type="button"
              onClick={onToggleBackgroundPlay}
              aria-pressed={backgroundPlayEnabled}
              style={{
                border: "1px solid rgba(25, 51, 47, 0.2)",
                borderRadius: 999,
                background: backgroundPlayEnabled ? "#19332f" : "#fffdf9",
                color: backgroundPlayEnabled ? "#fffdf9" : "#19332f",
                padding: "0.7rem 1rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {backgroundPlayEnabled ? "Background play: On" : "Background play: Off"}
            </button>
          </div>
        </div>

        <div className="home-library-heading">
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
            autoPlayIndex={autoPlayIndex}
            onPlay={onPlay}
            onNext={onNext}
            onPrevious={onPrevious}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            backgroundPlayEnabled={backgroundPlayEnabled}
          />
        ) : (
          <div className="favorites-empty">
            <h2>No favorites yet</h2>
            <p>Tap the heart on a song to save it here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default Favorites