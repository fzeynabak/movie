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
  ): Promise<{ successCount: number; failedCount: number; moviesCount: number; seriesCount: number }> {
    let successCount = 0;
    let failedCount = 0;
    let moviesCount = 0;
    let seriesCount = 0;

    const settings = dbService.getSettings();
    const defaultMoviePrice = settings?.defaultMoviePrice || 2000;
    const defaultSeriesPrice = settings?.defaultSeriesPrice || 1500;

    // Cache to avoid searching TMDb and downloading posters multiple times for the same series folder or name
    const seriesFolderCache = new Map<string, any>();
    const folderPosterCache = new Map<string, { posterPath: string; backdropPath: string; gallery: string[] }>();

    for (const item of selectedItems) {
      try {
        const isWindows = item.file.folder.includes('\\');
        const picFolder = item.file.folder + (isWindows ? '\\pic' : '/pic');
        const fKey = picFolder.toLowerCase().trim();

        // If series, try to reconstruct dummy TMDb match from existing series in DB first to be fully offline and avoid downloads
        if (item.parsed.isSeries && !item.tmdb) {
          const parsedSeries = item.parsed as ParsedSeries;
          const seriesNameKey = parsedSeries.seriesName.trim();
          const existingSeriesList = dbService.getSeries();
          const dbSeriesItem = existingSeriesList.find(s => 
            s.titleFa.toLowerCase().trim() === seriesNameKey.toLowerCase() ||
            s.titleEn.toLowerCase().trim() === seriesNameKey.toLowerCase()
          );

          if (dbSeriesItem) {
            item.tmdb = {
              id: dbSeriesItem.officialSite ? parseInt(dbSeriesItem.officialSite.split('/').pop() || '0', 10) : 0,
              title: dbSeriesItem.titleFa,
              originalTitle: dbSeriesItem.titleEn,
              posterPath: dbSeriesItem.poster,
              backdropPath: dbSeriesItem.poster,
              overview: dbSeriesItem.summary,
              releaseDate: dbSeriesItem.year,
              rating: parseFloat(dbSeriesItem.imdbRating) || 0.0,
              genres: dbSeriesItem.genres || [],
              cast: dbSeriesItem.actors ? dbSeriesItem.actors.split(', ') : [],
              director: dbSeriesItem.director ? dbSeriesItem.director.split(', ') : [],
              runtime: parseInt(dbSeriesItem.episodeDuration) || 45,
              countries: [dbSeriesItem.country || ''],
              gallery: dbSeriesItem.gallery || [],
              voteCount: 0,
              productionCompanies: [],
              mediaType: 'tv'
            };
            item.matchStatus = 'matched';
          }
        }

        // If series, we can also check the in-memory cache keyed by series name
        if (item.parsed.isSeries) {
          const parsedSeries = item.parsed as ParsedSeries;
          const sKey = parsedSeries.seriesName.toLowerCase().trim();
          if (seriesFolderCache.has(sKey)) {
            const cachedTmdb = seriesFolderCache.get(sKey);
            if (cachedTmdb) {
              item.tmdb = JSON.parse(JSON.stringify(cachedTmdb));
              item.matchStatus = 'matched';
            }
          }
        }

        // Apply folder poster cache if available
        if (folderPosterCache.has(fKey)) {
          const cachedPaths = folderPosterCache.get(fKey);
          if (cachedPaths && item.tmdb) {
            item.tmdb.posterPath = cachedPaths.posterPath;
            item.tmdb.backdropPath = cachedPaths.backdropPath;
            item.tmdb.gallery = cachedPaths.gallery;
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

                // Store in folderPosterCache
                folderPosterCache.set(fKey, {
                  posterPath: item.tmdb.posterPath,
                  backdropPath: item.tmdb.backdropPath,
                  gallery: item.tmdb.gallery
                });
              }

              // Store in cache for subsequent episodes using series name as key
              if (item.parsed.isSeries) {
                const parsedSeries = item.parsed as ParsedSeries;
                const sKey = parsedSeries.seriesName.toLowerCase().trim();
                seriesFolderCache.set(sKey, JSON.parse(JSON.stringify(item.tmdb)));
              }
            }
          } catch (tmdbErr) {
            console.error('TMDb dynamic lookup failed on import for:', item.file.filename, tmdbErr);
          }
        }

        // If tmdb has remote paths (e.g. from batch assigning), download them locally and cache them!
        if (item.tmdb) {
          const isRemotePoster = item.tmdb.posterPath && (item.tmdb.posterPath.startsWith('http') || (item.tmdb.posterPath.startsWith('/') && !item.tmdb.posterPath.includes('/pic/') && !item.tmdb.posterPath.includes('\\pic\\')));
          const isRemoteBackdrop = item.tmdb.backdropPath && (item.tmdb.backdropPath.startsWith('http') || (item.tmdb.backdropPath.startsWith('/') && !item.tmdb.backdropPath.includes('/pic/') && !item.tmdb.backdropPath.includes('\\pic\\')));
          
          if ((isRemotePoster || isRemoteBackdrop) && window.electronAPI && window.electronAPI.savePosterLocal) {
            try {
              if (isRemotePoster && item.tmdb.posterPath) {
                const posterRes = await window.electronAPI.savePosterLocal(item.tmdb.posterPath, picFolder, 'poster');
                if (posterRes && posterRes.success) {
                  item.tmdb.posterPath = posterRes.savedPath;
                }
              }

              if (isRemoteBackdrop && item.tmdb.backdropPath) {
                const backdropRes = await window.electronAPI.savePosterLocal(item.tmdb.backdropPath, picFolder, 'backdrop');
                if (backdropRes && backdropRes.success) {
                  item.tmdb.backdropPath = backdropRes.savedPath;
                }
              }

              if (item.tmdb.gallery && item.tmdb.gallery.length > 0) {
                const localGallery: string[] = [];
                for (let i = 0; i < Math.min(item.tmdb.gallery.length, 3); i++) {
                  const imgUrl = item.tmdb.gallery[i];
                  if (imgUrl.startsWith('http') || (imgUrl.startsWith('/') && !imgUrl.includes('/pic/') && !imgUrl.includes('\\pic\\'))) {
                    const gallRes = await window.electronAPI.savePosterLocal(imgUrl, picFolder, `gallery_${i + 1}`);
                    if (gallRes && gallRes.success) {
                      localGallery.push(gallRes.savedPath);
                    } else {
                      localGallery.push(imgUrl);
                    }
                  } else {
                    localGallery.push(imgUrl);
                  }
                }
                item.tmdb.gallery = localGallery;
              }

              // Store in folderPosterCache
              folderPosterCache.set(fKey, {
                posterPath: item.tmdb.posterPath,
                backdropPath: item.tmdb.backdropPath,
                gallery: item.tmdb.gallery
              });

              // Store in cache for subsequent episodes using series name as key
              if (item.parsed.isSeries) {
                const parsedSeries = item.parsed as ParsedSeries;
                const sKey = parsedSeries.seriesName.toLowerCase().trim();
                seriesFolderCache.set(sKey, JSON.parse(JSON.stringify(item.tmdb)));
              }
            } catch (err) {
              console.error('Error downloading local poster for pre-assigned tmdb:', err);
            }
          }
        }

        if (item.parsed.isSeries) {
          // --- TV SERIES IMPORT ---
          seriesCount++;
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
              director: (item.tmdb?.director && Array.isArray(item.tmdb.director)) ? item.tmdb.director.join(', ') : 'نامشخص',
              writer: 'نامشخص',
              actors: (item.tmdb?.cast && Array.isArray(item.tmdb.cast)) ? item.tmdb.cast.join(', ') : 'نامشخص',
              episodeDuration: item.tmdb?.runtime ? `${item.tmdb.runtime} دقیقه` : '۴۵ دقیقه',
              country: (item.tmdb?.countries && Array.isArray(item.tmdb.countries)) ? item.tmdb.countries.join(', ') : 'خارجی',
              language: defaultCategory.includes('ایرانی') ? 'فارسی' : 'زبان اصلی (زیرنویس فارسی)',
              imdbRating: typeof item.tmdb?.rating === 'number' ? item.tmdb.rating.toFixed(1) : '0.0',
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
            director: (item.tmdb?.director && Array.isArray(item.tmdb.director)) ? item.tmdb.director.join(', ') : 'نامشخص',
            writer: 'نامشخص',
            actors: (item.tmdb?.cast && Array.isArray(item.tmdb.cast)) ? item.tmdb.cast.join(', ') : 'نامشخص',
            duration: item.tmdb?.runtime ? `${item.tmdb.runtime} دقیقه` : '۱۲۰ دقیقه',
            country: (item.tmdb?.countries && Array.isArray(item.tmdb.countries)) ? item.tmdb.countries.join(', ') : 'خارجی',
            language: defaultCategory.includes('ایرانی') ? 'فارسی' : 'زبان اصلی (زیرنویس فارسی)',
            imdbRating: typeof item.tmdb?.rating === 'number' ? item.tmdb.rating.toFixed(1) : '0.0',
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
          moviesCount++;
          console.log(`Imported movie: ${titleFa}`);
        }
        successCount++;
      } catch (err) {
        console.error('Failed to import scanned item:', item, err);
        failedCount++;
      }
    }

    return { successCount, failedCount, moviesCount, seriesCount };
  }
}
