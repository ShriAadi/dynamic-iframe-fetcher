
import React, { useState, useEffect, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { parseVideoUrl, fetchNewVideoUrl, isVideoUrlExpired } from '@/services/videoService';
import { searchMovies, TMDBMovieResult, getPosterUrl, getImdbId } from '@/services/tmdbService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Film, Loader2 } from "lucide-react";
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [isLoadingMovie, setIsLoadingMovie] = useState<boolean>(false);
  const [selectedMovieTitle, setSelectedMovieTitle] = useState<string>("");
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useIsMobile();

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
  const handleMovieSelect = async (movie: TMDBMovieResult) => {
    setIsLoadingMovie(true);
    setSelectedMovieTitle(movie.title);
    
    try {
      // Get IMDB ID for the selected movie
      const imdbId = await getImdbId(movie.id);
      
      if (!imdbId) {
        toast.error(`Could not find IMDB ID for "${movie.title}"`);
        setIsLoadingMovie(false);
        return;
      }
      
      // Construct the URL with the IMDB ID
      const newUrl = `https://jole340erun.com/play/${imdbId}`;
      setVideoUrl(newUrl);
      setMovieId(imdbId);
      setSearchQuery("");
      setSearchResults([]);
      
      toast.success(`Loading: ${movie.title}`, {
        description: `Release date: ${movie.release_date || 'Unknown'}`
      });
    } catch (error) {
      console.error("Error loading movie:", error);
      toast.error(`Failed to load "${movie.title}"`);
    } finally {
      setIsLoadingMovie(false);
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
      setVideoUrl(newUrl);
      setSelectedMovieTitle("Movie Video Player"); // Reset title if entering direct ID
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
    <div className="space-y-4 sm:space-y-8 max-w-4xl mx-auto px-2 sm:px-4">
      <Card className="w-full shadow-lg border-opacity-50 backdrop-blur-sm bg-white/80 transition-all duration-300">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl font-semibold">
            {selectedMovieTitle ? `Now Playing: ${selectedMovieTitle}` : "Dynamic Movie Video Player"}
          </CardTitle>
          <CardDescription>
            Search for movies by name or enter a movie ID directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
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
                <div className="mt-2 border rounded-md shadow-sm max-h-40 sm:max-h-60 overflow-y-auto">
                  <ul className="py-1 divide-y divide-gray-100">
                    {searchResults.map((movie) => (
                      <li 
                        key={movie.id}
                        className="px-2 sm:px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors flex items-center gap-2 sm:gap-3"
                        onClick={() => handleMovieSelect(movie)}
                      >
                        {movie.poster_path ? (
                          <img 
                            src={getPosterUrl(movie.poster_path, isMobile ? 'w92' : 'w92')} 
                            alt={movie.title}
                            className="h-12 w-9 sm:h-16 sm:w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-9 sm:h-16 sm:w-12 bg-gray-200 rounded flex items-center justify-center">
                            <Film className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{movie.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown year'}
                          </p>
                          {!isMobile && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {movie.overview || 'No overview available'}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {debouncedSearchQuery && !isSearching && searchResults.length === 0 && (
                <div className="mt-2 p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground bg-muted/30 rounded">
                  No movies found matching "{debouncedSearchQuery}"
                </div>
              )}
            </div>
            
            <div className="mt-2 sm:mt-4">
              <h3 className="text-xs sm:text-sm font-medium mb-2">Or Enter Movie ID</h3>
              <form onSubmit={handleMovieIdSubmit} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  type="text"
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  placeholder="Enter movie ID (e.g., tt27995594)"
                  className="flex-1"
                />
                <Button type="submit" variant="default" className="w-full sm:w-auto">
                  Load Movie
                </Button>
              </form>
            </div>
          </div>
          
          {currentMovieId && (
            <div className="mb-3 sm:mb-4 p-2 bg-muted/30 rounded-md">
              <p className="text-xs sm:text-sm">
                <span className="font-medium">Current Movie ID:</span> 
                <span className="ml-1">{currentMovieId}</span>
              </p>
            </div>
          )}
          
          <div className="mb-3 sm:mb-4">
            <p className="text-xs text-muted-foreground">
              Current video type: <span className="font-medium">{getVideoTypeLabel(videoUrl)}</span>
            </p>
          </div>
          
          {isLoadingMovie ? (
            <div className="flex items-center justify-center p-8 sm:p-16">
              <div className="text-center">
                <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin mx-auto mb-3 sm:mb-4 text-primary" />
                <p className="text-muted-foreground text-sm sm:text-base">Loading movie...</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden">
              <VideoPlayer
                initialSrc={videoUrl}
                refreshInterval={60 * 60 * 1000} // Refresh every hour
                fetchNewUrl={refreshVideoUrl}
                key={videoUrl} // Add a key that changes when the video URL changes to force re-mount
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoFetcher;
