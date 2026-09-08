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
import "./favorite.css";
import "./services/home.css";

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
        <div className="favorites-toolbar">
          <button className="favorites-back" type="button" onClick={onBack}>
            Back to songs
          </button>

          <div className="favorites-actions">
            <button
              className="favorites-shuffle"
              type="button"
              onClick={onToggleShuffle}
              aria-pressed={shuffleEnabled}
              aria-label="Shuffle favorite songs"
            >
              {shuffleEnabled ? "Shuffle favorites: On" : "Shuffle favorites"}
            </button>

            <button
              type="button"
              onClick={onToggleBackgroundPlay}
              aria-pressed={backgroundPlayEnabled}
              className="favorites-background"
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