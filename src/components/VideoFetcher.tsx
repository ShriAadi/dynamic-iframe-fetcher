
import React, { useState, useEffect, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { parseVideoUrl, fetchNewVideoUrl, isVideoUrlExpired } from '@/services/videoService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useDebounce } from '@/hooks/useDebounce';

interface VideoFetcherProps {
  defaultVideoUrl?: string;
}

// Mock movie search API
const searchMovies = async (query: string): Promise<Array<{id: string, title: string}>> => {
  // This would typically be an API call to your movie database
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock movie database with some sample movies
      const movies = [
        { id: 'tt27995594', title: 'Alien: Romulus' },
        { id: 'tt0111161', title: 'The Shawshank Redemption' },
        { id: 'tt0468569', title: 'The Dark Knight' },
        { id: 'tt1375666', title: 'Inception' },
        { id: 'tt0120737', title: 'The Lord of the Rings: The Fellowship of the Ring' },
        { id: 'tt0120689', title: 'The Green Mile' },
        { id: 'tt0109830', title: 'Forrest Gump' },
        { id: 'tt0133093', title: 'The Matrix' },
      ];

      // Filter movies based on query
      const results = query 
        ? movies.filter(movie => 
            movie.title.toLowerCase().includes(query.toLowerCase())
          )
        : [];
      
      resolve(results);
    }, 300);
  });
};

const VideoFetcher: React.FC<VideoFetcherProps> = ({ 
  defaultVideoUrl = "https://jole340erun.com/play/tt27995594" 
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(defaultVideoUrl);
  const [movieId, setMovieId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Array<{id: string, title: string}>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

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

  // Handle search query changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery) {
        setIsSearching(true);
        try {
          const results = await searchMovies(debouncedSearchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("Error searching movies:", error);
          toast.error("Failed to search movies");
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    };

    performSearch();
  }, [debouncedSearchQuery]);

  // Handle movie selection
  const handleMovieSelect = (movieId: string, title: string) => {
    // Format movieId to ensure it has the correct format (tt followed by numbers)
    let formattedId = movieId;
    if (!formattedId.startsWith('tt') && !isNaN(Number(formattedId))) {
      formattedId = `tt${formattedId}`;
    }
    
    // Construct the URL with the movie ID
    const newUrl = `https://jole340erun.com/play/${formattedId}`;
    setVideoUrl(newUrl);
    setMovieId(formattedId);
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`Loading: ${title}`, {
      description: `Movie ID: ${formattedId}`
    });
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
            Search for movies by name or enter a movie ID directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-1 mb-6">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies by name..."
                  className="pl-10"
                />
              </div>
              
              {isSearching && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-md shadow-sm max-h-60 overflow-y-auto">
                  <ul className="py-1">
                    {searchResults.map((movie) => (
                      <li 
                        key={movie.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => handleMovieSelect(movie.id, movie.title)}
                      >
                        <p className="text-sm font-medium">{movie.title}</p>
                        <p className="text-xs text-muted-foreground">{movie.id}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Or Enter Movie ID</h3>
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
            key={videoUrl} // Add a key that changes when the video URL changes to force re-mount
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoFetcher;
