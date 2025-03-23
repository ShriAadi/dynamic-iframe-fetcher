
import React, { useEffect, useRef } from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import { toast } from "sonner";

interface PlyrPlayerProps {
  src: string;
  onError?: () => void;
}

const PlyrPlayer: React.FC<PlyrPlayerProps> = ({ src, onError }) => {
  const playerRef = useRef<Plyr>(null);

  useEffect(() => {
    // Reset the player when src changes
    if (playerRef.current?.plyr) {
      playerRef.current.plyr.source = {
        type: 'video',
        sources: [
          {
            src,
            type: src.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
          },
        ],
      };
    }
  }, [src]);

  const handleError = () => {
    console.error("Plyr error: Failed to load video");
    if (onError) {
      onError();
    }
    toast.error("Failed to load video");
  };

  const plyrOptions = {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'captions',
      'settings',
      'pip',
      'airplay',
      'fullscreen',
    ],
    settings: ['captions', 'quality', 'speed', 'loop'],
    i18n: {
      restart: 'Restart',
      rewind: 'Rewind {seektime}s',
      play: 'Play',
      pause: 'Pause',
      fastForward: 'Forward {seektime}s',
      seek: 'Seek',
      played: 'Played',
      buffered: 'Buffered',
      currentTime: 'Current time',
      duration: 'Duration',
      volume: 'Volume',
      mute: 'Mute',
      unmute: 'Unmute',
      enableCaptions: 'Enable captions',
      disableCaptions: 'Disable captions',
      enterFullscreen: 'Enter fullscreen',
      exitFullscreen: 'Exit fullscreen',
      frameTitle: 'Player for {title}',
      captionsMenu: 'Captions menu',
      speed: 'Speed',
      normal: 'Normal',
      quality: 'Quality',
      loop: 'Loop',
    },
  };

  return (
    <div className="plyr-container rounded-lg overflow-hidden">
      <Plyr
        ref={playerRef}
        source={{
          type: 'video',
          sources: [
            {
              src,
              type: src.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
            },
          ],
        }}
        options={plyrOptions}
        onError={handleError}
      />
    </div>
  );
};

export default PlyrPlayer;
