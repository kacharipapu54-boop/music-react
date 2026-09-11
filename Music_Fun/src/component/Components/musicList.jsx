import Music_card from "./Music_card";
import "./musicList.css";

function MusicList({
  songs = [],
  activeIndex = null,
  onPlay = () => undefined,
  onNext = () => undefined,
  onPrevious = () => undefined,
  favoriteIds = [],
  onToggleFavorite = () => undefined,
  showActivePlayer = true,
}) {
  if (!songs.length) {
    return (
      <div className="empty-library">
        <div className="empty-icon">♪</div>
        <h3>No songs found</h3>
        <p>Try a different song, artist, or search phrase.</p>
      </div>
    );
  }

  return (
    <div className="music-list">
      {songs.map((song, index) => (
        <Music_card
          key={song.youtubeVideoId || song.trackId}
          song={song}
          isActive={activeIndex === index}
          onPlay={() => onPlay(index)}
          onNext={onNext}
          onPrevious={onPrevious}
          isFavorite={favoriteIds.includes(song.youtubeVideoId)}
          onToggleFavorite={() => onToggleFavorite(song)}
          showPlayer={showActivePlayer}
        />
      ))}
    </div>
  );
}

export default MusicList;
