/**
 * @typedef {{
 *   songs?: any[];
 *   activeIndex?: number | null;
 *   onPlay?: (index: number) => void;
 *   onNext?: () => void | Promise<void>;
 *   onPrevious?: () => void;
 *   favoriteIds?: string[];
 *   onToggleFavorite?: (song: any) => void;
 *   onBack?: () => void;
 *   shuffleEnabled?: boolean;
 *   onToggleShuffle?: () => void;
 *   showPlayer?: boolean;
 * }} FavoritesProps
 */

import MusicList from "./Components/musicList.jsx";
import "./favorite.css";

/**
 * @param {FavoritesProps} props
 */
function Favorites({
  songs = [],
  activeIndex = null,
  onPlay = () => undefined,
  onNext = () => undefined,
  onPrevious = () => undefined,
  favoriteIds = [],
  onToggleFavorite = (_song) => undefined,
  onBack = () => undefined,
  shuffleEnabled = false,
  onToggleShuffle = () => undefined,
  showPlayer = true,
}) {
  return (
    <main className="favorites-page">
      <div className="favorites-container">

        <div className="favorites-header">
          <button
            className="favorites-back"
            type="button"
            onClick={onBack}
          >
            ← Back
          </button>

          <div>
            <p className="favorites-eyebrow">
              YOUR COLLECTION
            </p>

            <h1>Your Favorites</h1>

            <p className="favorites-count">
              {songs.length} saved song{songs.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="favorites-actions">

          <button
            type="button"
            className={`favorites-action ${
              shuffleEnabled ? "active" : ""
            }`}
            onClick={onToggleShuffle}
            aria-pressed={shuffleEnabled}
          >
            🔀 {shuffleEnabled ? "Shuffle On" : "Shuffle"}
          </button>

        </div>

        <MusicList
          songs={songs}
          activeIndex={activeIndex}
          onPlay={onPlay}
          onNext={onNext}
          onPrevious={onPrevious}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          showPlayer={showPlayer}
        />

      </div>
    </main>
  );
}

export default Favorites;