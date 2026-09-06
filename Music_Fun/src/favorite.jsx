import MusicList from "./Components/musicList.jsx";

function Favorites({
    songs = [],
    activeIndex = null,
    autoPlayIndex = null,
    onPlay = () => {},
    onNext = () => {},
    onPrevious = () => {},
    favoriteIds = [],
    onToggleFavorite,
    onBack,
}) {
    return (
        <main className="home-page favorites-page">
            <section className="home-library">
                <button className="favorites-back" type="button" onClick={onBack}>
                    Back to songs
                </button>
                <div className="home-library-heading">
                    <div>
                        <p className="home-section-label">Your collection</p>
                        <h2>Your Favorites</h2>
                    </div>
                    <span className="song-count">
                        {favoriteIds.length} songs
                    </span>
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