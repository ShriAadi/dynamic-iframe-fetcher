
import React, { useEffect, useRef, useState } from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import { toast } from "sonner";
import { APITypes } from 'plyr-react';
import Hls from 'hls.js';

interface PlyrPlayerProps {
  src: string;
  onError?: () => void;
}

const PlyrPlayer: React.FC<PlyrPlayerProps> = ({ src, onError }) => {
  const playerRef = useRef<APITypes>(null);
  const [hls, setHls] = useState<Hls | null>(null);

  useEffect(() => {
    let hlsInstance: Hls | null = null;
    
    // Function to initialize HLS
    const initializeHls = () => {
      if (Hls.isSupported() && src.includes('.m3u8')) {
        console.log("Initializing HLS for source:", src);
        
        // Destroy previous HLS instance if it exists
        if (hls) {
          hls.destroy();
        }
        
        // Create new HLS instance
        hlsInstance = new Hls({
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          startLevel: -1,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          }
        });
        
        // Attach media element - Fixed: Accessing media element properly
        if (playerRef.current?.plyr) {
          // Access the HTML video element through the plyr instance
          const videoElement = playerRef.current.plyr.media as HTMLVideoElement;
          if (videoElement) {
            hlsInstance.attachMedia(videoElement);
            hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
              console.log("HLS media attached");
              hlsInstance?.loadSource(src);
            });
            
            // Handle HLS events
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
              console.log("HLS manifest parsed, levels:", data.levels.length);
              const availableQualities = data.levels.map((level) => level.height);
              console.log("Available qualities:", availableQualities);
            });
            
            hlsInstance.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) {
                console.error("Fatal HLS error:", data.type, data.details);
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    // Try to recover network error
                    console.log("HLS network error - trying to recover");
                    hlsInstance?.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log("HLS media error - trying to recover");
                    hlsInstance?.recoverMediaError();
                    break;
                  default:
                    // Cannot recover
                    console.error("Unrecoverable HLS error");
                    hlsInstance?.destroy();
                    if (onError) onError();
                    toast.error("Failed to load video stream");
                    break;
                }
              }
            });
            
            setHls(hlsInstance);
          } else {
            console.error("Could not find video element in Plyr");
            if (onError) onError();
          }
        }
      } else if (playerRef.current?.plyr) {
        // Direct source assignment for other formats
        playerRef.current.plyr.source = {
          type: 'video',
          sources: [
            {
              src,
              type: determineVideoType(src),
            },
          ],
        };
      }
    };
    
    // Initialize when component mounts or source changes
    initializeHls();
    
    // Cleanup
    return () => {
      if (hlsInstance) {
        console.log("Destroying HLS instance");
        hlsInstance.destroy();
      }
    };
  }, [src, onError]);

  // Determine video type based on file extension
  const determineVideoType = (url: string): string => {
    if (url.includes('.m3u8')) return 'application/x-mpegURL';
    if (url.includes('.mpd')) return 'application/dash+xml';
    if (url.includes('.mp4')) return 'video/mp4';
    if (url.includes('.webm')) return 'video/webm';
    if (url.includes('.ogg')) return 'video/ogg';
    if (url.includes('.mkv')) return 'video/x-matroska';
    return 'video/mp4'; // Default
  };

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
              type: determineVideoType(src),
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
