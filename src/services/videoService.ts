
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
 * Extract the original video stream URL from an iframe embed page
 * @param movieId The movie ID to extract video for
 * @returns A Promise that resolves to the extracted direct video URL or null if not found
 */
export const extractOriginalVideoUrl = async (movieId: string): Promise<string | null> => {
  try {
    // In a real implementation, you would:
    // 1. Make a request to the iframe URL
    // 2. Parse the HTML response to find the video source
    // 3. Return the direct video URL
    
    console.log("Attempting to extract original video for movie:", movieId);
    
    // For demonstration purposes, we'll simulate this with a mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate a simulated direct stream URL
        const timestamp = Date.now();
        const simulatedDirectUrl = `https://i-cdn-0.jole340erun.com/stream2/i-cdn-0/42736faa7d17d5e3f3d145baf3850d44/MJTMsp1RshGTygnMNRUR2N2MSlnWXZEdMNDZzQWe5MDZzMmdZJTO1R2RWVHZDljekhkSsl1VwYnWtx2cihVT21keRNTWU1ENadVU69ERJdnWHZUaOp2Y5lleox2TEFEeZp2a0oVbJNTTU1UP:${timestamp}:117.235.253.44:bf32bff0cbfda4dfc7b1d4e32ee4f2644e9d81783c25c1f18e5ec3c261cc0ad9/1080/index.m3u8`;
        console.log("Extracted direct video URL:", simulatedDirectUrl);
        resolve(simulatedDirectUrl);
      }, 1000); // Simulate network delay
    });
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
  // In a real implementation, you would call an API to search for movies
  // For demonstration, we'll return mock results
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
            poster: "https://via.placeholder.com/150x225?text=Movie" 
          }
        ]);
      } else {
        // Generate some mock search results
        const results: MovieSearchResult[] = [
          { 
            id: "tt27995594", 
            title: `${query} Adventure`, 
            year: "2023",
            poster: "https://via.placeholder.com/150x225?text=Adventure" 
          },
          { 
            id: "tt2062700", 
            title: `${query} Mystery`, 
            year: "2022",
            poster: "https://via.placeholder.com/150x225?text=Mystery" 
          },
          { 
            id: "tt1375666", 
            title: `${query} Drama`, 
            year: "2021",
            poster: "https://via.placeholder.com/150x225?text=Drama" 
          }
        ];
        resolve(results);
      }
    }, 500);
  });
};
