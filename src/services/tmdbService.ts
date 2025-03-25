
/**
 * Service for interacting with The Movie Database (TMDB) API
 */

const TMDB_API_KEY = 'e3453ddae36b6a33e4f5480ccb0e49dc';
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Interface for TMDB movie search results
 */
export interface TMDBMovieResult {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  imdb_id?: string;
}

/**
 * Interface for TMDB search response
 */
interface TMDBSearchResponse {
  page: number;
  results: TMDBMovieResult[];
  total_results: number;
  total_pages: number;
}

/**
 * Interface for TMDB movie details response
 */
interface TMDBMovieDetails extends TMDBMovieResult {
  imdb_id: string;
}

/**
 * Search movies from TMDB API
 * @param query Search query string
 * @returns Promise with search results
 */
export const searchMovies = async (query: string): Promise<TMDBMovieResult[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const url = `${TMDB_API_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data: TMDBSearchResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error searching TMDB:', error);
    throw error;
  }
};

/**
 * Get movie details from TMDB API
 * @param movieId TMDB movie ID
 * @returns Promise with movie details
 */
export const getMovieDetails = async (movieId: number): Promise<TMDBMovieDetails> => {
  try {
    const url = `${TMDB_API_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting movie details:', error);
    throw error;
  }
};

/**
 * Get IMDB ID for a movie by its TMDB ID
 * @param tmdbId TMDB movie ID
 * @returns Promise with IMDB ID
 */
export const getImdbId = async (tmdbId: number): Promise<string | null> => {
  try {
    const movieDetails = await getMovieDetails(tmdbId);
    return movieDetails.imdb_id || null;
  } catch (error) {
    console.error('Error getting IMDB ID:', error);
    return null;
  }
};

/**
 * Get a full poster image URL from TMDB poster path
 * @param posterPath Poster path from TMDB
 * @param size Size of the poster (w92, w154, w185, w342, w500, w780, original)
 * @returns Full poster URL or a placeholder if poster path is null
 */
export const getPosterUrl = (posterPath: string | null, size: string = 'w185'): string => {
  if (!posterPath) {
    return '/placeholder.svg'; // Return placeholder image if no poster
  }
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
};
