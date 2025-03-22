
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4">
      <Card className="w-full shadow-lg border-opacity-50 backdrop-blur-sm bg-white/80 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Dynamic Video Player</CardTitle>
          <CardDescription>
            This player automatically refreshes expired video URLs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex space-x-2 mb-6">
            <Input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter video iframe URL"
              className="flex-1"
            />
            <Button type="submit" variant="default">
              Update Source
            </Button>
          </form>
          
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
