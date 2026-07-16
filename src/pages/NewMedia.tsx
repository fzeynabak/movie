/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { TMDbService, TMDbMetadata } from '../utils/TMDbService';
import { SettingsService } from '../utils/SettingsService';
import { Movie, Series, Season, Episode, MediaCategory } from '../types';
import { showToast } from '../utils/toast';
import { FilenameParser, LearnedRule } from '../utils/FilenameParser';
import { 
  Film, 
  Tv, 
  Search, 
  Plus, 
  Check, 
  Info, 
  AlertTriangle, 
  Clock, 
  Star, 
  User, 
  FolderOpen, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Settings as SettingsIcon,
  RefreshCw,
  X,
  Play,
  TrendingUp,
  Grid,
  MapPin,
  Tag,
  DollarSign,
  Video
} from 'lucide-react';

// Simple Jalali Date converter
function toJalali(dateStr: string): string {
  if (!dateStr) return 'نامشخص';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const g_y = date.getFullYear();
  const g_m = date.getMonth() + 1;
  const g_d = date.getDate();
  
  const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  if (isLeap(g_y)) g_days_in_month[1] = 29;
  
  const gy = g_y - 1600;
  const gm = g_m - 1;
  const gd = g_d - 1;
  
  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
  for (let i = 0; i < gm; ++i) g_day_no += g_days_in_month[i];
  g_day_no += gd;
  
  let j_day_no = g_day_no - 79;
  const j_np = Math.floor(j_day_no / 12053);
  j_day_no %= 12053;
  
  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;
  
  if (j_day_no >= 366) {
    jy += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }
  
  let jm = 0;
  for (let i = 0; i < 12; ++i) {
    if (j_day_no < j_days_in_month[i]) {
      jm = i;
      break;
    }
    j_day_no -= j_days_in_month[i];
  }
  
  const jy_str = jy.toString();
  const jm_str = (jm + 1).toString().padStart(2, '0');
  const jd_str = (j_day_no + 1).toString().padStart(2, '0');
  
  return `${jy_str}/${jm_str}/${jd_str}`;
}

// Convert numbers to Persian digits
function toPersianDigits(num: string | number): string {
  if (num === undefined || num === null) return '';
  const str = num.toString();
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persian[parseInt(w, 10)]);
}

interface NewMediaProps {
  onGoToSettings?: () => void;
  onViewLocalMedia?: (type: 'movie' | 'series', id: string) => void;
}

