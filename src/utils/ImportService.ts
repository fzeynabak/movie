/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbService } from '../db/databaseService';
import { ScannedMediaItem } from './MediaScanner';
import { Movie, Series, Season, Episode } from '../types';
import { ParsedMovie, ParsedSeries } from './FilenameParser';
import { TMDbService } from './TMDbService';

export class ImportService {
  /**
   * Imports selected scanned media items into the database.
   * Handles both movies and TV series.
   * 
   * @param selectedItems List of selected ScannedMediaItem objects to import
   * @param defaultCategory The active category from the UI (e.g., 'خارجی' or 'ایرانی')
   * @returns A promise resolving to the number of successfully imported files
   */
  public static async importItems(
    selectedItems: ScannedMediaItem[],
    defaultCategory: string = 'خارجی'
  ): Promise<{ successCount: number; failedCount: number }> {
    let successCount = 0;
    let failedCount = 0;

    const settings = dbService.getSettings();
    const defaultMoviePrice = settings?.defaultMoviePrice || 2000;
    const defaultSeriesPrice = settings?.defaultSeriesPrice || 1500;

    // Cache to avoid searching TMDb and downloading posters multiple times for the same series folder
    const seriesFolderCache = new Map<string, any>();

    for (const item of selectedItems) {
      try {
        // If series and folder already processed, reuse the downloaded tmdb data
        if (item.parsed.isSeries && seriesFolderCache.has(item.file.folder)) {
          const cachedTmdb = seriesFolderCache.get(item.file.folder);
          if (cachedTmdb) {
            item.tmdb = JSON.parse(JSON.stringify(cachedTmdb));
            item.matchStatus = 'matched';
          }
        }

        // Dynamic, on-demand TMDb lookup and local image caching on selection
        if (!item.tmdb) {
          try {
            const parts = item.file.folder.split(/[/\\]/);
            const parentFolderName = parts[parts.length - 1] || '';
            const tmdbMatch = await TMDbService.findBestMatch(item.parsed, parentFolderName);
            if (tmdbMatch) {
              item.tmdb = tmdbMatch;
              item.matchStatus = 'matched';

              // Download posters and backdrop locally inside film directory under /pic/
              if (window.electronAPI && window.electronAPI.savePosterLocal) {
                const isWindows = item.file.folder.includes('\\');
                const picFolder = item.file.folder + (isWindows ? '\\pic' : '/pic');

                // A. Save poster
                if (item.tmdb.posterPath) {
                  const posterRes = await window.electronAPI.savePosterLocal(item.tmdb.posterPath, picFolder, 'poster');
                  if (posterRes && posterRes.success) {
                    item.tmdb.posterPath = posterRes.savedPath;
                  }
                }

                // B. Save backdrop
                if (item.tmdb.backdropPath) {
                  const backdropRes = await window.electronAPI.savePosterLocal(item.tmdb.backdropPath, picFolder, 'backdrop');
                  if (backdropRes && backdropRes.success) {
                    item.tmdb.backdropPath = backdropRes.savedPath;
                  }
                }

                // C. Save gallery (scenes)
                if (item.tmdb.gallery && item.tmdb.gallery.length > 0) {
                  const localGallery: string[] = [];
                  for (let i = 0; i < Math.min(item.tmdb.gallery.length, 3); i++) {
                    const imgUrl = item.tmdb.gallery[i];
                    const gallRes = await window.electronAPI.savePosterLocal(imgUrl, picFolder, `gallery_${i + 1}`);
                    if (gallRes && gallRes.success) {
                      localGallery.push(gallRes.savedPath);
                    }
                  }
                  item.tmdb.gallery = localGallery;
                }
              }

              // Store in cache for subsequent episodes
              if (item.parsed.isSeries) {
                seriesFolderCache.set(item.file.folder, JSON.parse(JSON.stringify(item.tmdb)));
              }
            }
          } catch (tmdbErr) {
            console.error('TMDb dynamic lookup failed on import for:', item.file.filename, tmdbErr);
          }
        }

        if (item.parsed.isSeries) {
          // --- TV SERIES IMPORT ---
          const parsedSeries = item.parsed as ParsedSeries;
          const seasonNumStr = parsedSeries.season || '1';
          const seasonNum = parseInt(seasonNumStr, 10) || 1;
          const epNum = parseInt(parsedSeries.episodeNumber || '1', 10) || 1;
          const epName = `قسمت ${epNum}`;

          const tmdbId = item.tmdb?.id;
          const titleEn = item.tmdb?.originalTitle || parsedSeries.seriesName;
          const titleFa = item.tmdb?.title || parsedSeries.seriesName;

          // Search if this series already exists in the database
          const existingSeriesList = dbService.getSeries();
          const existingSeries = existingSeriesList.find(s => {
            // Match by TMDb ID (stored in officialSite or collectionName equivalent) or name
            if (tmdbId && s.officialSite && s.officialSite.includes(`/tv/${tmdbId}`)) {
              return true;
            }
            return s.titleEn.toLowerCase() === titleEn.toLowerCase() || s.titleFa === titleFa;
          });

          // Detect associated subtitles automatically
          let subtitlesList: string[] = [];
          if (window.electronAPI && window.electronAPI.findMatchingSubtitles) {
            try {
              const res = await window.electronAPI.findMatchingSubtitles(item.file.fullPath);
              if (res && res.success && res.subtitles) {
                subtitlesList = res.subtitles;
              }
            } catch (err) {
              console.error('Auto sub scanning error for episode:', err);
            }
          }

          // Build Episode item
          const newEpisode: Episode = {
            id: 'ep_' + Math.random().toString(36).substr(2, 9),
            episodeNumber: epNum,
            name: epName,
            videoPath: item.file.fullPath,
            description: item.tmdb?.overview || '',
            subtitlesList: subtitlesList.length > 0 ? subtitlesList : undefined
          };

          if (existingSeries) {
            // Appending to existing series
            const updatedSeasons = [...(existingSeries.seasons || [])];
            const seasonName = `فصل ${seasonNum}`;
            let seasonIndex = updatedSeasons.findIndex(s => s.name === seasonName || s.name.includes(`فصل ${seasonNum}`));

            if (seasonIndex === -1) {
              // Create new season
              const newSeason: Season = {
                id: 'se_' + Math.random().toString(36).substr(2, 9),
                name: seasonName,
                episodes: [newEpisode]
              };
              updatedSeasons.push(newSeason);
            } else {
              // Add episode to existing season
              const episodes = [...updatedSeasons[seasonIndex].episodes];
              // Prevent duplicates of the same episode number
              const dupIdx = episodes.findIndex(e => e.episodeNumber === epNum);
              if (dupIdx === -1) {
                episodes.push(newEpisode);
                episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
                updatedSeasons[seasonIndex] = {
                  ...updatedSeasons[seasonIndex],
                  episodes
                };
              } else {
                // Update file path of the duplicate episode
                episodes[dupIdx] = {
                  ...episodes[dupIdx],
                  videoPath: item.file.fullPath
                };
                updatedSeasons[seasonIndex] = {
                  ...updatedSeasons[seasonIndex],
                  episodes
                };
              }
            }

            // Update series
            const updatedEpisodesCount = updatedSeasons.reduce((acc, s) => acc + s.episodes.length, 0);
            dbService.updateSeries(existingSeries.id, {
              seasons: updatedSeasons,
              myEpisodesCount: updatedEpisodesCount
            });

            console.log(`Updated existing series: ${existingSeries.titleFa} with S${seasonNum}E${epNum}`);
          } else {
            // Create a brand new series
            const seasonName = `فصل ${seasonNum}`;
            const newSeason: Season = {
              id: 'se_' + Math.random().toString(36).substr(2, 9),
              name: seasonName,
              episodes: [newEpisode]
            };

            const newSeriesItem: Omit<Series, 'id' | 'addedAt' | 'seasons'> & { seasons?: Season[] } = {
              category: defaultCategory,
              titleFa,
              titleEn,
              year: item.tmdb?.releaseDate ? item.tmdb.releaseDate.substring(0, 4) : (parsedSeries.year || new Date().getFullYear().toString()),
              director: item.tmdb?.director.join(', ') || 'نامشخص',
              writer: 'نامشخص',
              actors: item.tmdb?.cast.join(', ') || 'نامشخص',
              episodeDuration: item.tmdb?.runtime ? `${item.tmdb.runtime} دقیقه` : '۴۵ دقیقه',
              country: item.tmdb?.countries.join(', ') || 'خارجی',
              language: defaultCategory.includes('ایرانی') ? 'فارسی' : 'زبان اصلی (زیرنویس فارسی)',
              imdbRating: item.tmdb?.rating ? item.tmdb.rating.toFixed(1) : '0.0',
              quality: parsedSeries.resolution || '1080p',
              subtitle: 'زیرنویس چسبیده دارد',
              genres: item.tmdb?.genres || [],
              poster: item.tmdb?.posterPath || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500',
              summary: item.tmdb?.overview || `سریال تلویزیونی ${titleFa} اسکن شده از فایل‌های فیزیکی سیستم.`,
              filePath: item.file.folder,
              purchasePrice: 0,
              salePrice: defaultSeriesPrice,
              seasons: [newSeason],
              totalEpisodes: 1,
              myEpisodesCount: 1,
              releasedEpisodesCount: 1,
              isEnded: false,
              isEndedText: 'در حال پخش',
              officialSite: tmdbId ? `https://www.themoviedb.org/tv/${tmdbId}` : undefined,
              gallery: item.tmdb?.gallery || []
            };

            dbService.addSeries(newSeriesItem);
            console.log(`Created new series: ${titleFa} with S${seasonNum}E${epNum}`);
          }
        } else {
          // --- MOVIE IMPORT ---
          const parsedMovie = item.parsed as ParsedMovie;
          const tmdbId = item.tmdb?.id;
          const titleEn = item.tmdb?.originalTitle || parsedMovie.title;
          const titleFa = item.tmdb?.title || parsedMovie.title;

          // Detect associated subtitles automatically
          let subtitlesList: string[] = [];
          if (window.electronAPI && window.electronAPI.findMatchingSubtitles) {
            try {
              const res = await window.electronAPI.findMatchingSubtitles(item.file.fullPath);
              if (res && res.success && res.subtitles) {
                subtitlesList = res.subtitles;
              }
            } catch (err) {
              console.error('Auto sub scanning error for movie:', err);
            }
          }

          const newMovieItem: Omit<Movie, 'id' | 'addedAt'> = {
            category: defaultCategory,
            titleFa,
            titleEn,
            year: item.tmdb?.releaseDate ? item.tmdb.releaseDate.substring(0, 4) : (parsedMovie.year || new Date().getFullYear().toString()),
            director: item.tmdb?.director.join(', ') || 'نامشخص',
            writer: 'نامشخص',
            actors: item.tmdb?.cast.join(', ') || 'نامشخص',
            duration: item.tmdb?.runtime ? `${item.tmdb.runtime} دقیقه` : '۱۲۰ دقیقه',
            country: item.tmdb?.countries.join(', ') || 'خارجی',
            language: defaultCategory.includes('ایرانی') ? 'فارسی' : 'زبان اصلی (زیرنویس فارسی)',
            imdbRating: item.tmdb?.rating ? item.tmdb.rating.toFixed(1) : '0.0',
            quality: parsedMovie.resolution || '1080p',
            subtitle: 'زیرنویس چسبیده دارد',
            genres: item.tmdb?.genres || [],
            poster: item.tmdb?.posterPath || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500',
            summary: item.tmdb?.overview || `فیلم سینمایی ${titleFa} اسکن شده از مسیر فیزیکی سیستم.`,
            filePath: item.file.fullPath,
            purchasePrice: 0,
            salePrice: defaultMoviePrice,
            officialSite: tmdbId ? `https://www.themoviedb.org/movie/${tmdbId}` : undefined,
            collectionName: item.tmdb ? `TMDb ID: ${tmdbId}` : undefined,
            gallery: item.tmdb?.gallery || [],
            subtitlesList: subtitlesList.length > 0 ? subtitlesList : undefined
          };

          dbService.addMovie(newMovieItem);
          console.log(`Imported movie: ${titleFa}`);
        }
        successCount++;
      } catch (err) {
        console.error('Failed to import scanned item:', item, err);
        failedCount++;
      }
    }

    return { successCount, failedCount };
  }
}
