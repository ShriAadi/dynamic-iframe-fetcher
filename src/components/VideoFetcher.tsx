
import React, { useState, useEffect, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { parseVideoUrl, fetchNewVideoUrl, isVideoUrlExpired } from '@/services/videoService';
import { searchMovies, TMDBMovieResult, getPosterUrl } from '@/services/tmdbService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Film, Loader2 } from "lucide-react";
import { useDebounce } from '@/hooks/useDebounce';

interface VideoFetcherProps {
  defaultVideoUrl?: string;
}

const VideoFetcher: React.FC<VideoFetcherProps> = ({ 
  defaultVideoUrl = "https://jole340erun.com/play/tt27995594" 
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(defaultVideoUrl);
  const [movieId, setMovieId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<TMDBMovieResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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
      if (debouncedSearchQuery && debouncedSearchQuery.length >= 2) {
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

  // Handle movie selection from TMDB results
  const handleMovieSelect = (movie: TMDBMovieResult) => {
    // Convert TMDB ID to IMDB ID format (this is a mock conversion - in a real app you'd use an API)
    // In a real implementation, you might need to use another API endpoint to get the actual IMDB ID
    const formattedId = `tt${movie.id}`;
    
    // Construct the URL with the movie ID
    const newUrl = `https://jole340erun.com/play/${formattedId}`;
    setVideoUrl(newUrl);
    setMovieId(formattedId);
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`Loading: ${movie.title}`, {
      description: `Release date: ${movie.release_date || 'Unknown'}`
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
                  placeholder="Search for movies by title..."
                  className="pl-10"
                />
              </div>
              
              {isSearching && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching TMDB...</span>
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-md shadow-sm max-h-60 overflow-y-auto">
                  <ul className="py-1 divide-y divide-gray-100">
                    {searchResults.map((movie) => (
                      <li 
                        key={movie.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors flex items-center gap-3"
                        onClick={() => handleMovieSelect(movie)}
                      >
                        {movie.poster_path ? (
                          <img 
                            src={getPosterUrl(movie.poster_path, 'w92')} 
                            alt={movie.title}
                            className="h-16 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-16 w-12 bg-gray-200 rounded flex items-center justify-center">
                            <Film className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{movie.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown year'}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {movie.overview || 'No overview available'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {debouncedSearchQuery && !isSearching && searchResults.length === 0 && (
                <div className="mt-2 p-3 text-sm text-muted-foreground bg-muted/30 rounded">
                  No movies found matching "{debouncedSearchQuery}"
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