export default function NewMedia({ onGoToSettings, onViewLocalMedia }: NewMediaProps) {
  const [hasCreds, setHasCreds] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'movies' | 'tv' | 'search' | 'ir-movies' | 'ir-tv'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  // Cache check helper states
  const [localMovies, setLocalMovies] = useState<Movie[]>([]);
  const [localSeries, setLocalSeries] = useState<Series[]>([]);
  const [appSettings, setAppSettings] = useState(dbService.getSettings());

  // Details Modal States
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [fullMetadata, setFullMetadata] = useState<TMDbMetadata | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  
  // Add to Local Library Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<'movie' | 'series'>('movie');
  const [formTitleFa, setFormTitleFa] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formDirector, setFormDirector] = useState('');
  const [formWriter, setFormWriter] = useState('');
  const [formActors, setFormActors] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formPoster, setFormPoster] = useState('');
  const [formGenres, setFormGenres] = useState<string[]>([]);
  const [formQuality, setFormQuality] = useState('');
  const [formCategory, setFormCategory] = useState<MediaCategory>('خارجی');
  const [formFilePath, setFormFilePath] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState(0);
  const [formSalePrice, setFormSalePrice] = useState(0);
  const [formSubtitle, setFormSubtitle] = useState('زیرنویس چسبیده فارسی');
  const [formDuration, setFormDuration] = useState('');
  
  // Series specific fields
  const [formSeasonsCount, setFormSeasonsCount] = useState(1);
  const [formSeasonsDetails, setFormSeasonsDetails] = useState<{ seasonNumber: number; name: string; episodeCount: number; selected: boolean; filePath: string; }[]>([]);

  // Background check status states
  const [isCheckingNewEpisodes, setIsCheckingNewEpisodes] = useState(false);

  // Missing episodes checker state
  const [showMissingEpisodesModal, setShowMissingEpisodesModal] = useState(false);
  const [missingEpisodesList, setMissingEpisodesList] = useState<any[]>([]);
  const [isCheckingMissing, setIsCheckingMissing] = useState(false);

  // Algorithm Naming Rule Trainer state
  const [trainerKeyword, setTrainerKeyword] = useState('');
  const [trainerSeriesName, setTrainerSeriesName] = useState('');
  const [trainerSeason, setTrainerSeason] = useState('1');
  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([]);

  useEffect(() => {
    const credCheck = SettingsService.hasCredentials();
    setHasCreds(credCheck);
    
    // Load local cache to compare
    setLocalMovies(dbService.getMovies());
    setLocalSeries(dbService.getSeries());
    setAppSettings(dbService.getSettings());
    setLearnedRules(FilenameParser.getLearnedRules());

    if (credCheck) {
      loadTabContent('trending');
    }
  }, []);

  const loadTabContent = async (
    tab: 'trending' | 'movies' | 'tv' | 'search' | 'ir-movies' | 'ir-tv',
    page: number = 1,
    isAppend: boolean = false
  ) => {
    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setResults([]);
    }

    try {
      let newItems: any[] = [];

      const getReleaseYear = (item: any) => {
        const dateStr = item.release_date || item.first_air_date;
        if (!dateStr) return null;
        const match = dateStr.match(/^(\d{4})/);
        return match ? parseInt(match[1], 10) : null;
      };

      if (tab === 'trending') {
        const movies = await TMDbService.getTrendingMovies(page);
        const tv = await TMDbService.getTrendingTV(page);

        // Merge with mediaType tag
        newItems = [
          ...movies.slice(0, 10).map(m => ({ ...m, media_type: 'movie' })),
          ...tv.slice(0, 10).map(t => ({ ...t, media_type: 'tv' }))
        ];
        newItems.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      } else if (tab === 'movies') {
        const movies = await TMDbService.getUpcomingMovies(page);
        newItems = movies.map(m => ({ ...m, media_type: 'movie' }));
      } else if (tab === 'tv') {
        const tv = await TMDbService.getTrendingTV(page);
        newItems = tv.map(t => ({ ...t, media_type: 'tv' }));
      } else if (tab === 'ir-movies') {
        const movies = await TMDbService.getIranianMovies(page);
        newItems = movies.map(m => ({ ...m, media_type: 'movie' }));
        // Filter strictly for release year >= 2021
        newItems = newItems.filter(item => {
          const yr = getReleaseYear(item);
          return yr !== null && yr >= 2021;
        });

        // Auto-fetch subsequent pages if page 1 results are too few
        if (!isAppend && newItems.length < 10) {
          let nextPageToFetch = page + 1;
          while (newItems.length < 10 && nextPageToFetch <= page + 3) {
            const extraMovies = await TMDbService.getIranianMovies(nextPageToFetch);
            const extraMapped = extraMovies.map(m => ({ ...m, media_type: 'movie' })).filter(item => {
              const yr = getReleaseYear(item);
              return yr !== null && yr >= 2021;
            });
            if (extraMapped.length === 0) break;
            newItems = [...newItems, ...extraMapped];
            nextPageToFetch++;
          }
          setCurrentPage(nextPageToFetch - 1);
        }
      } else if (tab === 'ir-tv') {
        const tv = await TMDbService.getIranianTV(page);
        newItems = tv.map(t => ({ ...t, media_type: 'tv' }));
        // Filter strictly for first air year >= 2021
        newItems = newItems.filter(item => {
          const yr = getReleaseYear(item);
          return yr !== null && yr >= 2021;
        });

        // Auto-fetch subsequent pages if page 1 results are too few
        if (!isAppend && newItems.length < 10) {
          let nextPageToFetch = page + 1;
          while (newItems.length < 10 && nextPageToFetch <= page + 3) {
            const extraTV = await TMDbService.getIranianTV(nextPageToFetch);
            const extraMapped = extraTV.map(t => ({ ...t, media_type: 'tv' })).filter(item => {
              const yr = getReleaseYear(item);
              return yr !== null && yr >= 2021;
            });
            if (extraMapped.length === 0) break;
            newItems = [...newItems, ...extraMapped];
            nextPageToFetch++;
          }
          setCurrentPage(nextPageToFetch - 1);
        }
      }

      if (newItems.length === 0) {
        setHasMore(false);
        if (isAppend) {
          showToast('اثر جدید دیگری یافت نشد.', 'info');
        }
      } else {
        setHasMore(true);
        setResults(prev => {
          const combined = isAppend ? [...prev, ...newItems] : newItems;
          const seen = new Set();
          return combined.filter(item => {
            if (!item.id) return true;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });
      }
    } catch (err) {
      console.error('Error fetching list from TMDB:', err);
      showToast('خطا در برقراری ارتباط با سرویس TMDB رخ داد.', 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleTabChange = (tab: 'trending' | 'movies' | 'tv' | 'search' | 'ir-movies' | 'ir-tv') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setHasMore(true);
    if (tab !== 'search') {
      loadTabContent(tab, 1, false);
    } else {
      setResults([]);
    }
  };

  const handleLoadMore = () => {
    const next = currentPage + 1;
    setCurrentPage(next);
    loadTabContent(activeTab, next, true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setResults([]);
    try {
      // Search movies and tv shows
      const movies = await TMDbService.searchMovie(searchQuery);
      const tv = await TMDbService.searchTV(searchQuery);
      
      const merged = [
        ...movies.map(m => ({ ...m, media_type: 'movie' })),
        ...tv.map(t => ({ ...t, media_type: 'tv' }))
      ];
      
      merged.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      setResults(merged);
      
      if (merged.length === 0) {
        showToast('هیچ اثری متناسب با جستجوی شما یافت نشد.', 'info');
      }
    } catch (err) {
      console.error('Error during TMDB search:', err);
      showToast('جستجو در TMDB ناموفق بود.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if item is already in local library
  const getLibraryStatus = (item: any): { exists: boolean; id?: string; localItem?: Movie | Series } => {
    const originalTitle = item.original_title || item.original_name || '';
    const title = item.title || item.name || '';
    const releaseDate = item.release_date || item.first_air_date || '';
    const year = releaseDate ? releaseDate.split('-')[0] : '';
    
    const cleanStr = (s: string) => s.toLowerCase().replace(/[^\w\u0600-\u06FF]/g, '').trim();
    
    if (item.media_type === 'movie' || !item.first_air_date) {
      // Check in movies
      const matched = localMovies.find(m => {
        const titleEnMatch = m.titleEn && cleanStr(m.titleEn) === cleanStr(originalTitle);
        const titleFaMatch = m.titleFa && cleanStr(m.titleFa) === cleanStr(title);
        const yearMatch = !year || !m.year || m.year === year;
        return (titleEnMatch || titleFaMatch) && yearMatch;
      });
      return matched ? { exists: true, id: matched.id, localItem: matched } : { exists: false };
    } else {
      // Check in series
      const matched = localSeries.find(s => {
        const titleEnMatch = s.titleEn && cleanStr(s.titleEn) === cleanStr(originalTitle);
        const titleFaMatch = s.titleFa && cleanStr(s.titleFa) === cleanStr(title);
        const yearMatch = !year || !s.year || s.year === year;
        return (titleEnMatch || titleFaMatch) && yearMatch;
      });
      return matched ? { exists: true, id: matched.id, localItem: matched } : { exists: false };
    }
  };

  const handleOpenDetails = async (item: any) => {
    setSelectedItem(item);
    setFullMetadata(null);
    setIsFetchingDetails(true);
    setShowAddForm(false);
    
    const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    
    try {
      const meta = await TMDbService.fetchMetadata(item.id, mediaType);
      if (meta) {
        setFullMetadata(meta);
        
        // Prepare initial form states
        setFormType(mediaType);
        setFormTitleFa(meta.title || '');
        setFormTitleEn(meta.originalTitle || '');
        
        const releaseYear = meta.releaseDate ? meta.releaseDate.split('-')[0] : '';
        setFormYear(releaseYear);
        
        setFormDirector(meta.director ? meta.director.join('، ') : '');
        setFormWriter(meta.productionCompanies ? meta.productionCompanies.slice(0, 2).join('، ') : '');
        setFormActors(meta.cast ? meta.cast.slice(0, 5).join('، ') : '');
        setFormSummary(meta.overview || '');
        setFormPoster(meta.posterPath || '');
        setFormGenres(meta.genres || []);
        
        // Apply default settings
        setFormQuality(appSettings.defaultQuality || '1080p BluRay');
        setFormCategory((appSettings.customCategories && appSettings.customCategories[1]) as MediaCategory || 'خارجی');
        setFormPurchasePrice(0);
        setFormSalePrice(mediaType === 'movie' ? appSettings.defaultMoviePrice : appSettings.defaultSeriesPrice);
        setFormSubtitle('زیرنویس چسبیده فارسی');
        setFormDuration(meta.runtime ? `${meta.runtime} دقیقه` : 'نامشخص');
        setFormFilePath('');

        if (mediaType === 'tv' && meta.tvSeasons) {
          const seasonsMapped = meta.tvSeasons.map(s => ({
            seasonNumber: s.seasonNumber,
            name: s.name || `فصل ${s.seasonNumber}`,
            episodeCount: s.episodeCount || 0,
            selected: s.seasonNumber === 1, // select first season by default
            filePath: ''
          }));
          setFormSeasonsDetails(seasonsMapped);
          setFormSeasonsCount(seasonsMapped.length);
        }
      } else {
        showToast('بارگذاری جزئیات کامل متادیتا با خطا مواجه شد.', 'warning');
      }
    } catch (err) {
      console.error('Error fetching full metadata:', err);
      showToast('خطا در دریافت متادیتا از وب‌سرویس.', 'error');
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleSelectFilePath = async () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        setFormFilePath(path);
      }
    } else {
      const manual = prompt('لطفاً آدرس پوشه یا فایل فیزیکی را به صورت دستی وارد کنید:');
      if (manual) {
        setFormFilePath(manual);
      }
    }
  };

  const handleSelectSeasonPath = async (idx: number) => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        setFormSeasonsDetails(prev => prev.map((s, i) => i === idx ? { ...s, filePath: path } : s));
      }
    } else {
      const manual = prompt(`لطفاً آدرس پوشه فصل ${formSeasonsDetails[idx].seasonNumber} را وارد کنید:`);
      if (manual) {
        setFormSeasonsDetails(prev => prev.map((s, i) => i === idx ? { ...s, filePath: manual } : s));
      }
    }
  };

  const handleSaveToLibrary = () => {
    if (!formTitleFa.trim()) {
      showToast('لطفاً عنوان فارسی را وارد کنید.', 'warning');
      return;
    }

    try {
      if (formType === 'movie') {
        const movieItem: Omit<Movie, 'id' | 'addedAt'> = {
          category: formCategory,
          titleFa: formTitleFa.trim(),
          titleEn: formTitleEn.trim(),
          year: formYear.trim(),
          director: formDirector.trim(),
          writer: formWriter.trim(),
          actors: formActors.trim(),
          duration: formDuration.trim(),
          country: fullMetadata?.countries?.join('، ') || 'نامشخص',
          language: formSubtitle.includes('دوبله') ? 'دوبله فارسی' : 'زبان اصلی',
          imdbRating: fullMetadata?.rating ? String(fullMetadata.rating.toFixed(1)) : '0.0',
          quality: formQuality,
          subtitle: formSubtitle,
          genres: formGenres,
          poster: formPoster,
          summary: formSummary.trim(),
          filePath: formFilePath.trim(),
          purchasePrice: formPurchasePrice,
          salePrice: formSalePrice,
          collectionName: '',
          subtitlesList: []
        };

        const added = dbService.addMovie(movieItem);
        showToast(`فیلم "${added.titleFa}" با موفقیت به آرشیو فیزیکی اضافه شد.`, 'success');
        
        // Refresh Cache local
        setLocalMovies(dbService.getMovies());
      } else {
        // Prepare Seasons structure
        const activeSeasons = formSeasonsDetails.filter(s => s.selected);
        const seasonsList: Season[] = activeSeasons.map(as => {
          const episodes: Episode[] = [];
          for (let ep = 1; ep <= as.episodeCount; ep++) {
            episodes.push({
              id: 'ep_' + Math.random().toString(36).substr(2, 9),
              episodeNumber: ep,
              name: `قسمت ${ep}`,
              videoPath: as.filePath ? `${as.filePath}\\Episode_${ep.toString().padStart(2, '0')}.mkv` : '',
              description: 'قسمت جدید',
              subtitlesList: []
            });
          }
          return {
            id: 'se_' + Math.random().toString(36).substr(2, 9),
            name: as.name,
            episodes
          };
        });

        // Compute episode statistics
        const myEpisodesCount = seasonsList.reduce((sum, s) => sum + s.episodes.length, 0);
        const totalEpisodes = formSeasonsDetails.reduce((sum, s) => sum + s.episodeCount, 0);

        const seriesItem: Omit<Series, 'id' | 'addedAt' | 'seasons'> & { seasons?: Season[] } = {
          category: formCategory,
          titleFa: formTitleFa.trim(),
          titleEn: formTitleEn.trim(),
          year: formYear.trim(),
          director: formDirector.trim(),
          writer: formWriter.trim(),
          actors: formActors.trim(),
          episodeDuration: '45 دقیقه',
          country: fullMetadata?.countries?.join('، ') || 'نامشخص',
          language: formSubtitle.includes('دوبله') ? 'دوبله فارسی' : 'زبان اصلی',
          imdbRating: fullMetadata?.rating ? String(fullMetadata.rating.toFixed(1)) : '0.0',
          quality: formQuality,
          subtitle: formSubtitle,
          genres: formGenres,
          poster: formPoster,
          summary: formSummary.trim(),
          filePath: formFilePath.trim(),
          purchasePrice: formPurchasePrice,
          salePrice: formSalePrice,
          seasons: seasonsList,
          totalEpisodes: totalEpisodes,
          myEpisodesCount: myEpisodesCount,
          releasedEpisodesCount: totalEpisodes,
          isEnded: fullMetadata?.tvSeasons && fullMetadata.tvSeasons.length > 0 ? true : false,
          isEndedText: 'پایان یافته'
        };

        const added = dbService.addSeries(seriesItem);
        showToast(`سریال "${added.titleFa}" همراه با فصل‌ها با موفقیت اضافه شد.`, 'success');
        
        // Refresh local cache
        setLocalSeries(dbService.getSeries());
      }
      
      setSelectedItem(null);
      setFullMetadata(null);
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding to local SQLite library:', err);
      showToast('ثبت اطلاعات در دیتابیس بومی SQLite با خطا همراه بود.', 'error');
    }
  };

  // Background/Manual Series Update check
  const handleCheckNewEpisodes = async () => {
    if (!SettingsService.hasCredentials()) {
      showToast('لطفاً ابتدا کلید API خود را در تنظیمات وارد کنید تا جستجو در TMDB فعال شود.', 'warning');
      return;
    }

    setIsCheckingNewEpisodes(true);
    showToast('در حال بررسی فصول و قسمت‌های جدید سریال‌های در جریان شما...', 'info');

    let updatedCount = 0;
    try {
      // Find all in-progress series (which we can check by matching TMDB)
      for (const series of localSeries) {
        // Search on TMDB to get the ID
        const searchResults = await TMDbService.searchTV(series.titleEn || series.titleFa, series.year);
        if (searchResults && searchResults.length > 0) {
          const bestMatch = searchResults[0];
          const details = await TMDbService.fetchMetadata(bestMatch.id, 'tv');
          
          if (details && details.tvSeasons) {
            const tmdbSeasonsCount = details.tvSeasons.length;
            const localSeasonsCount = series.seasons ? series.seasons.length : 0;
            
            if (tmdbSeasonsCount > localSeasonsCount) {
              // Found new season! Trigger notifications
              updatedCount++;
              
              // Trigger Windows / Native Notification
              if (typeof window !== 'undefined' && window.Notification) {
                if (Notification.permission === 'granted') {
                  new Notification('فصل جدید در سامانه TMDB شناسایی شد!', {
                    body: `فصل جدیدی برای سریال محبوب "${series.titleFa}" کشف شد. اکنون می‌توانید آن را به آرشیو اضافه کنید.`
                  });
                } else if (Notification.permission !== 'denied') {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      new Notification('فصل جدید در سامانه TMDB شناسایی شد!', {
                        body: `فصل جدیدی برای سریال محبوب "${series.titleFa}" کشف شد.`
                      });
                    }
                  });
                }
              }
              
              // In-app alert
              showToast(`فصل جدیدی برای سریال "${series.titleFa}" روی TMDB منتشر شده است! (${localSeasonsCount} فصل لوکال vs ${tmdbSeasonsCount} فصل جدید)`, 'success');
            }
          }
        }
      }

      if (updatedCount === 0) {
        showToast('تمام سریال‌های آرشیو شما کاملاً بروز هستند. مورد جدیدی پیدا نشد.', 'success');
      } else {
        showToast(`بررسی به اتمام رسید. تعداد ${toPersianDigits(updatedCount)} بروزرسانی در TMDB کشف شد.`, 'success');
      }
    } catch (err) {
      console.error('Error during background check:', err);
      showToast('خطا در بررسی بروزرسانی سریال‌ها.', 'error');
    } finally {
      setIsCheckingNewEpisodes(false);
    }
  };

  // Check missing episodes comparing local series and TMDB releases
  const handleCheckMissingEpisodes = async () => {
    if (!SettingsService.hasCredentials()) {
      showToast('لطفاً ابتدا کلید API خود را در تنظیمات وارد کنید تا مقایسه با TMDB فعال شود.', 'warning');
      return;
    }

    setIsCheckingMissing(true);
    setShowMissingEpisodesModal(true);
    setMissingEpisodesList([]);
    try {
      const missingList: any[] = [];
      
      for (const series of localSeries) {
        let tmdbId: number | null = null;
        if (series.officialSite) {
          const match = series.officialSite.match(/tv\/(\d+)/);
          if (match) tmdbId = parseInt(match[1], 10);
        }
        
        if (!tmdbId && series.titleEn) {
          const searchRes = await TMDbService.searchTV(series.titleEn, series.year);
          if (searchRes && searchRes.length > 0) {
            tmdbId = searchRes[0].id;
          }
        }

        if (tmdbId) {
          const meta = await TMDbService.fetchMetadata(tmdbId, 'tv');
          if (meta && meta.tvSeasons) {
            const localSeasons = series.seasons || [];
            const seriesMissingSeasons: any[] = [];
            
            for (const tmdbSeason of meta.tvSeasons) {
              if (tmdbSeason.seasonNumber === 0) continue; // Skip specials/season 0
              
              const localSeason = localSeasons.find(ls => {
                const numMatch = ls.name.match(/\d+/);
                const localNum = numMatch ? parseInt(numMatch[0], 10) : null;
                return localNum === tmdbSeason.seasonNumber;
              });

              if (!localSeason) {
                // Entire season missing
                const eps: number[] = [];
                for (let e = 1; e <= tmdbSeason.episodeCount; e++) eps.push(e);
                seriesMissingSeasons.push({
                  seasonNumber: tmdbSeason.seasonNumber,
                  seasonName: tmdbSeason.name || `فصل ${tmdbSeason.seasonNumber}`,
                  missingEpisodes: eps,
                  totalEpisodesOnTmdb: tmdbSeason.episodeCount,
                  isEntireSeasonMissing: true
                });
              } else {
                // Check missing episodes inside existing season
                const localEpisodes = localSeason.episodes || [];
                const missingEps: number[] = [];
                for (let epNum = 1; epNum <= tmdbSeason.episodeCount; epNum++) {
                  const hasEp = localEpisodes.some(le => le.episodeNumber === epNum);
                  if (!hasEp) {
                    missingEps.push(epNum);
                  }
                }

                if (missingEps.length > 0) {
                  seriesMissingSeasons.push({
                    seasonNumber: tmdbSeason.seasonNumber,
                    seasonName: localSeason.name || `فصل ${tmdbSeason.seasonNumber}`,
                    missingEpisodes: missingEps,
                    totalEpisodesOnTmdb: tmdbSeason.episodeCount,
                    isEntireSeasonMissing: false
                  });
                }
              }
            }

            if (seriesMissingSeasons.length > 0) {
              missingList.push({
                seriesId: series.id,
                titleFa: series.titleFa,
                titleEn: series.titleEn,
                poster: series.poster,
                missingDetails: seriesMissingSeasons
              });
            }
          }
        }
      }
      setMissingEpisodesList(missingList);
      if (missingList.length === 0) {
        showToast('بررسی کامل شد! آرشیو شما کاملاً کامل است و هیچ قسمت جدید مفقودی یافت نشد.', 'success');
      } else {
        showToast(`تعداد ${toPersianDigits(missingList.length)} سریال دارای قسمت یا فصل مفقود شناسایی شدند.`, 'info');
      }
    } catch (err) {
      console.error('Error comparing local series episodes with TMDB:', err);
      showToast('خطا در بارگذاری لیست قسمت‌های جدید و مقایسه با وب‌سایت TMDB.', 'error');
    } finally {
      setIsCheckingMissing(false);
    }
  };

  // Algorithm custom rule trainer methods
  const handleSaveTrainerRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerKeyword.trim() || !trainerSeriesName.trim() || !trainerSeason.trim()) {
      showToast('لطفاً همه فیلدهای الگوریتم آموزش را پر کنید.', 'warning');
      return;
    }
    FilenameParser.saveLearnedRule(
      trainerKeyword.trim(),
      trainerSeriesName.trim(),
      trainerSeason.trim()
    );
    setLearnedRules(FilenameParser.getLearnedRules());
    setTrainerKeyword('');
    setTrainerSeriesName('');
    setTrainerSeason('1');
    showToast('الگوی جدید با موفقیت به هوش مصنوعی نام‌گذاری اضافه شد. اسکن‌های بعدی بر این اساس هوشمندتر خواهند شد!', 'success');
  };

  const handleDeleteTrainerRule = (id: string) => {
    try {
      const rules = FilenameParser.getLearnedRules().filter(r => r.id !== id);
      localStorage.setItem('parstech_learned_rules', JSON.stringify(rules));
      setLearnedRules(rules);
      showToast('الگوی نام‌گذاری با موفقیت حذف شد.', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 min-h-0" id="new-media-page-shell">
      {/* 1. Header and Page Banner */}
      <div className="bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 rounded-2xl p-5 shadow-sm relative overflow-hidden shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/15">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 dark:text-white">فیلم و سریال‌های جدید روز دنیا</h1>
            <p className="text-[11px] text-gray-450 dark:text-gray-400 mt-1 leading-relaxed font-bold">اتصال زنده به بانک جهانی اطلاعات سینما (TMDB) برای یافتن جدیدترین آثار و افزودن آسان به هارد آرشیو</p>
          </div>
        </div>
        
        {hasCreds && (
          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={handleCheckMissingEpisodes}
              className="z-10 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center cursor-pointer"
              id="btn-check-missing-episodes"
            >
              <Info className="w-4 h-4" />
              <span>بررسی قسمت‌های مفقود آرشیو</span>
            </button>
            <button
              onClick={handleCheckNewEpisodes}
              disabled={isCheckingNewEpisodes}
              className="z-10 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center cursor-pointer disabled:opacity-50"
              id="btn-check-new-episodes"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingNewEpisodes ? 'animate-spin' : ''}`} />
              <span>بررسی اتوماتیک قسمت‌های جدید آرشیو</span>
            </button>
          </div>
        )}
      </div>

      {/* Check credentials */}
      {!hasCreds ? (
        <div className="flex-1 bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-10 shadow-lg animate-scaleIn">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 mb-5">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-base font-black text-gray-900 dark:text-white mb-3">اعتبارنامه سرویس TMDB تنظیم نشده است</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6 max-w-md font-semibold">
            برای استفاده از قابلیت جذاب کشف اتوماتیک آثار جدید و هماهنگ‌سازی متادیتا، ابتدا باید یک کلید API رایگان از سایت themoviedb.org دریافت کرده و در تنظیمات برنامه ذخیره کنید.
          </p>
          <button
            onClick={onGoToSettings}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>تنظیم کلید API در صفحه تنظیمات</span>
          </button>
        </div>
      ) : (
        <>
          {/* 2. Navigation bar & Search layout */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0 bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 p-3 rounded-2xl shadow-sm">
            {/* Tab layout */}
            <div className="flex flex-wrap items-center gap-1 bg-gray-50 dark:bg-[#111827] p-1 rounded-xl border border-gray-100 dark:border-gray-800/60 font-bold text-[11px]">
              <button
                onClick={() => handleTabChange('trending')}
                className={`px-3.5 h-9 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'trending' ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>ترندهای داغ این هفته</span>
              </button>
              <button
                onClick={() => handleTabChange('movies')}
                className={`px-3.5 h-9 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'movies' ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>فیلم‌های جدید دنیا</span>
              </button>
              <button
                onClick={() => handleTabChange('tv')}
                className={`px-3.5 h-9 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'tv' ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>سریال‌های جدید دنیا</span>
              </button>
              <button
                onClick={() => handleTabChange('ir-movies')}
                className={`px-3.5 h-9 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'ir-movies' ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Film className="w-3.5 h-3.5 text-emerald-500" />
                <span>فیلم‌های جدید ایرانی</span>
              </button>
              <button
                onClick={() => handleTabChange('ir-tv')}
                className={`px-3.5 h-9 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'ir-tv' ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Tv className="w-3.5 h-3.5 text-emerald-500" />
                <span>سریال‌های جدید ایرانی</span>
              </button>
              <button
                onClick={() => handleTabChange('search')}
                className={`px-3.5 h-9 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'search' ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>جستجوی پیشرفته آثار</span>
              </button>
            </div>

            {/* Live custom search form */}
            {activeTab === 'search' && (
              <form onSubmit={handleSearch} className="flex-1 md:max-w-md flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="نام فیلم یا سریال را به انگلیسی یا فارسی جستجو کنید..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-3 pr-10 rounded-xl bg-gray-50 dark:bg-[#111827] border border-gray-250 dark:border-gray-800 text-[11px] font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
                </div>
                <button
                  type="submit"
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11.5px] font-black transition-all cursor-pointer h-10 flex items-center justify-center"
                >
                  بگرد
                </button>
              </form>
            )}
          </div>

          {/* 3. Results Panel / Dynamic Grid list */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
              <p className="text-xs text-gray-450 font-bold">در حال برقراری ارتباط زنده با سرورهای TMDB...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex-1 bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <Film className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-xs text-gray-400 font-bold">
                {activeTab === 'search' 
                  ? 'لطفاً نام اثر مورد نظر خود را در بالا جستجو کنید.' 
                  : 'برای بارگذاری اطلاعات روی دکمه‌های ناوبری کلیک کنید.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-10" id="new-media-grid">
              {results.map((item) => {
                const lib = getLibraryStatus(item);
                const title = item.title || item.name || 'بدون عنوان';
                const originalTitle = item.original_title || item.original_name || '';
                const releaseDate = item.release_date || item.first_air_date || '';
                const year = releaseDate ? releaseDate.split('-')[0] : '';
                const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                const rating = item.vote_average || 0;
                const posterUrl = item.poster_path 
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
                  : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop';

                const activeCardStyle = dbService.getSettings().cardStyle || 'modern';

                if (activeCardStyle === 'creative') {
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDetails(item)}
                      className="group bg-slate-900 rounded-2xl overflow-hidden border border-gray-800/80 hover:border-indigo-500/60 shadow-md hover:shadow-indigo-500/10 hover:shadow-2xl transition-all duration-500 flex flex-col cursor-pointer relative aspect-[2/3]"
                    >
                      {/* Badge for library status */}
                      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5">
                        {lib.exists ? (
                          <span className="text-[9px] font-black bg-emerald-505 text-white px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>موجود</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-gray-950/80 backdrop-blur-md text-gray-250 px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                            <Plus className="w-3 h-3" />
                            <span>افزودن</span>
                          </span>
                        )}
                      </div>

                      {/* Poster */}
                      <div className="absolute inset-0 w-full h-full bg-slate-900">
                        <img
                          src={posterUrl}
                          alt={title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>

                      {/* Premium Content Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent flex flex-col justify-end p-3.5 z-10 transition-all duration-300">
                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 space-y-1.5">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black w-max block ${mediaType === 'movie' ? 'bg-rose-500/20 text-rose-350 border border-rose-500/20' : 'bg-violet-500/20 text-violet-305 border border-violet-500/20'}`}>
                            {mediaType === 'movie' ? 'فیلم سینمایی' : 'سریال تلویزیونی'}
                          </span>
                          
                          <h3 className="text-[11px] font-black text-white line-clamp-2 leading-snug drop-shadow-lg">
                            {title}
                          </h3>
                          <p className="text-[9px] font-bold text-gray-300 truncate font-mono drop-shadow">
                            {originalTitle}
                          </p>
                          
                          {/* Details revealed on hover */}
                          <div className="h-0 opacity-0 group-hover:h-6 group-hover:opacity-100 transition-all duration-300 overflow-hidden flex items-center justify-between text-[9px] font-extrabold text-gray-300 border-t border-white/10 pt-1.5 mt-1">
                            <span className="flex items-center gap-0.5 text-amber-400">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{toPersianDigits(rating.toFixed(1))}</span>
                            </span>
                            <span>{toPersianDigits(year)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (activeCardStyle === 'glassy') {
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDetails(item)}
                      className="group bg-white/40 dark:bg-slate-900/35 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 dark:border-white/5 hover:border-indigo-500/40 dark:hover:border-indigo-500/50 shadow-md hover:shadow-indigo-500/10 hover:shadow-2xl transition-all duration-500 flex flex-col cursor-pointer relative"
                    >
                      {/* Badge for library status */}
                      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
                        {lib.exists ? (
                          <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>موجود در آرشیو</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-gray-900/70 backdrop-blur-md text-gray-205 px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                            <Plus className="w-3 h-3" />
                            <span>خرید و افزودن</span>
                          </span>
                        )}
                      </div>

                      {/* Poster */}
                      <div className="relative aspect-[2/3] overflow-hidden bg-slate-100/40 dark:bg-slate-900/40 border-b border-white/10">
                        <img
                          src={posterUrl}
                          alt={title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                          <span className="text-[10px] text-white font-extrabold flex items-center gap-1 bg-indigo-600/80 backdrop-blur-md px-2 py-1 rounded">
                            مشاهده متادیتا
                          </span>
                        </div>
                      </div>

                      {/* Metadata Content */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2 bg-gradient-to-b from-transparent to-white/10 dark:to-slate-950/10">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-extrabold text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-0.5 text-amber-500">
                              <Star className="w-3 h-3 fill-amber-500" />
                              <span>{toPersianDigits(rating.toFixed(1))}</span>
                            </span>
                            <span>{toPersianDigits(year)}</span>
                          </div>
                          <h3 className="text-[11.5px] font-black text-gray-900 dark:text-white line-clamp-1 leading-normal">
                            {title}
                          </h3>
                          <p className="text-[9.5px] font-bold text-gray-450 dark:text-gray-400 truncate font-mono">
                            {originalTitle}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-2 mt-1">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-extrabold ${mediaType === 'movie' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450' : 'bg-violet-500/10 text-violet-600 dark:text-violet-450'}`}>
                            {mediaType === 'movie' ? 'فیلم سینمایی' : 'سریال تلویزیونی'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default 'modern' design
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetails(item)}
                    className="group bg-white dark:bg-[#1e293b] rounded-2xl overflow-hidden border border-gray-150 dark:border-gray-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative"
                  >
                    {/* Badge for library status */}
                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
                      {lib.exists ? (
                        <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>موجود در آرشیو</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-black bg-gray-900/75 backdrop-blur-md text-gray-250 px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                          <Plus className="w-3 h-3" />
                          <span>خرید و افزودن</span>
                        </span>
                      )}
                    </div>

                    {/* Poster */}
                    <div className="relative aspect-[2/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img
                        src={posterUrl}
                        alt={title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                        <span className="text-[10px] text-white font-extrabold flex items-center gap-1 bg-indigo-600 px-2 py-1 rounded">
                          مشاهده متادیتا
                        </span>
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2 bg-gradient-to-b from-transparent to-gray-50/20 dark:to-slate-900/10">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-extrabold text-gray-400">
                          <span className="flex items-center gap-0.5 text-amber-500">
                            <Star className="w-3 h-3 fill-amber-500" />
                            <span>{toPersianDigits(rating.toFixed(1))}</span>
                          </span>
                          <span>{toPersianDigits(year)}</span>
                        </div>
                        <h3 className="text-[11.5px] font-black text-gray-900 dark:text-white line-clamp-1 leading-normal">
                          {title}
                        </h3>
                        <p className="text-[9.5px] font-bold text-gray-450 dark:text-gray-400 truncate font-mono">
                          {originalTitle}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-805 pt-2 mt-1">
                        <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-extrabold ${mediaType === 'movie' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-500' : 'bg-violet-50 dark:bg-violet-950/20 text-violet-500'}`}>
                          {mediaType === 'movie' ? 'فیلم سینمایی' : 'سریال تلویزیونی'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Load More Footer */}
            {activeTab !== 'search' && results.length > 0 && (
              <div className="flex flex-col items-center justify-center border-t border-gray-150 dark:border-gray-800/80 pt-6 pb-8 px-2 shrink-0">
                {hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading || isLoadingMore}
                    className="z-10 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-95 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-xl shadow-indigo-600/10 hover:shadow-indigo-600/25 transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    {isLoadingMore ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <span>{isLoadingMore ? 'در حال بارگذاری آثار جدید...' : 'بارگذاری و نمایش آثار بیشتر...'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-[#111827]/40 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800/80">
                    انتهای لیست آثار • تمام نتایج موجود در بانک اطلاعاتی بارگذاری شدند.
                  </span>
                )}
                <div className="text-[10px] text-gray-400 font-bold mt-3">
                  در حال نمایش {toPersianDigits(results.length)} اثر فعال {activeTab === 'ir-movies' || activeTab === 'ir-tv' ? '(فقط آثار سال ۲۰۲۱ به بعد)' : ''}
                </div>
              </div>
            )}
          </>
        )}
        </>
      )}

      {/* 4. TMDb Metadata Details Drawer / Modal overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" id="details-overlay">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row relative animate-scaleIn max-h-[90vh]">
            
            {/* Close trigger button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 left-4 z-50 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
              id="btn-close-details"
            >
              <X className="w-4 h-4" />
            </button>

            {isFetchingDetails ? (
              <div className="w-full flex flex-col items-center justify-center p-12 min-h-[400px]">
                <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
                <p className="text-xs text-gray-400 font-bold">در حال واکشی اطلاعات کامل، فصول، کمپانی‌ها و بیوگرافی عوامل...</p>
              </div>
            ) : !fullMetadata ? (
              <div className="w-full flex flex-col items-center justify-center p-12 min-h-[400px]">
                <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
                <p className="text-xs text-gray-400 font-bold">بارگذاری اطلاعات متادیتا با خطا همراه بود.</p>
              </div>
            ) : (
              <>
                {/* Visual / Left Poster Section */}
                <div className="w-full md:w-1/3 bg-slate-900/20 flex flex-col border-l border-gray-150 dark:border-gray-800">
                  <div className="relative aspect-[2/3] md:aspect-auto md:h-full overflow-hidden shrink-0">
                    <img
                      src={fullMetadata.posterPath || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300'}
                      alt={fullMetadata.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-transparent to-transparent md:hidden" />
                  </div>
                </div>

                {/* Content / Right Details Section */}
                <div className="w-full md:w-2/3 flex flex-col overflow-y-auto max-h-[90vh] md:max-h-none p-6 space-y-5">
                  
                  {/* Backdrop Header block */}
                  <div className="relative rounded-2xl h-44 overflow-hidden shadow-inner shrink-0 hidden sm:block">
                    <img
                      src={fullMetadata.backdropPath || 'https://images.unsplash.com/photo-1574267431644-4ed9440f53ac?q=80&w=800'}
                      alt="backdrop"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1e293b] via-transparent to-transparent" />
                    <div className="absolute bottom-4 right-4 text-white drop-shadow-md">
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold mb-1.5 inline-block">
                        {fullMetadata.mediaType === 'movie' ? 'فیلم سینمایی' : 'سریال تلویزیونی'}
                      </span>
                      <h2 className="text-lg font-black">{fullMetadata.title}</h2>
                      <p className="text-xs font-mono opacity-85 mt-0.5">{fullMetadata.originalTitle}</p>
                    </div>
                  </div>

                  {/* Header mobile layout */}
                  <div className="sm:hidden space-y-1">
                    <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded font-bold inline-block">
                      {fullMetadata.mediaType === 'movie' ? 'فیلم سینمایی' : 'سریال تلویزیونی'}
                    </span>
                    <h2 className="text-base font-black text-gray-900 dark:text-white">{fullMetadata.title}</h2>
                    <p className="text-xs font-mono text-gray-400">{fullMetadata.originalTitle}</p>
                  </div>

                  {/* Badges / Essential stats */}
                  <div className="flex flex-wrap items-center gap-3.5 text-[11px] font-bold text-gray-550 dark:text-gray-300 border-b border-gray-100 dark:border-gray-805 pb-3">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-amber-500" />
                      <span>{toPersianDigits(fullMetadata.rating.toFixed(1))} از ۱۰ ({toPersianDigits(fullMetadata.voteCount)} رای)</span>
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>{toPersianDigits(fullMetadata.runtime)} دقیقه</span>
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <span className="text-blue-500">تاریخ انتشار: {toPersianDigits(toJalali(fullMetadata.releaseDate))}</span>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <h4 className="text-[12px] font-black text-gray-900 dark:text-white">خلاصه داستان و سناریو:</h4>
                    <p className="text-[11.5px] leading-relaxed text-gray-600 dark:text-gray-300 font-semibold text-justify">
                      {fullMetadata.overview || 'هیچ خلاصه‌ای به زبان فارسی برای این اثر در سرورهای TMDB یافت نشد.'}
                    </p>
                  </div>

                  {/* Cast and crew */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11.5px] font-bold bg-gray-50/50 dark:bg-[#111827]/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-805">
                    <div className="space-y-1">
                      <span className="text-gray-400 block text-[10px]">کارگردان / تیم سازنده:</span>
                      <span className="text-gray-800 dark:text-gray-200">{fullMetadata.director?.join('، ') || 'نامشخص'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-400 block text-[10px]">ستارگان و بازیگران برتر:</span>
                      <span className="text-gray-800 dark:text-gray-200 line-clamp-1" title={fullMetadata.cast?.join('، ')}>
                        {fullMetadata.cast?.slice(0, 4).join('، ') || 'نامشخص'}
                      </span>
                    </div>
                  </div>

                  {/* Action or registration layout */}
                  {!showAddForm ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                      {getLibraryStatus(fullMetadata).exists ? (
                        <div className="flex-1 w-full bg-emerald-500/15 border border-emerald-500/35 p-3 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                            <Check className="w-5 h-5" />
                            <span>این اثر پیش از این به آرشیو فیزیکی دیتابیس اضافه شده است.</span>
                          </div>
                          <button
                            onClick={() => {
                              const match = getLibraryStatus(fullMetadata);
                              if (match.id && onViewLocalMedia) {
                                setSelectedItem(null);
                                onViewLocalMedia(fullMetadata.mediaType, match.id);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-750 transition-all cursor-pointer"
                          >
                            مشاهده در آرشیو
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="w-full py-3.5 bg-gradient-to-r from-[#2563eb] to-[#4f46e5] hover:from-[#1d4ed8] hover:to-[#4338ca] text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          id="btn-trigger-add-form"
                        >
                          <Plus className="w-5 h-5" />
                          <span>خرید و ثبت این اثر در آرشیو فیزیکی مغازه</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* registration form */
                    <div className="border-t border-gray-150 dark:border-gray-850 pt-5 space-y-4 animate-scaleIn">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Video className="w-5 h-5 animate-bounce" />
                        <h3 className="text-xs font-black">فرم ثبت و پیوند با فایل‌های دیسک سخت (HDD Link)</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Title FA */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400">عنوان فارسی اثر:</label>
                          <input
                            type="text"
                            value={formTitleFa}
                            onChange={(e) => setFormTitleFa(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-indigo-500 bg-gray-50/50 dark:bg-slate-900/30"
                          />
                        </div>

                        {/* Title EN */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400">عنوان اصلی / انگلیسی:</label>
                          <input
                            type="text"
                            value={formTitleEn}
                            onChange={(e) => setFormTitleEn(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-indigo-500 bg-gray-50/50 dark:bg-slate-900/30"
                          />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400">دسته‌بندی فروشگاه:</label>
                          <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value as MediaCategory)}
                            className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-indigo-500 bg-white dark:bg-[#1e293b]"
                          >
                            {appSettings.customCategories?.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {/* Quality */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400">کیفیت ویدئو:</label>
                          <select
                            value={formQuality}
                            onChange={(e) => setFormQuality(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-indigo-500 bg-white dark:bg-[#1e293b]"
                          >
                            {appSettings.customQualities?.map((q) => (
                              <option key={q} value={q}>{q}</option>
                            ))}
                          </select>
                        </div>

                        {/* Subtitle / Language */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400">زبان و زیرنویس:</label>
                          <select
                            value={formSubtitle}
                            onChange={(e) => setFormSubtitle(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-indigo-500 bg-white dark:bg-[#1e293b]"
                          >
                            <option value="زیرنویس چسبیده فارسی">زیرنویس چسبیده فارسی</option>
                            <option value="دوبله فارسی حرفه‌ای">دوبله فارسی حرفه‌ای</option>
                            <option value="دو زبانه (دوبله + زبان اصلی)">دو زبانه (دوبله + زبان اصلی)</option>
                            <option value="زبان اصلی بدون زیرنویس">زبان اصلی بدون زیرنویس</option>
                          </select>
                        </div>

                        {/* Prices */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400">قیمت فروش به مشتری (تومان):</label>
                          <input
                            type="number"
                            value={formSalePrice}
                            onChange={(e) => setFormSalePrice(Number(e.target.value))}
                            className="w-full h-10 px-3 rounded-xl border border-gray-250 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-indigo-500 bg-gray-50/50 dark:bg-slate-900/30"
                          />
                        </div>
                      </div>

                      {/* File Path input */}
                      {formType === 'movie' ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400">مسیر فایل فیزیکی فیلم در هارد سیستم:</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="مثال: D:\Movies\Inception.2010.1080p.mkv"
                              value={formFilePath}
                              onChange={(e) => setFormFilePath(e.target.value)}
                              className="flex-1 h-10 px-3 rounded-xl border border-gray-250 dark:border-gray-800 text-xs font-mono focus:outline-none focus:border-indigo-500"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              onClick={handleSelectFilePath}
                              className="px-4 bg-gray-100 dark:bg-slate-800 border border-gray-250 dark:border-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                            >
                              <FolderOpen className="w-4 h-4" />
                              <span>انتخاب فایل</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Series Season layout */
                        <div className="space-y-3.5 bg-gray-50 dark:bg-slate-900/20 p-4 rounded-xl border border-gray-150 dark:border-gray-805">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">فصل‌های موجود در هارد شما جهت آرشیو:</span>
                            <span className="text-[10px] text-gray-400">فصل‌های انتخابی در پایگاه داده SQLite ایجاد می‌شوند.</span>
                          </div>

                          <div className="space-y-2.5">
                            {formSeasonsDetails.map((season, idx) => (
                              <div key={season.seasonNumber} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1e293b] p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={season.selected}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setFormSeasonsDetails(prev => prev.map((s, i) => i === idx ? { ...s, selected: checked } : s));
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                  />
                                  <span>{season.name} ({toPersianDigits(season.episodeCount)} قسمت)</span>
                                </label>
                                
                                {season.selected && (
                                  <div className="flex-1 flex gap-2">
                                    <input
                                      type="text"
                                      placeholder={`مسیر پوشه فصل ${season.seasonNumber} در هارد`}
                                      value={season.filePath}
                                      onChange={(e) => {
                                        const path = e.target.value;
                                        setFormSeasonsDetails(prev => prev.map((s, i) => i === idx ? { ...s, filePath: path } : s));
                                      }}
                                      className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-gray-750 text-[10.5px] font-mono focus:outline-none focus:border-indigo-500 bg-gray-50/30"
                                      dir="ltr"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSelectSeasonPath(idx)}
                                      className="px-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-750 hover:bg-gray-200 text-gray-750 dark:text-gray-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <FolderOpen className="w-3.5 h-3.5" />
                                      <span>انتخاب</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submit form buttons */}
                      <div className="flex gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-750 dark:text-gray-200 rounded-xl text-xs font-bold cursor-pointer transition-all border border-gray-200 dark:border-gray-700 text-center"
                        >
                          انصراف
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveToLibrary}
                          className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/25 transition-all text-center cursor-pointer"
                        >
                          تایید و ذخیره در پایگاه داده SQLite
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* 5. Missing Episodes Scanner & Smart Naming Assistant Modal */}
      {showMissingEpisodesModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" id="missing-episodes-overlay">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col relative max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-slate-900/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-rose-550/10 dark:bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-900 dark:text-white">دستیار مقایسه‌ای آرشیو و بررسی هوشمند قسمت‌های جدید</h3>
                  <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold mt-0.5">مقایسه فیزیکی فصول هارد شما با بانک اطلاعاتی جهانی TMDB و آموزش الگوریتم نام‌گذاری</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowMissingEpisodesModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-550 dark:text-gray-300 flex items-center justify-center transition-all cursor-pointer border border-gray-200 dark:border-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Column: Missing Results */}
              <div className="flex-1 p-5 overflow-y-auto border-l border-gray-150 dark:border-gray-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200">نتایج واکاوی و قطعات گمشده:</span>
                  <button
                    onClick={handleCheckMissingEpisodes}
                    disabled={isCheckingMissing}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[10.5px] font-black flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingMissing ? 'animate-spin' : ''}`} />
                    <span>شروع مجدد اسکن مقایسه‌ای</span>
                  </button>
                </div>

                {isCheckingMissing ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                    <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
                    <p className="text-xs text-gray-400 font-bold">در حال پردازش گام‌به‌گام سریال‌های هارد و استعلام برخط فصول از TMDB...</p>
                  </div>
                ) : missingEpisodesList.length === 0 ? (
                  <div className="flex-1 bg-gray-50/50 dark:bg-[#111827]/20 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                    <Check className="w-12 h-12 text-emerald-500 mb-3" />
                    <h4 className="text-xs font-black text-gray-850 dark:text-gray-200">آرشیو شما بی‌نقص است!</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 max-w-sm leading-relaxed">
                      در مقایسه فایل‌های ثبت‌شده شما با قسمت‌های رسمی منتشر شده در TMDB هیچ فصل یا قسمت مفقودی یافت نشد.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {missingEpisodesList.map((item) => (
                      <div
                        key={item.seriesId}
                        className="bg-gray-50/50 dark:bg-[#111827]/40 border border-gray-150 dark:border-gray-805 rounded-xl p-4 flex gap-3"
                      >
                        {item.poster && (
                          <img
                            src={item.poster.startsWith('http') ? item.poster : `https://image.tmdb.org/t/p/w200${item.poster}`}
                            alt={item.titleFa}
                            referrerPolicy="no-referrer"
                            className="w-12 h-18 object-cover rounded-lg bg-slate-200 shadow"
                          />
                        )}
                        <div className="flex-1 space-y-2">
                          <div>
                            <h4 className="text-xs font-black text-gray-900 dark:text-white">{item.titleFa}</h4>
                            <p className="text-[9.5px] font-bold text-gray-400 font-mono mt-0.5">{item.titleEn}</p>
                          </div>

                          <div className="space-y-2.5 border-t border-gray-200/50 dark:border-gray-800/50 pt-2">
                            {item.missingDetails.map((sec: any) => (
                              <div key={sec.seasonNumber} className="text-[10px] space-y-1">
                                <div className="flex items-center gap-1.5 font-black text-gray-750 dark:text-gray-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  <span>{sec.seasonName}:</span>
                                  {sec.isEntireSeasonMissing ? (
                                    <span className="bg-red-50 dark:bg-red-950/20 text-red-500 px-1.5 py-0.5 rounded text-[9px]">کل این فصل را در هارد ندارید</span>
                                  ) : (
                                    <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-500 px-1.5 py-0.5 rounded text-[9px]">دارای قسمت‌های مفقود</span>
                                  )}
                                </div>
                                <div className="text-[9.5px] text-gray-450 dark:text-gray-400 leading-relaxed font-mono font-bold pr-3">
                                  قسمت‌های گمشده: {sec.missingEpisodes.map((num: number) => `E${num}`).join('، ')}
                                  <span className="text-[9px] text-indigo-500 mr-2">({toPersianDigits(sec.missingEpisodes.length)} قسمت از {toPersianDigits(sec.totalEpisodesOnTmdb)})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: AI & Rule Trainer */}
              <div className="w-full md:w-80 bg-gray-50/50 dark:bg-[#111827]/20 p-5 overflow-y-auto flex flex-col gap-5 shrink-0">
                
                {/* Rule Form */}
                <form onSubmit={handleSaveTrainerRule} className="space-y-3">
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <Tv className="w-4 h-4" />
                    <h4 className="text-[11px] font-black">آموزش دستیار هوشمند نام‌گذاری</h4>
                  </div>
                  <p className="text-[9.5px] text-gray-400 font-bold leading-relaxed">
                    با وارد کردن الگوهای نام‌گذاری فایل‌های خود، به الگوریتم یاد بدهید که پسوندها و عبارات پیچیده (مثل HAFT E07) را چگونه بشناسد.
                  </p>

                  {/* Pattern key */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-gray-400">کلمه یا الگوی موجود در فایل:</label>
                    <input
                      type="text"
                      placeholder="مثال: HAFT E"
                      value={trainerKeyword}
                      onChange={(e) => setTrainerKeyword(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-250 dark:border-gray-800 text-[11px] font-mono focus:outline-none focus:border-indigo-500 bg-white dark:bg-[#1e293b]"
                      dir="ltr"
                    />
                  </div>

                  {/* Target Series Name */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-gray-400">معادل نام فارسی سریال در آرشیو:</label>
                    <input
                      type="text"
                      placeholder="مثال: هفت"
                      value={trainerSeriesName}
                      onChange={(e) => setTrainerSeriesName(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-250 dark:border-gray-800 text-[11px] font-bold focus:outline-none focus:border-indigo-500 bg-white dark:bg-[#1e293b]"
                    />
                  </div>

                  {/* Season number */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-gray-400">فصل هدف:</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={trainerSeason}
                      onChange={(e) => setTrainerSeason(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-gray-250 dark:border-gray-800 text-[11px] font-bold focus:outline-none focus:border-indigo-500 bg-white dark:bg-[#1e293b]"
                      dir="ltr"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-750 text-white rounded-lg text-[10px] font-black shadow transition-all cursor-pointer text-center"
                  >
                    ثبت الگو و آموزش به الگوریتم اسکنر
                  </button>
                </form>

                {/* Rules List */}
                <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 block">قوانین فعال هوش مصنوعی شما ({toPersianDigits(learnedRules.length)}):</span>
                  {learnedRules.length === 0 ? (
                    <span className="text-[9.5px] text-gray-400 font-bold block bg-white dark:bg-[#1e293b]/50 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-800/80 text-center">
                      هنوز الگوی دستی ثبت نشده است. برنامه از رگولار اکسپرشن‌های استاندارد استفاده می‌کند.
                    </span>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {learnedRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="bg-white dark:bg-[#1e293b] p-2 rounded-lg border border-gray-150 dark:border-gray-805 flex items-center justify-between shadow-sm"
                        >
                          <div className="flex-1 min-w-0 pr-1 text-[9.5px]">
                            <span className="font-mono bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-1 py-0.5 rounded text-[8.5px] truncate max-w-full block" dir="ltr">
                              "{rule.keyword}"
                            </span>
                            <span className="text-gray-400 block mt-1 font-bold">
                              ← {rule.seriesName} (فصل {toPersianDigits(rule.seasonNumber)})
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteTrainerRule(rule.id)}
                            className="text-rose-500 hover:text-rose-700 text-[9px] font-black px-1.5 py-1 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 rounded cursor-pointer shrink-0 transition-colors"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
