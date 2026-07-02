/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedMedia, ParsedMovie, ParsedSeries } from './FilenameParser';
import { SettingsService } from './SettingsService';

export interface TMDbMetadata {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string;
  runtime: number; // in minutes
  genres: string[];
  rating: number; // vote_average
  voteCount: number;
  posterPath: string; // full image URL or relative path
  backdropPath: string; // full image URL or relative path
  cast: string[]; // names of top actors
  director: string[]; // names of directors
  productionCompanies: string[];
  countries: string[];
  mediaType: 'movie' | 'tv';
  gallery?: string[]; // full image URLs for backdrops/scenes
  tvSeasons?: { seasonNumber: number; name: string; episodeCount: number; }[];
}

export class TMDbService {
  /**
   * Helper to execute fetch requests to TMDb.
   * Automatically injects credentials and parameters from SettingsService.
   */
  private static async fetchTMDb(endpoint: string, queryParams: Record<string, string> = {}): Promise<any> {
    const settings = SettingsService.getTMDbSettings();
    
    // Check if any credential exists
    const token = settings.readAccessToken.trim();
    const apiKey = settings.apiKey.trim();

    if (!token && !apiKey) {
      throw new Error('TMDb credentials are not configured in settings.');
    }

    const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);

    // Standard params: language and include_adult
    const lang = queryParams.language || settings.language;
    url.searchParams.set('language', lang);
    url.searchParams.set('include_adult', settings.includeAdult ? 'true' : 'false');

    // Add rest of query params
    for (const [key, value] of Object.entries(queryParams)) {
      if (key !== 'language' && key !== 'include_adult') {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      url.searchParams.set('api_key', apiKey);
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      throw new Error(`TMDb HTTP error ${res.status}`);
    }
    return await res.json();
  }

  /**
   * Tests connection with the provided credentials.
   */
  public static async testConnection(apiKey: string, readAccessToken: string): Promise<boolean> {
    const cleanApiKey = apiKey.trim();
    const cleanToken = readAccessToken.trim();

    if (!cleanApiKey && !cleanToken) {
      return false;
    }

    const url = new URL('https://api.themoviedb.org/3/configuration');
    const headers: Record<string, string> = {};

    if (cleanToken) {
      headers['Authorization'] = `Bearer ${cleanToken}`;
    } else {
      url.searchParams.set('api_key', cleanApiKey);
    }

    try {
      const res = await fetch(url.toString(), { headers });
      return res.ok;
    } catch (err) {
      console.error('TMDb connection test exception:', err);
      return false;
    }
  }

  /**
   * Calculates similarity between two strings using token overlap coefficient.
   */
  public static calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    const clean = (s: string) => s.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').split(/\s+/).filter(Boolean);
    const tokens1 = new Set(clean(str1));
    const tokens2 = new Set(clean(str2));
    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    let intersection = 0;
    tokens1.forEach(t => {
      if (tokens2.has(t)) intersection++;
    });

