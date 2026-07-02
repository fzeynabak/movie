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

export class FilenameParser {
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
    const normalized = nameWithoutExt.replace(/[\._]/g, ' ');

    // Match Series Patterns: S02E05 or S2E5 or 2x05 or s02e05
    const sSeriesRegex = /\b[Ss](\d+)[Ee](\d+)\b/; // S02E05
    const xSeriesRegex = /\b(\d+)x(\d+)\b/;       // 2x05

    let isSeries = false;
    let seriesName = '';
    let season = '';
    let episode = '';
    let episodeNumber = '';

    let matchS = normalized.match(sSeriesRegex);
    let matchX = normalized.match(xSeriesRegex);

    let matchIndex = -1;
    let matchLength = 0;

    if (matchS) {
      isSeries = true;
      season = matchS[1];
      episode = matchS[0].toUpperCase(); // "S02E05"
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

    if (isSeries) {
      return {
        isSeries: true,
        seriesName: extractedName || 'Unknown Series',
        season,
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
