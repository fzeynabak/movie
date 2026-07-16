export interface ParsedMovie {
  isSeries: false;
  title: string;
  year?: string;
  resolution?: string;
  source?: string;
  codec?: string;
}

export interface ParsedSeries {
  isSeries: true;
  seriesName: string;
  season?: string; // e.g., "02" or "2"
  episode?: string; // e.g., "S02E05" or "05"
  episodeNumber?: string; // e.g., "05" or "5"
  year?: string;
  resolution?: string;
  source?: string;
  codec?: string;
}

export type ParsedMedia = ParsedMovie | ParsedSeries;

export interface LearnedRule {
  id: string;
  keyword: string; // e.g. "HAFT" or "HAFT E" or custom pattern
  seriesName: string;
  season: string;
}

export class FilenameParser {
  /**
   * Retrieve learned naming rules from localStorage
   */
  public static getLearnedRules(): LearnedRule[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('parstech_learned_rules');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error loading learned rules:', e);
      return [];
    }
  }

  /**
   * Save a new learned naming rule
   */
  public static saveLearnedRule(keyword: string, seriesName: string, season: string): void {
    if (typeof window === 'undefined') return;
    try {
      const rules = this.getLearnedRules();
      // Remove existing for same keyword to prevent duplicates
      const filtered = rules.filter(r => r.keyword.toLowerCase() !== keyword.toLowerCase());
      filtered.push({
        id: 'rule_' + Math.random().toString(36).substr(2, 9),
        keyword,
        seriesName,
        season
      });
      localStorage.setItem('parstech_learned_rules', JSON.stringify(filtered));
      console.log('Saved new learned rule:', keyword, seriesName, season);
    } catch (e) {
      console.error('Error saving learned rule:', e);
    }
  }

  /**
   * Parses any movie or TV series filename and extracts metadata.
   * 
   * Supported resolutions: 2160p, 1080p, 720p, 480p, 4k, 8k, etc.
   * Supported sources: BluRay, BRRip, BDRip, WEB-DL, WEBDL, WebRip, WEBRip, HDTV, PDTV, Cam, TS, etc.
   * Supported codecs: x264, x265, h264, h265, hevc, HEVC, AVC, etc.
   * 
   * @param filename Filename with or without extension
   * @returns ParsedMovie or ParsedSeries as a structured JSON object
   */
  public static parse(filename: string): ParsedMedia {
    // 1. Remove extension
    let nameWithoutExt = filename;
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex > 0) {
      nameWithoutExt = filename.substring(0, dotIndex);
    }

    // Normalise dots, underscores, and hyphens into spaces to simplify scanning tokens
    const normalized = nameWithoutExt.replace(/[\._\-]/g, ' ');

    let isSeries = false;
    let seriesName = '';
    let season = '';
    let episode = '';
    let episodeNumber = '';

    let matchIndex = -1;
    let matchLength = 0;

    // Check learned rules first to override default parsing
    const learnedRules = this.getLearnedRules();
    let matchedRule: LearnedRule | null = null;
    
    for (const rule of learnedRules) {
      if (normalized.toLowerCase().includes(rule.keyword.toLowerCase())) {
        matchedRule = rule;
        break;
      }
    }

    // Match Series Patterns: S02E05 or S2E5 or 2x05 or s02e05
    const sSeriesRegex = /\b[Ss](\d+)\s*[Ee](\d+)\b/i; // S02E05, S2 E5, S02_E05, S02-E05
    const xSeriesRegex = /\b(\d+)\s*[xX]\s*(\d+)\b/;       // 2x05, 2 x 05
    const eOnlyRegex = /\b[Ee](?:p(?:isode)?)?\s*(\d+)\b/; // E07, E07, Ep07, Episode 7, e7 (case-insensitive done in matching below)
    const partRegex = /\b(?:part|part_|episode|ep|ep_)\s*(\d+)\b/i; // Part 7, Part_07, Ep 7
    
    // Test combinations
    let matchS = normalized.match(sSeriesRegex);
    let matchX = normalized.match(xSeriesRegex);
    let matchE = normalized.match(new RegExp(eOnlyRegex.source, 'i'));
    let matchPart = normalized.match(partRegex);

    if (matchS) {
      isSeries = true;
      season = matchS[1];
      episode = matchS[0].toUpperCase().replace(/\s/g, ''); // "S02E05"
      episodeNumber = matchS[2];
      matchIndex = matchS.index || -1;
      matchLength = matchS[0].length;
    } else if (matchX) {
      isSeries = true;
      season = matchX[1];
      episode = `S${matchX[1].padStart(2, '0')}E${matchX[2].padStart(2, '0')}`;
      episodeNumber = matchX[2];
      matchIndex = matchX.index || -1;
      matchLength = matchX[0].length;
    } else if (matchE) {
      isSeries = true;
      season = matchedRule ? matchedRule.season : '1'; // Default to 1, or override by matched rule
      episodeNumber = matchE[1];
      episode = `S${season.padStart(2, '0')}E${episodeNumber.padStart(2, '0')}`;
      matchIndex = matchE.index || -1;
      matchLength = matchE[0].length;
    } else if (matchPart) {
      isSeries = true;
      season = matchedRule ? matchedRule.season : '1';
      episodeNumber = matchPart[1];
      episode = `S${season.padStart(2, '0')}E${episodeNumber.padStart(2, '0')}`;
      matchIndex = matchPart.index || -1;
      matchLength = matchPart[0].length;
    } else if (matchedRule) {
      // If we have a matched rule and no episode found, let's see if there is any trailing number
      const trailingNumberMatch = normalized.match(/\b(\d+)\b/g);
      if (trailingNumberMatch && trailingNumberMatch.length > 0) {
        isSeries = true;
        season = matchedRule.season;
        episodeNumber = trailingNumberMatch[trailingNumberMatch.length - 1]; // pick last number as episode
        episode = `S${season.padStart(2, '0')}E${episodeNumber.padStart(2, '0')}`;
      }
    }

    // Extract attributes (Year, Resolution, Source, Codec)
    // Year Pattern: (2009) or 2009 or 1404
    const yearRegex = /\b(13\d\d|14\d\d|19\d\d|20\d\d)\b/;
    const yearMatch = normalized.match(yearRegex);
    const year = yearMatch ? yearMatch[1] : undefined;

    // Resolution Pattern: 2160p, 1080p, 720p, 480p, 1080i, 4K, 8K, 3D
    const resRegex = /\b(2160[pP]|1080[pPiI]|720[pP]|480[pP]|[48][kK]|[34]d)\b/;
    const resMatch = normalized.match(resRegex);
    const resolution = resMatch ? resMatch[1] : undefined;

    // Source Pattern: BluRay, Web-DL, WebRip, HDTV, etc.
    const sourceRegex = /\b(BluRay|Bluray|BRRip|BDRip|WEB-DL|WEBDL|WebRip|WEBRip|HDTV|PDTV|CAM|TS-RIP)\b/i;
    const sourceMatch = normalized.match(sourceRegex);
    const source = sourceMatch ? sourceMatch[1] : undefined;

    // Codec Pattern: x264, x265, h264, h265, hevc, avc, h.264, h.265
    const codecRegex = /\b(x264|x265|h264|h265|hevc|HEVC|avc|AVC|h\.264|h\.265)\b/i;
    const codecMatch = normalized.match(codecRegex);
    const codec = codecMatch ? codecMatch[1] : undefined;

    // Determine the Title / Series Name from the text preceding the first metadata token
    let stopIndex = normalized.length;

    // We want the title to stop before year, resolution, source, codec, or season/episode marker
    const indices = [
      yearMatch ? yearMatch.index : -1,
      resMatch ? resMatch.index : -1,
      sourceMatch ? sourceMatch.index : -1,
      codecMatch ? codecMatch.index : -1,
      matchIndex
    ].filter(idx => idx !== undefined && idx !== null && idx >= 0);

    if (indices.length > 0) {
      stopIndex = Math.min(...indices);
    }

    let extractedName = normalized.substring(0, stopIndex).trim();
    // Clean up trailing parentheses, dashes, spaces from title
    extractedName = extractedName.replace(/\s*[\(\[\-\+]$/, '').trim();
    extractedName = extractedName.replace(/^[\(\[\-\+]\s*/, '').trim();

    // If matched rule exists, apply the mapped series name
    if (matchedRule) {
      seriesName = matchedRule.seriesName;
    } else {
      seriesName = extractedName || 'Unknown Series';
    }

    if (isSeries) {
      return {
        isSeries: true,
        seriesName: seriesName,
        season: season || '1',
        episode,
        episodeNumber,
        year,
        resolution,
        source,
        codec
      };
    } else {
      return {
        isSeries: false,
        title: extractedName || 'Unknown Movie',
        year,
        resolution,
        source,
        codec
      };
    }
  }
}