    return intersection / Math.min(tokens1.size, tokens2.size);
  }

  /**
   * Search for a movie on TMDb.
   */
  public static async searchMovie(title: string, year?: string): Promise<any[]> {
    if (!SettingsService.hasCredentials()) {
      return [];
    }

    const queryParams: Record<string, string> = { query: title };
    if (year && /^\d{4}$/.test(year)) {
      queryParams['primary_release_year'] = year;
    }

    try {
      const data = await this.fetchTMDb('search/movie', queryParams);
      return data.results || [];
    } catch (err) {
      console.warn('TMDb preferred language movie search failed, trying English:', err);
      try {
        const enData = await this.fetchTMDb('search/movie', { ...queryParams, language: 'en-US' });
        return enData.results || [];
      } catch (e) {
        console.error('TMDb movie search complete failure:', e);
        return [];
      }
    }
  }

  /**
   * Search for a TV series on TMDb.
   */
  public static async searchTV(title: string, year?: string): Promise<any[]> {
    if (!SettingsService.hasCredentials()) {
      return [];
    }

    const queryParams: Record<string, string> = { query: title };
    if (year && /^\d{4}$/.test(year)) {
      queryParams['first_air_date_year'] = year;
    }

    try {
      const data = await this.fetchTMDb('search/tv', queryParams);
      return data.results || [];
    } catch (err) {
      console.warn('TMDb preferred language TV search failed, trying English:', err);
      try {
        const enData = await this.fetchTMDb('search/tv', { ...queryParams, language: 'en-US' });
        return enData.results || [];
      } catch (e) {
        console.error('TMDb TV search complete failure:', e);
        return [];
      }
    }
  }

  /**
   * Finds the single best match for a given parsed media item.
   * Can accept an optional folderName (representing the Persian folder name) for highly accurate lookup.
   */
  public static async findBestMatch(parsed: ParsedMedia, folderName?: string): Promise<TMDbMetadata | null> {
    try {
      // If TMDb settings are not configured, return null immediately
      if (!SettingsService.hasCredentials()) {
        return null;
      }

      const isTV = parsed.isSeries;
      const parsedTitle = isTV ? (parsed as ParsedSeries).seriesName : (parsed as ParsedMovie).title;
      
      // Convert Shamsi/Solar Hijri year (1300-1450) to Gregorian (add 621)
      let year = parsed.year;
      if (year) {
        const yrNum = parseInt(year, 10);
        if (yrNum >= 1300 && yrNum <= 1450) {
          year = (yrNum + 621).toString();
        }
      }

      // Check for generic folder names that shouldn't be used as Persian search terms
      const genericFolders = new Set([
        'movies', 'series', 'downloads', 'desktop', 'media', 'film', 'video', 'serial', 'new folder',
        'پوشه جدید', 'فیلم', 'سریال', 'مجموعه', 'archive', 'آرشیو', 'دانلود', 'دانلودها', 'newfolder', 'temp', 'mkv', 'mp4'
      ]);
      const cleanFolder = folderName ? folderName.trim() : '';
      const isGeneric = !cleanFolder || genericFolders.has(cleanFolder.toLowerCase());
      
      const searchTitle = !isGeneric ? cleanFolder : parsedTitle;

      let results: any[] = [];

      // 1. Try Primary Search Title (Persian folder name or Parsed title) + Year
      if (isTV) {
        results = await this.searchTV(searchTitle, year);
      } else {
        results = await this.searchMovie(searchTitle, year);
      }

      // 2. Try Primary Search Title Only if nothing found with year
      if (results.length === 0) {
        if (isTV) {
          results = await this.searchTV(searchTitle);
        } else {
          results = await this.searchMovie(searchTitle);
        }
      }

      // 3. Fallback: If we searched folderName and got nothing, try Parsed Title from filename + Year
      if (results.length === 0 && !isGeneric && cleanFolder !== parsedTitle) {
        if (isTV) {
          results = await this.searchTV(parsedTitle, year);
        } else {
          results = await this.searchMovie(parsedTitle, year);
        }
        
        // 4. Fallback: Parsed Title Only
        if (results.length === 0) {
          if (isTV) {
            results = await this.searchTV(parsedTitle);
          } else {
            results = await this.searchMovie(parsedTitle);
          }
        }
      }

      if (results.length === 0) {
        return null;
      }

      // Choose the best match using score ranking
      const ranked = results.map(item => {
        const itemTitle = isTV ? (item.name || item.original_name || '') : (item.title || item.original_title || '');
        const itemOrigTitle = isTV ? (item.original_name || '') : (item.original_title || '');
        
        // Match against both Persian search title and parsed English title
        const sim1 = this.calculateSimilarity(searchTitle, itemTitle);
        const sim2 = this.calculateSimilarity(searchTitle, itemOrigTitle);
        const sim3 = this.calculateSimilarity(parsedTitle, itemTitle);
        const sim4 = this.calculateSimilarity(parsedTitle, itemOrigTitle);
        const simScore = Math.max(sim1, sim2, sim3, sim4);

        let yearScore = 0;
        const releaseDate = isTV ? item.first_air_date : item.release_date;
        if (year && releaseDate && releaseDate.startsWith(year)) {
          yearScore = 0.4; // High weight for correct year
        }

        const popScore = Math.min((item.popularity || 0) / 1000, 0.05); // Small weight for popular entries

        const totalScore = simScore + yearScore + popScore;

        return { item, totalScore };
      });

      // Sort by score descending
      ranked.sort((a, b) => b.totalScore - a.totalScore);

      const bestResult = ranked[0];
      if (bestResult && bestResult.totalScore > 0.25) { // Minimum threshold to prevent terrible matches
        return await this.fetchMetadata(bestResult.item.id, isTV ? 'tv' : 'movie');
      }

      return null;
    } catch (err) {
      console.error('Error finding best TMDb match:', err);
      return null;
    }
  }

  /**
   * Fetch complete metadata details for an ID and media type.
   */
  public static async fetchMetadata(id: number, mediaType: 'movie' | 'tv'): Promise<TMDbMetadata | null> {
    if (!SettingsService.hasCredentials()) {
      return null;
    }

    const settings = SettingsService.getTMDbSettings();
    const mainLang = settings.language;

    try {
      const data = await this.fetchTMDb(`${mediaType}/${id}`, { append_to_response: 'credits,images', language: mainLang });
      
      let enData: any = null;
      if (mainLang !== 'en-US') {
        try {
          enData = await this.fetchTMDb(`${mediaType}/${id}`, { append_to_response: 'credits,images', language: 'en-US' });
        } catch (e) {
          console.warn('TMDb English details fetch failed:', e);
        }
      }

      const mergedData = data || enData;
      if (!mergedData) return null;

      // Extract backdrops as a gallery
      const imagesList = data.images?.backdrops || enData?.images?.backdrops || [];
      const gallery = imagesList.slice(0, 5).map((img: any) => `https://image.tmdb.org/t/p/original${img.file_path}`);

      // Ensure English fallbacks for empty primary fields
      const getVal = (primaryField: any, fallbackField: any) => {
        if (primaryField !== undefined && primaryField !== null && primaryField !== '') return primaryField;
        return fallbackField;
      };

      const title = mediaType === 'movie' 
        ? getVal(data.title, enData?.title || data.original_title)
        : getVal(data.name, enData?.name || data.original_name);

      const originalTitle = mediaType === 'movie'
        ? (data.original_title || enData?.original_title || '')
        : (data.original_name || enData?.original_name || '');

      const overview = getVal(data.overview, enData?.overview || '');
      const releaseDate = mediaType === 'movie'
        ? (data.release_date || enData?.release_date || '')
        : (data.first_air_date || enData?.first_air_date || '');

      const runtime = mediaType === 'movie'
        ? (data.runtime || enData?.runtime || 0)
        : (data.episode_run_time && data.episode_run_time[0] ? data.episode_run_time[0] : (enData?.episode_run_time && enData?.episode_run_time[0] ? enData.episode_run_time[0] : 45));

      const genres = (data.genres || enData?.genres || []).map((g: any) => g.name);

      const posterPath = data.poster_path 
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : (enData?.poster_path ? `https://image.tmdb.org/t/p/w500${enData.poster_path}` : '');

      const backdropPath = data.backdrop_path
        ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
        : (enData?.backdrop_path ? `https://image.tmdb.org/t/p/original${enData.backdrop_path}` : '');

      // Credits / Cast & Crew
      const credits = data.credits || enData?.credits || {};
      const cast = (credits.cast || []).slice(0, 10).map((c: any) => c.name);

      let directors: string[] = [];
      if (mediaType === 'movie') {
        directors = (credits.crew || [])
          .filter((member: any) => member.job === 'Director')
          .map((d: any) => d.name);
      } else {
        if (data.created_by && data.created_by.length > 0) {
          directors = data.created_by.map((c: any) => c.name);
        } else if (enData?.created_by && enData.created_by.length > 0) {
          directors = enData.created_by.map((c: any) => c.name);
        } else {
          directors = (credits.crew || [])
            .filter((member: any) => member.job === 'Director' || member.job === 'Producer')
            .slice(0, 2)
            .map((d: any) => d.name);
        }
      }

      const productionCompanies = (data.production_companies || enData?.production_companies || []).map((c: any) => c.name);
      
      const countries = mediaType === 'movie'
        ? (data.production_countries || enData?.production_countries || []).map((c: any) => c.name || c.iso_3166_1)
        : (data.origin_country || enData?.origin_country || []);

      let tvSeasons: any[] = [];
      if (mediaType === 'tv' && data.seasons) {
        tvSeasons = data.seasons
          .filter((s: any) => s.season_number > 0)
          .map((s: any) => ({
            seasonNumber: s.season_number,
            name: s.name || `فصل ${s.season_number}`,
            episodeCount: s.episode_count || 0
          }));
      }

      return {
        id: mergedData.id,
        title,
        originalTitle,
        overview,
        releaseDate,
        runtime,
        genres,
        rating: mergedData.vote_average || 0,
        voteCount: mergedData.vote_count || 0,
        posterPath,
        backdropPath,
        cast,
        director: directors,
        productionCompanies,
        countries,
        mediaType,
        gallery,
        tvSeasons
      };
    } catch (err) {
      console.error(`Error fetching TMDb details for ${mediaType} ${id}:`, err);
      return null;
    }
  }
}
