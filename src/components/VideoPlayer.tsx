
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, AlertCircle, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { extractOriginalVideoUrl } from '@/services/videoService';

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
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const [useEmbedView, setUseEmbedView] = useState<boolean>(false);
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isDirectVideoUrl = (url: string): boolean => {
    return url.endsWith('.m3u8') || 
           url.includes('/stream') || 
           url.match(/\.(mp4|webm|ogg|mov)$/i) !== null;
  };

  // Update video source when initialSrc changes
  useEffect(() => {
    setVideoSrc(initialSrc);
    
    // Create embed URL from initial source if it's not a direct video
    if (!isDirectVideoUrl(initialSrc)) {
      setEmbedUrl(initialSrc);
    } else {
      // For direct URLs, revert to the original non-direct URL if we have it
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
      }
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
        
        // Also update the embed URL if needed
        if (!isDirectVideoUrl(newUrl)) {
          setEmbedUrl(newUrl);
        }
        
        toast.success("Video source updated successfully");
      } else {
        if (isDirectVideoUrl(videoSrc) && !useEmbedView) {
          if (videoRef.current) {
            videoRef.current.load();
          }
        } else if (iframeRef.current) {
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

  const handleExtractOriginal = async () => {
    if (isDirectVideoUrl(videoSrc)) {
      toast.info("This is already a direct video URL");
      return;
    }
    
    setIsExtracting(true);
    try {
      const extractedUrl = await extractOriginalVideoUrl(videoSrc);
      if (extractedUrl) {
        setOriginalVideoUrl(extractedUrl);
        setVideoSrc(extractedUrl); // Automatically use the direct URL
        setUseEmbedView(false); // Switch to direct view
        toast.success("Using direct video stream for better TV compatibility");
      } else {
        toast.error("Could not extract original video URL");
      }
    } catch (error) {
      console.error("Error extracting original video URL:", error);
      toast.error("Failed to extract original video URL");
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleEmbedView = () => {
    setUseEmbedView(!useEmbedView);
    if (!useEmbedView) {
      // Switching to embed view
      toast.info("Switched to embedded player view");
    } else {
      // Switching to direct view
      toast.info("Switched to direct player view");
    }
  };

  useEffect(() => {
    if (refreshInterval > 0) {
      timerRef.current = setInterval(refreshVideoUrl, refreshInterval);
    }

    // If this is an Android TV or large format device, try to extract the direct URL for better compatibility
    const checkAndExtractForTV = async () => {
      // Only do this for iframe sources
      if (!isDirectVideoUrl(videoSrc) && !originalVideoUrl) {
        await handleExtractOriginal();
      }
    };
    
    checkAndExtractForTV();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [refreshInterval, videoSrc]);

  const handleMediaError = () => {
    setHasError(true);
    toast.error("Failed to load video");
    
    // If direct URL fails, offer to switch to embed view
    if (isDirectVideoUrl(videoSrc) && !useEmbedView && embedUrl) {
      toast.info("Try switching to embedded player view", {
        action: {
          label: "Switch",
          onClick: () => setUseEmbedView(true)
        }
      });
    }
  };

  const switchToOriginalSource = () => {
    if (originalVideoUrl) {
      setVideoSrc(originalVideoUrl);
      setUseEmbedView(false);
      toast.success("Switched to original video source");
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => toast.success("URL copied to clipboard"))
      .catch(err => {
        console.error("Could not copy URL: ", err);
        toast.error("Failed to copy URL");
      });
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
          {!isDirectVideoUrl(videoSrc) && !useEmbedView && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractOriginal}
              disabled={isExtracting}
              className="flex items-center gap-1 transition-all"
            >
              <ExternalLink className={`h-3.5 w-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
              <span>{isExtracting ? 'Extracting...' : 'Extract Original'}</span>
            </Button>
          )}
          {isDirectVideoUrl(videoSrc) || embedUrl ? (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleEmbedView}
              className="flex items-center gap-1 transition-all"
            >
              {useEmbedView ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{useEmbedView ? 'Direct Player' : 'Embed Player'}</span>
            </Button>
          ) : null}
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

      {originalVideoUrl && videoSrc !== originalVideoUrl && !useEmbedView && (
        <div className="p-3 bg-muted/30 rounded-md mb-4">
          <div className="flex justify-between items-center">
            <p className="text-sm">
              <span className="font-medium">Direct streaming available</span>
            </p>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={switchToOriginalSource}
              >
                Use Direct Stream
              </Button>
            </div>
          </div>
        </div>
      )}

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
                The video source might have expired. Please try refreshing or switch to embedded player.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={refreshVideoUrl} variant="outline">
                Try Again
              </Button>
              {embedUrl && !useEmbedView && (
                <Button onClick={toggleEmbedView} variant="default">
                  Try Embed Player
                </Button>
              )}
            </div>
          </div>
        ) : useEmbedView && embedUrl ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            width={width}
            height={height}
            frameBorder="0"
            allowFullScreen={true}
            className="w-full aspect-video rounded-lg transition-opacity duration-300 ease-in-out"
            style={{ opacity: isLoading ? 0.3 : 1 }}
            onError={handleMediaError}
          />
        ) : isDirectVideoUrl(videoSrc) ? (
          <video
            ref={videoRef}
            src={videoSrc}
            width={width}
            height={height}
            controls
            autoPlay
            className="w-full aspect-video rounded-lg transition-opacity duration-300 ease-in-out"
            style={{ opacity: isLoading ? 0.3 : 1 }}
            onError={handleMediaError}
            playsInline // Better mobile experience
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <iframe
            ref={iframeRef}
            src={videoSrc}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 tv-controls">
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
        
        {!isDirectVideoUrl(videoSrc) && !useEmbedView && (
          <Button 
            variant="default" 
            size="lg" 
            onClick={handleExtractOriginal}
            className="text-lg py-6 tv-button"
            disabled={isExtracting}
          >
            <ExternalLink className="h-6 w-6 mr-2" />
            Get Direct Stream
          </Button>
        )}
        
        {(isDirectVideoUrl(videoSrc) || embedUrl) && (
          <Button 
            variant="default" 
            size="lg" 
            onClick={toggleEmbedView}
            className="text-lg py-6 tv-button"
          >
            {useEmbedView ? <Minimize2 className="h-6 w-6 mr-2" /> : <Maximize2 className="h-6 w-6 mr-2" />}
            {useEmbedView ? 'Direct Player' : 'Embed Player'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
