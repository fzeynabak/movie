/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MediaCategory = string;

export interface Movie {
  id: string;
  category: MediaCategory;
  titleFa: string;
  titleEn: string;
  year: string;
  director: string;
  writer: string;
  actors: string;
  duration: string; // in minutes or text
  country: string;
  language: string;
  imdbRating: string;
  quality: string;
  subtitle: string;
  genres: string[]; // array of strings
  poster: string; // unsplash image url or dataUri
  summary: string;
  officialSite?: string;
  filePath: string;
  purchasePrice: number;
  salePrice: number;
  addedAt: string;
  gallery?: string[]; // screen shots gallery urls
  originPeerIp?: string; // LAN IP of the system this movie is stored on
  isPeerMedia?: boolean; // True if this movie belongs to a peer computer (System 2)
  collectionName?: string; // Optional collection name (e.g., "Lord Of The Rings")
  subtitlesList?: string[]; // Array of subtitle file paths
}

export interface Episode {
  id: string;
  episodeNumber: number;
  name: string;
  videoPath: string;
  description: string;
  subtitlesList?: string[]; // Array of subtitle file paths for this episode
}

export interface Season {
  id: string;
  name: string; // e.g. "فصل اول"
  episodes: Episode[];
}

export interface Series {
  id: string;
  category: MediaCategory;
  titleFa: string;
  titleEn: string;
  year: string;
  director: string;
  writer: string;
  actors: string;
  episodeDuration: string;
  country: string;
  language: string;
  imdbRating: string;
  quality: string;
  subtitle: string;
  genres: string[];
  poster: string;
  summary: string;
  officialSite?: string;
  filePath?: string; // root folder path of the TV series
  purchasePrice: number; // base series purchase cost
  salePrice: number; // base series complete sale price
  seasons: Season[];
  addedAt: string;
  gallery?: string[];
  releaseDay?: string; // e.g. "جمعه"
  releaseTime?: string; // e.g. "22:00"
  originPeerIp?: string; // LAN IP of the system peer where this is stored
  isPeerMedia?: boolean; // True if this series belongs to a peer computer (System 2)
  totalEpisodes?: number;
  myEpisodesCount?: number;
  releasedEpisodesCount?: number;
  isEnded?: boolean;
  isEndedText?: string;
}

export type SalesType = 'movie' | 'series_full' | 'series_season' | 'series_episode' | 'series_multi_episode';

export interface CartItem {
  id: string; // unique cart item id
  mediaId: string; // reference to movie/series id
  mediaTitle: string; // e.g. "تلقین" or "بازی مرکب"
  mediaType: 'movie' | 'series';
  salesType: SalesType;
  details: string; // e.g. "فیلم سینمایی", "فروش کامل", "فصل ۱", "فصل ۱ - قسمت ۳"
  filePath: string; // primary physical path (for opening folder)
  videoPaths: string[]; // list of all associated physical files
  purchasePrice: number; // item's backend base purchase price
  salePrice: number; // customizable sale price
}

export interface CustomerSession {
  id: string; // unique tab session id
  customerName: string; // customer name or contact info
  cart: CartItem[]; // customer's specific active shopping cart
  selectedDrivePath?: string; // USB drive path for this customer
  selectedDriveCapacityGB?: number; // USB drive capacity in GB for space warning
}

export interface Sale {
  id: string;
  date: string; // ISO timestamp
  customerName: string;
  mediaId: string; // movie or series id
  mediaTitle: string; // title of original media
  mediaType: 'movie' | 'series';
  salesType: SalesType;
  details: string; // e.g. "فروش کامل", "فصل ۲", "فصل ۱ - قسمت ۵"
  purchasePrice: number; // logged at point-of-sale for profit calculation
  salePrice: number; // actual amount sold for
  discount: number; // discount amount in Tomans
  items?: CartItem[]; // list of items in case of multi-item checkout
}

export interface DefaultPaths {
  movies: string;
  series: string;
  backups: string;
  music?: string;
}

export interface Song {
  id: string;
  titleFa: string;
  titleEn?: string;
  artist: string;
  duration: number; // in seconds, e.g. 210
  quality: string; // e.g. "320kbps", "128kbps"
  filePath: string;
  tags: string[]; // e.g. ["شاد", "ماشین", "پاپ"]
  addedAt: string;
}

export interface MusicPlaylist {
  id: string;
  name: string; // e.g. "شاد"
  description?: string;
  color?: string; // category tag badge colors for gorgeous presentation
}

