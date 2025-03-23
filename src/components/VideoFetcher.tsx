
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, ExternalLink, Film } from "lucide-react";
import { extractOriginalVideoUrl, generateVideoUrlFromId } from '@/services/videoService';
import PlyrPlayer from './PlyrPlayer';
import MovieSearch from './MovieSearch';

interface VideoFetcherProps {
  defaultMovieId?: string;
}

const VideoFetcher: React.FC<VideoFetcherProps> = ({ 
  defaultMovieId = "tt27995594" 
}) => {
  const [currentMovieId, setCurrentMovieId] = useState<string>(defaultMovieId);
  const [directVideoUrl, setDirectVideoUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    // Reset state when movie ID changes
    setDirectVideoUrl(null);
    setHasError(false);
  }, [currentMovieId]);

  const handleExtractOriginalUrl = async () => {
    if (isExtracting) return;
    
    setIsExtracting(true);
    setHasError(false);
    
    try {
      const extractedUrl = await extractOriginalVideoUrl(currentMovieId);
      if (extractedUrl) {
        setDirectVideoUrl(extractedUrl);
        toast.success("Original video URL extracted successfully");
      } else {
        toast.error("Could not extract original video URL");
        setHasError(true);
      }
    } catch (error) {
      console.error("Error extracting original video URL:", error);
      toast.error("Failed to extract original video URL");
      setHasError(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSelectMovie = (movieId: string) => {
    setCurrentMovieId(movieId);
    setDirectVideoUrl(null);
  };

  const handleVideoError = () => {
    setHasError(true);
  };

  const retryVideo = async () => {
    setIsLoading(true);
    try {
      await handleExtractOriginalUrl();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4">
      <Card className="w-full shadow-lg border-opacity-50 backdrop-blur-sm bg-white/80 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Movie Player</CardTitle>
          <CardDescription>
            Search for movies by title or ID, then watch in high quality with Plyr
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovieSearch onSelectMovie={handleSelectMovie} />
          
          <div className="mb-4 p-3 bg-muted/30 rounded-md flex justify-between items-center">
            <div>
              <p className="text-sm">
                <span className="font-medium">Current Movie ID:</span> 
                <span className="ml-1">{currentMovieId}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractOriginalUrl}
              disabled={isExtracting}
              className="flex items-center gap-1 transition-all"
            >
              <ExternalLink className={`h-3.5 w-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
              <span>{isExtracting ? 'Extracting...' : 'Extract & Play'}</span>
            </Button>
          </div>
          
          <div className="video-container relative">
            {isExtracting && (
              <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                <div className="video-placeholder animate-shimmer w-full h-full"></div>
              </div>
            )}

            {hasError ? (
              <div className="flex flex-col items-center justify-center h-64 p-8 space-y-4 bg-muted/30 rounded-lg">
                <Film className="h-12 w-12 text-destructive animate-pulse-opacity" />
                <div className="text-center">
                  <h3 className="text-lg font-medium">Video unavailable</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Could not load the video. Please try extracting again.
                  </p>
                </div>
                <Button onClick={retryVideo} variant="outline" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCcw className="h-4 w-4 animate-spin mr-2" />
                      Retrying...
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
              </div>
            ) : directVideoUrl ? (
              <PlyrPlayer src={directVideoUrl} onError={handleVideoError} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 p-8 space-y-4 bg-muted/30 rounded-lg">
                <Film className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <h3 className="text-lg font-medium">No video loaded</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Extract & Play" to load the video
                  </p>
                </div>
                <Button onClick={handleExtractOriginalUrl} disabled={isExtracting}>
                  {isExtracting ? 'Extracting...' : 'Extract & Play'}
                </Button>
              </div>
            )}
          </div>
          
          {directVideoUrl && (
            <div className="mt-4 p-3 bg-muted/30 rounded-md">
              <div className="flex justify-between items-center">
                <p className="text-sm truncate flex-1 mr-2">
                  <span className="font-medium">Video URL:</span> 
                  <span className="ml-1 text-muted-foreground text-xs">{directVideoUrl}</span>
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigator.clipboard.writeText(directVideoUrl)}
                >
                  Copy URL
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoFetcher;
