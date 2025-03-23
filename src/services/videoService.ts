// This service handles fetching video URLs and movie information

/**
 * Interface for video source configuration
 */
interface VideoSourceConfig {
  baseUrl: string;
  videoId: string;
  authToken?: string;
  params?: Record<string, string>;
  isDirectVideo?: boolean;
}

/**
 * Movie search result interface
 */
export interface MovieSearchResult {
  id: string;
  title: string;
  year?: string;
  poster?: string;
  rating?: string;
  genre?: string;
}

/**
 * Parse the video URL to extract components like domain, video ID, etc.
 * @param url The video URL to parse
 * @returns Parsed URL components in an object
 */
export const parseVideoUrl = (url: string): VideoSourceConfig | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Check if it's a direct video URL (like .m3u8)
    const isDirectVideo = url.endsWith('.m3u8') || 
                          url.includes('/stream') || 
                          url.match(/\.(mp4|webm|ogg|mov)$/i) !== null;
    
    return {
      baseUrl: `${urlObj.protocol}//${urlObj.hostname}`,
      videoId: pathParts[pathParts.length - 1] || '',
      params: Object.fromEntries(urlObj.searchParams.entries()),
      isDirectVideo
    };
  } catch (error) {
    console.error("Failed to parse video URL:", error);
    return null;
  }
};

/**
 * Generate video URL from movie ID
 * @param movieId The movie ID (e.g., tt27995594)
 * @returns Full URL for the video
 */
export const generateVideoUrlFromId = (movieId: string): string => {
  // Format the movie ID to ensure it has the correct format (tt followed by numbers)
  let formattedId = movieId.trim();
  if (!formattedId.startsWith('tt') && !isNaN(Number(formattedId))) {
    formattedId = `tt${formattedId}`;
  }
  
  return `https://jole340erun.com/play/${formattedId}`;
};

/**
 * Extract video URL from an iframe element by ID
 * @param iframeId ID of the iframe element
 * @returns Extracted video URL or null if not found
 */
export const extractVideoFromIframe = (iframeId: string): string | null => {
  try {
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (!iframe) return null;
    
    // Try to access iframe content (this will fail due to same-origin policy in most cases)
    // This is just a placeholder for the concept
    return iframe.src;
  } catch (error) {
    console.error("Failed to extract video from iframe:", error);
    return null;
  }
};

/**
 * Create temporary iframe to extract video URL
 * @param url The URL to load in the iframe
 * @returns Promise resolving to the extracted video URL
 */
export const extractVideoUrlFromPage = async (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    // Create a temporary iframe
    const tempIframe = document.createElement('iframe');
    tempIframe.style.display = 'none';
    tempIframe.src = url;
    
    // Set a timeout to prevent hanging if extraction fails
    const timeoutId = setTimeout(() => {
      document.body.removeChild(tempIframe);
      console.warn("Extraction timed out, using fallback URL");
      resolve(null);
    }, 5000);
    
    // Listen for iframe to load
    tempIframe.onload = () => {
      try {
        // In a real scenario, we would use message passing or other techniques here
        // For this demo, we'll simulate extraction
        clearTimeout(timeoutId);
        document.body.removeChild(tempIframe);
        resolve(null); // Initial extraction failed
      } catch (error) {
        document.body.removeChild(tempIframe);
        console.error("Error during extraction:", error);
        resolve(null);
      }
    };
    
    document.body.appendChild(tempIframe);
  });
};

/**
 * Extract the original video stream URL from an iframe embed page
 * @param movieId The movie ID to extract video for
 * @returns A Promise that resolves to the extracted direct video URL or null if not found
 */
export const extractOriginalVideoUrl = async (movieId: string): Promise<string | null> => {
  try {
    console.log("Attempting to extract original video for movie:", movieId);
    
    // Generate the iframe URL
    const iframeUrl = generateVideoUrlFromId(movieId);
    
    // Try to extract the video URL from the iframe page
    const extractedUrl = await extractVideoUrlFromPage(iframeUrl);
    
    if (extractedUrl) {
      console.log("Successfully extracted URL from iframe:", extractedUrl);
      return extractedUrl;
    }
    
    console.log("Direct extraction failed, using iframe proxy approach");
    
    // Create a unique ID for this movie's player
    const playerId = `movie-player-${movieId}`;
    
    // Return a special URL that tells our player to use an iframe with postMessage communication
    return `iframe://${iframeUrl}?playerId=${playerId}`;
  } catch (error) {
    console.error("Error extracting original video URL:", error);
    return null;
  }
};

/**
 * Search for movies by title or ID
 * @param query Search query (title or ID)
 * @returns Promise with search results
 */
export const searchMovies = async (query: string): Promise<MovieSearchResult[]> => {
  // In a real implementation, you would call an API like OMDB or TMDB
  console.log("Searching for movies with query:", query);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Check if the query looks like a movie ID
      if (query.startsWith('tt') || !isNaN(Number(query))) {
        const formattedId = query.startsWith('tt') ? query : `tt${query}`;
        resolve([
          { 
            id: formattedId, 
            title: `Movie ${formattedId}`,
            year: "2023",
            poster: "https://via.placeholder.com/150x225?text=Movie",
            rating: "8.5",
            genre: "Action, Drama"
          }
        ]);
      } else {
        // Generate some mock search results
        const results: MovieSearchResult[] = [
          { 
            id: "tt27995594", 
            title: `${query} Adventure`, 
            year: "2023",
            poster: "https://via.placeholder.com/150x225?text=Adventure",
            rating: "7.8",
            genre: "Adventure, Fantasy"
          },
          { 
            id: "tt2062700", 
            title: `${query} Mystery`, 
            year: "2022",
            poster: "https://via.placeholder.com/150x225?text=Mystery",
            rating: "8.2",
            genre: "Mystery, Thriller"
          },
          { 
            id: "tt1375666", 
            title: `${query} Drama`, 
            year: "2021",
            poster: "https://via.placeholder.com/150x225?text=Drama",
            rating: "9.0",
            genre: "Drama, Sci-Fi"
          },
          {
            id: "tt0111161",
            title: `The ${query} Redemption`,
            year: "1994",
            poster: "https://via.placeholder.com/150x225?text=Classic",
            rating: "9.3",
            genre: "Drama"
          },
          {
            id: "tt0468569",
            title: `The Dark ${query}`,
            year: "2008",
            poster: "https://via.placeholder.com/150x225?text=Batman",
            rating: "9.0",
            genre: "Action, Crime, Drama"
          }
        ];
        resolve(results);
      }
    }, 500);
  });
};

/**
 * For real implementation, you would need to connect to a movie database API 
 * such as OMDB API (http://www.omdbapi.com/) or 
 * TMDB API (https://developers.themoviedb.org/3)
 * 
 * Example API integration with TMDB:
 */
/*
export const searchMoviesWithTMDB = async (query: string): Promise<MovieSearchResult[]> => {
  const API_KEY = "your_tmdb_api_key"; // You would need to get this from TMDB
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? movie.release_date.split('-')[0] : undefined,
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
        rating: movie.vote_average ? movie.vote_average.toString() : undefined,
        genre: movie.genre_ids ? movie.genre_ids.join(', ') : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error("Error searching TMDB:", error);
    return [];
  }
};
*/
