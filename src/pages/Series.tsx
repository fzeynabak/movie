/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { Series, Season, Episode, MediaCategory, getSafePosterUrl } from '../types';
import { toPersianNums, formatCurrency } from './Dashboard';
import { CATEGORIES } from './Movies';
import { showToast, showAlert, showConfirm } from '../utils/toast';
import { MediaScanner, ScannedMediaItem } from '../utils/MediaScanner';
import { SettingsService } from '../utils/SettingsService';
import { TMDbService } from '../utils/TMDbService';
import { ScanPreviewModal } from '../components/ScanPreviewModal';
import { 
  Tv, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  X, 
  Edit, 
  Trash2, 
  ListOrdered, 
  DollarSign, 
  Check, 
  PlusCircle, 
  FileVideo, 
  ArrowLeft, 
  Film,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Play,
  FolderOpen,
  ExternalLink,
  Download,
  Globe,
  Maximize2,
  Network,
  Grid,
  List
} from 'lucide-react';

interface SeriesProps {
  onAddToCart?: (item: any) => void;
  cartItems?: any[];
  activeCustomer?: { id: string; name: string; phone: string; } | null;
  initialSelectedId?: string | null;
  onClearInitialSelectedId?: () => void;
}

export const POPULAR_GENRES = [
  'درام', 'کمدی', 'اکشن', 'علمی تخیلی', 'ترسناک', 
  'هیجان انگیز', 'مستند', 'خانوادگی', 'جنایی', 
  'معمایی', 'عاشقانه', 'تاریخی', 'بیوگرافی', 'ماجراجویی', 
  'انیمیشن', 'جنگی', 'موزیکال', 'وسترن', 'ورزشی', 
  'اجتماعی', 'فانتزی', 'فیلم کوتاه', 'برنامه تلویزیونی'
];

