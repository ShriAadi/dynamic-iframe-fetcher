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
  const [playerMode, setPlayerMode] = useState<'direct' | 'iframe'>('direct');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Check if we're using the iframe proxy approach
    if (src.startsWith('iframe://')) {
      const iframeUrl = src.replace('iframe://', '');
      setIframeSrc(iframeUrl);
      setPlayerMode('iframe');
      return;
    }
    
    setPlayerMode('direct');
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
        
        // Wait for component to properly mount before trying to access video element
        setTimeout(() => {
          if (playerRef.current?.plyr) {
            // Get the video element using a more reliable selector
            const playerElement = document.querySelector('.plyr-container video') as HTMLVideoElement;
            
            if (playerElement) {
              console.log("Found video element, attaching HLS");
              hlsInstance?.attachMedia(playerElement);
              hlsInstance?.on(Hls.Events.MEDIA_ATTACHED, () => {
                console.log("HLS media attached");
                hlsInstance?.loadSource(src);
              });
              
              // Handle HLS events
              hlsInstance?.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
                console.log("HLS manifest parsed, levels:", data.levels.length);
                const availableQualities = data.levels.map((level) => level.height);
                console.log("Available qualities:", availableQualities);
                
                // Auto-play when manifest is parsed
                playerRef.current?.plyr?.play();
              });
              
              hlsInstance?.on(Hls.Events.ERROR, (_, data) => {
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
              console.error("Could not find video element using direct DOM selector");
              
              // Try again with a longer delay as a fallback
              setTimeout(() => {
                const videoElement = document.querySelector('.plyr-container video') as HTMLVideoElement;
                if (videoElement) {
                  console.log("Found video element on second attempt");
                  hlsInstance?.attachMedia(videoElement);
                  hlsInstance?.on(Hls.Events.MEDIA_ATTACHED, () => {
                    hlsInstance?.loadSource(src);
                  });
                  setHls(hlsInstance);
                } else if (onError) {
                  onError();
                }
              }, 500);
            }
          }
        }, 200); // Increased delay to ensure the Plyr component is fully mounted
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
    
    // Setup message event listener for iframe communication
    const handleMessage = (event: MessageEvent) => {
      try {
        // Handle messages from iframe players
        if (event.data && typeof event.data === 'object' && event.data.type === 'video-extracted') {
          const extractedUrl = event.data.url;
          console.log("Received extracted video URL from iframe:", extractedUrl);
          if (extractedUrl && typeof extractedUrl === 'string') {
            setVideoSrc(extractedUrl);
          }
        }
      } catch (error) {
        console.error("Error handling iframe message:", error);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Cleanup
    return () => {
      if (hlsInstance) {
        console.log("Destroying HLS instance");
        hlsInstance.destroy();
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [src, onError, hls]);

  // Function to handle setting video source from iframe message
  const setVideoSrc = (newSrc: string) => {
    setPlayerMode('direct');
    setIframeSrc(null);
    
    // Clean up existing HLS instance if any
    if (hls) {
      hls.destroy();
      setHls(null);
    }
    
    // Update source for player
    if (playerRef.current?.plyr) {
      playerRef.current.plyr.source = {
        type: 'video',
        sources: [
          {
            src: newSrc,
            type: determineVideoType(newSrc),
          },
        ],
      };
    }
  };

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

  // If we're in iframe mode, render an iframe
  if (playerMode === 'iframe' && iframeSrc) {
    return (
      <div className="plyr-container rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full"
          style={{ width: '100%', height: '450px' }}
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media"
        />
      </div>
    );
  }

  // Otherwise render the Plyr player
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
