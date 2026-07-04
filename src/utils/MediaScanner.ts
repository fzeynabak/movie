import { FilenameParser, ParsedMedia } from './FilenameParser';
import { TMDbService, TMDbMetadata } from './TMDbService';

export interface ScannedFile {
  filename: string;
  fullPath: string;
  extension: string;
  folder: string;
  size: number;
  modifiedDate: string;
}

export interface ScannedMediaItem {
  file: ScannedFile;
  parsed: ParsedMedia;
  tmdb?: TMDbMetadata | null;
  matchStatus: 'matched' | 'unknown' | 'failed';
}

export class MediaScanner {
  /**
   * Scans a target directory recursively for supported video formats.
   * Supported formats: mkv, mp4, avi, mov, wmv, flv, mpeg, mpg, m4v, ts
   * 
   * @param directoryPath The absolute path of the directory to scan
   * @returns A promise that resolves to an array of ScannedFile objects
   */
  public static async scanDirectory(directoryPath: string): Promise<ScannedFile[]> {
    if (!directoryPath) {
      throw new Error('مسیر دایرکتوری معتبر نمی‌باشد.');
    }

    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.scanMediaDirectory) {
      throw new Error('بستر اجرای فرآیند بنده (Electron IPC) در دسترس نیست.');
    }

    try {
      const response = await window.electronAPI.scanMediaDirectory(directoryPath);
      if (response && response.success && response.files) {
        return response.files;
      } else {
        throw new Error(response?.error || 'خطای ناشناخته در زمان اسکن پوشه.');
      }
    } catch (error) {
      console.error('MediaScanner scan error:', error);
      throw error;
    }
  }

  /**
   * Scans a directory recursively, parses filenames, searches TMDb for matches, and builds a preview list.
   * 
   * @param directoryPath The path of the folder to scan
   * @returns List of scanned media items with parsed filename data and TMDb metadata if matched
   */
  public static async scanAndMatch(directoryPath: string): Promise<ScannedMediaItem[]> {
    const rawFiles = await this.scanDirectory(directoryPath);
    const results: ScannedMediaItem[] = [];

    for (const file of rawFiles) {
      try {
        const parsed = FilenameParser.parse(file.filename);
        results.push({
          file,
          parsed,
          tmdb: null,
          matchStatus: 'unknown'
        });
      } catch (err) {
        console.error(`Error scanning and parsing file "${file.filename}":`, err);
      }
    }

    return results;
  }


  /**
   * Filter scanned files by a specific format or multiple formats.
   */
  public static filterByExtension(files: ScannedFile[], extensions: string[]): ScannedFile[] {
    const extSet = new Set(extensions.map(ext => ext.toLowerCase().replace(/^\./, '')));
    return files.filter(f => extSet.has(f.extension.toLowerCase()));
  }

  /**
   * Sort files by name, size or modification date.
   */
  public static sortFiles(
    files: ScannedFile[], 
    sortBy: 'filename' | 'size' | 'modifiedDate', 
    direction: 'asc' | 'desc' = 'asc'
  ): ScannedFile[] {
    const sorted = [...files];
    sorted.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === 'filename') {
        return direction === 'asc' 
          ? valA.localeCompare(valB, 'fa') 
          : valB.localeCompare(valA, 'fa');
      }

      if (sortBy === 'modifiedDate') {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return direction === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // Default numeric comparison for size
      return direction === 'asc' ? valA - valB : valB - valA;
    });

    return sorted;
  }
}
