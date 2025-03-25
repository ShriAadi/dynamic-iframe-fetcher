
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
  movieTitle?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  initialSrc,
  width = 797,
  height = 453,
  refreshInterval = 3600000, // Default to 1 hour
  fetchNewUrl,
  movieTitle = "",
}) => {
  const [videoSrc, setVideoSrc] = useState<string>(initialSrc);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update video source when initialSrc changes
  useEffect(() => {
    setVideoSrc(initialSrc);
    
    // Create embed URL from initial source
    const baseUrl = initialSrc.split('/stream')[0];
    if (baseUrl.includes('jole340erun.com')) {
      // Extract the movie ID from the URL or use a default embed URL
      const movieId = initialSrc.includes('/play/') 
        ? initialSrc.split('/play/')[1].split('?')[0] 
        : extractMovieIdFromUrl(initialSrc);
      
      if (movieId) {
        setEmbedUrl(`https://jole340erun.com/play/${movieId}`);
      } else {
        setEmbedUrl(initialSrc);
      }
    } else {
      setEmbedUrl(initialSrc);
    }
  }, [initialSrc]);

  const extractMovieIdFromUrl = (url: string): string => {
    // Extract movie ID from URL (e.g., tt12345678)
    const ttMatch = url.match(/tt\d+/);
    return ttMatch ? ttMatch[0] : "";
  };

  const refreshVideoUrl = async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      if (fetchNewUrl) {
        const newUrl = await fetchNewUrl();
        setVideoSrc(newUrl);
        
        // Update the embed URL
        const baseUrl = newUrl.split('/stream')[0];
        if (baseUrl.includes('jole340erun.com')) {
          const movieId = newUrl.includes('/play/') 
            ? newUrl.split('/play/')[1].split('?')[0] 
            : extractMovieIdFromUrl(newUrl);
          
          if (movieId) {
            setEmbedUrl(`https://jole340erun.com/play/${movieId}`);
          } else {
            setEmbedUrl(newUrl);
          }
        } else {
          setEmbedUrl(newUrl);
        }
        
        toast.success("Video source updated successfully");
      } else {
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

  useEffect(() => {
    if (refreshInterval > 0) {
      timerRef.current = setInterval(refreshVideoUrl, refreshInterval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [refreshInterval, videoSrc]);

  const handleMediaError = () => {
    setHasError(true);
    toast.error("Failed to load video");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base md:text-lg font-medium">
            {movieTitle}
          </h3>
        </div>
        <div className="flex gap-2">
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
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={refreshVideoUrl} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={embedUrl || videoSrc}
            width={width}
            height={height}
            frameBorder="0"
            allowFullScreen={true}
            className="w-full aspect-video rounded-lg transition-opacity duration-300 ease-in-out"
            style={{ opacity: isLoading ? 0.3 : 1 }}
            onError={handleMediaError}
          />
        )}
      </div>
      
      {/* TV-friendly controls - bigger touch targets */}
      <div className="grid grid-cols-1 gap-3 mt-4 tv-controls">
        <Button 
          variant="outline" 
          size="lg" 
          onClick={refreshVideoUrl}
          className="text-lg py-6 tv-button"
          disabled={isLoading}
        >
          <RefreshCcw className="h-6 w-6 mr-2" />
          Refresh Video
        </Button>
      </div>
    </div>
  );
};

export default VideoPlayer;
