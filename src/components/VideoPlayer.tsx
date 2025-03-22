
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  initialSrc: string;
  width?: number;
  height?: number;
  refreshInterval?: number; // in milliseconds
  fetchNewUrl?: () => Promise<string>;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  initialSrc,
  width = 797,
  height = 453,
  refreshInterval = 3600000, // Default to 1 hour
  fetchNewUrl,
}) => {
  const [videoSrc, setVideoSrc] = useState<string>(initialSrc);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Extract domain and video ID from the src URL
  const extractVideoInfo = (src: string) => {
    try {
      const url = new URL(src);
      return {
        domain: url.hostname,
        videoId: url.pathname.split('/').pop() || ''
      };
    } catch (error) {
      console.error("Invalid URL:", src);
      return { domain: 'unknown', videoId: 'unknown' };
    }
  };

  const { domain, videoId } = extractVideoInfo(initialSrc);

  // Function to refresh the video URL
  const refreshVideoUrl = async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      if (fetchNewUrl) {
        const newUrl = await fetchNewUrl();
        setVideoSrc(newUrl);
        toast.success("Video source updated successfully");
      } else {
        // If no fetch function is provided, we simulate a refresh by reloading the iframe
        if (iframeRef.current) {
          const currentSrc = iframeRef.current.src;
          iframeRef.current.src = '';
          setTimeout(() => {
            if (iframeRef.current) iframeRef.current.src = currentSrc;
          }, 100);
        }
        toast.info("Video refreshed");
      }
    } catch (error) {
      console.error("Error refreshing video URL:", error);
      setHasError(true);
      toast.error("Failed to update video source");
    } finally {
      setIsLoading(false);
    }
  };

  // Set up automatic refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      timerRef.current = setInterval(refreshVideoUrl, refreshInterval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [refreshInterval]);

  // Handle iframe load error
  const handleIframeError = () => {
    setHasError(true);
    toast.error("Failed to load video");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Source: {domain}
          </p>
          <p className="text-xs text-muted-foreground">
            Video ID: {videoId}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshVideoUrl}
          disabled={isLoading}
          className="flex items-center gap-1 transition-all"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      <div className={`video-container relative ${hasError ? 'video-error' : ''}`}>
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <div className="video-placeholder animate-shimmer w-full h-full"></div>
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center justify-center h-full p-8 space-y-4 bg-muted/30 rounded-lg">
            <AlertCircle className="h-12 w-12 text-destructive animate-pulse-opacity" />
            <div className="text-center">
              <h3 className="text-lg font-medium">Video unavailable</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The video source might have expired. Please try refreshing.
              </p>
            </div>
            <Button onClick={refreshVideoUrl} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={videoSrc}
            width={width}
            height={height}
            frameBorder="0"
            allowFullScreen={true}
            className="w-full rounded-lg transition-opacity duration-300 ease-in-out"
            style={{ opacity: isLoading ? 0.3 : 1 }}
            onError={handleIframeError}
          />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
