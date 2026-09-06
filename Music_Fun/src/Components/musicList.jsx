import Music_card from "./Music_card";
import "./musicList.css";

function MusicList({
  songs,
  activeIndex,
  autoPlayIndex,
  onPlay,
  onNext,
  onPrevious,
}) {

  if (
    !songs ||
    songs.length === 0
  ) {

    return (
      <div className="empty-library">

        <div className="empty-icon">
          🎵
        </div>

        <h3>
          No songs found
        </h3>

        <p>
          Try another song or artist.
        </p>

      </div>
    );
  }


  return (
    <div className="music-list">

      {songs.map(
        (song, index) => (

          <Music_card

            key={
              song.youtubeVideoId ||
              song.trackId
            }

            song={
              song
            }

            isActive={
              activeIndex === index
            }

            autoPlay={
              autoPlayIndex === index
            }

            onPlay={() =>
              onPlay(index)
            }

            onNext={
              onNext
            }

            onPrevious={
              onPrevious
            }

          />

        )
      )}

    </div>
  );
}

export default MusicList;