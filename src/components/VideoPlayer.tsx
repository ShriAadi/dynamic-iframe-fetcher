import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, AlertCircle, ExternalLink } from "lucide-react";
import { extractOriginalVideoUrl } from '@/services/videoService';

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
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isDirectVideoUrl = (url: string): boolean => {
    return url.endsWith('.m3u8') || 
           url.includes('/stream') || 
           url.match(/\.(mp4|webm|ogg|mov)$/i) !== null;
  };

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

  const refreshVideoUrl = async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      if (fetchNewUrl) {
        const newUrl = await fetchNewUrl();
        setVideoSrc(newUrl);
        toast.success("Video source updated successfully");
      } else {
        if (isDirectVideoUrl(videoSrc)) {
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
        toast.success("Original video URL extracted successfully");
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

  const switchToOriginalSource = () => {
    if (originalVideoUrl) {
      setVideoSrc(originalVideoUrl);
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
          <p className="text-sm font-medium text-muted-foreground">
            Source: {extractVideoInfo(videoSrc).domain}
          </p>
          <p className="text-xs text-muted-foreground">
            Video ID: {extractVideoInfo(videoSrc).videoId}
          </p>
        </div>
        <div className="flex gap-2">
          {!isDirectVideoUrl(videoSrc) && (
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

      {originalVideoUrl && (
        <div className="p-3 bg-muted/30 rounded-md mb-4">
          <div className="flex justify-between items-center">
            <p className="text-sm truncate flex-1 mr-2">
              <span className="font-medium">Original URL:</span> 
              <span className="ml-1 text-muted-foreground">{originalVideoUrl}</span>
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(originalVideoUrl)}
              >
                Copy
              </Button>
              {videoSrc !== originalVideoUrl && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={switchToOriginalSource}
                >
                  Use This Source
                </Button>
              )}
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
                The video source might have expired. Please try refreshing.
              </p>
            </div>
            <Button onClick={refreshVideoUrl} variant="outline">
              Try Again
            </Button>
          </div>
        ) : isDirectVideoUrl(videoSrc) ? (
          <video
            ref={videoRef}
            src={videoSrc}
            width={width}
            height={height}
            controls
            autoPlay
            className="w-full rounded-lg transition-opacity duration-300 ease-in-out"
            style={{ opacity: isLoading ? 0.3 : 1 }}
            onError={handleMediaError}
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
            className="w-full rounded-lg transition-opacity duration-300 ease-in-out"
            style={{ opacity: isLoading ? 0.3 : 1 }}
            onError={handleMediaError}
          />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
