
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Film } from "lucide-react";
import { searchMovies, MovieSearchResult } from '@/services/videoService';
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

interface MovieSearchProps {
  onSelectMovie: (movieId: string) => void;
}

const MovieSearch: React.FC<MovieSearchProps> = ({ onSelectMovie }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    
    try {
      const results = await searchMovies(searchQuery.trim());
      setSearchResults(results);
      
      if (results.length === 0) {
        toast.info("No movies found matching your search");
      }
    } catch (error) {
      console.error("Error searching movies:", error);
      toast.error("Failed to search for movies");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectMovie = (movie: MovieSearchResult) => {
    setShowResults(false);
    onSelectMovie(movie.id);
    toast.success(`Selected movie: ${movie.title}`);
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSearch} className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by movie title or ID..."
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={isSearching}
          className="whitespace-nowrap"
        >
          {isSearching ? 'Searching...' : 'Search Movies'}
        </Button>
      </form>

      {showResults && (
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            placeholder="Type to search..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Results">
              {searchResults.map((movie) => (
                <CommandItem
                  key={movie.id}
                  onSelect={() => handleSelectMovie(movie)}
                  className="flex items-center gap-2 p-2 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {movie.poster ? (
                      <img 
                        src={movie.poster} 
                        alt={movie.title} 
                        className="h-12 w-9 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-9 bg-muted flex items-center justify-center rounded">
                        <Film className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{movie.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{movie.id}</span>
                        {movie.year && (
                          <span className="text-xs text-muted-foreground">({movie.year})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
    </div>
  );
};

export default MovieSearch;