export interface AppSettings {
  theme: 'light' | 'dark';
  defaultPaths: DefaultPaths;
  pageSize: 20 | 50 | 100;
  defaultMoviePrice: number; // Single fixed sale price per movie copy (e.g., 2000 Tomans)
  defaultSeriesPrice: number; // Single fixed sale price per series episode (e.g., 1500 Tomans)
  defaultQuality?: string; // Add default quality option (e.g., "1080p BluRay")
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopPhoneSecondary?: string;
  customCategories?: string[];
  customQualities?: string[];
  lanEnabled?: boolean;
  lastPeerIp?: string;
  tmdbApiKey?: string;
  tmdbReadAccessToken?: string;
  tmdbLanguage?: string;
  tmdbIncludeAdult?: boolean;
  videoPlayerMode?: 'internal' | 'external';
  saveInvoiceToUsbEnabled?: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => Promise<boolean>;
      maximizeWindow: () => Promise<boolean>;
      closeWindow: () => Promise<boolean>;
      openFileInExplorer: (filepath: string, originPeerIp?: string) => Promise<{ success: boolean; error?: string }>;
      playVideoFile: (filepath: string, originPeerIp?: string) => Promise<{ success: boolean; error?: string }>;
      openFolderDirectory: (dirpath: string, originPeerIp?: string) => Promise<{ success: boolean; error?: string }>;
      selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
      selectPoster: () => Promise<string | null>;
      selectDirectory: () => Promise<any>;
      readDbFile: () => Promise<any>;
      writeDbFile: (fullData: any) => Promise<{ success: boolean; error?: string }>;
      getDbFilePath: () => Promise<string>;
      setSqliteDbPath?: (newPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      runSql: (sql: string, params?: any[]) => Promise<{ success: boolean; rows?: any[]; error?: string; lastID?: number; changes?: number }>;
      isSqliteAvailable: () => Promise<boolean>;
      fetchUrlData?: (url: string, options?: { timeout?: number }) => Promise<{ success: boolean; data?: any; error?: string }>;
      savePosterLocal?: (imageUrl: string, destFolder: string, filename: string) => Promise<{ success: boolean; savedPath?: string; error?: string }>;
      existsFile?: (filepath: string) => Promise<{ success: boolean; exists: boolean; size?: number; error?: string }>;
      renameFile?: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
      moveFilePhysical?: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
      getDiskSpace?: (dirPath: string) => Promise<{ success: boolean; totalBytes?: number; freeBytes?: number; usedBytes?: number; error?: string }>;
      resolveVideoPath?: (basePathWithoutExt: string) => Promise<{ success: boolean; resolvedPath: string; ext: string; error?: string }>;
      scanSeriesDirectory?: (dirpath: string) => Promise<{ success: boolean; files?: Array<{ name: string; path: string; ext: string; size: number }>; error?: string }>;
      scanMediaDirectory?: (dirpath: string) => Promise<{ success: boolean; files?: Array<{ filename: string; fullPath: string; extension: string; folder: string; size: number; modifiedDate: string }>; error?: string }>;
      getLocalIps?: () => Promise<string[]>;
      downloadLanFile?: (url: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
      copyFileToUsb?: (sourcePath: string, destDir: string, id: string, targetFileName?: string) => Promise<{ success: boolean; destPath?: string; error?: string }>;
      saveBase64File?: (base64Data: string, destPath: string) => Promise<{ success: boolean; destPath?: string; error?: string }>;
      readClipboardHTML?: () => Promise<{ success: boolean; html?: string; text?: string; error?: string }>;
      openTelegram?: () => Promise<{ success: boolean; fallback?: boolean; error?: string }>;
      downloadInternetFile?: (id: string, url: string, destPath: string) => Promise<{ success: boolean; destPath?: string; error?: string }>;
      cancelDownloadFile?: (id: string) => Promise<{ success: boolean; error?: string }>;
      findMatchingSubtitles?: (videoPath: string) => Promise<{ success: boolean; subtitles?: string[]; error?: string }>;
      readTextFile?: (filepath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      exportSqliteDb?: (destPath: string) => Promise<{ success: boolean; error?: string }>;
      importSqliteDb?: (srcPath: string) => Promise<{ success: boolean; error?: string }>;
      onCopyProgress?: (callback: (data: { id: string; progress: number; bytesCopied: number; totalBytes: number; speedMbs: number; completed?: boolean; error?: string }) => void) => void;
      onDownloadProgress?: (callback: (data: any) => void) => void;
      onDownloadTaskProgress?: (callback: (data: { id: string; progress: number; bytesWritten: number; totalBytes: number; speedMbs: number; currentSpeedMbs?: number; timeElapsed?: number; completed?: boolean; error?: string }) => void) => void;
      cancelCopy?: (id: string) => Promise<{ success: boolean; error?: string }>;
      saveInvoiceImage?: (destDir: string, dataUrl: string, filename: string) => Promise<{ success: boolean; error?: string }>;
      windowControl?: any;
      getDbStats?: any;
      checkOnboardingStatus?: any;
    };
  }
}

export function getSafePosterUrl(poster: string | undefined | null): string {
  if (!poster) return 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400';
  if (poster.startsWith('http://') || poster.startsWith('https://') || poster.startsWith('data:')) {
    return poster;
  }
  // If it's a local path (either starts with a drive letter or has backslashes)
  let formatted = poster.replace(/\\/g, '/');
  if (!formatted.startsWith('file:///')) {
    if (formatted.startsWith('/')) {
      formatted = 'file://' + formatted;
    } else {
      formatted = 'file:///' + formatted;
    }
  }
  return formatted;
}

export type Person = any;