export default function SeriesPage({ 
  onAddToCart, 
  cartItems = [], 
  activeCustomer,
  initialSelectedId,
  onClearInitialSelectedId
}: SeriesProps) {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'همه'>('همه');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filterCountry, setFilterCountry] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [filterMinImdb, setFilterMinImdb] = useState('');
  const [filterCrew, setFilterCrew] = useState('');
  const [sortBy, setSortBy] = useState<'titleFa' | 'year' | 'imdbRating' | 'addedAt'>('addedAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals Toggles
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [scannedFiles, setScannedFiles] = useState<ScannedMediaItem[]>([]);
  const [showScanPreviewModal, setShowScanPreviewModal] = useState(false);

  // Advanced List and Card View Toggle State
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [colFilters, setColFilters] = useState<Record<string, string>>({
    titleFa: '',
    titleEn: '',
    quality: '',
    imdbRating: '',
    year: '',
    category: ''
  });

  // Form Fields State
  const [formCategory, setFormCategory] = useState<MediaCategory>('ایرانی');
  const [formTitleFa, setFormTitleFa] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formDirector, setFormDirector] = useState('');
  const [formWriter, setFormWriter] = useState('');
  const [formActors, setFormActors] = useState('');
  const [formEpisodeDuration, setFormEpisodeDuration] = useState('');
  const [formCountry, setFormCountry] = useState('ایران');
  const [formLanguage, setFormLanguage] = useState('دوبله فارسی');
  const [formImdbRating, setFormImdbRating] = useState('');
  const [formQuality, setFormQuality] = useState(() => dbService.getSettings().defaultQuality || '1080p BluRay');
  const [formSubtitle, setFormSubtitle] = useState('دوبله فارسی');
  const [formGenres, setFormGenres] = useState<string[]>(['درام']);
  const [formPoster, setFormPoster] = useState('https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400');
  const [formSummary, setFormSummary] = useState('');
  const [formFilePath, setFormFilePath] = useState('');
  const [formOfficialSite, setFormOfficialSite] = useState('');
  const [formGallery, setFormGallery] = useState('');
  const [formReleaseDay, setFormReleaseDay] = useState('');
  const [formReleaseTime, setFormReleaseTime] = useState('');
  const [formTotalEpisodes, setFormTotalEpisodes] = useState<number>(0);
  const [formMyEpisodesCount, setFormMyEpisodesCount] = useState<number>(0);
  const [formReleasedEpisodesCount, setFormReleasedEpisodesCount] = useState<number>(0);
  const [formIsEnded, setFormIsEnded] = useState<boolean>(false);
  const [formIsEndedText, setFormIsEndedText] = useState<string>('پایان سریال');
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [galleryZoomScale, setGalleryZoomScale] = useState(1);
  const [importText, setImportText] = useState('');
  const [formSeasons, setFormSeasons] = useState<Season[]>([]);

  // TMDb Manual Fetch State
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchId, setTmdbSearchId] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);

  // TMDb Image Selection Modal State
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [fetchedImages, setFetchedImages] = useState<{
    poster: string;
    backdrop: string;
    gallery: string[];
  }>({ poster: '', backdrop: '', gallery: [] });
  const [imageAssignments, setImageAssignments] = useState<{
    poster: 'poster' | 'gallery' | 'none';
    backdrop: 'poster' | 'gallery' | 'none';
    gallery: ('poster' | 'gallery' | 'none')[];
  }>({
    poster: 'poster',
    backdrop: 'gallery',
    gallery: []
  });

  const assignImageRole = (indexOrKey: 'poster' | 'backdrop' | number, role: 'poster' | 'gallery' | 'none') => {
    setImageAssignments(prev => {
      if (typeof indexOrKey === 'number') {
        const newGallery = [...prev.gallery];
        newGallery[indexOrKey] = role;
        return { ...prev, gallery: newGallery };
      } else {
        return { ...prev, [indexOrKey]: role };
      }
    });
  };

  const [downloadDestFolder, setDownloadDestFolder] = useState('');
  const [isDownloadingImages, setIsDownloadingImages] = useState(false);

  const extractTmdbIdAndType = (input: string, defaultType: 'movie' | 'tv'): { id: number; type: 'movie' | 'tv' } | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    // Check if it's a simple number
    if (/^\d+$/.test(trimmed)) {
      return { id: parseInt(trimmed, 10), type: defaultType };
    }
    
    // Check for URL structures
    const movieMatch = trimmed.match(/\/movie\/(\d+)/);
    if (movieMatch) {
      return { id: parseInt(movieMatch[1], 10), type: 'movie' };
    }
    
    const tvMatch = trimmed.match(/\/tv\/(\d+)/);
    if (tvMatch) {
      return { id: parseInt(tvMatch[1], 10), type: 'tv' };
    }
    
    return null;
  };

  const downloadSelectedImages = async () => {
    if (!downloadDestFolder.trim()) {
      showToast('لطفاً پوشه مقصد برای ذخیره‌سازی تصاویر را انتخاب کنید.', 'error');
      return;
    }
    
    setIsDownloadingImages(true);
    showToast('در حال دریافت و ذخیره تصاویر انتخابی در پوشه سریال...');
    
    try {
      if (window.electronAPI && window.electronAPI.savePosterLocal) {
        const isWindows = downloadDestFolder.includes('\\');
        const picFolder = downloadDestFolder.trim() + (isWindows ? '\\pic' : '/pic');
        
        let posterLocalPath = '';
        const galleryPaths: string[] = [];
        
        // 1. Process default poster
        if (imageAssignments.poster === 'poster' && fetchedImages.poster) {
          const res = await window.electronAPI.savePosterLocal(fetchedImages.poster, picFolder, 'poster');
          if (res && res.success) {
            posterLocalPath = res.savedPath;
          }
        } else if (imageAssignments.poster === 'gallery' && fetchedImages.poster) {
          const res = await window.electronAPI.savePosterLocal(fetchedImages.poster, picFolder, 'gallery_poster');
          if (res && res.success) {
            galleryPaths.push(res.savedPath);
          }
        }
        
        // 2. Process default backdrop
        if (imageAssignments.backdrop === 'poster' && fetchedImages.backdrop) {
          const res = await window.electronAPI.savePosterLocal(fetchedImages.backdrop, picFolder, 'poster_backdrop');
          if (res && res.success) {
            posterLocalPath = res.savedPath;
          }
        } else if (imageAssignments.backdrop === 'gallery' && fetchedImages.backdrop) {
          const res = await window.electronAPI.savePosterLocal(fetchedImages.backdrop, picFolder, 'backdrop');
          if (res && res.success) {
            galleryPaths.push(res.savedPath);
          }
        }
        
        // 3. Process extra gallery images
        for (let i = 0; i < fetchedImages.gallery.length; i++) {
          const role = imageAssignments.gallery[i];
          if (role === 'poster') {
            const imgUrl = fetchedImages.gallery[i];
            const res = await window.electronAPI.savePosterLocal(imgUrl, picFolder, `poster_extra_${i + 1}`);
            if (res && res.success) {
              posterLocalPath = res.savedPath;
            }
          } else if (role === 'gallery') {
            const imgUrl = fetchedImages.gallery[i];
            const res = await window.electronAPI.savePosterLocal(imgUrl, picFolder, `gallery_${i + 1}`);
            if (res && res.success) {
              galleryPaths.push(res.savedPath);
            }
          }
        }
        
        if (posterLocalPath) {
          setFormPoster(posterLocalPath);
        }
        if (galleryPaths.length > 0) {
          setFormGallery(galleryPaths.join(','));
        }
        
        showToast('تمام تصاویر انتخابی با موفقیت در پوشه سریال ذخیره و به فیلدها متصل شدند.');
        setShowImagePickerModal(false);
      } else {
        // Fallback for online preview / web simulation
        let posterWebUrl = '';
        const galleryWebUrls: string[] = [];
        
        if (imageAssignments.poster === 'poster') {
          posterWebUrl = fetchedImages.poster;
        } else if (imageAssignments.poster === 'gallery') {
          galleryWebUrls.push(fetchedImages.poster);
        }
        
        if (imageAssignments.backdrop === 'poster') {
          posterWebUrl = fetchedImages.backdrop;
        } else if (imageAssignments.backdrop === 'gallery') {
          galleryWebUrls.push(fetchedImages.backdrop);
        }
        
        fetchedImages.gallery.forEach((url, idx) => {
          const role = imageAssignments.gallery[idx];
          if (role === 'poster') {
            posterWebUrl = url;
          } else if (role === 'gallery') {
            galleryWebUrls.push(url);
          }
        });
        
        if (posterWebUrl) {
          setFormPoster(posterWebUrl);
        }
        if (galleryWebUrls.length > 0) {
          setFormGallery(galleryWebUrls.join(','));
        }
        
        showToast('تصاویر انتخابی (آدرس‌های اینترنتی) به فیلدهای مربوطه متصل شدند.');
        setShowImagePickerModal(false);
      }
    } catch (err: any) {
      console.error('Error downloading selected images:', err);
      showToast('خطا در دانلود تصاویر: ' + err.message, 'error');
    } finally {
      setIsDownloadingImages(false);
    }
  };

  const populateFormWithTmdb = async (metadata: any) => {
    if (!metadata) return;
    setFormTitleFa(metadata.title || '');
    setFormTitleEn(metadata.originalTitle || '');
    setFormYear(metadata.releaseDate ? metadata.releaseDate.substring(0, 4) : '');
    setFormDirector(metadata.director ? metadata.director.join(', ') : '');
    setFormActors(metadata.cast ? metadata.cast.join(', ') : '');
    setFormEpisodeDuration(metadata.runtime ? `${metadata.runtime} دقیقه` : '۴۵ دقیقه');
    setFormCountry(metadata.countries ? metadata.countries.join(', ') : 'خارجی');
    setFormLanguage(formCategory.includes('ایرانی') ? 'فارسی' : 'زبان اصلی (زیرنویس فارسی)');
    setFormImdbRating(metadata.rating ? metadata.rating.toFixed(1) : '0.0');

    // Translate and normalize genres to map to POPULAR_GENRES
    const genreTranslations: Record<string, string> = {
      'drama': 'درام',
      'comedy': 'کمدی',
      'action': 'اکشن',
      'science fiction': 'علمی تخیلی',
      'sci-fi': 'علمی تخیلی',
      'horror': 'ترسناک',
      'thriller': 'هیجان انگیز',
      'documentary': 'مستند',
      'family': 'خانوادگی',
      'crime': 'جنایی',
      'mystery': 'معمایی',
      'romance': 'عاشقانه',
      'history': 'تاریخی',
      'biography': 'بیوگرافی',
      'adventure': 'ماجراجویی',
      'animation': 'انیمیشن',
      'war': 'جنگی',
      'music': 'موزیکال',
      'musical': 'موزیکال',
      'western': 'وسترن',
      'fantasy': 'فانتزی',
      'tv movie': 'برنامه تلویزیونی',
      'tv show': 'برنامه تلویزیونی',
      'soap': 'اجتماعی',
      'talk': 'برنامه تلویزیونی',
      'news': 'مستند',
      'reality': 'برنامه تلویزیونی',
      'kids': 'انیمیشن',
      'action & adventure': 'اکشن',
      'sci-fi & fantasy': 'علمی تخیلی'
    };

    const normalizeGenre = (g: string): string => {
      if (!g) return '';
      return g.trim()
        .toLowerCase()
        .replace(/‌/g, ' ') // replace ZWNJ with space
        .replace(/-/g, ' ') // replace dash with space
        .replace(/\s+/g, ' '); // normalize spaces
    };

    const mappedGenres: string[] = [];
    const incomingGenres = metadata.genres || [];
    incomingGenres.forEach((g: string) => {
      const norm = normalizeGenre(g);
      // 1. Direct translation
      if (genreTranslations[norm]) {
        mappedGenres.push(genreTranslations[norm]);
        return;
      }
      // 2. See if there is a matches in POPULAR_GENRES
      const match = POPULAR_GENRES.find(pg => normalizeGenre(pg) === norm);
      if (match) {
        mappedGenres.push(match);
      } else {
        // Check if any POPULAR_GENRES string contains or is contained in the norm
        const containingMatch = POPULAR_GENRES.find(pg => {
          const pNorm = normalizeGenre(pg);
          return pNorm.includes(norm) || norm.includes(pNorm);
        });
        if (containingMatch) {
          mappedGenres.push(containingMatch);
        }
      }
    });
    setFormGenres(Array.from(new Set(mappedGenres)));

    // Auto-populate seasons and episodes if metadata.tvSeasons is available
    if (metadata.tvSeasons && metadata.tvSeasons.length > 0) {
      const generatedSeasons: Season[] = metadata.tvSeasons.map((s: any) => {
        const seasonId = `season_${s.seasonNumber}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // Generate episodes list automatically
        const episodes: Episode[] = [];
        for (let i = 1; i <= s.episodeCount; i++) {
          episodes.push({
            id: `ep_${s.seasonNumber}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            episodeNumber: i,
            name: `قسمت ${i}`,
            videoPath: '',
            description: `فصل ${s.seasonNumber} قسمت ${i}`
          });
        }

        return {
          id: seasonId,
          name: s.name ? s.name.replace(/Season/gi, 'فصل') : `فصل ${s.seasonNumber}`,
          episodes: episodes
        };
      });
      setFormSeasons(generatedSeasons);
      
      // Calculate and set total episodes count
      const totalEpisodes = metadata.tvSeasons.reduce((acc: number, cur: any) => acc + (cur.episodeCount || 0), 0);
      setFormTotalEpisodes(totalEpisodes);
      setFormMyEpisodesCount(0); // initially 0
      setFormReleasedEpisodesCount(totalEpisodes);
    }

    setFormSummary(metadata.overview || '');
    setFormOfficialSite(`https://www.themoviedb.org/tv/${metadata.id}`);

    // Pre-populate destination folder from file path if possible
    let defaultDest = '';
    if (formFilePath) {
      defaultDest = formFilePath;
    }
    setDownloadDestFolder(defaultDest);

    // Load available images to select from
    const galleryImages = metadata.gallery || [];
    setFetchedImages({
      poster: metadata.posterPath || '',
      backdrop: metadata.backdropPath || '',
      gallery: galleryImages
    });
    setImageAssignments({
      poster: metadata.posterPath ? 'poster' : 'none',
      backdrop: metadata.backdropPath ? 'gallery' : 'none',
      gallery: galleryImages.map(() => 'gallery')
    });

    showToast('مشخصات متنی سریال دریافت شد. لطفاً تصاویر مورد نیاز را تایید و ذخیره کنید.');
    setShowImagePickerModal(true);
  };

  const handleSearchTmdb = async () => {
    if (!tmdbSearchQuery.trim()) {
      showToast('لطفاً نام سریال را وارد کنید.', 'error');
      return;
    }
    if (!SettingsService.hasCredentials()) {
      showToast('لطفاً ابتدا تنظیمات TMDb را در بخش تنظیمات پیکربندی کنید.', 'error');
      return;
    }
    setIsSearchingTmdb(true);
    setTmdbResults([]);
    try {
      const response = await TMDbService.searchTV(tmdbSearchQuery.trim());
      if (response && response.length > 0) {
        setTmdbResults(response.slice(0, 5));
        showToast(`تعداد ${response.length} سریال پیدا شد.`);
      } else {
        showToast('هیچ سریالی با این نام در TMDb پیدا نشد.', 'error');
      }
    } catch (err: any) {
      console.error('TMDb manual search error:', err);
      showToast('خطا در ارتباط با سرور TMDb.', 'error');
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const handleFetchTmdbByIdOrUrl = async () => {
    const parsedInfo = extractTmdbIdAndType(tmdbSearchId, 'tv');
    if (!parsedInfo) {
      showToast('لطفاً یک شناسه یا لینک معتبر از سایت TMDb وارد کنید.', 'error');
      return;
    }
    if (!SettingsService.hasCredentials()) {
      showToast('لطفاً ابتدا تنظیمات TMDb را در بخش تنظیمات پیکربندی کنید.', 'error');
      return;
    }
    setIsSearchingTmdb(true);
    try {
      const metadata = await TMDbService.fetchMetadata(parsedInfo.id, 'tv');
      if (metadata) {
        await populateFormWithTmdb(metadata);
      } else {
        showToast('هیچ اطلاعاتی برای این شناسه/لینک در TMDb یافت نشد.', 'error');
      }
    } catch (err: any) {
      console.error('TMDb fetch by ID error:', err);
      showToast('خطا در دریافت اطلاعات از سرور TMDb.', 'error');
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const triggerAutoTmdbSearchFromFolder = async (folderPath: string) => {
    if (!SettingsService.hasCredentials()) return;
    try {
      const winIdx = folderPath.lastIndexOf('\\');
      const nixIdx = folderPath.lastIndexOf('/');
      const idx = Math.max(winIdx, nixIdx);
      const parentFolderName = idx !== -1 ? folderPath.substring(idx + 1) : folderPath;

      const cleanName = parentFolderName.replace(/\b(13\d\d|14\d\d|19\d\d|20\d\d)\b/g, '').trim();

      setFormTitleFa(cleanName || parentFolderName);
      setFormTitleEn(cleanName || parentFolderName);
      setTmdbSearchQuery(cleanName || parentFolderName);

      showToast('در حال جستجوی خودکار مشخصات سریال در TMDb...');
      
      const parsed = {
        isSeries: true,
        seriesName: cleanName || parentFolderName,
        year: undefined
      };

      const metadata = await TMDbService.findBestMatch(parsed as any, parentFolderName);
      if (metadata) {
        await populateFormWithTmdb(metadata);
      } else {
        showToast('مشخصات خودکار در TMDb یافت نشد. می‌توانید دستی جستجو یا لینک وارد کنید.', 'info');
      }
    } catch (err) {
      console.error('Auto TMDb search from folder failed:', err);
    }
  };

  const [episodeFileExtension, setEpisodeFileExtension] = useState('.mkv');
  const [batchFileExtension, setBatchFileExtension] = useState('.mkv');

  const handleSavePosterLocally = async () => {
    if (!formPoster) {
      alert('ابتدا آدرس تصویر کاور یا فیلد پوستر آن را پر کنید.');
      return;
    }
    if (!formFilePath) {
      alert('لطفا ابتدا مسیر پوشه فیزیکی سریال را وارد یا انتخاب کنید.');
      return;
    }
    try {
      if (window.electronAPI && window.electronAPI.savePosterLocal) {
        const res = await window.electronAPI.savePosterLocal(formPoster, formFilePath, 'poster');
        if (res && res.success && res.savedPath) {
          setFormPoster(res.savedPath);
          alert('تصویر کاور با موفقیت دانلود و در پوشه سریال شما ذخیره شد:\n' + res.savedPath);
        } else {
          alert('خطا در ذخیره پوستر: ' + (res?.error || 'خطای جابجایی دیسک'));
        }
      }
    } catch (err: any) {
      showToast('خطا در ذخیره محلی پوستر: ' + err.message, 'error');
    }
  };

  const handleScanFolder = async () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      try {
        const hasCredentials = SettingsService.hasCredentials();
        if (!hasCredentials) {
          showToast("TMDb API is not configured. Please open Settings and configure your TMDb API.", 'warning');
        }

        const folderPath = await window.electronAPI.selectDirectory();
        if (folderPath) {
          console.log(`Starting media scan for folder: ${folderPath}`);
          if (hasCredentials) {
            showToast(`در حال اسکن و دریافت اطلاعات از TMDb...`, 'info');
          } else {
            showToast(`در حال اسکن آفلاین فایل‌ها (بدون اتصال به TMDb)...`, 'info');
          }
          const items = await MediaScanner.scanAndMatch(folderPath);
          console.log(`Scan completed for ${folderPath}. Total files found: ${items.length}`, items);
          setScannedFiles(items);
          setShowScanPreviewModal(true);
          if (hasCredentials) {
            showToast(`اسکن و دریافت اطلاعات با موفقیت انجام شد. ${items.length} فایل پیدا شد.`, 'success');
          } else {
            showToast(`اسکن فایل‌ها با موفقیت انجام شد. ${items.length} فایل پیدا شد.`, 'success');
          }
        }
      } catch (err: any) {
        console.error('Error scanning folder:', err);
        showToast(`خطا در اسکن پوشه: ${err.message || err}`, 'error');
      }
    } else {
      showToast('ابزار انتخاب پوشه بومی فقط در نسخه اصلی سیستم‌عامل در دسترس است.', 'warning');
    }
  };

  const handleImportJson = () => {
    try {
      if (!importText.trim()) {
        showToast('لطفاً ابتدا کد JSON سریال را در کادر مربوطه وارد نمایید.', 'warning');
        return;
      }
      const parsed = JSON.parse(importText);
      if (parsed.titleFa) setFormTitleFa(parsed.titleFa);
      if (parsed.titleEn) setFormTitleEn(parsed.titleEn);
      if (parsed.year) setFormYear(parsed.year);
      if (parsed.director) setFormDirector(parsed.director);
      if (parsed.writer) setFormWriter(parsed.writer);
      
      if (parsed.actors) {
        if (Array.isArray(parsed.actors)) {
          setFormActors(parsed.actors.join(' - '));
        } else {
          setFormActors(parsed.actors);
        }
      }
      
      if (parsed.episodeDuration) setFormEpisodeDuration(parsed.episodeDuration);
      if (parsed.duration) setFormEpisodeDuration(parsed.duration);
      if (parsed.country) setFormCountry(parsed.country);
      if (parsed.language) setFormLanguage(parsed.language);
      if (parsed.imdbRating) setFormImdbRating(parsed.imdbRating);
      if (parsed.quality) {
        const settings = dbService.getSettings();
        const customQ = settings.customQualities || [];
        const presetQ = ['1080p Web-DL', '1080p BluRay', '4K UHD Bluray', '720p HD'];
        const allQ = [...presetQ, ...customQ];
        if (!allQ.includes(parsed.quality)) {
          const updated = [...customQ, parsed.quality];
          dbService.updateSettings({ customQualities: updated });
        }
        setFormQuality(parsed.quality);
      }
      
      if (parsed.subtitle) setFormSubtitle(parsed.subtitle);
      if (parsed.genres) {
        if (Array.isArray(parsed.genres)) setFormGenres(parsed.genres);
      }
      
      // Handle flexible poster urls
      const posterVal = parsed.poster || parsed.posterUrl || parsed.imageUrl;
      if (posterVal) setFormPoster(posterVal);
      
      if (parsed.summary) setFormSummary(parsed.summary);
      if (parsed.filePath) setFormFilePath(parsed.filePath);
      if (parsed.officialSite) setFormOfficialSite(parsed.officialSite);
      if (parsed.releaseDay) setFormReleaseDay(parsed.releaseDay);
      if (parsed.releaseTime) setFormReleaseTime(parsed.releaseTime);
      
      if (parsed.category) {
        const settings = dbService.getSettings();
        const customC = settings.customCategories || [];
        const presetC = ['ایرانی', 'خارجی', 'انیمیشن', 'کره‌ای', 'هندی', 'متفرقه'];
        const allC = [...presetC, ...customC];
        if (!allC.includes(parsed.category)) {
          const updated = [...customC, parsed.category];
          dbService.updateSettings({ customCategories: updated });
        }
        setFormCategory(parsed.category);
      }

      // Handle Seasons and Episodes importing from inside JSON
      if (parsed.seasons && Array.isArray(parsed.seasons)) {
        const mappedSeasons: Season[] = parsed.seasons.map((s: any, sIdx: number) => ({
          id: s.id || 'season_' + Math.random().toString(36).substr(2, 9) + '_' + sIdx,
          name: s.name || `فصل ${sIdx + 1}`,
          episodes: Array.isArray(s.episodes) ? s.episodes.map((e: any, eIdx: number) => ({
            id: e.id || 'epi_' + Math.random().toString(36).substr(2, 9) + '_' + eIdx,
            episodeNumber: typeof e.episodeNumber === 'number' ? e.episodeNumber : (eIdx + 1),
            name: e.name || `قسمت ${typeof e.episodeNumber === 'number' ? e.episodeNumber : (eIdx + 1)}`,
            videoPath: e.videoPath || '',
            description: e.description || ''
          })) : []
        }));
        setFormSeasons(mappedSeasons);
        showToast('اطلاعات فصول و قسمت‌ها از فایل JSON خوانده شد.');
      } else if (typeof parsed.seasonsCount === 'number') {
        const sCount = parsed.seasonsCount;
        const eCount = typeof parsed.episodesCount === 'number' ? parsed.episodesCount : 10;
        const generatedSeasons: Season[] = [];
        for (let sIdx = 0; sIdx < sCount; sIdx++) {
          const episodes: Episode[] = [];
          for (let eIdx = 0; eIdx < eCount; eIdx++) {
            episodes.push({
              id: 'epi_' + Math.random().toString(36).substr(2, 9) + '_' + sIdx + '_' + eIdx,
              episodeNumber: eIdx + 1,
              name: `قسمت ${eIdx + 1}`,
              videoPath: '',
              description: ''
            });
          }
          generatedSeasons.push({
            id: 'season_' + Math.random().toString(36).substr(2, 9) + '_' + sIdx,
            name: `فصل ${sIdx + 1}`,
            episodes
          });
        }
        setFormSeasons(generatedSeasons);
        showToast(`تعداد ${sCount} فصل و هر فصل ${eCount} قسمت برای این سریال آماده گردید.`);
      } else {
        setFormSeasons([]);
      }

      if (parsed.gallery) {
        if (Array.isArray(parsed.gallery)) {
          setFormGallery(parsed.gallery.join(', '));
        } else {
          setFormGallery(parsed.gallery);
        }
      }

      if (parsed.totalEpisodes !== undefined) {
        setFormTotalEpisodes(Number(parsed.totalEpisodes) || 0);
      }
      if (parsed.myEpisodesCount !== undefined) {
        setFormMyEpisodesCount(Number(parsed.myEpisodesCount) || 0);
      }
      if (parsed.releasedEpisodesCount !== undefined) {
        setFormReleasedEpisodesCount(Number(parsed.releasedEpisodesCount) || 0);
      }
      if (parsed.isEnded !== undefined) {
        setFormIsEnded(!!parsed.isEnded);
      }
      if (parsed.isEndedText !== undefined) {
        setFormIsEndedText(parsed.isEndedText);
      }
      
      showToast('اطلاعات سریال از قالب JSON خوانده شد و در فرم فیلدها پر گردید.');
    } catch (e) {
      showAlert('خطا در خواندن قالب JSON. از صحت ساختار متن اطمینان حاصل فرمایید.', 'error');
    }
  };

  const loadExampleJson = () => {
    const example = {
      titleFa: "بازی تاج و تخت",
      titleEn: "Game of Thrones",
      category: "خارجی",
      year: "۲۰۱۱",
      director: "دیوید بنیاف",
      writer: "جرج آر. آر. مارتین",
      actors: "کیت هرینگتون - امیلیا کلارک - پیتر دینکلیج",
      episodeDuration: "۵۷ دقیقه",
      country: "آمریکا",
      language: "فارسی (دوبله)",
      imdbRating: "۹.۲",
      quality: "1080p BluRay",
      subtitle: "دوبله فارسی",
      genres: ["اکشن", "ماجراجویی", "درام"],
      posterUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400",
      summary: "داستان نبرد چندین خانواده‌ی اشرافی برای به دست آوردن کنترل سرزمین افسانه‌ای وستروس...",
      officialSite: "https://www.imdb.com/title/tt0944947/",
      filePath: "D:\\Media\\Series\\Game of Thrones",
      releaseDay: "جمعه",
      releaseTime: "22:00",
      seasonsCount: 8,
      episodesCount: 10
    };
    setImportText(JSON.stringify(example, null, 2));
  };

  // Episode & Season Manager Modal
  const [managingSeries, setManagingSeries] = useState<Series | null>(null);
  const [detailSeries, setDetailSeries] = useState<Series | null>(null);
  const [zoomedPoster, setZoomedPoster] = useState<string | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null); // active season ID being managed
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [editingSeasonName, setEditingSeasonName] = useState('');
  const [seasonFormName, setSeasonFormName] = useState('');
  
  const [showAddEpisodeBox, setShowAddEpisodeBox] = useState<string | null>(null); // seasonId to show box for Adding
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null); // episode ID being edited
  const [episodeFormNum, setEpisodeFormNum] = useState(1);
  const [episodeFormName, setEpisodeFormName] = useState('');
  const [episodeFormFile, setEpisodeFormFile] = useState('');
  const [episodeFormDesc, setEpisodeFormDesc] = useState('');

  // Batch Generation States
  const [batchSeasonsCount, setBatchSeasonsCount] = useState(2);
  const [batchEpisodesForSeason, setBatchEpisodesForSeason] = useState<number[]>([10, 10]);

  // Sells modal 💰
  const [sellingSeries, setSellingSeries] = useState<Series | null>(null);
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleOption, setSaleOption] = useState<'full' | 'season' | 'episode' | 'multi_episode'>('full');
  const [selectedSaleSeason, setSelectedSaleSeason] = useState('');
  const [selectedSaleEpisode, setSelectedSaleEpisode] = useState('');
  const [selectedSaleEpisodes, setSelectedSaleEpisodes] = useState<string[]>([]);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [saleDiscount, setSaleDiscount] = useState(0);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (initialSelectedId && seriesList.length > 0) {
      const match = seriesList.find(s => s.id === initialSelectedId);
      if (match) {
        setManagingSeries(match);
        if (match.seasons && match.seasons.length > 0) {
          setActiveSeasonId(match.seasons[0].id);
        } else {
          setActiveSeasonId(null);
        }
      }
      if (onClearInitialSelectedId) {
        onClearInitialSelectedId();
      }
    }
  }, [initialSelectedId, seriesList]);

  useEffect(() => {
    if (!selectedGalleryImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const galleryList = detailSeries?.gallery || [];
      const currentIdx = galleryList.indexOf(selectedGalleryImage);

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        if (currentIdx < galleryList.length - 1) {
          setSelectedGalleryImage(galleryList[currentIdx + 1]);
          setGalleryZoomScale(1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        if (currentIdx > 0) {
          setSelectedGalleryImage(galleryList[currentIdx - 1]);
          setGalleryZoomScale(1);
        }
      } else if (e.key === 'Escape') {
        setSelectedGalleryImage(null);
        setGalleryZoomScale(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedGalleryImage, detailSeries]);

  // Auto path suggestions for new episodes
  useEffect(() => {
    let active = true;
    if (managingSeries && activeSeasonId && showAddEpisodeBox === activeSeasonId && !editingEpisodeId) {
      const defaultPath = getEpisodeDefaultPath(managingSeries, activeSeasonId, episodeFormNum, episodeFileExtension);
      setEpisodeFormFile(defaultPath);

      if (window.electronAPI && window.electronAPI.resolveVideoPath) {
        const pathWithoutExt = defaultPath.substring(0, defaultPath.lastIndexOf('.'));
        window.electronAPI.resolveVideoPath(pathWithoutExt).then((res) => {
          if (active && res && res.success && res.resolvedPath) {
            setEpisodeFormFile(res.resolvedPath);
            if (res.ext) {
              setEpisodeFileExtension(res.ext);
            }
          }
        }).catch(console.warn);
      }
    }
    return () => {
      active = false;
    };
  }, [episodeFormNum, activeSeasonId, showAddEpisodeBox, editingEpisodeId, managingSeries?.filePath, managingSeries?.titleEn, episodeFileExtension]);

  const refreshData = () => {
    setSeriesList(dbService.getSeries());
    const settings = dbService.getSettings();
    setPageSize(settings.pageSize || 20);
  };

  // 1. Populate form for Edit
  const handleOpenEdit = (series: Series, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSeries(series);
    setFormCategory(series.category);
    setFormTitleFa(series.titleFa);
    setFormTitleEn(series.titleEn);
    setFormYear(series.year);
    setFormDirector(series.director);
    setFormWriter(series.writer);
    setFormActors(series.actors);
    setFormEpisodeDuration(series.episodeDuration);
    setFormCountry(series.country || 'ایران');
    setFormLanguage(series.language || 'دوبله فارسی');
    setFormImdbRating(series.imdbRating);
    setFormQuality(series.quality);
    setFormSubtitle(series.subtitle);
    setFormGenres(series.genres || []);
    setFormPoster(series.poster);
    setFormSummary(series.summary);
    setFormFilePath(series.filePath || '');
    setFormOfficialSite(series.officialSite || '');
    setFormGallery(series.gallery ? series.gallery.join(', ') : '');
    setFormReleaseDay(series.releaseDay || '');
    setFormReleaseTime(series.releaseTime || '');
    setFormTotalEpisodes(series.totalEpisodes || 0);
    setFormMyEpisodesCount(series.myEpisodesCount || 0);
    setFormReleasedEpisodesCount(series.releasedEpisodesCount || 0);
    setFormIsEnded(series.isEnded || false);
    setFormIsEndedText(series.isEndedText || 'پایان سریال');
    setFormSeasons(series.seasons || []);
    setImportText('');
    setShowFormModal(true);
  };

  const clearFormFields = () => {
    setFormCategory('ایرانی');
    setFormTitleFa('');
    setFormTitleEn('');
    setFormYear('۱۴۰۳');
    setFormDirector('');
    setFormWriter('');
    setFormActors('');
    setFormEpisodeDuration('۵۰ دقیقه');
    setFormCountry('ایران');
    setFormLanguage('دوبله فارسی');
    setFormImdbRating('۸.۰');
    const setts = dbService.getSettings();
    setFormQuality(setts.defaultQuality || '1080p BluRay');
    setFormSubtitle('دوبله فارسی');
    setFormGenres(['درام', 'عاشقانه']);
    setFormPoster('https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400');
    setFormSummary('');
    setFormFilePath('');
    setFormOfficialSite('');
    setFormGallery('');
    setFormReleaseDay('');
    setFormReleaseTime('');
    setFormTotalEpisodes(0);
    setFormMyEpisodesCount(0);
    setFormReleasedEpisodesCount(0);
    setFormIsEnded(false);
    setFormIsEndedText('پایان سریال');
    setFormSeasons([]);
    setImportText('');
  };

  const handleOpenCreate = () => {
    if (editingSeries !== null) {
      clearFormFields();
    }
    setEditingSeries(null);
    setShowFormModal(true);
  };

  const handlePickPoster = async () => {
    if (window.electronAPI) {
      try {
        const path = await window.electronAPI.selectPoster();
        if (path) {
          setFormPoster(path);
        }
      } catch (err) {
        console.error('Failed to select poster:', err);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
              setFormPoster(event.target.result);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const handlePickEpisodeFilePath = () => {
    if (window.electronAPI) {
      window.electronAPI.selectFile().then((path: string) => {
        if (path) setEpisodeFormFile(path);
      }).catch((err: any) => {
        console.error('Failed to select file natively:', err);
      });
    } else {
      const inputPath = window.prompt('(شبیه‌ساز آنلاین) آدرس فیزیکی فایل این قسمت را وارد کنید:', episodeFormFile || 'D:\\Media\\Series\\EpisodeName.mkv');
      if (inputPath !== null) {
        setEpisodeFormFile(inputPath);
      }
    }
  };

  const handleExportSingleSeriesJson = (series: Series) => {
    try {
      const dataStr = JSON.stringify(series, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const sanitizedTitle = (series.titleEn || series.titleFa || 'series').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
      const exportFileDefaultName = `series_${sanitizedTitle}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showToast('مشخصات این سریال با موفقیت به صورت فایل JSON برون‌بری شد.');
    } catch {
      showToast('خطا در برون‌بری اطلاعات سریال.', 'error');
    }
  };

  const handlePlayFile = async (filePath: string, originPeerIp?: string, customTitle?: string, subtitlesList?: string[]) => {
    if (!filePath) {
      showAlert('مسیری برای این رسانه ثبت نشده است. ابتدا اطلاعات را ویرایش کرده و آدرس فایل را وارد نمایید.', 'warning');
      return;
    }
    const settings = dbService.getSettings();
    if (settings.videoPlayerMode === 'internal') {
      const event = new CustomEvent('play_video_internal', {
        detail: { filePath, title: customTitle || 'پخش ویدیو', originPeerIp, subtitlesList }
      });
      window.dispatchEvent(event);
      return;
    }

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.playVideoFile(filePath, originPeerIp);
        if (res && !res.success) {
          showAlert('خطا در پخش فایل: ' + res.error, 'error');
        }
      } catch (err) {
        console.error('Failed to play natively:', err);
      }
    } else {
      showAlert(`پورت سیستم: پخش ویدیو به نرم‌افزار پیش‌فرض سیستم فرستاده می‌شود.\n\nمسیر فایل:\n${filePath}`, 'info', 'شبیه‌ساز پخش ویدیو');
    }
  };

  const handleOpenFolder = async (filePath: string, originPeerIp?: string) => {
    if (!filePath) {
      showAlert('مسیری برای این رسانه ثبت نشده است. ابتدا اطلاعات را ویرایش کرده و آدرس فایل را وارد نمایید.', 'warning');
      return;
    }
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.openFileInExplorer(filePath, originPeerIp);
        if (res && !res.success) {
          showAlert('خطا در باز کردن پوشه: ' + res.error, 'error');
        }
      } catch (err) {
        console.error('Failed to open folder natively:', err);
      }
    } else {
      showAlert(`شبیه‌ساز مرورگر: پوشه حاوی این فایل در سیستم باز می‌شود.\n\nمسیر فایل:\n${filePath}`, 'info', 'نمایش در پوشه');
    }
  };

  const handlePlayEpisode = (episode: Episode, series: Series) => {
    const path = episode.videoPath && episode.videoPath.trim() !== '' && episode.videoPath !== 'D:\\Media\\Series\\Video.mkv'
      ? episode.videoPath
      : (series.filePath || '');
    handlePlayFile(path, series.originPeerIp, `${series.titleFa} - ${episode.name}`, episode.subtitlesList);
  };

  const handleOpenEpisodeFolder = (episode: Episode, series: Series) => {
    const path = episode.videoPath && episode.videoPath.trim() !== '' && episode.videoPath !== 'D:\\Media\\Series\\Video.mkv'
      ? episode.videoPath
      : (series.filePath || '');
    handleOpenFolder(path, series.originPeerIp);
  };

  const handleDeleteSeries = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('آیا از حذف این سریال به همراه تمامی فصل‌ها و قسمت‌ها اطمینان دارید؟')) {
      dbService.deleteSeries(id);
      refreshData();
      if (managingSeries && managingSeries.id === id) {
        setManagingSeries(null);
      }
    }
  };

  const handleSaveSeries = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleFa || !formTitleEn) {
      alert('وارد کردن نام فارسی و انگلیسی اجباری است.');
      return;
    }

    const existingSeries = dbService.getSeries();
    const isDuplicate = existingSeries.some(s => {
      if (editingSeries && s.id === editingSeries.id) return false;
      const sameTitleFa = s.titleFa.trim() === formTitleFa.trim();
      const sameTitleEn = s.titleEn.trim().toLowerCase() === formTitleEn.trim().toLowerCase();
      const sameFilePath = formFilePath && formFilePath.trim() !== '' && s.filePath && s.filePath.trim().toLowerCase() === formFilePath.trim().toLowerCase();
      return sameTitleFa || sameTitleEn || sameFilePath;
    });

    if (isDuplicate) {
      showAlert('این سریال از قبل در سیستم موجود است! عنوان فارسی، انگلیسی یا مسیر فایل این سریال تکراری است.', 'warning');
      return;
    }

    const settings = dbService.getSettings();
    const payload = {
      category: formCategory,
      titleFa: formTitleFa,
      titleEn: formTitleEn,
      year: formYear,
      director: formDirector,
      writer: formWriter,
      actors: formActors,
      episodeDuration: formEpisodeDuration,
      country: formCountry,
      language: formLanguage,
      imdbRating: formImdbRating,
      quality: formQuality,
      subtitle: formSubtitle,
      genres: formGenres,
      poster: formPoster,
      summary: formSummary,
      filePath: formFilePath,
      officialSite: formOfficialSite,
      gallery: formGallery ? formGallery.split(',').map(s => s.trim()).filter(Boolean) : [],
      releaseDay: formReleaseDay || undefined,
      releaseTime: formReleaseTime || undefined,
      totalEpisodes: Number(formTotalEpisodes || 0),
      myEpisodesCount: Number(formMyEpisodesCount || 0),
      releasedEpisodesCount: Number(formReleasedEpisodesCount || 0),
      isEnded: formIsEnded,
      isEndedText: formIsEndedText || 'پایان سریال',
      purchasePrice: 0,
      salePrice: settings.defaultSeriesPrice * 10, // general season package baseline
      seasons: formSeasons && formSeasons.length > 0 ? formSeasons : (editingSeries ? editingSeries.seasons : [])
    };

    if (editingSeries) {
      dbService.updateSeries(editingSeries.id, payload);
    } else {
      dbService.addSeries(payload);
    }

    setShowFormModal(false);
    clearFormFields();
    refreshData();
  };

  // 2. Nesting Season Managers
  const handleAddNewSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingSeries || !seasonFormName.trim()) return;

    const newSeason = dbService.addSeason(managingSeries.id, seasonFormName);
    setSeasonFormName('');
    // Reload managing series context
    const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
    if (updated) {
      setManagingSeries(updated);
      if (newSeason) {
        setActiveSeasonId(newSeason.id);
      }
    }
    refreshData();
  };

  const handleDeleteSeason = (seasonId: string) => {
    if (!managingSeries) return;
    if (window.confirm('با حذف این فصل تمام قسمت‌های آن خارج خواهند شد. حذف شود؟')) {
      dbService.deleteSeason(managingSeries.id, seasonId);
      const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
      if (updated) {
        setManagingSeries(updated);
        if (activeSeasonId === seasonId) {
          if (updated.seasons && updated.seasons.length > 0) {
            setActiveSeasonId(updated.seasons[0].id);
          } else {
            setActiveSeasonId(null);
          }
        }
      } else {
        setManagingSeries(null);
        setActiveSeasonId(null);
      }
      refreshData();
    }
  };

  const handleUpdateSeason = (seasonId: string) => {
    if (!managingSeries || !editingSeasonName.trim()) return;
    dbService.updateSeason(managingSeries.id, seasonId, editingSeasonName);
    setEditingSeasonId(null);
    setEditingSeasonName('');
    const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
    if (updated) setManagingSeries(updated);
    refreshData();
  };

  // 3. Nesting Episode Actions
  const handleAddEpisode = (seasonId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!managingSeries) return;

    if (editingEpisodeId) {
      dbService.updateEpisode(managingSeries.id, seasonId, editingEpisodeId, {
        episodeNumber: Number(episodeFormNum) || 1,
        name: episodeFormName || `قسمت ${toPersianNums(episodeFormNum)}`,
        videoPath: episodeFormFile || `D:\\Media\\Series\\Video.mkv`,
        description: episodeFormDesc
      });
    } else {
      dbService.addEpisode(managingSeries.id, seasonId, {
        episodeNumber: Number(episodeFormNum) || 1,
        name: episodeFormName || `قسمت ${toPersianNums(episodeFormNum)}`,
        videoPath: episodeFormFile || `D:\\Media\\Series\\Video.mkv`,
        description: episodeFormDesc
      });
    }

    // Reset episode inputs
    setEpisodeFormNum(1);
    setEpisodeFormName('');
    setEpisodeFormFile('');
    setEpisodeFormDesc('');
    setShowAddEpisodeBox(null);
    setEditingEpisodeId(null);

    const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
    if (updated) setManagingSeries(updated);
    refreshData();
  };

  const handleBatchSeasonsCountChange = (count: number) => {
    setBatchSeasonsCount(count);
    const newArr = [...batchEpisodesForSeason];
    if (count > newArr.length) {
      for (let i = newArr.length; i < count; i++) {
        newArr.push(10); // default 10 episodes
      }
    } else if (count < newArr.length) {
      newArr.length = count;
    }
    setBatchEpisodesForSeason(newArr);
  };

  const getEpisodeDefaultPath = (series: Series, seasonId: string | null, epNum: number, ext?: string) => {
    if (!series) return '';
    const folderPath = series.filePath || `D:\\Media\\Series\\${series.titleEn || ''}`;
    const enTitle = (series.titleEn || 'series').trim().toLowerCase().replace(/\s+/g, '-');
    
    let sNum = 1;
    if (series.seasons && seasonId) {
      const idx = series.seasons.findIndex(s => s.id === seasonId);
      if (idx !== -1) {
        sNum = idx + 1;
      }
    }
    const sStr = sNum.toString().padStart(2, '0');
    const eStr = epNum.toString().padStart(2, '0');
    const finalExt = ext ? (ext.startsWith('.') ? ext : `.${ext}`) : '.mkv';
    
    return `${folderPath}\\Season-${sStr}\\${enTitle}-s${sStr}-e${eStr}${finalExt}`;
  };

  const handleGenerateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingSeries) return;

    if (window.confirm('توجه: تولید گروهی تمام فصل‌ها و قسمت‌های قبلی این سریال را حذف و به طور کامل بازنویسی خواهد کرد. آیا مطمئن هستید؟')) {
      let updatedSeasonsList: Season[] = [];
      const numSeasons = Number(batchSeasonsCount) || 1;
      const seasonNamesFa = ["اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم", "سیزدهم", "چهاردهم", "پانزدهم"];

      const enTitle = (managingSeries.titleEn || 'series').trim().toLowerCase().replace(/\s+/g, '-');
      const rootPath = managingSeries.filePath || `D:\\Media\\Series\\${managingSeries.titleEn || 'SeriesName'}`;

      for (let sIdx = 0; sIdx < numSeasons; sIdx++) {
        const sName = `فصل ${seasonNamesFa[sIdx] || (sIdx + 1)}`;
        const numEpisodes = Number(batchEpisodesForSeason[sIdx]) || 10;
        const episodesList: Episode[] = [];
        const sStr = (sIdx + 1).toString().padStart(2, '0');

        for (let eIdx = 1; eIdx <= numEpisodes; eIdx++) {
          const eStr = eIdx.toString().padStart(2, '0');
          const finalExt = batchFileExtension ? (batchFileExtension.startsWith('.') ? batchFileExtension : `.${batchFileExtension}`) : '.mkv';
          const autoPath = `${rootPath}\\Season-${sStr}\\${enTitle}-s${sStr}-e${eStr}${finalExt}`;

          episodesList.push({
            id: 'ep_' + Math.random().toString(36).substr(2, 9),
            episodeNumber: eIdx,
            name: `قسمت ${toPersianNums(eIdx)}`,
            videoPath: autoPath,
            description: ''
          });
        }

        updatedSeasonsList.push({
          id: 'se_' + Math.random().toString(36).substr(2, 9),
          name: sName,
          episodes: episodesList
        });
      }

      dbService.updateSeries(managingSeries.id, { seasons: updatedSeasonsList });
      
      const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
      if (updated) {
        setManagingSeries(updated);
        if (updated.seasons && updated.seasons.length > 0) {
          setActiveSeasonId(updated.seasons[0].id);
        } else {
          setActiveSeasonId(null);
        }
      }
      refreshData();
      alert('فصل‌ها و قسمت‌ها به طور کامل و گروهی تولید شدند!');
    }
  };

  const handleAutoMatchExtensionsFromDisk = async () => {
    if (!managingSeries) return;
    const folderPath = managingSeries.filePath;
    if (!folderPath) {
      showAlert('لطفا ابتدا مسیر پوشه فیزیکی سریال را در کادر بالای مدیریت قسمت ها یا کادر مشخصات سریال وارد کنید.', 'warning', 'مسیر پوشه فیزیکی ثبت نشده');
      return;
    }

    try {
      if (window.electronAPI && window.electronAPI.scanSeriesDirectory) {
        showToast('در حال اسکن پوشه سریال و تطبیق پسوندهای mkv, mp4, 3gp, ...', 'info');
        const scanRes = await window.electronAPI.scanSeriesDirectory(folderPath);
        if (scanRes && scanRes.success && scanRes.files) {
          const files = scanRes.files;
          let matchedCount = 0;

          // Clone seasons list
          const updatedSeasonsList = JSON.parse(JSON.stringify(managingSeries.seasons || [])) as Season[];

          // Helper to match season and episode from file name and path
          const parseSeasonAndEpisode = (fileName: string, fullPath: string) => {
            const name = fileName.toLowerCase();
            
            // 1. Try SxxExx or sxx-exx
            const seMatch = name.match(/s(\d+)\s*[-_e]?\s*e(\d+)/i) || name.match(/s(\d+)\s*episode\s*(\d+)/i);
            if (seMatch) {
              return {
                seasonNum: parseInt(seMatch[1], 10),
                episodeNum: parseInt(seMatch[2], 10)
              };
            }

            // 2. Try e.g. E02 or Ep2
            const eMatch = name.match(/e(\d+)(?=\D|$)/i) || name.match(/ep\s*(\d+)/i) || name.match(/episode\s*(\d+)/i) || name.match(/قسمت\s*(\d+)/i);
            if (eMatch) {
              // Guess season from path
              const pathParts = fullPath.toLowerCase().split(/[\\/]/);
              let guessedSeason = 1;
              for (const part of pathParts) {
                const sMatch = part.match(/season\s*[-_]?\s*(\d+)/i) || part.match(/season\s*(\d+)/i) || part.match(/s(\d+)/i) || part.match(/fasl\s*(\d+)/i);
                if (sMatch) {
                  guessedSeason = parseInt(sMatch[1], 10);
                  break;
                }
                if (part.includes('اول') || part.includes('1')) guessedSeason = 1;
                else if (part.includes('دوم') || part.includes('2')) guessedSeason = 2;
                else if (part.includes('سوم') || part.includes('3')) guessedSeason = 3;
                else if (part.includes('چهارم') || part.includes('4')) guessedSeason = 4;
                else if (part.includes('پنجم') || part.includes('5')) guessedSeason = 5;
              }
              return {
                seasonNum: guessedSeason,
                episodeNum: parseInt(eMatch[1], 10)
              };
            }

            // 3. Try pure single/double numbers as episode number
            const numMatches = name.match(/(?:^|[^a-zA-Z0-9])(\d{1,3})(?=\D|$)/g);
            if (numMatches) {
              const cleanNums = numMatches.map(m => parseInt(m.replace(/\D/g, ''), 10)).filter(n => n > 0 && n < 1000);
              if (cleanNums.length > 0) {
                const ep = cleanNums[cleanNums.length - 1];
                let guessedSeason = 1;
                const pathParts = fullPath.toLowerCase().split(/[\\/]/);
                for (const part of pathParts) {
                  const sMatch = part.match(/season\s*[-_]?\s*(\d+)/i) || part.match(/season\s*(\d+)/i) || part.match(/s(\d+)/i) || part.match(/fasl\s*(\d+)/i);
                  if (sMatch) {
                    guessedSeason = parseInt(sMatch[1], 10);
                    break;
                  }
                }
                return {
                  seasonNum: guessedSeason,
                  episodeNum: ep
                };
              }
            }

            return null;
          };

          // Go through scanned files and build a mapping
          const fileMapping: { [key: string]: string } = {};
          for (const file of files) {
            const parsed = parseSeasonAndEpisode(file.name, file.path);
            if (parsed) {
              fileMapping[`${parsed.seasonNum}_${parsed.episodeNum}`] = file.path;
            }
          }

          const getBaseNameWithoutExt = (p: string) => {
            const dotIdx = p.lastIndexOf('.');
            return dotIdx !== -1 ? p.substring(0, dotIdx) : p;
          };

          // Loop through standard seasons & episodes to map them
          for (let sIdx = 0; sIdx < updatedSeasonsList.length; sIdx++) {
            const season = updatedSeasonsList[sIdx];
            const seasonNum = sIdx + 1;
            const eps = season.episodes || [];
            
            for (let eIdx = 0; eIdx < eps.length; eIdx++) {
              const ep = eps[eIdx];
              const epNum = ep.episodeNumber;

              const mappedPath = fileMapping[`${seasonNum}_${epNum}`];
              if (mappedPath) {
                ep.videoPath = mappedPath;
                matchedCount++;
              } else {
                const currentBase = getBaseNameWithoutExt(ep.videoPath);
                const matchedFile = files.find(f => getBaseNameWithoutExt(f.path).toLowerCase() === currentBase.toLowerCase());
                if (matchedFile) {
                  ep.videoPath = matchedFile.path;
                  matchedCount++;
                }
              }
            }
          }

          // Natural sequential sorted order mapping as ultimate fallback
          if (matchedCount === 0 && files.length > 0) {
            const allEpisodes: Episode[] = [];
            updatedSeasonsList.forEach(s => s.episodes?.forEach(e => allEpisodes.push(e)));
            
            if (allEpisodes.length === files.length) {
              const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
              let fileIdx = 0;
              for (let sIdx = 0; sIdx < updatedSeasonsList.length; sIdx++) {
                const s = updatedSeasonsList[sIdx];
                const sortedEps = [...(s.episodes || [])].sort((a, b) => a.episodeNumber - b.episodeNumber);
                for (let eIdx = 0; eIdx < sortedEps.length; eIdx++) {
                  const ep = sortedEps[eIdx];
                  const actualEp = s.episodes.find(originalEp => originalEp.id === ep.id);
                  if (actualEp && sortedFiles[fileIdx]) {
                    actualEp.videoPath = sortedFiles[fileIdx].path;
                    matchedCount++;
                    fileIdx++;
                  }
                }
              }
            }
          }

          if (matchedCount > 0) {
            dbService.updateSeries(managingSeries.id, { seasons: updatedSeasonsList });
            const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
            if (updated) setManagingSeries(updated);
            refreshData();
            showAlert(`تعداد ${matchedCount} قسمت با موفقیت به فایل‌های واقعی با پسوند صحیح روی دیسک متصل شدند!`, 'success', 'موفقیت');
          } else {
            showAlert('هیچ فایل فیزیکی منطبقی با شماره قسمت‌ها پیدا نشد. لطفا فرمت اسامی فایل‌های ویدیویی را بررسی کنید (مثلا S01E01 یا E01).', 'info', 'اطلاع');
          }
        } else {
          showAlert('خطا در اسکن پوشه: ' + (scanRes?.error || 'پوشه پیدا نشد یا خالی است.'), 'error', 'خطا');
        }
      } else {
        showToast('پورت دسکتاپ فعال نیست؛ شبیه‌ساز تطبیق پسوند اجرا می‌شود.', 'warning');
        const updatedSeasonsList = JSON.parse(JSON.stringify(managingSeries.seasons || [])) as Season[];
        let count = 0;
        for (const s of updatedSeasonsList) {
          for (const e of s.episodes) {
            const extOptions = ['.mp4', '.mkv', '.3gp'];
            const randomExt = extOptions[(s.episodes.indexOf(e)) % 3];
            const base = e.videoPath.includes('.') ? e.videoPath.substring(0, e.videoPath.lastIndexOf('.')) : e.videoPath;
            e.videoPath = base + randomExt;
            count++;
          }
        }
        dbService.updateSeries(managingSeries.id, { seasons: updatedSeasonsList });
        const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
        if (updated) setManagingSeries(updated);
        refreshData();
        showAlert(`شبیه‌سازی: تعداد ${count} قسمت با پسوندهای فیزیکی واقعی (mkv, mp4, 3gp) ست شدند.`, 'success', 'اتمام شبیه‌ساز');
      }
    } catch (err: any) {
      showToast('خطا در تطبیق پسوندهای دیسک: ' + err.message, 'error');
    }
  };

  const handleAutoRenameEpisodeFiles = async () => {
    if (!managingSeries) return;
    if (!activeSeasonId) {
      showAlert('لطفا ابتدا یک فصل را انتخاب کنید تا قسمت‌های آن تغییر نام یابند.', 'warning', 'فصل انتخاب نشده است');
      return;
    }
    const currentSeason = managingSeries.seasons.find(s => s.id === activeSeasonId);
    if (!currentSeason || !currentSeason.episodes || currentSeason.episodes.length === 0) {
      showAlert('این فصل دارای هیچ قسمتی نیست.', 'warning', 'قسمتی یافت نشد');
      return;
    }

    if (!window.confirm('آیا مطمئن هستید که می‌خواهید نام فیزیکی فایل‌های این فصل را بر اساس یک نقشه راه منظم و استاندارد (مثلاً Aban-S01E01.mp4) تغییر دهید؟ این عملیات فایل‌های فیزیکی روی دیسک را تغییر نام خواهد داد.')) {
      return;
    }

    try {
      showToast('در حال تغییر نام فیزیکی فایل‌ها...', 'info');
      let successRenames = 0;
      let failedRenames = 0;

      // Clean the series title for use in English filename
      const rawTitle = managingSeries.titleEn || managingSeries.titleFa || 'Series';
      const cleanTitle = rawTitle
        .trim()
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // remove special characters
        .replace(/\s+/g, '-'); // replace spaces with hyphens

      const seasonNum = currentSeason.seasonNumber || 1;
      const sStr = seasonNum.toString().padStart(2, '0');

      // Create a cloned version of seasons list
      const updatedSeasonsList = JSON.parse(JSON.stringify(managingSeries.seasons || [])) as Season[];
      const seasonToUpdate = updatedSeasonsList.find(s => s.id === activeSeasonId);
      if (!seasonToUpdate) return;

      for (const ep of seasonToUpdate.episodes || []) {
        const oldPath = ep.videoPath;
        if (!oldPath) continue;

        // Check if file actually exists
        const check = window.electronAPI && window.electronAPI.existsFile ? await window.electronAPI.existsFile(oldPath) : null;
        if (!check || !check.exists) {
          continue; // skip files that don't exist physically
        }

        // Get extension
        const extIdx = oldPath.lastIndexOf('.');
        const ext = extIdx !== -1 ? oldPath.substring(extIdx).toLowerCase() : '.mkv';

        // Extract folder path (directory including trailing slash)
        const lastSlash = Math.max(oldPath.lastIndexOf('\\'), oldPath.lastIndexOf('/'));
        const folder = oldPath.substring(0, lastSlash + 1);
        const originalFileName = oldPath.substring(lastSlash + 1);

        // Try to extract quality from original name (e.g., 1080, 720, 480)
        let qualitySuffix = '';
        const qualMatch = originalFileName.match(/(1080|720|480)/);
        if (qualMatch) {
          qualitySuffix = `-${qualMatch[1]}`;
        } else if (managingSeries.quality) {
          const sQualMatch = managingSeries.quality.match(/(1080|720|480)/);
          if (sQualMatch) {
            qualitySuffix = `-${sQualMatch[1]}`;
          }
        }

        const eStr = (ep.episodeNumber || 1).toString().padStart(2, '0');
        
        // Target name, e.g. Aban-S01E01-720.mp4
        const newFileName = `${cleanTitle}-S${sStr}E${eStr}${qualitySuffix}${ext}`;
        const newPath = folder + newFileName;

        if (oldPath.toLowerCase() !== newPath.toLowerCase()) {
          if (window.electronAPI && window.electronAPI.renameFile) {
            const renameRes = await window.electronAPI.renameFile(oldPath, newPath);
            if (renameRes && renameRes.success) {
              ep.videoPath = newPath;
              successRenames++;
            } else {
              failedRenames++;
              console.error(`Failed to rename physical file from ${oldPath} to ${newPath}:`, renameRes?.error);
            }
          }
        } else if (oldPath !== newPath) {
          // Case-only rename or direct path match
          if (window.electronAPI && window.electronAPI.renameFile) {
            const renameRes = await window.electronAPI.renameFile(oldPath, newPath);
            if (renameRes && renameRes.success) {
              ep.videoPath = newPath;
              successRenames++;
            }
          }
        }
      }

      if (successRenames > 0) {
        // Save database & refresh state
        dbService.updateSeries(managingSeries.id, { seasons: updatedSeasonsList });
        const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
        if (updated) setManagingSeries(updated);
        refreshData();
        showToast(`با موفقیت تعداد ${successRenames} فایل تغییر نام داده شد!`, 'success');
      } else {
        showToast('هیچ فایلی واجد شرایط تغییر نام یافت نشد یا تمام فایل‌ها از قبل نام استاندارد داشتند.', 'warning');
      }
    } catch (err: any) {
      console.error('Error auto renaming files:', err);
      showToast('بروز خطا در هنگام تغییر نام فایل‌ها: ' + err.message, 'error');
    }
  };

  const handleDeleteEpisode = (seasonId: string, epId: string) => {
    if (!managingSeries) return;
    if (window.confirm('آیا قصد حذف این قسمت را دارید؟')) {
      dbService.deleteEpisode(managingSeries.id, seasonId, epId);
      const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
      if (updated) setManagingSeries(updated);
      refreshData();
    }
  };

  // Helper: Retrieve the absolute latest added episode information
  const getLatestEpisodeInfo = (series: Series): string => {
    if (!series.seasons || series.seasons.length === 0) return 'بدون قسمت';
    
    // Scan all seasons and return the episode with the largest index or count
    const allEpisodes: { seasonName: string; ep: Episode }[] = [];
    series.seasons.forEach(season => {
      season.episodes.forEach(ep => {
        allEpisodes.push({ seasonName: season.name, ep });
      });
    });

    if (allEpisodes.length === 0) return 'فصل بدون قسمت';
    
    // Sort or return the last one in order
    const lastItem = allEpisodes[allEpisodes.length - 1];
    return `${lastItem.seasonName} - قسمت ${toPersianNums(lastItem.ep.episodeNumber)} (${lastItem.ep.name})`;
  };

  // 4. Advanced Sales overlay 💰
  const handleOpenSale = (series: Series, e: React.MouseEvent) => {
    e.stopPropagation();
    setSellingSeries(series);
    setSaleCustomerName(activeCustomer ? activeCustomer.name : '');
    setSaleOption('full');

    const settings = dbService.getSettings();
    const totalEpisodes = series.seasons.reduce((sum, s) => sum + s.episodes.length, 0);
    const computedFullPrice = totalEpisodes > 0 ? totalEpisodes * settings.defaultSeriesPrice : 10 * settings.defaultSeriesPrice;
    setCalculatedPrice(computedFullPrice);
    setSaleDiscount(0);

    // Pick first defaults if available
    if (series.seasons && series.seasons.length > 0) {
      setSelectedSaleSeason(series.seasons[0].id);
      setSelectedSaleEpisodes([]);
      if (series.seasons[0].episodes && series.seasons[0].episodes.length > 0) {
        setSelectedSaleEpisode(series.seasons[0].episodes[0].id);
      }
    }
  };

  // Recalculating slice prices dynamically based on user selections
  useEffect(() => {
    if (!sellingSeries) return;

    const settings = dbService.getSettings();
    if (saleOption === 'full') {
      const totalEpisodes = sellingSeries.seasons.reduce((sum, s) => sum + s.episodes.length, 0);
      const computed = totalEpisodes > 0 ? totalEpisodes * settings.defaultSeriesPrice : 10 * settings.defaultSeriesPrice;
      setCalculatedPrice(computed);
    } else if (saleOption === 'season') {
      const targetSeason = sellingSeries.seasons.find(s => s.id === selectedSaleSeason);
      const epCount = targetSeason?.episodes.length || 0;
      const computed = epCount > 0 ? epCount * settings.defaultSeriesPrice : 8 * settings.defaultSeriesPrice;
      setCalculatedPrice(computed);
    } else if (saleOption === 'episode') {
      setCalculatedPrice(settings.defaultSeriesPrice);
    } else if (saleOption === 'multi_episode') {
      const computed = (selectedSaleEpisodes?.length || 0) * settings.defaultSeriesPrice;
      setCalculatedPrice(computed);
    }
  }, [saleOption, selectedSaleSeason, selectedSaleEpisode, selectedSaleEpisodes, sellingSeries]);

  const handleRegisterSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingSeries) return;

    let invoiceDetails = 'فروش فیلم/سریال';
    let baseCost = sellingSeries.purchasePrice;
    let filePathToOpen = '';

    if (saleOption === 'full') {
      invoiceDetails = 'فروش کامل سریال';
      if (sellingSeries.seasons.length > 0 && sellingSeries.seasons[0].episodes.length > 0) {
        filePathToOpen = sellingSeries.seasons[0].episodes[0].videoPath || sellingSeries.seasons[0].episodes[0].filePath || '';
      }
    } else if (saleOption === 'season') {
      const targetSeason = sellingSeries.seasons.find(s => s.id === selectedSaleSeason);
      invoiceDetails = `فروش تک فصل (${targetSeason?.name || 'فصل منتخب'})`;
      // Cost division proportionately
      baseCost = Math.round(sellingSeries.purchasePrice / (sellingSeries.seasons.length || 1));
      if (targetSeason && targetSeason.episodes.length > 0) {
        filePathToOpen = targetSeason.episodes[0].videoPath || targetSeason.episodes[0].filePath || '';
      }
    } else if (saleOption === 'episode') {
      const targetSeason = sellingSeries.seasons.find(s => s.id === selectedSaleSeason);
      const targetEpisode = targetSeason?.episodes.find(ep => ep.id === selectedSaleEpisode);
      invoiceDetails = `فروش تک قسمت (${targetSeason?.name} - قسمت ${targetEpisode?.episodeNumber})`;
      // Total episode division cost
      const totalEp = sellingSeries.seasons.reduce((sum, s) => sum + s.episodes.length, 0) || 12;
      baseCost = Math.round(sellingSeries.purchasePrice / totalEp);
      if (targetEpisode) {
        filePathToOpen = targetEpisode.videoPath || targetEpisode.filePath || '';
      }
    } else if (saleOption === 'multi_episode') {
      const targetSeason = sellingSeries.seasons.find(s => s.id === selectedSaleSeason);
      const epCount = selectedSaleEpisodes.length;
      invoiceDetails = `فروش ${toPersianNums(epCount)} قسمت از ${targetSeason?.name || 'فصل منتخب'}`;
      // Total episode division cost
      const totalEp = sellingSeries.seasons.reduce((sum, s) => sum + s.episodes.length, 0) || 12;
      const singleEpCost = Math.round(sellingSeries.purchasePrice / totalEp);
      baseCost = singleEpCost * epCount;
      const firstEpId = selectedSaleEpisodes[0];
      const targetEpisode = targetSeason?.episodes.find(ep => ep.id === firstEpId);
      if (targetEpisode) {
        filePathToOpen = targetEpisode.videoPath || targetEpisode.filePath || '';
      }
    }

    if (onAddToCart) {
      let videoPaths: string[] = [];
      if (saleOption === 'full') {
        sellingSeries.seasons.forEach(s => {
          s.episodes.forEach(ep => {
            const p = ep.videoPath || ep.filePath || '';
            if (p) videoPaths.push(p);
          });
        });
      } else if (saleOption === 'season') {
        const targetSeason = sellingSeries.seasons.find(s => s.id === selectedSaleSeason);
        targetSeason?.episodes.forEach(ep => {
          const p = ep.videoPath || ep.filePath || '';
          if (p) videoPaths.push(p);
        });
      } else if (saleOption === 'episode') {
        const targetSeason = sellingSeries.seasons.find(s => s.id === selectedSaleSeason);
        const targetEpisode = targetSeason?.episodes.find(ep => ep.id === selectedSaleEpisode);
        const p = targetEpisode?.videoPath || targetEpisode?.filePath || '';
        if (p) videoPaths.push(p);
      } else if (saleOption === 'multi_episode') {
        const targetSeason = sellingSeries.seasons.find(s => s.id === selectedSaleSeason);
        targetSeason?.episodes.forEach(ep => {
          if (selectedSaleEpisodes.includes(ep.id)) {
            const p = ep.videoPath || ep.filePath || '';
            if (p) videoPaths.push(p);
          }
        });
      }

      onAddToCart({
        mediaId: sellingSeries.id,
        mediaTitle: sellingSeries.titleFa,
        mediaType: 'series',
        salesType: saleOption === 'full' ? 'series_full' : saleOption === 'season' ? 'series_season' : saleOption === 'episode' ? 'series_episode' : 'series_multi_episode',
        details: `${sellingSeries.titleFa} (${invoiceDetails})`,
        purchasePrice: baseCost,
        salePrice: Math.max((Number(calculatedPrice) || 0) - Number(saleDiscount || 0), 0),
        filePath: filePathToOpen,
        videoPaths: videoPaths
      });
      setSellingSeries(null);
      return;
    }

    dbService.addSale({
      customerName: 'مشتری صوتی و تصویری دفتری',
      mediaId: sellingSeries.id,
      mediaTitle: sellingSeries.titleFa,
      mediaType: 'series',
      salesType: saleOption === 'full' ? 'series_full' : saleOption === 'season' ? 'series_season' : saleOption === 'episode' ? 'series_episode' : 'series_multi_episode',
      details: invoiceDetails,
      purchasePrice: baseCost,
      salePrice: Number(calculatedPrice) || 0,
      discount: Number(saleDiscount) || 0
    });

    setSellingSeries(null);
    showToast('فاکتور فروش با موفقیت به سرور مالی افزوده و سود خالص آن ثبت شد.');
  };

  // Helper to convert Persian numerals to English numerals
  const toGregorianNumStr = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '';
    return str.toString()
      .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
  };

  // Filter List Logic
  const filteredSeries = seriesList.filter(item => {
    const seriesCats = item.category ? item.category.split(',').map(c => c.trim()) : [];
    const matchesCategory = selectedCategory === 'همه' || seriesCats.includes(selectedCategory);
    const matchesSearch = 
      item.titleFa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.actors.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry = !filterCountry || item.country.includes(filterCountry);
    const matchesLanguage = !filterLanguage || item.language.includes(filterLanguage);
    const matchesGenre = !filterGenre || (item.genres && item.genres.some(g => g.includes(filterGenre)));
    const matchesYear = !filterYear || toGregorianNumStr(item.year).includes(toGregorianNumStr(filterYear));
    const matchesQuality = !filterQuality || (item.quality && item.quality.toLowerCase().includes(filterQuality.toLowerCase()));
    
    const imdbVal = parseFloat(toGregorianNumStr(item.imdbRating)) || 0;
    const minImdbVal = parseFloat(toGregorianNumStr(filterMinImdb)) || 0;
    const matchesMinImdb = !filterMinImdb || imdbVal >= minImdbVal;
    
    const matchesCrew = !filterCrew || 
      item.director.toLowerCase().includes(filterCrew.toLowerCase()) ||
      item.actors.toLowerCase().includes(filterCrew.toLowerCase()) ||
      (item.writer && item.writer.toLowerCase().includes(filterCrew.toLowerCase()));

    // Advanced Column-Header Filters
    const matchesColTitleFa = !colFilters.titleFa || item.titleFa.toLowerCase().includes(colFilters.titleFa.toLowerCase());
    const matchesColTitleEn = !colFilters.titleEn || item.titleEn.toLowerCase().includes(colFilters.titleEn.toLowerCase());
    const matchesColQuality = !colFilters.quality || (item.quality || '').toLowerCase().includes(colFilters.quality.toLowerCase());
    const matchesColImdb = !colFilters.imdbRating || item.imdbRating.toLowerCase().includes(colFilters.imdbRating.toLowerCase());
    const matchesColYear = !colFilters.year || item.year.toLowerCase().includes(colFilters.year.toLowerCase());
    const matchesColCategory = !colFilters.category || (item.category || '').toLowerCase().includes(colFilters.category.toLowerCase());

    return matchesCategory && matchesSearch && matchesCountry && matchesLanguage && matchesGenre && matchesYear && matchesQuality && matchesMinImdb && matchesCrew &&
      matchesColTitleFa && matchesColTitleEn && matchesColQuality && matchesColImdb && matchesColYear && matchesColCategory;
  });

  // Sort
  const sortedSeries = [...filteredSeries].sort((a, b) => {
    let fieldA: any = a[sortBy];
    let fieldB: any = b[sortBy];

    if (sortBy === 'imdbRating') {
      fieldA = Number(a.imdbRating) || 0;
      fieldB = Number(b.imdbRating) || 0;
    }

    if (sortOrder === 'desc') {
      return fieldA > fieldB ? -1 : 1;
    } else {
      return fieldA < fieldB ? -1 : 1;
    }
  });

  // Paginated List
  const totalItems = sortedSeries.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedSeries = sortedSeries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Helper to extract unique genres present in seriesList
  const allAvailableGenres = Array.from(new Set(seriesList.flatMap(s => s.genres || [])));

  return (
    <div className="space-y-6" id="series-tab-content">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-150 dark:border-gray-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100" id="series-title">مدیریت سریال‌ها</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">مدیریت فصول، قسمت‌ها و همچنین سیستم فروش مستقل هر سریال یا فصول مستقل آن</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleScanFolder}
            className="flex items-center justify-center gap-1.5 px-4 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/10 transition-all cursor-pointer"
            id="btn-scan-folder"
          >
            <FolderOpen className="w-4 h-4" />
            <span>اسکن پوشه</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-1.5 px-4 h-10 bg-[#38bdf8] hover:bg-sky-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-sky-400/10 transition-all cursor-pointer"
            id="btn-add-series"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>افزودن سریال جدید</span>
          </button>
        </div>
      </div>

      {/* Categories Tabs Selector and View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-150 dark:border-gray-800 pb-2" id="series-category-selector-wrapper">
        <div className="flex items-center overflow-x-auto gap-2 pb-1 scrollbar-none" id="series-category-selector">
          <button
            onClick={() => { setSelectedCategory('همه'); setCurrentPage(1); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'همه' 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-950' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-150 dark:bg-[#1e293b] dark:text-gray-300 dark:border-gray-800 dark:hover:bg-slate-800'
            }`}
            id="series-cat-all"
          >
            همه سریال‌ها ({toPersianNums(seriesList.length)})
          </button>
          {CATEGORIES.map(cat => {
            const count = seriesList.filter(s => s.category && s.category.split(',').map(c => c.trim()).includes(cat)).length;
            return (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-sky-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-150 dark:bg-[#1e293b] dark:text-gray-300 dark:border-gray-800 dark:hover:bg-slate-800'
                }`}
                id={`series-cat-${cat}`}
              >
                {cat} ({toPersianNums(count)})
              </button>
            );
          })}
        </div>

        {/* Beautiful Segmented Toggle for Card vs Advanced List View */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 border border-gray-200 dark:border-slate-700/50 self-end sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'card' 
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title="نمای کارتی"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>نمای کارتی</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list' 
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title="نمای لیستی پیشرفته با فیلتر سرستون"
          >
            <List className="w-3.5 h-3.5" />
            <span>نمای لیستی پیشرفته</span>
          </button>
        </div>
      </div>

      {/* Search and Sort Filter toolbar */}
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3" id="series-filters-row">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search text */}
          <div className="flex-1 relative flex items-center">
            <Search className="absolute right-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در نام سریال، بازیگران، کارگردان..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pr-10 pl-4 h-10 bg-gray-50 dark:bg-slate-800/60 rounded-lg text-xs font-medium border border-gray-150 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-sky-500 animate-fadeIn"
              id="series-search-input"
            />
          </div>

          {/* Filters panel trigger */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 h-10 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              showFilters 
                ? 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-300' 
                : 'bg-white text-gray-600 dark:bg-[#1e293b] dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200'
            }`}
            id="btn-series-filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>فیلترهای پیشرفته</span>
          </button>
        </div>

        {/* Filters dropdown parameters */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800 animate-fadeIn" id="series-advanced-filters">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {/* Country search */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">کشور سازنده</label>
                <input
                  type="text"
                  placeholder="کره جنوبی، ایران، آمریکا..."
                  value={filterCountry}
                  onChange={(e) => { setFilterCountry(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2.5 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-450"
                />
              </div>

              {/* Language filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">زبان سریال</label>
                <select
                  value={filterLanguage}
                  onChange={(e) => { setFilterLanguage(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  id="filter-language-series"
                >
                  <option value="">همه زبان‌ها</option>
                  <option value="دوبله فارسی">دوبله فارسی</option>
                  <option value="زبان اصلی">زبان اصلی</option>
                  <option value="دوزبانه (دوبله و زبان اصلی)">دوزبانه (دوبله و زبان اصلی)</option>
                </select>
              </div>

              {/* Genre filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">ژانر</label>
                <select
                  value={filterGenre}
                  onChange={(e) => { setFilterGenre(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-205 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">همه ژانرها</option>
                  {allAvailableGenres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Year filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">سال انتشار</label>
                <input
                  type="text"
                  placeholder="۱۴۰۳ یا ۲۰۲۴"
                  value={filterYear}
                  onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2.5 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-450"
                />
              </div>

              {/* Quality selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">کیفیت فیلم</label>
                <select
                  value={filterQuality}
                  onChange={(e) => { setFilterQuality(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">همه کیفیت‌ها</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="4K">4K UHD</option>
                  <option value="BluRay">BluRay</option>
                  <option value="Web-DL">Web-DL</option>
                </select>
              </div>

              {/* IMDb filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">امتیاز بندی IMDb</label>
                <select
                  value={filterMinImdb}
                  onChange={(e) => { setFilterMinImdb(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">همه امتیازها</option>
                  <option value="5">۵ و بالاتر</option>
                  <option value="6">۶ و بالاتر</option>
                  <option value="7">۷ و بالاتر</option>
                  <option value="8">۸ و بالاتر</option>
                  <option value="9">۹ و بالاتر</option>
                </select>
              </div>

              {/* Specific Crew search */}
              <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1">
                <label className="text-[10px] font-bold text-gray-500 block">عوامل (کارگردان/بازیگر)</label>
                <input
                  type="text"
                  placeholder="جستجوی همکاران..."
                  value={filterCrew}
                  onChange={(e) => { setFilterCrew(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2.5 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-450"
                />
              </div>

              {/* Sorting and Reset Controls */}
              <div className="flex gap-1.5 pt-4 lg:pt-0 col-span-2 md:col-span-4 lg:col-span-1 items-end justify-between font-sans">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">ترتیب بر اساس</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="addedAt">تاریخ ثبت</option>
                    <option value="year">سال انتشار</option>
                    <option value="imdbRating">رتبه IMDB</option>
                    <option value="titleFa">نام فارسی</option>
                  </select>
                </div>

                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="h-8 w-8 flex items-center justify-center bg-gray-100 hover:bg-gray-150 dark:bg-[#1e293b] hover:dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-750 cursor-pointer text-xs font-semibold shrink-0"
                  title={sortOrder === 'desc' ? 'نزولی' : 'صعودی'}
                >
                  {sortOrder === 'desc' ? '▼' : '▲'}
                </button>
              </div>
            </div>

            {/* Clear filters trigger row */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setFilterCountry('');
                  setFilterLanguage('');
                  setFilterGenre('');
                  setFilterYear('');
                  setFilterQuality('');
                  setFilterMinImdb('');
                  setFilterCrew('');
                  setSortBy('addedAt');
                  setSortOrder('desc');
                  setSearchQuery('');
                  setSelectedCategory('همه');
                  setCurrentPage(1);
                }}
                className="px-3.5 py-1 text-[10px] font-extrabold text-red-650 hover:text-red-750 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/45 rounded transition-colors cursor-pointer"
              >
                پاکسازی تمامی فیلترها ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Series Grid items */}
      {paginatedSeries.length === 0 ? (
        <div className="bg-white dark:bg-[#1e293b] p-12 text-center rounded-xl border border-gray-150 dark:border-gray-800 shadow-sm" id="empty-series">
          <Tv className="w-10 h-10 text-gray-350 mx-auto mb-3 animate-pulse" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">سریالی سازگار با کوئری شما وجود ندارد!</h3>
          <p className="text-xs text-gray-400 mt-1">امکان تعریف سریال با کلیک روی افزودن سریال جدید بالا سمت چپ برقرار است.</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="series-grid">
          {paginatedSeries.map(series => {
            const seasonsCount = series.seasons.length;
            const episodesCount = series.seasons.reduce((sum, s) => sum + s.episodes.length, 0);
            
            return (
              <div
                key={series.id}
                onClick={() => {
                  setDetailSeries(series);
                }}
                className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-150 dark:border-[#1e293b] hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden relative shadow-sm cursor-pointer hover:border-sky-500/20"
                id={`series-card-${series.id}`}
              >
                {/* Visual Cover Header */}
                <div className="flex gap-4 p-4">
                  {/* Poster image thumbnail */}
                  <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden shrink-0 relative shadow group">
                    <img 
                      src={getSafePosterUrl(series.poster)} 
                      alt={series.titleFa}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-1 right-1 bg-black/60 text-amber-500 font-mono text-[9px] px-1 py-0.5 rounded font-bold">
                      ★ {toPersianNums(series.imdbRating)}
                    </span>
                  </div>

                  {/* Core metadata details */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex flex-wrap gap-1">
                          {series.isEnded && (
                            <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-1.5 py-0.5 rounded font-bold shrink-0 animate-pulse border border-red-200 dark:border-red-900/30">
                              🎬 {series.isEndedText || 'پایان یافته'}
                            </span>
                          )}
                          {(series.category || 'متفرقه').split(',').map(cat => (
                            <span key={cat} className="text-[9px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 px-1.5 py-0.5 rounded font-bold shrink-0">
                              {cat.trim()}
                            </span>
                          ))}
                        </div>
                        <span className="text-[9px] bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400 px-1.5 py-0.5 rounded font-bold truncate">
                          {series.quality}
                        </span>
                      </div>
                      
                      <h3 className="text-xs font-bold text-gray-950 dark:text-gray-100 truncate mt-1.5" title={series.titleFa}>
                        {series.titleFa}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{series.titleEn}</p>
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-500 mt-1">
                      <p className="truncate">کارگردان: <strong className="text-gray-700 dark:text-gray-300">{series.director || 'نامشخص'}</strong></p>
                      
                      {/* Detailed Episode Tracking numbers */}
                      <div className="text-[10px] bg-gray-50/80 dark:bg-slate-800/40 p-1.5 rounded-lg border border-gray-100 dark:border-slate-800/60 flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <span>کل قسمت‌ها:</span>
                          <strong className="text-gray-700 dark:text-gray-300 font-bold">{series.totalEpisodes ? toPersianNums(series.totalEpisodes) : toPersianNums(episodesCount)}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>آرشیو شما:</span>
                          <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{toPersianNums(series.myEpisodesCount || 0)} قسمت</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>پخش شده تا الان:</span>
                          <strong className="text-amber-600 dark:text-amber-400 font-bold">{toPersianNums(series.releasedEpisodesCount || 0)} قسمت</strong>
                        </div>
                      </div>

                      {/* Interactive Seasons and episode counts */}
                      <div className="flex items-center gap-2.5 text-sky-600 dark:text-sky-400 font-bold mt-1 text-[10px]">
                        <span>{toPersianNums(seasonsCount)} فصل ثبت شده</span>
                        <span>•</span>
                        <span>{toPersianNums(episodesCount)} فایل ویدئویی</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirements: Show the latest added episode in main card */}
                <div className="px-4 py-2 bg-sky-50/50 dark:bg-slate-900 border-t border-b border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px]" id={`series-latest-ep-${series.id}`}>
                  <span className="text-gray-400">آخرین قسمت:</span>
                  <strong className="text-sky-600 dark:text-sky-400 font-medium truncate max-w-[190px] mr-2">
                    {toPersianNums(getLatestEpisodeInfo(series))}
                  </strong>
                </div>

                {/* Dynamic detailed visual fields & Bottom operating bar */}
                <div className="p-4 bg-gray-50 dark:bg-[#1a2236]/30 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between" id={`series-footer-${series.id}`}>
                  {/* Price info button */}
                  <div>
                    <span className="text-[10px] text-gray-400 block pb-0.5">قیمت کل پکیج</span>
                    <strong className="text-xs font-bold text-emerald-600">{formatCurrency(series.salePrice)}</strong>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {/* Sell dialog trigger */}
                    <button
                      onClick={(e) => handleOpenSale(series, e)}
                      className="flex items-center gap-1.5 h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold cursor-pointer"
                      title="ثبت فروش (یا تک فصل)"
                      id={`btn-series-sell-${series.id}`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>فروش</span>
                    </button>

                    {/* Manage Nesting 📋 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingSeries(series);
                        if (series.seasons && series.seasons.length > 0) {
                          setActiveSeasonId(series.seasons[0].id);
                        } else {
                          setActiveSeasonId(null);
                        }
                      }}
                      className="flex items-center gap-1 h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold cursor-pointer"
                      title="مدیریت قسمت‌ها و فصول"
                      id={`btn-series-manage-${series.id}`}
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>قسمت‌ها</span>
                    </button>

                    {/* Basic CRUD operations icons */}
                    {series.officialSite && (
                      <a
                        href={series.officialSite}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-gray-400 hover:text-amber-500 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                        title="مشاهده سایت مرجع / IMDb"
                        id={`btn-series-site-${series.id}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => handleOpenEdit(series, e)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      title="ویرایش سریال"
                      id={`btn-series-edit-${series.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSeries(series.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-650 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      title="حذف سریال"
                      id={`btn-series-delete-${series.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-slate-800 rounded-xl shadow-sm" id="series-list-table-container">
          <table className="w-full text-right border-collapse text-xs" dir="rtl">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#141d2e] border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-bold">
                <th className="p-3 w-16 text-center">پوستر</th>
                
                <th className="p-3 min-w-[150px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('titleFa'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-[#38bdf8] transition-colors cursor-pointer"
                    >
                      <span>عنوان فارسی</span>
                      {sortBy === 'titleFa' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.titleFa}
                      onChange={(e) => setColFilters(prev => ({ ...prev, titleFa: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[150px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('titleEn' as any); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-[#38bdf8] transition-colors cursor-pointer"
                    >
                      <span>عنوان انگلیسی</span>
                      {sortBy === ('titleEn' as any) && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.titleEn}
                      onChange={(e) => setColFilters(prev => ({ ...prev, titleEn: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[100px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('quality' as any); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-[#38bdf8] transition-colors cursor-pointer"
                    >
                      <span>کیفیت</span>
                      {sortBy === ('quality' as any) && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.quality}
                      onChange={(e) => setColFilters(prev => ({ ...prev, quality: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[80px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('imdbRating'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-[#38bdf8] transition-colors cursor-pointer"
                    >
                      <span>امتیاز IMDb</span>
                      {sortBy === 'imdbRating' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.imdbRating}
                      onChange={(e) => setColFilters(prev => ({ ...prev, imdbRating: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[80px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('year'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-[#38bdf8] transition-colors cursor-pointer"
                    >
                      <span>سال ساخت</span>
                      {sortBy === 'year' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.year}
                      onChange={(e) => setColFilters(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[100px]">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700 dark:text-gray-300">دسته‌بندی</span>
                    <input
                      type="text"
                      value={colFilters.category}
                      onChange={(e) => setColFilters(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[120px] font-bold text-gray-700 dark:text-gray-300">آخرین قسمت</th>
                <th className="p-3 min-w-[100px] font-bold text-gray-700 dark:text-gray-300 font-bold text-indigo-600 dark:text-indigo-400">آرشیو شما</th>
                <th className="p-3 min-w-[110px] font-bold text-gray-700 dark:text-gray-300 font-bold text-emerald-600">قیمت پکیج</th>
                <th className="p-3 min-w-[100px] font-bold text-gray-700 dark:text-gray-300 text-center">وضعیت اتمام</th>
                <th className="p-3 w-[180px] text-center font-bold text-gray-700 dark:text-gray-300">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSeries.map((series) => {
                const seasonsCount = series.seasons.length;
                const episodesCount = series.seasons.reduce((sum, s) => sum + s.episodes.length, 0);
                return (
                  <tr 
                    key={series.id} 
                    onClick={() => setDetailSeries(series)}
                    className="border-b border-gray-100 dark:border-slate-800/60 hover:bg-slate-50/55 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-2 text-center">
                      <div className="w-10 h-14 rounded overflow-hidden mx-auto shadow-sm">
                        <img 
                          src={getSafePosterUrl(series.poster)} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </td>
                    <td className="p-3 font-bold text-gray-900 dark:text-gray-100">{series.titleFa}</td>
                    <td className="p-3 text-gray-500 font-mono text-[11px]">{series.titleEn}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                        {series.quality}
                      </span>
                    </td>
                    <td className="p-3 text-amber-500 font-mono font-bold">★ {toPersianNums(series.imdbRating)}</td>
                    <td className="p-3 font-mono text-gray-600 dark:text-gray-400">{toPersianNums(series.year)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(series.category || 'متفرقه').split(',').map(cat => (
                          <span key={cat} className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {cat.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-sky-600 dark:text-sky-400 truncate max-w-[150px]">
                      {toPersianNums(getLatestEpisodeInfo(series))}
                    </td>
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {toPersianNums(series.myEpisodesCount || 0)} قسمت
                    </td>
                    <td className="p-3 text-emerald-600 font-bold font-mono">
                      {formatCurrency(series.salePrice)}
                    </td>
                    <td className="p-3 text-center">
                      {series.isEnded ? (
                        <span className="bg-red-550 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                          اتمام سریال
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">در حال پخش</span>
                      )}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => handleOpenSale(series, e)}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                          title="ثبت فروش"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setManagingSeries(series);
                            if (series.seasons && series.seasons.length > 0) {
                              setActiveSeasonId(series.seasons[0].id);
                            } else {
                              setActiveSeasonId(null);
                            }
                          }}
                          className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                          title="مدیریت قسمت‌ها و فصول"
                        >
                          <ListOrdered className="w-3.5 h-3.5" />
                        </button>
                        {series.officialSite && (
                          <a
                            href={series.officialSite}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors flex items-center justify-center"
                            title="سایت مرجع"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={(e) => handleOpenEdit(series, e)}
                          className="p-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded transition-colors"
                          title="ویرایش"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSeries(series.id, e)}
                          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination indicators footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4" id="series-pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 border border-gray-150 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            id="series-page-prev"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <span className="text-xs font-semibold text-gray-650">
            صفحه {toPersianNums(currentPage)} از {toPersianNums(totalPages)}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 border border-gray-150 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            id="series-page-next"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* ADD/EDIT SERIES MAIN MODAL */}
      {showFormModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" 
          id="series-form-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFormModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-scaleIn">
            {/* Header */}
            <div className="px-5 py-4 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-805 dark:text-gray-100">
                {editingSeries ? `ویرایش سریال: ${editingSeries.titleFa}` : 'تعریف سریال یا مجموعه تلویزیونی جدید'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSeries} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto" id="series-catalog-form">
              {/* قالب ورود سریع اطلاعات با JSON */}
              <div className="p-4 bg-sky-50/40 dark:bg-slate-900/60 border border-sky-100 dark:border-sky-950 rounded-xl space-y-3 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block">ورود سریع اطلاعات سریال با قالب JSON</span>
                  <button
                    type="button"
                    onClick={loadExampleJson}
                    className="text-[9px] text-sky-500 hover:text-sky-600 dark:text-sky-400 font-bold underline cursor-pointer"
                  >
                    بارگذاری نمونه قالب JSON
                  </button>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full h-20 p-2 bg-white dark:bg-slate-950 rounded-lg text-[10px] font-mono border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-sky-500 resize-y"
                    placeholder='کد JSON اطلاعات سریال را در اینجا قرار داده و دکمه "اعمال اطلاعات JSON" را بزنید...'
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleImportJson}
                      className="h-8 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm shadow-sky-500/10"
                    >
                      اعمال اطلاعات JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* بخش جستجوی هوشمند TMDb */}
              <div className="p-4 bg-[#f8fafc] dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl space-y-3 mb-2">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">دریافت خودکار و هوشمند اطلاعات سریال از سایت TMDb</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  می‌توانید نام سریال را جستجو کنید تا اطلاعات و تصاویر آن به‌طور خودکار پر شوند. اگر سریال پیدا نشد، لینک یا شناسه عددی آن را از سایت <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">themoviedb.org</a> وارد کنید.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Search Query */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 block">جستجوی نام سریال (فارسی یا انگلیسی)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={tmdbSearchQuery}
                        onChange={(e) => setTmdbSearchQuery(e.target.value)}
                        className="flex-1 h-8 px-2.5 bg-white dark:bg-slate-950 rounded-lg text-xs border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-sky-500"
                        placeholder="مثال: شهرزاد یا Shahrzad"
                      />
                      <button
                        type="button"
                        onClick={handleSearchTmdb}
                        disabled={isSearchingTmdb}
                        className="h-8 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
                      >
                        {isSearchingTmdb ? '...' : 'جستجو'}
                        <Search className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Direct Link or ID */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 block">شناسه یا لینک مستقیم TMDb (برای یافتن مستقیم)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={tmdbSearchId}
                        onChange={(e) => setTmdbSearchId(e.target.value)}
                        className="flex-1 h-8 px-2.5 bg-white dark:bg-slate-950 rounded-lg text-xs border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-sky-500"
                        placeholder="مثال: https://www.themoviedb.org/tv/67890 یا 67890"
                      />
                      <button
                        type="button"
                        onClick={handleFetchTmdbByIdOrUrl}
                        disabled={isSearchingTmdb}
                        className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
                      >
                        {isSearchingTmdb ? '...' : 'دریافت'}
                        <Globe className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* نتایج جستجو */}
                {tmdbResults.length > 0 && (
                  <div className="pt-2 border-t border-gray-150 dark:border-slate-800/60 space-y-2">
                    <span className="text-[9px] font-bold text-gray-500 block">نتایج یافت شده (یکی را انتخاب کنید):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {tmdbResults.map((res: any) => {
                        const year = res.first_air_date ? res.first_air_date.substring(0, 4) : '';
                        const title = res.name || res.original_name;
                        const poster = res.poster_path ? `https://image.tmdb.org/t/p/w185${res.poster_path}` : '';
                        
                        return (
                          <div 
                            key={res.id}
                            className="p-1.5 bg-white dark:bg-slate-950 border border-gray-150 dark:border-slate-800 rounded-lg flex gap-2 items-center hover:border-sky-500 dark:hover:border-sky-500 transition-all text-right"
                          >
                            {poster ? (
                              <img src={poster} className="w-8 h-12 object-cover rounded shadow-sm" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-12 bg-gray-150 dark:bg-slate-850 rounded flex items-center justify-center"><Film className="w-4 h-4 text-gray-400" /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[10px] font-bold text-gray-800 dark:text-gray-200 truncate leading-snug">{title}</h4>
                              <span className="text-[9px] text-gray-400 font-mono block mt-0.5">{year ? toPersianNums(year) : ''}</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                setIsSearchingTmdb(true);
                                try {
                                  const metadata = await TMDbService.fetchMetadata(res.id, 'tv');
                                  if (metadata) {
                                    await populateFormWithTmdb(metadata);
                                    setTmdbResults([]);
                                  }
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setIsSearchingTmdb(false);
                                }
                              }}
                              className="h-6 px-2 bg-sky-50 hover:bg-sky-100 text-sky-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-sky-400 rounded-md text-[9px] font-bold cursor-pointer transition-all shrink-0"
                            >
                              انتخاب
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fa title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">نام فارسی سریال *</label>
                  <input
                    type="text"
                    required
                    value={formTitleFa}
                    onChange={(e) => setFormTitleFa(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500"
                    placeholder="مثال: بازی مرکب"
                  />
                </div>

                {/* En title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">نام انگلیسی سریال *</label>
                  <input
                    type="text"
                    required
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500"
                    placeholder="Squid Game"
                  />
                </div>

                 {/* Category */}
                <div className="space-y-1.5 bg-gray-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800 md:col-span-1">
                  <label className="text-[10px] font-black text-gray-400 block mb-1">دسته‌بندی‌های سریال * (امکان انتخاب همزمان چند دسته)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => {
                      const currentCats = formCategory ? formCategory.split(',').map(x => x.trim()) : [];
                      const isChecked = currentCats.includes(c);
                      return (
                        <label key={c} className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-750 rounded-lg cursor-pointer hover:border-sky-500 hover:bg-sky-50/10 transition-colors select-none text-[10.5px] font-bold text-gray-700 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let updatedCats;
                              if (e.target.checked) {
                                updatedCats = [...currentCats.filter(x => x !== c), c];
                              } else {
                                updatedCats = currentCats.filter(x => x !== c);
                              }
                              setFormCategory(updatedCats.join(', '));
                            }}
                            className="w-3.5 h-3.5 text-sky-600 rounded border-gray-300 dark:border-gray-700 focus:ring-sky-500 cursor-pointer"
                          />
                          <span>{c}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Release year */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">سال پخش</label>
                  <input
                    type="text"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Director */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">کارگردان</label>
                  <input
                    type="text"
                    value={formDirector}
                    onChange={(e) => setFormDirector(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Duration of an episode */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">مدت میانگین هر قسمت</label>
                  <input
                    type="text"
                    value={formEpisodeDuration}
                    onChange={(e) => setFormEpisodeDuration(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-sky-500"
                    placeholder="مثال: ۵۰ دقیقه"
                  />
                </div>

                {/* Actors */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 block">بازیگران اصلی (تفکیک با ویرگول)</label>
                  <input
                    type="text"
                    value={formActors}
                    onChange={(e) => setFormActors(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-gray-205 focus:outline-none focus:border-sky-500"
                    placeholder="لی جونگ جه، پارک هه سو..."
                  />
                </div>

                {/* IMDb score */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">امتیاز IMDB</label>
                  <input
                    type="text"
                    value={formImdbRating}
                    onChange={(e) => setFormImdbRating(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-gray-205 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Country */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">کشور سازنده</label>
                  <select
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ایران">ایران</option>
                    <option value="آمریکا">آمریکا</option>
                    <option value="کره جنوبی">کره جنوبی</option>
                    <option value="هند">هند</option>
                    <option value="فرانسه">فرانسه</option>
                    <option value="انگلستان">انگلستان</option>
                    <option value="ژاپن">ژاپن</option>
                    <option value="ایتالیا">ایتالیا</option>
                    <option value="متفرقه">متفرقه / سایر</option>
                  </select>
                </div>

                {/* Language */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">زبان سریال</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
                  >
                    <option value="دوبله فارسی">دوبله فارسی</option>
                    <option value="زبان اصلی">زبان اصلی</option>
                    <option value="دوزبانه (دوبله و زبان اصلی)">دوزبانه (دوبله و زبان اصلی)</option>
                  </select>
                </div>

                {/* Quality */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">کیفیت پیش‌فرض</label>
                  <select
                    value={formQuality}
                    onChange={(e) => setFormQuality(e.target.value)}
                    className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 cursor-pointer text-gray-800 dark:text-gray-200"
                  >
                    {[
                      '4K BluRay',
                      '4K HDR',
                      '4K Web-DL',
                      '1440p (2K)',
                      '1080p BluRay',
                      '1080p Web-DL',
                      '1080p x265',
                      '720p HD',
                      '720p x265',
                      '576p',
                      '480p SD',
                      '360p',
                      '240p'
                    ].map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>

               {/* Genres Multi-Select */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-gray-400 block">ژانرهای سریال (چند گزینه‌ای)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 h-[115px] overflow-y-auto">
                  {POPULAR_GENRES.map((g) => {
                    const isChecked = formGenres.includes(g);
                    return (
                      <label key={g} className="flex items-center gap-1.5 p-1 hover:bg-sky-50 dark:hover:bg-sky-950/20 rounded cursor-pointer select-none text-[10.5px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setFormGenres(formGenres.filter(item => item !== g));
                            } else {
                              setFormGenres([...formGenres, g]);
                            }
                          }}
                          className="w-3.5 h-3.5 accent-sky-600 text-sky-600 rounded cursor-pointer"
                        />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{g}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Poster configuration */}
              <div className="space-y-1.5 pt-1" id="series-poster-field-group">
                <label className="text-[10px] font-bold text-sky-550 dark:text-sky-400 block">پوستر سریال (بارگذاری عکس یا آدرس وب)</label>
                <div className="flex gap-3 items-start">
                  {formPoster && (
                    <div className="w-14 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shrink-0 shadow-sm relative group">
                      <img 
                        src={formPoster} 
                        alt="پوستر" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400";
                        }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        required
                        value={formPoster}
                        onChange={(e) => setFormPoster(e.target.value)}
                        className="flex-1 h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-sky-500"
                        placeholder="پیش‌نمایش تصویر..."
                      />
                      <button
                        type="button"
                        onClick={handlePickPoster}
                        className="h-9 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                        id="btn-pick-poster-series"
                      >
                        انتخاب تصویر...
                      </button>
                      {formPoster && formPoster.startsWith('http') && formFilePath && (
                        <button
                          type="button"
                          onClick={handleSavePosterLocally}
                          className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                          title="دانلود و ذخیره عکس پوستر فیزیکی در پوشه سریال"
                        >
                          ذخیره در پوشه سریال
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400">تصویر پوستر به طور خودکار در تمامی بخش‌های برنامه با نسبت تصویر استاندارد کلاسیک ۲:۳ (پرتره کامل) همسان‌سازی شده و پوشش داده می‌شود.</p>
                  </div>
                </div>
              </div>

              {/* Series folder path directory */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">مسیر پوشه اصلی این سریال روی سیستم *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formFilePath}
                    onChange={(e) => setFormFilePath(e.target.value)}
                    className="flex-1 h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-sky-500 font-mono text-left"
                    dir="ltr"
                    placeholder="D:\Media\Series\Shahrzad"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.electronAPI) {
                        window.electronAPI.selectDirectory().then((dir) => {
                          if (dir) {
                            setFormFilePath(dir);
                            if (!formTitleFa.trim() && !formTitleEn.trim()) {
                              triggerAutoTmdbSearchFromFolder(dir);
                            } else {
                              showToast('مسیر پوشه ثبت شد بدون تغییر اطلاعات از قبل دریافت شده سریال.', 'info');
                            }
                          }
                        }).catch(err => console.error(err));
                      } else {
                        const input = window.prompt('(شبیه‌ساز آنلاین) مسیر پوشه سریال را وارد کنید:', formFilePath || 'D:\\Media\\Series\\Shahrzad');
                        if (input !== null) {
                          setFormFilePath(input);
                        }
                      }
                    }}
                    className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 animate-scaleIn"
                  >
                    جستجو...
                  </button>
                </div>
                <p className="text-[9px] text-gray-400">تمام فصل‌ها و قسمت‌ها بر اساس این پوشه به صورت پیش‌فرض و مرتب نام‌گذاری و آدرس‌دهی می‌شوند.</p>
              </div>

              {/* Reference link input for series */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-gray-500 block">لینک یا آدرس سایت مرجع (IMDb، فیلیمو، فیلم‌نت و...)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formOfficialSite}
                    onChange={(e) => setFormOfficialSite(e.target.value)}
                    className="w-full h-9 pl-4 pr-9 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-500"
                    placeholder="https://www.imdb.com/title/..."
                    id="input-officialsite-series"
                  />
                  <ExternalLink className="absolute right-3 top-2.5 w-4 h-4 text-sky-500" />
                </div>
              </div>

              {/* Screenshots input for series */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-gray-500 block">گالری اسکرین‌شات‌ها / تصاویر فرعی صحنه</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formGallery}
                      onChange={(e) => setFormGallery(e.target.value)}
                      className="w-full h-9 pl-4 pr-9 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-500"
                      placeholder="https://image1.jpg, https://image2.jpg..."
                      id="input-gallery-series"
                    />
                    <Sparkles className="absolute right-3 top-2.5 w-4 h-4 text-amber-500" />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.electronAPI) {
                        try {
                          const path = await window.electronAPI.selectPoster();
                          if (path) {
                            setFormGallery(prev => prev ? `${prev}, ${path}` : path);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      } else {
                        const input = window.prompt('(شبیه‌ساز آنلاین) آدرس یا مسیر محلی تصویر جدید اسکرین‌شات را وارد کنید:');
                        if (input) {
                          setFormGallery(prev => prev ? `${prev}, ${input}` : input);
                        }
                      }
                    }}
                    className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 animate-scaleIn"
                  >
                    <span>افزودن تصویر...</span>
                  </button>
                </div>
              </div>

              {/* Weekly Airing / Broadcast Schedule */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 block">روز پخش هفتگی (شمارش معکوس)</label>
                  <select
                    value={formReleaseDay}
                    onChange={(e) => setFormReleaseDay(e.target.value)}
                    className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
                  >
                    <option value="">بدون زمان‌بندی (پخش کامل بروزر)</option>
                    <option value="شنبه">شنبه</option>
                    <option value="یکشنبه">یکشنبه</option>
                    <option value="دوشنبه">دوشنبه</option>
                    <option value="سه‌شنبه">سه‌شنبه</option>
                    <option value="چهارشنبه">چهارشنبه</option>
                    <option value="پنجشنبه">پنجشنبه</option>
                    <option value="جمعه">جمعه</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 block">ساعت پخش هفتگی</label>
                  <input
                    type="time"
                    value={formReleaseTime}
                    onChange={(e) => setFormReleaseTime(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono text-left border border-gray-200 dark:border-gray-700 text-gray-750 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Episode Tracking & Ended Status Section */}
              <div className="bg-gray-100/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-4 font-sans" id="episode-tracking-section">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 block border-b border-gray-200/50 dark:border-slate-800/80 pb-2">📊 جزئیات قسمت‌ها و وضعیت پخش سریال</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 block">تعداد کل قسمت‌ها</label>
                    <input
                      type="number"
                      min="0"
                      value={formTotalEpisodes}
                      onChange={(e) => setFormTotalEpisodes(Number(e.target.value) || 0)}
                      className="w-full h-9 px-3 bg-white dark:bg-slate-800 rounded-lg text-xs font-mono text-center border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 block">موجود در هارد شما</label>
                    <input
                      type="number"
                      min="0"
                      value={formMyEpisodesCount}
                      onChange={(e) => setFormMyEpisodesCount(Number(e.target.value) || 0)}
                      className="w-full h-9 px-3 bg-white dark:bg-slate-800 rounded-lg text-xs font-mono text-center border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 block">پخش شده تا کنون</label>
                    <input
                      type="number"
                      min="0"
                      value={formReleasedEpisodesCount}
                      onChange={(e) => setFormReleasedEpisodesCount(Number(e.target.value) || 0)}
                      className="w-full h-9 px-3 bg-white dark:bg-slate-800 rounded-lg text-xs font-mono text-center border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      id="checkbox-is-ended"
                      checked={formIsEnded}
                      onChange={(e) => setFormIsEnded(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="checkbox-is-ended" className="text-xs font-black text-gray-700 dark:text-gray-300 cursor-pointer">
                      پایان سریال / پایان فصل 🎬
                    </label>
                  </div>
                  
                  {formIsEnded && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="text-[10px] font-bold text-gray-500 block">عنوان مهر پایان (نمایشی روی پوستر)</label>
                      <input
                        type="text"
                        value={formIsEndedText}
                        onChange={(e) => setFormIsEndedText(e.target.value)}
                        placeholder="مثلا: پایان سریال یا پایان فصل ۱"
                        className="w-full h-9 px-3 bg-white dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1 font-sans">
                <label className="text-[10px] font-bold text-gray-400 block">خلاصه داستان مجموعه</label>
                <textarea
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full h-16 py-2 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-150 dark:border-gray-800 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  ثبت اطلاعات سریال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DETAIL OVERLAY MODAL FOR SERIES */}
      {detailSeries && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto font-sans" 
          id="series-detail-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailSeries(null);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row relative">
            
            {/* Close button */}
            <button 
              onClick={() => setDetailSeries(null)}
              className="absolute top-3 left-3 z-[31] p-1.5 bg-black/40 text-white hover:bg-black/60 rounded-full transition-colors cursor-pointer"
              id="close-series-detail-modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Poster column */}
            <div className="w-full md:w-2/5 h-64 md:h-auto bg-gray-950 relative overflow-hidden shrink-0">
              <img 
                src={getSafePosterUrl(detailSeries.poster)} 
                alt={detailSeries.titleFa} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-transparent to-black/40"></div>
              <button
                onClick={() => setZoomedPoster(getSafePosterUrl(detailSeries.poster))}
                className="absolute bottom-3 right-3 p-2 bg-black/50 text-white rounded-lg hover:bg-black/75 transition-colors text-xs flex items-center gap-1.5 font-bold cursor-pointer"
                id="btn-zoom-series-detail-poster"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>بزرگنمایی</span>
              </button>
            </div>

            {/* Meta column */}
            <div className="p-5 flex-1 flex flex-col justify-between" id="series-detail-meta-column">
              <div className="space-y-3.5 text-right font-sans">
                <div>
                <div className="flex flex-wrap gap-1">
                  {(detailSeries.category || 'متفرقه').split(',').map(cat => (
                    <span key={cat} className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold dark:bg-indigo-950 dark:text-indigo-300 shrink-0">{cat.trim()}</span>
                  ))}
                </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2">{detailSeries.titleFa}</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5" dir="ltr">{detailSeries.titleEn} | {toPersianNums(detailSeries.year)}</p>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-h-24 overflow-y-auto">
                  {detailSeries.summary || <span className="italic text-gray-400">هیچ خلاصه‌ای ثبت نشده است.</span>}
                </div>

                {/* Characteristics table */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]" id="series-detail-char-table">
                  <div>
                    <span className="text-gray-400">کارگردان:</span> <strong className="text-gray-700 dark:text-gray-200">{detailSeries.director || 'نامشخص'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">کشور:</span> <strong className="text-gray-700 dark:text-gray-200">{detailSeries.country || 'نامشخص'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">زبان:</span> <strong className="text-gray-700 dark:text-gray-200">{detailSeries.language || 'نامشخص'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">رتبه:</span> <strong className="text-amber-500 font-bold font-mono">★ {toPersianNums(detailSeries.imdbRating)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">نویسنده:</span> <strong className="text-gray-700 dark:text-gray-200">{detailSeries.writer || 'نامشخص'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">بخش:</span> <strong className="text-gray-700 dark:text-gray-200">{toPersianNums(detailSeries.seasons.length)} فصل ({toPersianNums(detailSeries.seasons.reduce((sum: number, s: any) => sum + s.episodes.length, 0))} قسمت)</strong>
                  </div>
                </div>

                {/* Subtitle status & Quality details */}
                <div className="flex gap-2" id="series-detail-qual-subtitle">
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-150 dark:border-gray-700 px-2.5 py-1 rounded font-bold">{detailSeries.quality}</span>
                  {detailSeries.releaseDay && (
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-150 dark:border-indigo-900/40 px-2.5 py-1 rounded font-bold">⏱️ روزهای پخش: {detailSeries.releaseDay}</span>
                  )}
                </div>

                {/* Official site clickable button - REQUESTED */}
                {detailSeries.officialSite && (
                  <div className="pt-1.5 flex items-center gap-2 text-xs">
                    <span className="text-gray-400 font-bold">وب‌سایت مرجع / ساخت اثر:</span>
                    <a 
                      href={detailSeries.officialSite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline font-bold flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                      <span>{detailSeries.officialSite}</span>
                    </a>
                  </div>
                )}

                {/* Peer Network Indicators / Remote file handling */}
                {detailSeries.isPeerMedia && (
                  <div className="p-3.5 bg-indigo-50/50 dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/60 rounded-xl space-y-2 mt-2 leading-relaxed text-right">
                    <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                      <Network className="w-4 h-4 animate-bounce shrink-0" />
                      <strong className="text-[11px] font-black">سریال روی هارد سیستم همکار قرار دارد</strong>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                      این سریال متعلق به سیستم همکار با آی‌پی <code className="font-mono text-indigo-600 bg-indigo-500/10 px-1 rounded">{detailSeries.originPeerIp}</code> است. می‌توانید به بخش مدیریت محلی ➔ <strong>شبکه محلی (LAN)</strong> مراجعه کرده و قسمت‌های مختلف آن را مگابایت به مگابایت با بالاترین سرعت شبکه به فلش یا هارد رکوردر خود کپی نمایید.
                    </p>
                  </div>
                )}

                {/* Screenshots Image Gallery */}
                {detailSeries.gallery && (detailSeries.gallery as any).length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800" id="series-detail-screengallery">
                    <span className="text-[10px] font-bold text-gray-400 block">گالری تصاویر مجموعه:</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full scrollbar-thin scrollbar-thumb-gray-200">
                      {(detailSeries.gallery as string[]).map((imgUrl, idx) => (
                        <img 
                          key={idx}
                          src={getSafePosterUrl(imgUrl)}
                          alt={`${detailSeries.titleFa} اسکرین شات ${idx + 1}`}
                          className="w-16 h-10 object-cover rounded border border-gray-200 dark:border-gray-750 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0 shadow-sm"
                          onClick={() => setSelectedGalleryImage(imgUrl)}
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions footer */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 flex flex-col sm:flex-row gap-3" id="series-detail-action-buttons">
                {/* Sale direct registration */}
                <button
                  onClick={(e) => { setDetailSeries(null); handleOpenSale(detailSeries, e); }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow shadow-emerald-500/10 cursor-pointer"
                  id="btn-series-detail-sell"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>ثبت و صدور فاکتور ({formatCurrency(detailSeries.salePrice)})</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => { 
                      setDetailSeries(null); 
                      setManagingSeries(detailSeries); 
                      if (detailSeries.seasons && detailSeries.seasons.length > 0) {
                        setActiveSeasonId(detailSeries.seasons[0].id);
                      } else {
                        setActiveSeasonId(null);
                      }
                    }}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs px-3"
                    title="مدیریت قسمت‌ها و فصول"
                    id="btn-series-detail-manage"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>فصل‌ها و قسمت‌ها</span>
                  </button>
                  <button
                    onClick={() => { handleExportSingleSeriesJson(detailSeries); }}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer"
                    title="برون‌بری مشخصات به صورت فایل JSON 📥"
                    id="btn-series-detail-export"
                  >
                    <Download className="w-4 h-4 text-[#38bdf8]" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ZOOMED POSTER SHADOW MODAL */}
      {zoomedPoster && (
        <div 
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedPoster(null)}
          id="series-zoomed-poster-modal"
        >
          <img 
            src={zoomedPoster} 
            alt="پوستر زوم شده" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scaleIn border border-white/15"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* GALLERY IMAGE SHADOW MODAL */}
      {selectedGalleryImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedGalleryImage(null)}
          id="series-gallery-zoom-modal"
        >
          <img 
            src={getSafePosterUrl(selectedGalleryImage)} 
            alt="تصویر گالری زوم شده" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scaleIn border border-white/15"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {managingSeries && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto font-sans" 
          id="series-episode-manager-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setManagingSeries(null);
            }
          }}
        >
          <div className="bg-white dark:bg-[#111827] w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden border border-gray-150 dark:border-gray-800 animate-scaleIn flex flex-col md:flex-row h-[85vh]">
            
            {/* Left Sidebar (Seasons & Batch Generator) */}
            <div className="w-full md:w-1/3 bg-gray-50 dark:bg-[#101726]/40 border-b md:border-b-0 md:border-l border-gray-200 dark:border-gray-800 p-4 flex flex-col justify-between overflow-y-auto" id="seasons-explorer-sidebar">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2 pb-2.5 border-b border-gray-250 dark:border-gray-800">
                  <Tv className="w-4 h-4 text-sky-500 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-gray-850 dark:text-gray-150 truncate">مدیریت فصول: {managingSeries.titleFa}</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{managingSeries.titleEn}</p>
                  </div>
                </div>

                {/* Series Metadata Card (Requested: 'اطلاعات سریال مثل فیلم ها') */}
                <div className="p-3 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-lg space-y-2">
                  <div className="flex gap-2.5">
                    <img src={getSafePosterUrl(managingSeries.poster)} className="w-11 h-16 object-cover rounded shadow select-none" referrerPolicy="no-referrer" />
                    <div className="text-[10px] space-y-0.5 text-gray-500 min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-gray-900 dark:text-gray-100">{managingSeries.titleFa}</p>
                      <p className="truncate font-mono">{managingSeries.titleEn} ({toPersianNums(managingSeries.year)})</p>
                      <p className="truncate">کارگردان: <strong className="text-gray-750 dark:text-gray-200">{managingSeries.director || 'نامشخص'}</strong></p>
                      <p className="truncate flex items-center gap-1">
                        <span>رایگان/رتبه:</span>
                        <strong className="text-amber-500 font-bold font-mono">★ {toPersianNums(managingSeries.imdbRating)}</strong>
                      </p>
                      {managingSeries.releaseDay && (
                        <p className="truncate text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 text-[9px] bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.5 rounded inline-block w-fit">
                          📅 پخش هفتگی: {managingSeries.releaseDay} {managingSeries.releaseTime ? `ساعت ${toPersianNums(managingSeries.releaseTime)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {managingSeries.summary && (
                    <p className="text-[10px] leading-relaxed text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-slate-800/80 pt-1.5 max-h-16 overflow-y-auto line-clamp-3" title="خلاصه داستان">
                      {managingSeries.summary}
                    </p>
                  )}

                  {managingSeries.officialSite && (
                    <div className="border-t border-gray-105 dark:border-slate-800/80 pt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-gray-405 font-bold">وب‌سایت مرجع / ساخت اثر:</span>
                      <a 
                        href={managingSeries.officialSite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-550 hover:underline font-bold flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded cursor-pointer max-w-[155px] truncate"
                        title={managingSeries.officialSite}
                      >
                        <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{managingSeries.officialSite}</span>
                      </a>
                    </div>
                  )}

                  {/* Screenshots gallery inside Seasons manager */}
                  {managingSeries.gallery && managingSeries.gallery.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-slate-800/80 pt-2 space-y-1" id="series-screengallery">
                      <span className="text-[9.5px] font-bold text-gray-400 block pb-0.5">📸 اسکرین‌شات‌ها و تصاویر صحنه:</span>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin scrollbar-thumb-gray-200">
                        {managingSeries.gallery.map((imgUrl, idx) => (
                          <img 
                            key={idx}
                            src={getSafePosterUrl(imgUrl)}
                            alt={`${managingSeries.titleFa} اسکرین شات ${idx + 1}`}
                            className="w-12 h-8 object-cover rounded border border-gray-150 dark:border-gray-800 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0 shadow-sm"
                            onClick={() => setSelectedGalleryImage(imgUrl)}
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Series Main Folder Picker box */}
                <div className="p-2.5 bg-indigo-50/50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-lg space-y-1.5" id="series-sidebar-folder-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">مسیر پوشه اصلی سریال:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const triggerSelect = () => {
                          if (window.electronAPI) {
                            window.electronAPI.selectDirectory().then((dir) => {
                              if (dir) {
                                dbService.updateSeries(managingSeries.id, { filePath: dir });
                                const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
                                if (updated) setManagingSeries(updated);
                                refreshData();
                              }
                            }).catch(err => console.error(err));
                          } else {
                            const input = window.prompt('(شبیه‌ساز آنلاین) مسیر پوشه اصلی این سریال را وارد کنید:', managingSeries.filePath || 'D:\\Media\\Series\\Shahrzad');
                            if (input !== null) {
                              dbService.updateSeries(managingSeries.id, { filePath: input });
                              const updated = dbService.getSeries().find(s => s.id === managingSeries.id);
                              if (updated) setManagingSeries(updated);
                              refreshData();
                            }
                          }
                        };
                        triggerSelect();
                      }}
                      className="text-[9px] font-extrabold text-[#38bdf8] bg-sky-600 hover:bg-sky-550 text-white dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 px-2 py-0.5 rounded cursor-pointer border border-[#38bdf8]/10"
                    >
                      تنظیم دایرکتوری...
                    </button>
                  </div>
                  {managingSeries.filePath ? (
                    <p className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-mono break-all line-clamp-2 select-all" dir="ltr" title={managingSeries.filePath}>
                      {managingSeries.filePath}
                    </p>
                  ) : (
                    <p className="text-[9.5px] text-amber-600 font-bold italic">
                      پوشه اصلی این سریال هنوز تعریف نشده است!
                    </p>
                  )}
                </div>

                {/* Specific Series JSON export */}
                <div className="p-2.5 bg-indigo-50/20 dark:bg-slate-900 border border-indigo-500/20 rounded-lg space-y-1.5" id="series-export-single-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">دریافت خروجی دیتابیس سریال:</span>
                    <button
                      type="button"
                      onClick={() => handleExportSingleSeriesJson(managingSeries)}
                      className="text-[9.5px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 font-bold px-2.5 py-1 rounded cursor-pointer flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>خروجی شناسنامه JSON</span>
                    </button>
                  </div>
                  <p className="text-[8.5px] text-gray-400 leading-normal">
                    دانلود کل اطلاعات این سریال، فصول، و قسمت‌ها در یک قالب فایل واحد JSON جهت انتقال سریع.
                  </p>
                </div>

                {/* Add Season box */}
                <form onSubmit={handleAddNewSeason} className="space-y-1.5 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-gray-150 dark:border-slate-800" id="add-season-form">
                  <label className="text-[10px] font-bold text-gray-500 block">افزودن فصل تک با نام دلخواه</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="مانند: فصل اول"
                      value={seasonFormName}
                      onChange={(e) => setSeasonFormName(e.target.value)}
                      className="flex-1 h-8 px-2.5 bg-gray-50 dark:bg-slate-800 rounded-md text-[11px] border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!seasonFormName.trim()}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shrink-0 cursor-pointer disabled:opacity-40"
                    >
                      افزودن
                    </button>
                  </div>
                </form>

                {/* Seasons items list inside sidebar */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 block">لیست فصل‌های موجود (کلیک برای مدیریت قسمت‌ها)</label>
                  <div className="space-y-1.5 overflow-y-auto max-h-[30vh]" id="seasons-list">
                    {managingSeries.seasons.length === 0 ? (
                      <p className="text-[10px] text-gray-450 italic text-center py-6 bg-white dark:bg-slate-900 rounded-lg border border-gray-150 dark:border-slate-800">فصلی تعریف نشده است. فصلی بسازید.</p>
                    ) : (
                      managingSeries.seasons.map(season => {
                        const isActive = activeSeasonId === season.id;
                        const isEditingName = editingSeasonId === season.id;
                        return (
                          <div 
                            key={season.id} 
                            onClick={() => {
                              if (!isEditingName) {
                                setActiveSeasonId(season.id);
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              isActive 
                                ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/50' 
                                : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              {isEditingName ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editingSeasonName}
                                    onChange={(e) => setEditingSeasonName(e.target.value)}
                                    className="h-7 px-1.5 bg-gray-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900 rounded text-xs w-full text-gray-800 dark:text-gray-200 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSeason(season.id)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded cursor-pointer"
                                    title="ذخیره"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingSeasonId(null); setEditingSeasonName(''); }}
                                    className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                                    title="انصراف"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                  <span className="text-xs font-bold text-gray-750 dark:text-gray-200 truncate">{season.name}</span>
                                  <span className="text-[9px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-1 py-0.5 rounded font-normal font-mono shrink-0">
                                    {toPersianNums(season.episodes.length)} قسمت
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {!isEditingName && (
                              <div className="flex items-center gap-1 shrink-0 mr-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => { setEditingSeasonId(season.id); setEditingSeasonName(season.name); }}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 text-indigo-500 rounded cursor-pointer"
                                  title="ویرایش نام فصل"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSeason(season.id)}
                                  className="p-1 hover:bg-red-50 dark:hover:bg-red-955/20 text-red-500 rounded cursor-pointer"
                                  title="حذف فصل"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Batch Generator Box */}
                <div className="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-900/60 dark:to-indigo-950/20 p-3 rounded-lg border border-sky-100 dark:border-slate-800 text-gray-850 dark:text-gray-150">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-sky-100 dark:border-slate-800 mb-2">
                    <ListOrdered className="w-4 h-4 text-sky-500" />
                    <span className="text-[11px] font-extrabold text-sky-700 dark:text-sky-400">تولید گروهی فصول و قسمت‌ها (سریع)</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] text-gray-500 dark:text-gray-400">تعداد کل فصل‌ها:</label>
                      <input 
                        type="number"
                        min="1"
                        max="15"
                        value={batchSeasonsCount}
                        onChange={(e) => handleBatchSeasonsCountChange(Number(e.target.value) || 1)}
                        className="w-16 h-7 px-1.5 bg-white dark:bg-slate-950 text-center rounded border border-gray-250 dark:border-slate-700 text-xs font-bold font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold text-emerald-600 dark:text-emerald-400">پسوند فیلم‌های تولیدی:</label>
                      <input 
                        type="text"
                        value={batchFileExtension}
                        onChange={(e) => setBatchFileExtension(e.target.value)}
                        placeholder="mkv."
                        className="w-16 h-7 px-1 bg-white dark:bg-slate-950 text-center rounded border border-gray-250 dark:border-slate-700 text-xs font-bold font-mono text-teal-600 dark:text-teal-400"
                      />
                    </div>

                    {/* Dynamic Inputs for each Season */}
                    <div className="space-y-1.5 max-h-[14vh] overflow-y-auto pr-0.5 border-t border-dashed border-gray-200 dark:border-slate-800 pt-2">
                      {Array.from({ length: batchSeasonsCount }).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] gap-2">
                          <span className="text-gray-500 flex items-center gap-1 truncate">
                            <span className="w-4 h-4 rounded-full bg-sky-100 dark:bg-slate-800 text-sky-700 dark:text-sky-400 flex items-center justify-center font-mono text-[9px]">{idx + 1}</span>
                            <span>تعداد قسمت‌های فصل {idx + 1}:</span>
                          </span>
                          <input 
                            type="number"
                            min="1"
                            max="60"
                            value={batchEpisodesForSeason[idx] !== undefined ? batchEpisodesForSeason[idx] : 10}
                            onChange={(e) => {
                              const updatedArr = [...batchEpisodesForSeason];
                              updatedArr[idx] = Number(e.target.value) || 5;
                              setBatchEpisodesForSeason(updatedArr);
                            }}
                            className="w-14 h-6 px-1.5 bg-white dark:bg-slate-950 text-center rounded border border-gray-250 dark:border-slate-700 text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateBatch}
                      className="w-full mt-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-extrabold cursor-pointer transition-colors shadow-sm text-center"
                    >
                      تولید و ثبت کلیه فصول و قسمت‌ها
                    </button>
                  </div>
                </div>
              </div>

              {/* Close Button at bottom of sidebar */}
              <div className="pt-3 border-t border-gray-250 dark:border-gray-800 mt-4">
                <button
                  type="button"
                  onClick={() => setManagingSeries(null)}
                  className="w-full h-8 bg-gray-200 hover:bg-gray-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-200 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>انصراف و بستن</span>
                </button>
              </div>
            </div>

            {/* Right Column (Episodes details of Active Season) */}
            <div className="flex-1 p-5 overflow-y-auto bg-white dark:bg-[#11181f]">
              <div className="space-y-4">
                {/* Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-gray-150 dark:border-slate-800 mb-4 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-indigo-500 animate-bounce" />
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-800 dark:text-gray-100">
                          {activeSeasonId 
                            ? `لیست قسمت‌های ${managingSeries.seasons.find(s => s.id === activeSeasonId)?.name || 'فصل منتخب'}` 
                            : 'مدیریت قسمت‌ها'}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">برای مشاهده قسمت‌ها، یک فصل انتخاب کنید یا ثبت کنید.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSeasonId && (
                        <>
                          <button
                            type="button"
                            onClick={handleAutoMatchExtensionsFromDisk}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                            title="اسکن کل پوشه سریال، تشخیص فصل/قسمت از نام فایل‌ها و تطبیق خودکار پسوندهای فیزیکی ویدئوها (mkv, mp4, 3gp, ...)"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-sky-200 animate-pulse" />
                            <span>تطبیق خودکار پسوندها از روی دیسک</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleAutoRenameEpisodeFiles}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                            title="تغییر نام خودکار و فیزیکی فایل‌های ویدئویی این فصل بر روی هارد دیسک بر اساس الگوی استاندارد و منظم (مثلاً Aban-S01E01.mp4)"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                            <span>تغییر نام فیزیکی فایل‌های این فصل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowAddEpisodeBox(activeSeasonId);
                              setEditingEpisodeId(null);
                              const nextEpNum = (managingSeries.seasons.find(s => s.id === activeSeasonId)?.episodes?.length || 0) + 1;
                              setEpisodeFormNum(nextEpNum);
                              setEpisodeFormName('');
                              const defaultPath = getEpisodeDefaultPath(managingSeries, activeSeasonId, nextEpNum, episodeFileExtension);
                              setEpisodeFormFile(defaultPath);
                              setEpisodeFormDesc('');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                          >
                            <span>+ افزودن قسمت جدید</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Single Episode Add/Edit Form Box */}
                  {activeSeasonId && showAddEpisodeBox === activeSeasonId && (
                    <form onSubmit={(e) => handleAddEpisode(activeSeasonId, e)} className="p-3 bg-indigo-50/40 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-lg space-y-2 mb-3.5 animate-fadeIn">
                      <div className="flex items-center justify-between pb-1 border-b border-gray-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Edit className="w-3.5 h-3.5" />
                          <span>{editingEpisodeId ? 'فرم ویرایش اطلاعات قسمت' : 'فرم افزودن قسمت به فصل انتخابی'}</span>
                        </span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowAddEpisodeBox(null);
                            setEditingEpisodeId(null);
                            setEpisodeFormNum(1);
                            setEpisodeFormName('');
                            setEpisodeFormFile('');
                            setEpisodeFormDesc('');
                          }} 
                          className="text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-gray-455 block">شماره قسمت</label>
                          <input 
                            type="number"
                            required
                            value={episodeFormNum}
                            onChange={(e) => setEpisodeFormNum(Number(e.target.value))}
                            className="w-full h-7 px-2 bg-white dark:bg-slate-950 rounded border border-gray-200 dark:border-slate-800 text-xs text-gray-850 dark:text-gray-100 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-0.5 col-span-2">
                          <label className="text-[9px] text-gray-455 block">نام قسمت / شرح مختصر</label>
                          <input 
                            type="text"
                            required
                            placeholder="مانند: قسمت اول یا نام دلخواه"
                            value={episodeFormName}
                            onChange={(e) => setEpisodeFormName(e.target.value)}
                            className="w-full h-7 px-2 bg-white dark:bg-slate-950 rounded border border-gray-200 dark:border-slate-800 text-xs text-gray-850 dark:text-gray-100 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5 col-span-2">
                          <label className="text-[9px] text-gray-455 block font-bold">مسیر فایل ویدئویی قسمت</label>
                          <div className="flex gap-1.5">
                            <input 
                              type="text"
                              placeholder="D:\Media\Series\Video.mkv"
                              value={episodeFormFile}
                              onChange={(e) => setEpisodeFormFile(e.target.value)}
                              className="flex-1 h-7 px-2 bg-white dark:bg-slate-950 rounded border border-gray-200 dark:border-slate-800 text-[10px] font-mono focus:outline-none text-gray-850 dark:text-gray-100"
                            />
                            <button
                              type="button"
                              onClick={handlePickEpisodeFilePath}
                              className="px-1.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[9px] cursor-pointer font-bold shrink-0"
                            >
                              جستجو...
                            </button>
                          </div>
                        </div>

                        <div className="space-y-0.5 col-span-1">
                          <label className="text-[9px] text-gray-455 block font-bold">پسوند فایل</label>
                          <input 
                            type="text"
                            value={episodeFileExtension}
                            onChange={(e) => {
                              const newExt = e.target.value;
                              setEpisodeFileExtension(newExt);
                              if (episodeFormFile) {
                                const extIdx = episodeFormFile.lastIndexOf('.');
                                if (extIdx !== -1) {
                                  const base = episodeFormFile.substring(0, extIdx);
                                  const cleanExt = newExt.startsWith('.') ? newExt : `.${newExt}`;
                                  setEpisodeFormFile(base + cleanExt);
                                }
                              }
                            }}
                            className="w-full h-7 px-1.5 bg-white dark:bg-slate-950 rounded border border-gray-200 dark:border-slate-800 text-xs font-mono font-bold text-center text-teal-600 dark:text-teal-400"
                            placeholder="mkv."
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] text-gray-455 block font-bold">توضیحات تکمیلی قسمت (داستان)</label>
                        <input 
                          type="text"
                          placeholder="مانند: در ابتدای این بخش..."
                          value={episodeFormDesc}
                          onChange={(e) => setEpisodeFormDesc(e.target.value)}
                          className="w-full h-7 px-2 bg-white dark:bg-slate-950 rounded border border-gray-200 dark:border-slate-805 text-[10px] text-gray-850 dark:text-gray-100 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-1 gap-1.5">
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowAddEpisodeBox(null);
                            setEditingEpisodeId(null);
                            setEpisodeFormNum(1);
                            setEpisodeFormName('');
                            setEpisodeFormFile('');
                            setEpisodeFormDesc('');
                          }}
                          className="px-3 py-1 bg-gray-100 text-gray-605 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700 rounded text-[10px] cursor-pointer font-bold"
                        >
                          لغو
                        </button>
                        <button type="submit" className="px-4 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors">
                          {editingEpisodeId ? 'ذخیره تغییرات' : 'ثبت قطعی'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Active Season Episodes list */}
                  <div className="space-y-2 mt-2">
                    {!activeSeasonId ? (
                      <div className="flex flex-col items-center justify-center text-center py-24 bg-gray-50/50 dark:bg-[#1a2230]/40 rounded-xl border border-gray-150 dark:border-slate-800 p-8 animate-fadeIn">
                        <Tv className="w-10 h-10 text-gray-300 dark:text-gray-700 animate-pulse mb-3" />
                        <p className="text-xs font-extrabold text-gray-700 dark:text-gray-350">هیچ فصلی انتخاب نشده است</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed max-w-sm">
                          برای شروع مدیریت یا افزودن قسمت‌ها، لطفاً از لیست سمت راست یک فصل را انتخاب کنید یا از دکمه تولید سریع گروهی استفاده کنید.
                        </p>
                      </div>
                    ) : (
                      (() => {
                        const selectedSeason = managingSeries.seasons.find(s => s.id === activeSeasonId);
                        if (!selectedSeason) return null;
                        
                        return selectedSeason.episodes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center py-16 bg-gray-50/40 dark:bg-[#1a2230]/40 rounded-xl border border-gray-150 dark:border-slate-800 p-8 animate-fadeIn">
                            <Check className="w-8 h-8 text-emerald-400 dark:text-emerald-800 mb-2" />
                            <p className="text-xs font-bold text-gray-750 dark:text-gray-300">این فصل هیچ قسمتی ندارد</p>
                            <p className="text-[10px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                              می‌آرایند! با دکمه <strong className="text-indigo-600 dark:text-indigo-400">"+ افزودن قسمت جدید"</strong> در بالا تک قسمت اضافه کنید یا از ابزار تولید گروهی در بخش قبل استفاده فرماييد.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
                            {selectedSeason.episodes.map(ep => (
                              <div 
                                key={ep.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 p-2.5 rounded-lg hover:shadow-sm hover:border-indigo-100 dark:hover:border-slate-705 transition-all gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-[9px] font-mono font-bold rounded shrink-0">
                                      قسمت {toPersianNums(ep.episodeNumber)}
                                    </span>
                                    <h6 className="text-[11px] font-extrabold text-gray-805 dark:text-gray-155 truncate">{ep.name}</h6>
                                  </div>
                                  
                                  {ep.videoPath && ep.videoPath !== 'D:\\Media\\Series\\Video.mkv' ? (
                                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 pr-1 truncate" dir="ltr" title={ep.videoPath}>
                                      {ep.videoPath}
                                    </p>
                                  ) : (
                                    <p className="text-[9px] text-amber-500/80 italic mt-1 pr-1">
                                      مسیر اختصاصی تنظیم نشده (استفاده از پوشه اصلی سریال)
                                    </p>
                                  )}

                                  {ep.description && <p className="text-[9.5px] text-gray-450 mt-1 leading-relaxed pr-1">{ep.description}</p>}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                  {/* Play Episode ▶️ */}
                                  <button
                                    onClick={() => handlePlayEpisode(ep, managingSeries)}
                                    className="p-1 px-1.5 border border-emerald-150 dark:border-emerald-950 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors"
                                    title="پخش با نرم‌افزار پیش‌فرض سیستم"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>پخش</span>
                                  </button>
                                  
                                  {/* Open Folder 📁 */}
                                  <button
                                    onClick={() => handleOpenEpisodeFolder(ep, managingSeries)}
                                    className="p-1 px-1.5 border border-sky-150 dark:border-sky-955 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors"
                                    title="باز کردن پوشه حاوی فیلم"
                                  >
                                    <FolderOpen className="w-3 h-3" />
                                    <span>پوشه</span>
                                  </button>

                                  {/* Edit Episode ✏️ */}
                                  <button
                                    onClick={() => {
                                      setEditingEpisodeId(ep.id);
                                      setShowAddEpisodeBox(activeSeasonId);
                                      setEpisodeFormNum(ep.episodeNumber);
                                      setEpisodeFormName(ep.name);
                                      setEpisodeFormFile(ep.videoPath || '');
                                      setEpisodeFormDesc(ep.description || '');
                                    }}
                                    className="p-1 px-1.5 border border-indigo-150 dark:border-indigo-955 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors"
                                    title="ویرایش قسمت"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>ویرایش</span>
                                  </button>

                                  {/* Delete action */}
                                  <button
                                    onClick={() => handleDeleteEpisode(activeSeasonId, ep.id)}
                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-955/20 text-red-500 rounded shrink-0 cursor-pointer"
                                    title="حذف قسمت"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DETAILED Dynamic Series Sales Modal 💰 */}
      {sellingSeries && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn" 
          id="series-selling-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSellingSeries(null);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-150 dark:border-gray-800">
            {/* Header */}
            <div className="px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold dark:text-indigo-400">
                <DollarSign className="w-4 h-4 text-indigo-500 fill-current animate-bounce" />
                <span>ثبت فاکتور فروش برای سریال</span>
              </span>
              <button onClick={() => setSellingSeries(null)} className="text-gray-400 hover:text-gray-600 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleRegisterSale} className="p-5 space-y-4 text-gray-850 dark:text-gray-150">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center gap-3 border border-gray-200 dark:border-slate-850 font-sans">
                <img src={getSafePosterUrl(sellingSeries.poster)} alt="" className="w-10 h-14 object-cover rounded shadow-sm" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">{sellingSeries.titleFa}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sellingSeries.titleEn} | {toPersianNums(sellingSeries?.seasons?.length || 0)} فصل</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1.5">قیمت کل پکیج: {formatCurrency(sellingSeries.salePrice)}</p>
                </div>
              </div>

              {/* Requirement: Sale کامل، تک فصل، تک قسمت یا چند قسمت */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">نوع فروش سریال *</label>
                <div className="grid grid-cols-4 gap-1.5" id="series-sale-options">
                  <button
                    type="button"
                    onClick={() => setSaleOption('full')}
                    className={`py-2 px-1 rounded-lg text-center font-bold text-[10px] border transition-all cursor-pointer ${
                      saleOption === 'full' 
                        ? 'bg-indigo-600 border-indigo-600 text-white animate-scaleIn' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    کل پکیج
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleOption('season')}
                    disabled={sellingSeries.seasons.length === 0}
                    className={`py-2 px-1 rounded-lg text-center font-bold text-[10px] border transition-all cursor-pointer disabled:opacity-40 ${
                      saleOption === 'season' 
                        ? 'bg-indigo-600 border-indigo-600 text-white animate-scaleIn' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    تک فصل
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleOption('episode')}
                    disabled={sellingSeries.seasons.length === 0 || !sellingSeries.seasons.some(s => s.episodes.length > 0)}
                    className={`py-2 px-1 rounded-lg text-center font-bold text-[10px] border transition-all cursor-pointer disabled:opacity-40 ${
                      saleOption === 'episode' 
                        ? 'bg-indigo-600 border-indigo-600 text-white animate-scaleIn' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    تک قسمت
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaleOption('multi_episode');
                      setSelectedSaleEpisodes([]);
                    }}
                    disabled={sellingSeries.seasons.length === 0 || !sellingSeries.seasons.some(s => s.episodes.length > 0)}
                    className={`py-2 px-1 rounded-lg text-center font-bold text-[10px] border transition-all cursor-pointer disabled:opacity-40 ${
                      saleOption === 'multi_episode' 
                        ? 'bg-indigo-600 border-indigo-600 text-white animate-scaleIn' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    چند قسمت
                  </button>
                </div>
              </div>

              {/* Selections based on sale option */}
              {saleOption === 'season' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[10px] font-bold text-gray-500 block">انتخاب فصل مورد نظر</label>
                  <select
                    value={selectedSaleSeason}
                    onChange={(e) => setSelectedSaleSeason(e.target.value)}
                    className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 cursor-pointer text-gray-805 dark:text-gray-200 font-bold font-sans"
                  >
                    {sellingSeries.seasons.map(s => <option key={s.id} value={s.id}>{s.name} ({s.episodes.length} قسمت)</option>)}
                  </select>
                </div>
              )}

              {saleOption === 'episode' && (
                <div className="grid grid-cols-2 gap-2.5 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block font-bold">انتخاب فصل</label>
                    <select
                      value={selectedSaleSeason}
                      onChange={(e) => {
                        setSelectedSaleSeason(e.target.value);
                        const s = sellingSeries.seasons.find(sea => sea.id === e.target.value);
                        if (s && s.episodes.length > 0) setSelectedSaleEpisode(s.episodes[0].id);
                      }}
                      className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 cursor-pointer text-gray-850 dark:text-gray-200 font-bold font-sans"
                    >
                      {sellingSeries.seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block font-bold">انتخاب قسمت</label>
                    <select
                      value={selectedSaleEpisode}
                      onChange={(e) => setSelectedSaleEpisode(e.target.value)}
                      className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 cursor-pointer text-gray-850 dark:text-gray-200 font-bold font-sans"
                    >
                      {(sellingSeries.seasons.find(s => s.id === selectedSaleSeason)?.episodes || []).map(ep => (
                        <option key={ep.id} value={ep.id}>قسمت {ep.episodeNumber}: {ep.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {saleOption === 'multi_episode' && (
                <div className="space-y-2.5 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block">انتخاب فصل</label>
                    <select
                      value={selectedSaleSeason}
                      onChange={(e) => {
                        setSelectedSaleSeason(e.target.value);
                        setSelectedSaleEpisodes([]);
                      }}
                      className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 cursor-pointer text-gray-850 dark:text-gray-200 font-bold font-sans"
                    >
                      {sellingSeries.seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 bg-gray-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="text-[10px] font-bold text-gray-400 block">انتخاب قسمت‌های مورد نظر:</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const allEps = (sellingSeries.seasons.find(s => s.id === selectedSaleSeason)?.episodes || []);
                            const filteredEps = allEps.filter(ep => {
                              if (!episodeSearchQuery) return true;
                              return ep.name.toLowerCase().includes(episodeSearchQuery.toLowerCase()) || 
                                     ep.episodeNumber.toString().includes(episodeSearchQuery);
                            });
                            setSelectedSaleEpisodes(prev => {
                              const otherEps = prev.filter(id => !allEps.some(e => e.id === id));
                              return [...otherEps, ...filteredEps.map(e => e.id)];
                            });
                          }}
                          className="px-1 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[8.5px] font-black rounded"
                        >
                          همه
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const allEps = (sellingSeries.seasons.find(s => s.id === selectedSaleSeason)?.episodes || []);
                            setSelectedSaleEpisodes(prev => prev.filter(id => !allEps.some(e => e.id === id)));
                          }}
                          className="px-1 py-0.5 bg-gray-150 hover:bg-gray-200 text-gray-700 text-[8.5px] font-black rounded"
                        >
                          هیچکدام
                        </button>
                        <input
                          type="text"
                          placeholder="جستجوی قسمت..."
                          value={episodeSearchQuery}
                          onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                          className="w-24 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-gray-250 dark:border-slate-700 rounded text-[9.5px] font-bold"
                        />
                      </div>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {(sellingSeries.seasons.find(s => s.id === selectedSaleSeason)?.episodes || [])
                        .filter(ep => {
                          if (!episodeSearchQuery) return true;
                          return ep.name.toLowerCase().includes(episodeSearchQuery.toLowerCase()) || 
                                 ep.episodeNumber.toString().includes(episodeSearchQuery);
                        })
                        .map(ep => {
                          const isChecked = selectedSaleEpisodes.includes(ep.id);
                          return (
                            <label key={ep.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-150/50 dark:hover:bg-slate-800/50 rounded cursor-pointer text-xs">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedSaleEpisodes(selectedSaleEpisodes.filter(id => id !== ep.id));
                                  } else {
                                    setSelectedSaleEpisodes([...selectedSaleEpisodes, ep.id]);
                                  }
                                }}
                                className="accent-indigo-600 w-3.5 h-3.5 shrink-0"
                              />
                              <span className="text-gray-700 dark:text-gray-300 font-bold leading-none">
                                قسمت {toPersianNums(ep.episodeNumber)}: {ep.name}
                              </span>
                            </label>
                          );
                        })}
                      {(sellingSeries.seasons.find(s => s.id === selectedSaleSeason)?.episodes || []).length === 0 && (
                        <div className="text-[10px] text-gray-400 text-center py-4">این فصل فاقد قسمت است.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Shopping basket hint */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-550 block">سیستم سبد خرید فعال</span>
                <p className="text-[10.5px] leading-relaxed text-gray-400 dark:text-gray-305 font-sans">
                  این کالا و متعلقات فصلی منتخب آن پس از تایید نهایی مستقیماً در فاکتور بالای صفحه انباشته خواهند شد.
                </p>
              </div>

              {/* Price fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">مبلغ نهایی معامله (تومان)</label>
                  <input
                    type="number"
                    value={calculatedPrice}
                    onChange={(e) => setCalculatedPrice(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-gray-100 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">تخفیف فاکتور (تومان)</label>
                  <input
                    type="number"
                    value={saleDiscount}
                    onChange={(e) => setSaleDiscount(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-gray-100 font-sans"
                  />
                </div>
              </div>

              {/* Estimate calculation block */}
              <div className="pt-2 text-[10px] text-gray-500 space-y-1 border-t border-gray-150 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900/40 p-2.5 rounded-lg font-sans">
                <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5 text-sky-500 shrink-0" /> محاسبه خودکار بر مبنای فصول و قسمت‌هاست.</span>
                <span className="font-extrabold text-emerald-600 font-mono">{formatCurrency(calculatedPrice - saleDiscount)}</span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setSellingSeries(null)}
                  className="px-4 py-2 border border-gray-205 dark:border-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-650 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    activeCustomer
                      ? 'bg-indigo-650 hover:bg-indigo-700 shadow-sm shadow-indigo-505/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                  }`}
                >
                  {activeCustomer ? 'افزودن به سبد خرید 🛒' : 'ثبت فاکتور سریال'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCREENSHOT GALLERY LIGHTBOX MODAL */}
      {selectedGalleryImage && (() => {
        const galleryList = detailSeries?.gallery || [];
        const currentIdx = galleryList.indexOf(selectedGalleryImage);
        
        const goNext = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (currentIdx < galleryList.length - 1) {
            setSelectedGalleryImage(galleryList[currentIdx + 1]);
            setGalleryZoomScale(1);
          }
        };

        const goPrev = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (currentIdx > 0) {
            setSelectedGalleryImage(galleryList[currentIdx - 1]);
            setGalleryZoomScale(1);
          }
        };

        const zoomIn = (e: React.MouseEvent) => {
          e.stopPropagation();
          setGalleryZoomScale(prev => Math.min(prev + 0.25, 3));
        };

        const zoomOut = (e: React.MouseEvent) => {
          e.stopPropagation();
          setGalleryZoomScale(prev => Math.max(prev - 0.25, 1));
        };

        const resetZoom = (e: React.MouseEvent) => {
          e.stopPropagation();
          setGalleryZoomScale(1);
        };

        return (
          <div 
            onClick={() => { setSelectedGalleryImage(null); setGalleryZoomScale(1); }} 
            className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-between p-4 animate-fadeIn select-none"
            id="gallery-lightbox-modal"
          >
            {/* Header controls inside lightbox */}
            <div className="w-full flex items-center justify-between text-white p-2 z-10 bg-black/40 backdrop-blur rounded-lg max-w-4xl border border-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setSelectedGalleryImage(null); setGalleryZoomScale(1); }}
                  className="p-1.5 hover:bg-slate-800 text-gray-300 hover:text-white rounded-full transition-all cursor-pointer border-none bg-transparent"
                  title="بستن"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-[11px] font-bold text-gray-300">
                  تصویر {toPersianNums(currentIdx + 1)} از {toPersianNums(galleryList.length)}
                </span>
              </div>

              {/* Zoom Buttons */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={zoomOut}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer transition-all border-none"
                  title="کوچک‌نمایی"
                >
                  زوم -
                </button>
                <span className="text-[11px] font-mono w-10 text-center font-bold text-indigo-400">
                  {Math.round(galleryZoomScale * 100)}%
                </span>
                <button 
                  onClick={zoomIn}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer transition-all border-none"
                  title="بزرگ‌نمایی"
                >
                  زوم +
                </button>
                {galleryZoomScale !== 1 && (
                  <button 
                    onClick={resetZoom}
                    className="px-2 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer transition-all border-none"
                  >
                    ۱۰۰٪
                  </button>
                )}
              </div>
            </div>

            {/* Main Stage with navigation buttons */}
            <div className="flex-1 w-full max-w-5xl flex items-center justify-between relative gap-4 my-2 overflow-hidden">
              {/* Prev Button (left arrow) */}
              <button 
                onClick={goPrev}
                disabled={currentIdx === 0}
                className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all border border-slate-800 disabled:opacity-20 disabled:cursor-not-allowed shrink-0 z-10 cursor-pointer"
                title="قبلی"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Image Container with Zoom support */}
              <div className="flex-1 h-full flex items-center justify-center overflow-auto cursor-grab active:cursor-grabbing p-4" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={getSafePosterUrl(selectedGalleryImage)} 
                  alt="نمای بزرگ صحنه" 
                  className="max-h-[70vh] max-w-full rounded-lg shadow-2xl transition-transform duration-200"
                  style={{ transform: `scale(${galleryZoomScale})` }}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Next Button (right arrow) */}
              <button 
                onClick={goNext}
                disabled={currentIdx === galleryList.length - 1}
                className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all border border-slate-800 disabled:opacity-20 disabled:cursor-not-allowed shrink-0 z-10 cursor-pointer"
                title="بعدی"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Thumbnails Underneath list */}
            {galleryList.length > 0 && (
              <div className="w-full max-w-4xl bg-black/55 backdrop-blur border border-slate-800 p-2.5 rounded-xl flex gap-2.5 overflow-x-auto justify-center z-10" onClick={(e) => e.stopPropagation()}>
                {galleryList.map((imgUrl, idx) => {
                  const isActive = imgUrl === selectedGalleryImage;
                  return (
                    <img 
                      key={idx}
                      src={getSafePosterUrl(imgUrl)}
                      alt=""
                      className={`w-16 h-10 object-cover rounded border cursor-pointer transition-all shrink-0 ${
                        isActive 
                          ? 'border-indigo-500 scale-110 shadow-lg shadow-indigo-505/25 ring-2 ring-indigo-500/20' 
                          : 'border-slate-800 hover:border-slate-500 hover:scale-105 opacity-60 hover:opacity-100'
                      }`}
                      onClick={() => {
                        setSelectedGalleryImage(imgUrl);
                        setGalleryZoomScale(1);
                      }}
                      referrerPolicy="no-referrer"
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* SCAN PREVIEW MODAL */}
      <ScanPreviewModal
        isOpen={showScanPreviewModal}
        onClose={() => setShowScanPreviewModal(false)}
        items={scannedFiles}
        title="پیش‌نمایش سریال‌های اسکن شده"
        defaultCategory={selectedCategory === 'همه' ? 'خارجی' : selectedCategory}
        onImportComplete={refreshData}
      />

      {/* TMDb Image Downloader & Picker Modal */}
      {showImagePickerModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-indigo-50 dark:bg-slate-950/40 border-b border-gray-150 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">مدیریت و دانلود هوشمند گالری تصاویر سریال TMDb</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowImagePickerModal(false)}
                className="p-1.5 hover:bg-gray-150 dark:hover:bg-slate-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[65vh] space-y-6">
              {/* Path Picker */}
              <div className="p-4 bg-gray-50 dark:bg-slate-950/25 rounded-xl border border-gray-100 dark:border-slate-850 space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block">پوشه مقصد برای دانلود و ذخیره تصاویر در هارد دیسک:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={downloadDestFolder}
                    onChange={(e) => setDownloadDestFolder(e.target.value)}
                    className="flex-1 h-10 px-3 bg-white dark:bg-slate-950 rounded-lg text-xs border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="یک پوشه در سیستم خود انتخاب کنید (مثلا: D:\Media\Series\Shahrzad)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.electronAPI && window.electronAPI.selectDirectory) {
                        window.electronAPI.selectDirectory().then((dir: string) => {
                          if (dir) setDownloadDestFolder(dir);
                        }).catch((err: any) => console.error(err));
                      } else {
                        showToast('انتخاب پوشه فقط در برنامه دسکتاپ فعال است. در وب آدرس‌ها متصل می‌شوند.', 'info');
                      }
                    }}
                    className="h-10 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border-none"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>انتخاب پوشه...</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  نکته: تصاویر دانلود شده به‌طور خودکار در زیرپوشه‌ای به نام <code className="font-mono bg-gray-200 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">pic</code> داخل پوشه مقصد فوق ذخیره خواهند شد.
                </p>
              </div>

              {/* Grid of Images to choose */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 block">انتخاب و تخصیص نقش برای هر تصویر جهت دانلود و ذخیره:</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Poster Column */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-500 block">تصویر ۱ (Poster پیش‌فرض):</span>
                    {fetchedImages.poster ? (
                      <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800">
                        <div 
                          className={`relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all ${
                            imageAssignments.poster === 'poster' ? 'border-indigo-600 shadow-md' :
                            imageAssignments.poster === 'gallery' ? 'border-emerald-600 shadow-md' :
                            'border-gray-200 dark:border-gray-800 opacity-45'
                          }`}
                        >
                          <img 
                            src={fetchedImages.poster} 
                            alt="Poster" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {imageAssignments.poster === 'poster' && (
                            <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">🖼️ پوستر اصلی</span>
                          )}
                          {imageAssignments.poster === 'gallery' && (
                            <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">📷 گالری تصاویر</span>
                          )}
                          {imageAssignments.poster === 'none' && (
                            <span className="absolute top-2 right-2 bg-gray-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">❌ عدم انتخاب</span>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded px-2 py-0.5 text-center">
                            <span className="text-[8px] font-bold text-white font-mono">poster.jpg</span>
                          </div>
                        </div>
                        {/* Selector Buttons */}
                        <div className="flex gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => assignImageRole('poster', 'poster')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer border-none ${
                              imageAssignments.poster === 'poster' 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            پوستر اصلی
                          </button>
                          <button
                            type="button"
                            onClick={() => assignImageRole('poster', 'gallery')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer border-none ${
                              imageAssignments.poster === 'gallery' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            گالری
                          </button>
                          <button
                            type="button"
                            onClick={() => assignImageRole('poster', 'none')}
                            className={`py-1 px-2 rounded text-[10px] font-bold transition-all cursor-pointer border-none ${
                              imageAssignments.poster === 'none' 
                                ? 'bg-gray-600 text-white' 
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[2/3] bg-gray-100 dark:bg-slate-950 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">پوستر یافت نشد</span>
                      </div>
                    )}
                  </div>

                  {/* Backdrop Column */}
                  <div className="space-y-2 md:col-span-2">
                    <span className="text-[11px] font-bold text-gray-500 block">تصویر ۲ (Backdrop پیش‌فرض):</span>
                    {fetchedImages.backdrop ? (
                      <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800">
                        <div 
                          className={`relative aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all ${
                            imageAssignments.backdrop === 'poster' ? 'border-indigo-600 shadow-md' :
                            imageAssignments.backdrop === 'gallery' ? 'border-emerald-600 shadow-md' :
                            'border-gray-200 dark:border-gray-800 opacity-45'
                          }`}
                        >
                          <img 
                            src={fetchedImages.backdrop} 
                            alt="Backdrop" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {imageAssignments.backdrop === 'poster' && (
                            <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">🖼️ پوستر اصلی</span>
                          )}
                          {imageAssignments.backdrop === 'gallery' && (
                            <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">📷 گالری تصاویر</span>
                          )}
                          {imageAssignments.backdrop === 'none' && (
                            <span className="absolute top-2 right-2 bg-gray-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">❌ عدم انتخاب</span>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded px-2 py-0.5 text-center">
                            <span className="text-[8px] font-bold text-white font-mono">backdrop.jpg</span>
                          </div>
                        </div>
                        {/* Selector Buttons */}
                        <div className="flex gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => assignImageRole('backdrop', 'poster')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer border-none ${
                              imageAssignments.backdrop === 'poster' 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            پوستر اصلی
                          </button>
                          <button
                            type="button"
                            onClick={() => assignImageRole('backdrop', 'gallery')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer border-none ${
                              imageAssignments.backdrop === 'gallery' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            گالری
                          </button>
                          <button
                            type="button"
                            onClick={() => assignImageRole('backdrop', 'none')}
                            className={`py-1 px-2 rounded text-[10px] font-bold transition-all cursor-pointer border-none ${
                              imageAssignments.backdrop === 'none' 
                                ? 'bg-gray-600 text-white' 
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gray-100 dark:bg-slate-950 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">پس‌زمینه یافت نشد</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extra Gallery Scenes */}
                {fetchedImages.gallery && fetchedImages.gallery.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-gray-500 block">سایر تصاویر گالری سریال (Scenes):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {fetchedImages.gallery.map((url, idx) => {
                        const currentRole = imageAssignments.gallery[idx];
                        return (
                          <div key={idx} className="space-y-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-150 dark:border-slate-800">
                            <div 
                              className={`relative aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all ${
                                currentRole === 'poster' ? 'border-indigo-600 shadow-md' :
                                currentRole === 'gallery' ? 'border-emerald-600 shadow-md' :
                                'border-gray-200 dark:border-gray-800 opacity-45'
                              }`}
                            >
                              <img 
                                src={url} 
                                alt={`Gallery scene ${idx + 1}`} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              {currentRole === 'poster' && (
                                <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10">🖼️ پوستر اصلی</span>
                              )}
                              {currentRole === 'gallery' && (
                                <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10">📷 گالری تصاویر</span>
                              )}
                              {currentRole === 'none' && (
                                <span className="absolute top-2 right-2 bg-gray-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10">❌ عدم انتخاب</span>
                              )}
                              <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-center">
                                <span className="text-[8px] font-bold text-white">gallery_{idx + 1}.jpg</span>
                              </div>
                            </div>
                            {/* Selector Buttons */}
                            <div className="flex gap-1 justify-center">
                              <button
                                type="button"
                                onClick={() => assignImageRole(idx, 'poster')}
                                className={`flex-1 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer border-none ${
                                  currentRole === 'poster' 
                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                پوستر
                              </button>
                              <button
                                type="button"
                                onClick={() => assignImageRole(idx, 'gallery')}
                                className={`flex-1 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer border-none ${
                                  currentRole === 'gallery' 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                گالری
                              </button>
                              <button
                                type="button"
                                onClick={() => assignImageRole(idx, 'none')}
                                className={`py-0.5 px-1.5 rounded text-[9px] font-bold transition-all cursor-pointer border-none ${
                                  currentRole === 'none' 
                                    ? 'bg-gray-600 text-white shadow-sm' 
                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-950/40 border-t border-gray-150 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                کل تصاویر انتخابی جهت دانلود: {[
                  imageAssignments.poster !== 'none',
                  imageAssignments.backdrop !== 'none',
                  ...imageAssignments.gallery.map(g => g !== 'none')
                ].filter(Boolean).length} عدد
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImagePickerModal(false)}
                  className="h-10 px-4 bg-white hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={downloadSelectedImages}
                  disabled={isDownloadingImages}
                  className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 border-none"
                >
                  {isDownloadingImages ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>در حال دانلود...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>دانلود و ذخیره روی سیستم</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
