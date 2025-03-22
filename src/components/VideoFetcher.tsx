
import React, { useState, useEffect, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { parseVideoUrl, fetchNewVideoUrl, isVideoUrlExpired } from '@/services/videoService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VideoFetcherProps {
  defaultVideoUrl?: string;
}

const VideoFetcher: React.FC<VideoFetcherProps> = ({ 
  defaultVideoUrl = "https://jole340erun.com/play/tt27995594" 
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(defaultVideoUrl);
  const [inputUrl, setInputUrl] = useState<string>(defaultVideoUrl);
  const [movieId, setMovieId] = useState<string>("");

  // Function to refresh the video URL
  const refreshVideoUrl = useCallback(async (): Promise<string> => {
    try {
      const sourceConfig = parseVideoUrl(videoUrl);
      if (!sourceConfig) {
        throw new Error("Failed to parse video URL");
      }
      
      const newUrl = await fetchNewVideoUrl(sourceConfig);
      setVideoUrl(newUrl);
      return newUrl;
    } catch (error) {
      console.error("Error refreshing video URL:", error);
      toast.error("Failed to refresh video URL");
      throw error;
    }
  }, [videoUrl]);

  // Check if the current URL is expired
  useEffect(() => {
    const checkExpiration = async () => {
      try {
        const expired = await isVideoUrlExpired(videoUrl);
        if (expired) {
          toast.warning("Video URL has expired, refreshing...", {
            duration: 3000,
          });
          await refreshVideoUrl();
        }
      } catch (error) {
        console.error("Error checking video URL expiration:", error);
      }
    };
    
    // Check when component mounts
    checkExpiration();
    
    // Set up regular checks (every 5 minutes)
    const interval = setInterval(checkExpiration, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [videoUrl, refreshVideoUrl]);

  // Handle form submission for new URL
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!inputUrl.trim()) {
        toast.error("Please enter a valid URL");
        return;
      }
      
      // Simple validation to ensure it looks like a URL
      if (!inputUrl.startsWith('http')) {
        toast.error("URL must start with http:// or https://");
        return;
      }
      
      setVideoUrl(inputUrl);
      toast.success("Video source updated");
    } catch (error) {
      console.error("Error updating video URL:", error);
      toast.error("Failed to update video URL");
    }
  };

  // Handle movie ID submission
  const handleMovieIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!movieId.trim()) {
        toast.error("Please enter a movie ID");
        return;
      }
      
      // Format movieId to ensure it has the correct format (tt followed by numbers)
      let formattedId = movieId;
      if (!formattedId.startsWith('tt') && !isNaN(Number(formattedId))) {
        formattedId = `tt${formattedId}`;
      }
      
      // Construct the URL with the movie ID
      const newUrl = `https://jole340erun.com/play/${formattedId}`;
      setInputUrl(newUrl);
      setVideoUrl(newUrl);
      toast.success(`Loaded movie ID: ${formattedId}`);
    } catch (error) {
      console.error("Error updating movie ID:", error);
      toast.error("Failed to update movie ID");
    }
  };

  // Determine if the URL is a stream URL or iframe URL for displaying in the UI
  const getVideoTypeLabel = (url: string) => {
    if (url.endsWith('.m3u8') || url.includes('/stream')) {
      return "Direct Stream";
    } else if (url.match(/\.(mp4|webm|ogg|mov)$/i) !== null) {
      return "Video File";
    }
    return "Embedded Player";
  };

  // Extract movie ID from the current URL
  const extractMovieIdFromUrl = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      
      // If it contains a tt ID pattern, return it
      if (lastPart.startsWith('tt')) {
        return lastPart;
      }
      return "";
    } catch {
      return "";
    }
  };

  const currentMovieId = extractMovieIdFromUrl(videoUrl);

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4">
      <Card className="w-full shadow-lg border-opacity-50 backdrop-blur-sm bg-white/80 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Dynamic Video Player</CardTitle>
          <CardDescription>
            Supports both iframe embeds and direct video stream URLs (m3u8, mp4, etc.). You can extract the original direct video URL from iframe embeds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Enter Video URL</h3>
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <Input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Enter video URL (iframe or direct stream)"
                  className="flex-1"
                />
                <Button type="submit" variant="default">
                  Load URL
                </Button>
              </form>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Enter Movie ID</h3>
              <form onSubmit={handleMovieIdSubmit} className="flex space-x-2">
                <Input
                  type="text"
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  placeholder="Enter movie ID (e.g., tt27995594)"
                  className="flex-1"
                />
                <Button type="submit" variant="default">
                  Load Movie
                </Button>
              </form>
            </div>
          </div>
          
          {currentMovieId && (
            <div className="mb-4 p-2 bg-muted/30 rounded-md">
              <p className="text-sm">
                <span className="font-medium">Current Movie ID:</span> 
                <span className="ml-1">{currentMovieId}</span>
              </p>
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">
              Current video type: <span className="font-medium">{getVideoTypeLabel(videoUrl)}</span>
            </p>
          </div>
          
          <VideoPlayer
            initialSrc={videoUrl}
            refreshInterval={60 * 60 * 1000} // Refresh every hour
            fetchNewUrl={refreshVideoUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoFetcher;
