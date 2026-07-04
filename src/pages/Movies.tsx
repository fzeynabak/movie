/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { Movie, MediaCategory, getSafePosterUrl } from '../types';
import { toPersianNums, formatCurrency } from './Dashboard';
import { showToast, showAlert, showConfirm } from '../utils/toast';
import { MediaScanner, ScannedMediaItem } from '../utils/MediaScanner';
import { SettingsService } from '../utils/SettingsService';
import { TMDbService } from '../utils/TMDbService';
import { ScanPreviewModal } from '../components/ScanPreviewModal';
import { 
  Play, 
  FolderOpen, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  X, 
  Info, 
  Maximize2, 
  DollarSign, 
  Check, 
  AlertCircle,
  Film,
  Volume2,
  FileVideo,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Globe,
  Download,
  Network,
  Grid,
  List
} from 'lucide-react';

export const CATEGORIES: MediaCategory[] = ['ایرانی', 'خارجی', 'انیمیشن', 'کره‌ای', 'هندی', 'متفرقه'];

const PRESET_POSTERS = [
  { name: 'درام/ملودرام', url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400' },
  { name: 'پلیسی/جنایی', url: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&q=80&w=400' },
  { name: 'تخیلی/حماسی', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400' },
  { name: 'فانتزی/انیمیشن', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400' },
  { name: 'رایگان/سرگرمی', url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400' }
];

export const POPULAR_GENRES = [
  'درام', 'کمدی', 'اکشن', 'علمی تخیلی', 'ترسناک', 
  'هیجان انگیز', 'مستند', 'خانوادگی', 'جنایی', 
  'معمایی', 'عاشقانه', 'تاریخی', 'بیوگرافی', 'ماجراجویی', 
  'انیمیشن', 'جنگی', 'موزیکال', 'وسترن', 'ورزشی', 
  'اجتماعی', 'فانتزی', 'فیلم کوتاه', 'برنامه تلویزیونی'
];

interface MoviesProps {
  onAddToCart?: (item: any) => void;
  cartItems?: any[];
  activeCustomer?: { id: string; name: string; phone: string; } | null;
  initialSelectedId?: string | null;
  onClearInitialSelectedId?: () => void;
}

export default function Movies({ 
  onAddToCart, 
  cartItems = [], 
  activeCustomer,
  initialSelectedId,
  onClearInitialSelectedId
}: MoviesProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'همه'>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters
  const [filterCountry, setFilterCountry] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [filterMinImdb, setFilterMinImdb] = useState('');
  const [filterCrew, setFilterCrew] = useState('');
  const [sortBy, setSortBy] = useState<'titleFa' | 'year' | 'imdbRating' | 'addedAt' | 'salePrice'>('addedAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [scannedFiles, setScannedFiles] = useState<ScannedMediaItem[]>([]);
  const [showScanPreviewModal, setShowScanPreviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showFormModal, setShowFormModal] = useState(false);

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
  const [formDuration, setFormDuration] = useState('');
  const [formCountry, setFormCountry] = useState('ایران');
  const [formLanguage, setFormLanguage] = useState('فارسی (دوبله)');
  const [formImdbRating, setFormImdbRating] = useState('');
  const [formQuality, setFormQuality] = useState(() => dbService.getSettings().defaultQuality || '1080p BluRay');
  const [formSubtitle, setFormSubtitle] = useState('فارسی (دوبله)');
  const [formGenres, setFormGenres] = useState<string[]>([]);
  const [formPoster, setFormPoster] = useState(PRESET_POSTERS[0].url);
  const [formSummary, setFormSummary] = useState('');
  const [formFilePath, setFormFilePath] = useState('');
  const [formOfficialSite, setFormOfficialSite] = useState('');
  const [formGallery, setFormGallery] = useState('');
  const [formSubtitlesList, setFormSubtitlesList] = useState<string[]>([]);
  const [activeBrowserUrl, setActiveBrowserUrl] = useState<string | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [galleryZoomScale, setGalleryZoomScale] = useState(1);
  const [formCollectionName, setFormCollectionName] = useState('');
  const [movieSearchText, setMovieSearchText] = useState('');
  const [showAddColMovieBox, setShowAddColMovieBox] = useState(false);

  // JSON Quick Import State
  const [importText, setImportText] = useState('');

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
  }>({ poster: 'poster', backdrop: 'gallery', gallery: [] });

  const assignImageRole = (type: 'poster' | 'backdrop' | number, role: 'poster' | 'gallery' | 'none') => {
    setImageAssignments(prev => {
      let nextPoster = prev.poster;
      let nextBackdrop = prev.backdrop;
      let nextGallery = [...prev.gallery];

      if (role === 'poster') {
        if (nextPoster === 'poster') nextPoster = 'gallery';
        if (nextBackdrop === 'poster') nextBackdrop = 'gallery';
        nextGallery = nextGallery.map(g => g === 'poster' ? 'gallery' : g);
      }

      if (type === 'poster') {
        nextPoster = role;
      } else if (type === 'backdrop') {
        nextBackdrop = role;
      } else {
        nextGallery[type] = role;
      }

      return {
        poster: nextPoster,
        backdrop: nextBackdrop,
        gallery: nextGallery
      };
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
    showToast('در حال دریافت و ذخیره تصاویر انتخابی در پوشه...');
    
    try {
      const isWindows = downloadDestFolder.includes('\\');
      const picFolder = downloadDestFolder.trim() + (isWindows ? '\\pic' : '/pic');

      // Identify which image is assigned as poster and which are gallery
      let posterUrlToDownload = '';
      const galleryUrlsToDownload: string[] = [];

      if (fetchedImages.poster) {
        if (imageAssignments.poster === 'poster') {
          posterUrlToDownload = fetchedImages.poster;
        } else if (imageAssignments.poster === 'gallery') {
          galleryUrlsToDownload.push(fetchedImages.poster);
        }
      }

      if (fetchedImages.backdrop) {
        if (imageAssignments.backdrop === 'poster') {
          posterUrlToDownload = fetchedImages.backdrop;
        } else if (imageAssignments.backdrop === 'gallery') {
          galleryUrlsToDownload.push(fetchedImages.backdrop);
        }
      }

      fetchedImages.gallery.forEach((url, idx) => {
        const role = imageAssignments.gallery[idx];
        if (role === 'poster') {
          posterUrlToDownload = url;
        } else if (role === 'gallery') {
          galleryUrlsToDownload.push(url);
        }
      });

      if (window.electronAPI && window.electronAPI.savePosterLocal) {
        if (posterUrlToDownload) {
          const res = await window.electronAPI.savePosterLocal(posterUrlToDownload, picFolder, 'poster');
          if (res && res.success) {
            setFormPoster(res.savedPath);
          } else {
            console.error('Failed to download poster:', res?.error);
            setFormPoster(posterUrlToDownload);
          }
        } else {
          setFormPoster('');
        }

        const localGallery: string[] = [];
        for (let i = 0; i < galleryUrlsToDownload.length; i++) {
          const imgUrl = galleryUrlsToDownload[i];
          const res = await window.electronAPI.savePosterLocal(imgUrl, picFolder, `gallery_${i + 1}`);
          if (res && res.success) {
            localGallery.push(res.savedPath);
          } else {
            localGallery.push(imgUrl);
          }
        }

        setFormGallery(localGallery.join(','));
        showToast('تمام تصاویر انتخابی با موفقیت ذخیره و به فرم متصل شدند.');
        setShowImagePickerModal(false);
      } else {
        // Fallback for online preview
        setFormPoster(posterUrlToDownload);
        setFormGallery(galleryUrlsToDownload.join(','));
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
    setFormDuration(metadata.runtime ? `${metadata.runtime} دقیقه` : '۱۲۰ دقیقه');
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

    setFormSummary(metadata.overview || '');
    setFormOfficialSite(`https://www.themoviedb.org/movie/${metadata.id}`);
    setFormCollectionName(`TMDb ID: ${metadata.id}`);

    // Pre-populate destination folder from file path if possible
    let defaultDest = '';
    if (formFilePath) {
      const dirIndex = Math.max(formFilePath.lastIndexOf('/'), formFilePath.lastIndexOf('\\'));
      if (dirIndex !== -1) {
        defaultDest = formFilePath.substring(0, dirIndex);
      } else {
        defaultDest = formFilePath;
      }
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

    showToast('مشخصات متنی فیلم دریافت شد. لطفاً تصاویر مورد نیاز را تایید و ذخیره کنید.');
    setShowImagePickerModal(true);
  };

  const handleSearchTmdb = async () => {
    if (!tmdbSearchQuery.trim()) {
      showToast('لطفاً نام فیلم را وارد کنید.', 'error');
      return;
    }
    if (!SettingsService.hasCredentials()) {
      showToast('لطفاً ابتدا تنظیمات TMDb را در بخش تنظیمات پیکربندی کنید.', 'error');
      return;
    }
    setIsSearchingTmdb(true);
    setTmdbResults([]);
    try {
      const response = await TMDbService.searchMovie(tmdbSearchQuery.trim());
      if (response && response.length > 0) {
        setTmdbResults(response.slice(0, 5));
        showToast(`تعداد ${response.length} فیلم پیدا شد.`);
      } else {
        showToast('هیچ فیلمی با این نام در TMDb پیدا نشد.', 'error');
      }
    } catch (err: any) {
      console.error('TMDb manual search error:', err);
      showToast('خطا در ارتباط با سرور TMDb.', 'error');
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const handleFetchTmdbByIdOrUrl = async () => {
    const parsedInfo = extractTmdbIdAndType(tmdbSearchId, 'movie');
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
      const metadata = await TMDbService.fetchMetadata(parsedInfo.id, 'movie');
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

  const triggerAutoTmdbSearchFromFile = async (filePath: string) => {
    if (!SettingsService.hasCredentials()) return;
    try {
      const winIdx = filePath.lastIndexOf('\\');
      const nixIdx = filePath.lastIndexOf('/');
      const idx = Math.max(winIdx, nixIdx);
      const filename = idx !== -1 ? filePath.substring(idx + 1) : filePath;
      
      const { FilenameParser } = await import('../utils/FilenameParser');
      const parsed = FilenameParser.parse(filename) as any;
      
      const fileFolder = idx !== -1 ? filePath.substring(0, idx) : '';
      const fWinIdx = fileFolder.lastIndexOf('\\');
      const fNixIdx = fileFolder.lastIndexOf('/');
      const fIdx = Math.max(fWinIdx, fNixIdx);
      const parentFolderName = fIdx !== -1 ? fileFolder.substring(fIdx + 1) : fileFolder;

      setFormTitleFa(parentFolderName || parsed.title);
      setFormTitleEn(parsed.title);
      if (parsed.year) setFormYear(parsed.year);
      if (parsed.resolution) setFormQuality(parsed.resolution);

      showToast('در حال جستجوی خودکار مشخصات در TMDb...');
      const metadata = await TMDbService.findBestMatch(parsed, parentFolderName);
      if (metadata) {
        await populateFormWithTmdb(metadata);
      } else {
        showToast('مشخصات خودکار در TMDb یافت نشد. می‌توانید دستی جستجو یا لینک وارد کنید.', 'info');
        setTmdbSearchQuery(parentFolderName || parsed.title);
      }
    } catch (err) {
      console.error('Auto TMDb search failed:', err);
    }
  };

  // Dynamic Lists supported by user-added categories and qualities
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);

  // Advanced Filters for Actors & Directors
  const [filterActor, setFilterActor] = useState('');
  const [filterDirector, setFilterDirector] = useState('');

  // Split helper for actors and directors (separated by spaces, dashes, commas, etc)
  const splitActors = (actorsStr: string) => {
    if (!actorsStr) return [];
    return actorsStr.split(/[-،,;\n]+/).map(x => x.trim()).filter(Boolean);
  };

  const splitDirectors = (directorsStr: string) => {
    if (!directorsStr) return [];
    return directorsStr.split(/[-،,;\n]+/).map(x => x.trim()).filter(Boolean);
  };

  // Hidden HTML5 Canvas compression to make posters standard sized and optimized
  const resizeImageToPoster = (dataUrlOrFile: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrlOrFile || dataUrlOrFile.startsWith('http')) {
        resolve(dataUrlOrFile);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        const targetWidth = 400;
        const targetHeight = 600;
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imgRatio = img.width / img.height;
          const targetRatio = targetWidth / targetHeight;
          let drawWidth = img.width;
          let drawHeight = img.height;
          let offsetX = 0;
          let offsetY = 0;
          
          if (imgRatio > targetRatio) {
            drawWidth = img.height * targetRatio;
            offsetX = (img.width - drawWidth) / 2;
          } else {
            drawHeight = img.width / targetRatio;
            offsetY = (img.height - drawHeight) / 2;
          }
          
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, targetWidth, targetHeight);
          try {
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch {
            resolve(dataUrlOrFile);
          }
        } else {
          resolve(dataUrlOrFile);
        }
      };
      img.onerror = () => {
        resolve(dataUrlOrFile);
      };
      img.src = dataUrlOrFile;
    });
  };

  const handleAddCustomCategory = (name: string) => {
    if (!name.trim()) return;
    const settings = dbService.getSettings();
    const existing = settings.customCategories || [];
    if (existing.includes(name.trim())) {
      alert('این دسته‌بندی از قبل وجود دارد.');
      return;
    }
    const updated = [...existing, name.trim()];
    dbService.updateSettings({ customCategories: updated });
    
    const presetsCategories = ['ایرانی', 'خارجی', 'انیمیشن', 'کره‌ای', 'هندی', 'متفرقه'];
    setAvailableCategories([...presetsCategories, ...updated]);
    setFormCategory(name.trim());
    alert(`دسته‌بندی "${name.trim()}" با موفقیت اضافه شد.`);
  };

  const handleAddCustomQuality = (name: string) => {
    if (!name.trim()) return;
    const settings = dbService.getSettings();
    const existing = settings.customQualities || [];
    if (existing.includes(name.trim())) {
      alert('این کیفیت از قبل وجود دارد.');
      return;
    }
    const updated = [...existing, name.trim()];
    dbService.updateSettings({ customQualities: updated });
    
    const presetsQualities = ['1080p Web-DL', '1080p BluRay', '4K UHD Bluray', '720p HD'];
    setAvailableQualities([...presetsQualities, ...updated]);
    setFormQuality(name.trim());
    showToast(`کیفیت "${name.trim()}" با موفقیت اضافه شد.`);
  };

  const handleImportJson = () => {
    try {
      if (!importText.trim()) {
        showToast('لطفاً ابتدا کد JSON فیلم را در کادر مربوطه وارد نمایید.', 'warning');
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
      
      if (parsed.duration) setFormDuration(parsed.duration);
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
          setAvailableQualities([...presetQ, ...updated]);
        }
        setFormQuality(parsed.quality);
      }
      
      if (parsed.subtitle) setFormSubtitle(parsed.subtitle);
      if (parsed.genres) {
        if (Array.isArray(parsed.genres)) setFormGenres(parsed.genres);
      }
      const posterVal = parsed.poster || parsed.posterUrl || parsed.imageUrl;
      if (posterVal) {
        resizeImageToPoster(posterVal).then(res => {
          setFormPoster(res);
        });
      }
      if (parsed.summary) setFormSummary(parsed.summary);
      if (parsed.filePath) setFormFilePath(parsed.filePath);
      if (parsed.officialSite) setFormOfficialSite(parsed.officialSite);
      
      if (parsed.category) {
        const settings = dbService.getSettings();
        const customC = settings.customCategories || [];
        const presetC = ['ایرانی', 'خارجی', 'انیمیشن', 'کره‌ای', 'هندی', 'متفرقه'];
        const allC = [...presetC, ...customC];
        if (!allC.includes(parsed.category)) {
          const updated = [...customC, parsed.category];
          dbService.updateSettings({ customCategories: updated });
          setAvailableCategories([...presetC, ...updated]);
        }
        setFormCategory(parsed.category);
      }
      
      if (parsed.collectionName) {
        setFormCollectionName(parsed.collectionName);
      }

      if (parsed.gallery) {
        if (Array.isArray(parsed.gallery)) {
          setFormGallery(parsed.gallery.join(', '));
        } else {
          setFormGallery(parsed.gallery);
        }
      }
      
      showToast('اطلاعات فیلم از قالب JSON خوانده شد و در فرم فیلدها پر گردید.');
    } catch (e) {
      showAlert('خطا در خواندن قالب JSON. از صحت ساختار متن اطمینان حاصل فرمایید.', 'error');
    }
  };

  const loadExampleJson = () => {
    const example = {
      titleFa: "بمب؛ یک عاشقانه",
      titleEn: "Bomb; A Love Story",
      category: "ایرانی",
      year: "۱۳۹۶",
      director: "پیمان معادی",
      writer: "پیمان معادی",
      actors: "پیمان معادی- لیلا حاتمی- سیامک انصاری- حبیب رضایی",
      duration: "۹۷ دقیقه",
      country: "ایران",
      language: "فارسی (دوبله)",
      imdbRating: "۶.۸",
      quality: "1080p BluRay",
      subtitle: "بدون زیرنویس",
      genres: ["درام", "عاشقانه", "تاریخی"],
      posterUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400",
      summary: "در بحبوحه جنگ ایران و عراق و بمباران‌های تهران، عشقی آرام بین یک زن و شوهر شکل می‌گیرد...",
      officialSite: "https://www.imdb.com/title/t7959074/",
      filePath: "D:\\Media\\Movies\\Bomb.A.Love.Story.1080p.mkv",
      collectionName: "مجموعه آثار پیمان معادی"
    };
    setImportText(JSON.stringify(example, null, 2));
  };

  const handleSavePosterLocally = async () => {
    if (!formPoster) {
      alert('ابتدا آدرس تصویر پوستر یا لینک آن را ثبت کنید.');
      return;
    }
    if (!formFilePath) {
      alert('لطفا ابتدا آدرس پوشه لوکال فیلم را وارد یا جستجو کنید.');
      return;
    }
    try {
      if (window.electronAPI && window.electronAPI.savePosterLocal) {
        const res = await window.electronAPI.savePosterLocal(formPoster, formFilePath, 'poster');
        if (res && res.success && res.savedPath) {
          setFormPoster(res.savedPath);
          alert('تصویر پوستر با موفقیت دانلود و در پوشه فیلم شما ذخیره شد:\n'.concat(res.savedPath));
        } else {
          alert('خطا در ذخیره پوستر: ' + (res?.error || 'خطای انتقال تصویر'));
        }
      }
    } catch (err: any) {
      alert('خطا در ذخیره محلی پوستر: ' + err.message);
    }
  };

  // Detail & Play Modals
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [zoomedPoster, setZoomedPoster] = useState<string | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [exploringFolder, setExploringFolder] = useState<Movie | null>(null);
  const [sellingMovie, setSellingMovie] = useState<Movie | null>(null);

  // Sales Form fields (deprecated individual register modal)
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [salePrice, setSalePrice] = useState(2000);
  const [saleDiscount, setSaleDiscount] = useState(0);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (initialSelectedId && movies.length > 0) {
      const match = movies.find(m => m.id === initialSelectedId);
      if (match) {
        setDetailMovie(match);
      }
      if (onClearInitialSelectedId) {
        onClearInitialSelectedId();
      }
    }
  }, [initialSelectedId, movies]);

  useEffect(() => {
    if (!selectedGalleryImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const galleryList = detailMovie?.gallery || [];
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
  }, [selectedGalleryImage, detailMovie]);

  const refreshData = () => {
    const list = dbService.getMovies();
    setMovies(list);
    const settings = dbService.getSettings();
    setPageSize(settings.pageSize || 20);
    setSalePrice(settings.defaultMoviePrice || 2000);
  };

  // Populate form with film details for editing
  const handleOpenEdit = (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMovie(movie);
    setFormCategory(movie.category);
    setFormTitleFa(movie.titleFa);
    setFormTitleEn(movie.titleEn);
    setFormYear(movie.year);
    setFormDirector(movie.director);
    setFormWriter(movie.writer);
    setFormActors(movie.actors);
    setFormDuration(movie.duration);
    setFormCountry(movie.country || 'ایران');
    setFormLanguage(movie.language || 'دوبله فارسی');
    setFormImdbRating(movie.imdbRating);
    setFormQuality(movie.quality);
    setFormSubtitle(movie.subtitle);
    setFormGenres(movie.genres || []);
    setFormPoster(movie.poster);
    setFormSummary(movie.summary);
    setFormFilePath(movie.filePath);
    setFormOfficialSite(movie.officialSite || '');
    setFormGallery(movie.gallery ? movie.gallery.join(', ') : '');
    setFormCollectionName(movie.collectionName || '');
    setFormSubtitlesList(movie.subtitlesList || []);
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
    setFormDuration('۱۲۰ دقیقه');
    setFormCountry('ایران');
    setFormLanguage('دوبله فارسی');
    setFormImdbRating('۷.۵');
    const setts = dbService.getSettings();
    setFormQuality(setts.defaultQuality || '1080p BluRay');
    setFormSubtitle('دوبله فارسی');
    setFormGenres(['درام', 'اجتماعی']);
    setFormPoster('');
    setFormSummary('');
    setFormFilePath('');
    setFormOfficialSite('');
    setFormGallery('');
    setFormCollectionName('');
    setFormSubtitlesList([]);
  };

  const handleOpenCreate = () => {
    if (editingMovie !== null) {
      clearFormFields();
    }
    setEditingMovie(null);
    setShowFormModal(true);
  };

  const handleDeleteMovie = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('آیا از حذف این فیلم اطمینان دارید؟')) {
      dbService.deleteMovie(id);
      refreshData();
      if (detailMovie && detailMovie.id === id) {
        setDetailMovie(null);
      }
    }
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
      // standard client web browser pick
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

  const handlePickFilePath = () => {
    if (window.electronAPI) {
      window.electronAPI.selectFile().then((path: string) => {
        if (path) {
          setFormFilePath(path);
          if (!formTitleFa.trim() && !formTitleEn.trim()) {
            triggerAutoTmdbSearchFromFile(path);
          } else {
            showToast('مسیر فیزیکی فایل ثبت شد بدون تغییر اطلاعات از قبل دریافت شده فیلم.', 'info');
          }
        }
      }).catch((err: any) => {
        console.error('Failed to select file natively:', err);
      });
    } else {
      const inputPath = window.prompt('(شبیه‌ساز آنلاین) آدرس فیزیکی فایل این فیلم را وارد کنید:', formFilePath || 'D:\\Media\\Movies\\MovieName.mkv');
      if (inputPath !== null) {
        setFormFilePath(inputPath);
      }
    }
  };

  const handlePickSubtitlePath = () => {
    if (window.electronAPI) {
      window.electronAPI.selectFile([
        { name: 'Subtitle Files', extensions: ['srt', 'vtt', 'sub', 'ass', 'SRT', 'VTT'] },
        { name: 'All Files', extensions: ['*'] }
      ]).then((path: string) => {
        if (path) {
          setFormSubtitlesList(prev => {
            if (prev.includes(path)) return prev;
            return [...prev, path];
          });
        }
      }).catch((err: any) => {
        console.error('Failed to select subtitle file natively:', err);
      });
    } else {
      const inputPath = window.prompt('(شبیه‌ساز آنلاین) آدرس فیزیکی فایل زیرنویس را وارد کنید:', 'D:\\Media\\Movies\\MovieName.srt');
      if (inputPath !== null && inputPath.trim() !== '') {
        setFormSubtitlesList(prev => {
          if (prev.includes(inputPath.trim())) return prev;
          return [...prev, inputPath.trim()];
        });
      }
    }
  };

  const handleExportSingleMovieJson = (movie: Movie) => {
    try {
      const dataStr = JSON.stringify(movie, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const sanitizedTitle = (movie.titleEn || movie.titleFa || 'movie').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
      const exportFileDefaultName = `movie_${sanitizedTitle}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showToast('مشخصات این فیلم با موفقیت به صورت فایل JSON برون‌بری شد.');
    } catch {
      showToast('خطا در برون‌بری اطلاعات فیلم.', 'error');
    }
  };

  const handlePlayFile = async (filePath: string, originPeerIp?: string) => {
    if (!filePath) {
      showAlert('مسیری برای این فیلم ثبت نشده است. ابتدا اطلاعات را ویرایش کرده و آدرس فایل را وارد نمایید.', 'warning');
      return;
    }
    const settings = dbService.getSettings();
    if (settings.videoPlayerMode === 'internal') {
      const matchedMovie = movies.find(m => m.filePath === filePath);
      const videoTitle = matchedMovie ? matchedMovie.titleFa : 'پخش فیلم';
      const subtitlesList = matchedMovie ? matchedMovie.subtitlesList : [];
      const event = new CustomEvent('play_video_internal', {
        detail: { filePath, title: videoTitle, originPeerIp, subtitlesList }
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
      showAlert(`پورت سیستم: پخش فیلم به نرم‌افزار پیش‌فرض سیستم فرستاده می‌شود.\n\nمسیر فایل:\n${filePath}`, 'info', 'شبیه‌ساز پخش فیلم');
    }
  };

  const handleOpenFolder = async (filePath: string, originPeerIp?: string) => {
    if (!filePath) {
      showAlert('مسیری برای این فیلم ثبت نشده است. ابتدا اطلاعات را ویرایش کرده و آدرس فایل را وارد نمایید.', 'warning');
      return;
    }
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.openFileInExplorer(filePath, originPeerIp);
        if (res && !res.success) {
          showAlert('خطا در کاربرای اکسپلورر: ' + res.error, 'error');
        }
      } catch (err) {
        console.error('Failed to open folder natively:', err);
      }
    } else {
      showAlert(`شبیه‌ساز مرورگر: پوشه حاوی این فایل در سیستم باز می‌شود.\n\nمسیر فایل:\n${filePath}`, 'info', 'نمایش در پوشه');
    }
  };

  const handleSaveMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleFa || !formTitleEn) {
      alert('لطفا فیلدهای نام فارسی و انگلیسی فیلم را تکمیل کنید.');
      return;
    }

    const existingMovies = dbService.getMovies();
    const isDuplicate = existingMovies.some(m => {
      if (editingMovie && m.id === editingMovie.id) return false;
      const sameTitleFa = m.titleFa.trim() === formTitleFa.trim();
      const sameTitleEn = m.titleEn.trim().toLowerCase() === formTitleEn.trim().toLowerCase();
      const sameFilePath = formFilePath && formFilePath.trim() !== '' && m.filePath && m.filePath.trim().toLowerCase() === formFilePath.trim().toLowerCase();
      return sameTitleFa || sameTitleEn || sameFilePath;
    });

    if (isDuplicate) {
      showAlert('این فیلم از قبل در سیستم موجود است! عنوان فارسی، عنوان انگلیسی یا مسیر فایل این فیلم تکراری است.', 'warning');
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
      duration: formDuration,
      country: formCountry,
      language: formLanguage,
      imdbRating: formImdbRating,
      quality: formQuality,
      subtitle: formSubtitle,
      genres: formGenres,
      poster: formPoster || PRESET_POSTERS[4].url,
      summary: formSummary,
      filePath: formFilePath,
      officialSite: formOfficialSite,
      gallery: formGallery ? formGallery.split(',').map(s => s.trim()).filter(Boolean) : [],
      purchasePrice: 0,
      salePrice: settings.defaultMoviePrice,
      collectionName: formCollectionName.trim() || undefined,
      subtitlesList: formSubtitlesList
    };

    if (editingMovie) {
      dbService.updateMovie(editingMovie.id, payload);
    } else {
      dbService.addMovie(payload);
    }

    setShowFormModal(false);
    clearFormFields();
    refreshData();
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

  // Open Direct Sale Dialog 💰 - Simplified to directly add to cart for movies
  const handleOpenSale = (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    const settings = dbService.getSettings();
    const defaultPrice = settings.defaultMoviePrice || movie.salePrice || 2000;
    
    if (onAddToCart) {
      onAddToCart({
        mediaId: movie.id,
        mediaTitle: movie.titleFa,
        mediaType: 'movie',
        salesType: 'movie',
        details: `فیلم سینمایی (${movie.quality || 'HD'})`,
        purchasePrice: movie.purchasePrice || 0,
        salePrice: defaultPrice,
        filePath: movie.filePath,
        videoPaths: [movie.filePath]
      });
      showToast(`فیلم "${movie.titleFa}" به سبد خرید اضافه شد.`, 'success');
      return;
    }

    dbService.addSale({
      customerName: 'مشتری متفرقه دفتری',
      mediaId: movie.id,
      mediaTitle: movie.titleFa,
      mediaType: 'movie',
      salesType: 'movie',
      details: 'فروش مستقیم فیلم',
      purchasePrice: movie.purchasePrice || 0,
      salePrice: defaultPrice,
      discount: 0
    });
    alert('تراکنش فروش با موفقیت به دیتابیس مالی افزوده شد.');
  };

  const handleRegisterSale = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Helper to convert Persian numerals to English numerals
  const toGregorianNumStr = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '';
    return str.toString()
      .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
  };

  // Filter & Search Logic
  const filteredMovies = movies.filter(movie => {
    const movieCats = movie.category ? movie.category.split(',').map(c => c.trim()) : [];
    const matchesCategory = selectedCategory === 'همه' || movieCats.includes(selectedCategory);
    const matchesSearch = 
      movie.titleFa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.actors.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry = !filterCountry || movie.country.includes(filterCountry);
    const matchesLanguage = !filterLanguage || movie.language.includes(filterLanguage);
    const matchesGenre = !filterGenre || movie.genres.some(g => g.includes(filterGenre));
    const matchesYear = !filterYear || toGregorianNumStr(movie.year).includes(toGregorianNumStr(filterYear));
    const matchesQuality = !filterQuality || movie.quality.toLowerCase().includes(filterQuality.toLowerCase());
    
    const imdbVal = parseFloat(toGregorianNumStr(movie.imdbRating)) || 0;
    const minImdbVal = parseFloat(toGregorianNumStr(filterMinImdb)) || 0;
    const matchesMinImdb = !filterMinImdb || imdbVal >= minImdbVal;
    
    const matchesCrew = !filterCrew || 
      movie.director.toLowerCase().includes(filterCrew.toLowerCase()) ||
      movie.actors.toLowerCase().includes(filterCrew.toLowerCase()) ||
      (movie.writer && movie.writer.toLowerCase().includes(filterCrew.toLowerCase()));

    // Advanced Column-Header Filters
    const matchesColTitleFa = !colFilters.titleFa || movie.titleFa.toLowerCase().includes(colFilters.titleFa.toLowerCase());
    const matchesColTitleEn = !colFilters.titleEn || movie.titleEn.toLowerCase().includes(colFilters.titleEn.toLowerCase());
    const matchesColQuality = !colFilters.quality || movie.quality.toLowerCase().includes(colFilters.quality.toLowerCase());
    const matchesColImdb = !colFilters.imdbRating || movie.imdbRating.toLowerCase().includes(colFilters.imdbRating.toLowerCase());
    const matchesColYear = !colFilters.year || movie.year.toLowerCase().includes(colFilters.year.toLowerCase());
    const matchesColCategory = !colFilters.category || (movie.category || '').toLowerCase().includes(colFilters.category.toLowerCase());

    return matchesCategory && matchesSearch && matchesCountry && matchesLanguage && matchesGenre && matchesYear && matchesQuality && matchesMinImdb && matchesCrew &&
      matchesColTitleFa && matchesColTitleEn && matchesColQuality && matchesColImdb && matchesColYear && matchesColCategory;
  });

  // Sorting
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    let fieldA: any = a[sortBy];
    let fieldB: any = b[sortBy];

    // Numbers check
    if (sortBy === 'salePrice') {
      fieldA = a.salePrice;
      fieldB = b.salePrice;
    }

    if (sortOrder === 'desc') {
      return fieldA > fieldB ? -1 : 1;
    } else {
      return fieldA < fieldB ? -1 : 1;
    }
  });

  // Pagination Slicing
  const totalItems = sortedMovies.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedMovies = sortedMovies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Helper to extract unique genres present for recommendation dropdown
  const allAvailableGenres = Array.from(new Set(movies.flatMap(m => m.genres)));

  return (
    <div className="space-y-6" id="movies-tab-content">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-150 dark:border-gray-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100" id="movies-title">مدیریت فیلم‌ها</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">آرشیو و فروش فیلم‌ها در شش قالب مجزا با تفکیک ایرانی، خارجی، انیمیشن و...</p>
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
            className="flex items-center justify-center gap-1.5 px-4 h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
            id="btn-add-movie"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن فیلم جدید</span>
          </button>
        </div>
      </div>

      {/* Categories Tabs Selector and View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-150 dark:border-gray-800 pb-2" id="movies-category-selector-wrapper">
        <div className="flex items-center overflow-x-auto gap-2 pb-1 scrollbar-none" id="movies-category-selector">
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedCategory('همه'); setCurrentPage(1); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'همه' 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-950' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-150 dark:bg-[#1e293b] dark:text-gray-300 dark:border-gray-800 dark:hover:bg-slate-800'
            }`}
            id="cat-tab-all"
          >
            همه فیلم‌ها ({toPersianNums(movies.length)})
          </button>
          {CATEGORIES.map(cat => {
            const catCount = movies.filter(m => m.category && m.category.split(',').map(c => c.trim()).includes(cat)).length;
            return (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-150 dark:bg-[#1e293b] dark:text-gray-300 dark:border-gray-800 dark:hover:bg-slate-800'
                }`}
                id={`cat-tab-${cat}`}
              >
                {cat} ({toPersianNums(catCount)})
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
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
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
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title="نمای لیستی پیشرفته با فیلتر سرستون"
          >
            <List className="w-3.5 h-3.5" />
            <span>نمای لیستی پیشرفته</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter and Search Controls */}
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3" id="filters-container">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search */}
          <div className="flex-1 relative flex items-center">
            <Search className="absolute right-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در فیلم‌ها بر اساس نام، کارگردان، بازیگران..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pr-10 pl-4 h-10 bg-gray-50 dark:bg-slate-800/60 rounded-lg text-xs font-medium border border-gray-150 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              id="movie-search-input"
            />
          </div>

          {/* Toggle advanced filter panel */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 h-10 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              showFilters 
                ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900' 
                : 'bg-white text-gray-600 dark:bg-[#1e293b] dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200'
            }`}
            id="btn-advanced-filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>فیلترهای پیشرفته</span>
          </button>
        </div>

        {/* Floating Extended Filter Options */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800 animate-fadeIn" id="advanced-filters-panel">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {/* Country search */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">کشور سازنده</label>
                <input
                  type="text"
                  placeholder="مثلا: ایران، آمریکا..."
                  value={filterCountry}
                  onChange={(e) => { setFilterCountry(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2.5 bg-gray-50 dark:bg-slate-800/80 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-indigo-500 placeholder-gray-400"
                  id="filter-country"
                />
              </div>

              {/* Language filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">زبان فیلم</label>
                <select
                  value={filterLanguage}
                  onChange={(e) => { setFilterLanguage(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800/80 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  id="filter-language"
                >
                  <option value="">همه زبان‌ها</option>
                  <option value="دوبله فارسی">دوبله فارسی</option>
                  <option value="زبان اصلی">زبان اصلی</option>
                  <option value="دوزبانه (دوبله و زبان اصلی)">دوزبانه (دوبله و زبان اصلی)</option>
                </select>
              </div>

              {/* Genre filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">ژانر فیلم</label>
                <select
                  value={filterGenre}
                  onChange={(e) => { setFilterGenre(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800/80 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  id="filter-genre"
                >
                  <option value="">همه ژانرها</option>
                  {allAvailableGenres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Year filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">سال ساخت</label>
                <input
                  type="text"
                  placeholder="مثلا: ۱۴۰۲ یا ۲۰۲۳"
                  value={filterYear}
                  onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2.5 bg-gray-50 dark:bg-slate-800/80 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-indigo-500 placeholder-gray-400"
                  id="filter-year"
                />
              </div>

              {/* Quality selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">کیفیت فیلم</label>
                <select
                  value={filterQuality}
                  onChange={(e) => { setFilterQuality(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800/80 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  id="filter-quality"
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
                <label className="text-[10px] font-bold text-gray-500 block">حداقل امتیاز IMDb</label>
                <select
                  value={filterMinImdb}
                  onChange={(e) => { setFilterMinImdb(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800/80 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  id="filter-min-imdb"
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
                  placeholder="جستجوی کارگردان...”"
                  value={filterCrew}
                  onChange={(e) => { setFilterCrew(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-2.5 bg-gray-50 dark:bg-slate-800/80 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-indigo-500 placeholder-gray-400"
                  id="filter-crew"
                />
              </div>

              {/* Sorting and Reset Controls */}
              <div className="flex gap-1.5 pt-4 lg:pt-0 col-span-2 md:col-span-4 lg:col-span-1 items-end justify-between">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">ترتیب بر اساس</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full h-8 px-2 bg-gray-50 dark:bg-slate-800/80 rounded-md text-[11px] border border-gray-200 dark:border-gray-750 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    id="sort-by"
                  >
                    <option value="addedAt font-sans">تاریخ افزودن</option>
                    <option value="year font-sans">سال ساخت</option>
                    <option value="imdbRating font-sans">امتیاز IMDB</option>
                    <option value="titleFa font-sans">نام فارسی</option>
                    <option value="salePrice font-sans">قیمت فروش</option>
                  </select>
                </div>

                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="h-8 w-8 flex items-center justify-center bg-gray-100 hover:bg-gray-150 dark:bg-[#1e293b] hover:dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-750 cursor-pointer text-xs font-semibold shrink-0"
                  title={sortOrder === 'desc' ? 'نزولی' : 'صعودی'}
                  id="btn-toggle-sort-order"
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
                className="px-3.5 py-1 text-[10px] font-extrabold text-red-600 hover:text-red-750 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                id="btn-clear-filters"
              >
                پاکسازی تمامی فیلترها ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Output list of Movies */}
      {paginatedMovies.length === 0 ? (
        <div className="bg-white dark:bg-[#1e293b] p-12 text-center rounded-xl border border-gray-150 dark:border-gray-800 shadow-sm" id="empty-movies">
          <Film className="w-10 h-10 text-gray-350 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">کوششی با فیلتر شما یافت نشد!</h3>
          <p className="text-xs text-gray-400 mt-1">مدیا سنتر آرشیوی ندارد یا فیلتر خیلی سختی اعمال کرده‌اید.</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5" id="movies-grid">
          {paginatedMovies.map(movie => (
            <div
              key={movie.id}
              onClick={() => setDetailMovie(movie)}
              className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-150 dark:border-[#1e293b] overflow-hidden hover:shadow-lg transition-all flex flex-col group cursor-pointer border-transparent dark:hover:border-slate-800 relative shadow-sm"
              id={`movie-card-${movie.id}`}
            >
              {/* Image thumbnail and quick triggers */}
              <div className="aspect-[2/3] w-full bg-gray-100 relative overflow-hidden group">
                <img 
                  src={getSafePosterUrl(movie.poster)} 
                  alt={movie.titleFa}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-gray-900"
                  referrerPolicy="no-referrer"
                />
                
                {/* Category tag */}
                <div className="absolute top-2 right-2 flex flex-wrap gap-1 z-10 max-w-[85%]">
                  {(movie.category || 'متفرقه').split(',').map(cat => (
                    <span key={cat} className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md shrink-0">
                      {cat.trim()}
                    </span>
                  ))}
                </div>

                {/* IMDb Rating Badge */}
                <span className="absolute bottom-2 right-2 bg-black/75 text-amber-500 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-md z-10">
                  ★ {toPersianNums(movie.imdbRating)}
                </span>

                {/* Overlay actions (Hove Triggered) */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition-opacity z-20">
                  {/* Play Action ▶️ */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayFile(movie.filePath, movie.originPeerIp); }}
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-transform transform scale-95 hover:scale-105"
                    title="پخش ویدیو"
                    id={`btn-play-${movie.id}`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>

                  {/* Folder Open Action 📁 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenFolder(movie.filePath, movie.originPeerIp); }}
                    className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-transform transform scale-95 hover:scale-105"
                    title="باز کردن مسیر فایل"
                    id={`btn-folder-${movie.id}`}
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>

                  {/* Poster zoom action */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setZoomedPoster(getSafePosterUrl(movie.poster)); }}
                    className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-transform transform scale-95 hover:scale-105"
                    title="بزرگنمایی پوستر"
                    id={`btn-zoom-${movie.id}`}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {/* Sell Directly 💰 Action */}
                  <button
                    onClick={(e) => handleOpenSale(movie, e)}
                    className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-transform transform scale-95 hover:scale-105"
                    title="ثبت فروش این فیلم"
                    id={`btn-sell-${movie.id}`}
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Text Meta Container */}
              <div className="p-3.5 flex-1 flex flex-col justify-between" id={`movie-meta-${movie.id}`}>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate" title={movie.titleFa}>
                    {movie.titleFa}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{movie.titleEn}</p>
                  
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[9px] bg-gray-50 text-gray-400 border border-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700 px-1 py-0.5 rounded font-mono font-medium shrink-0">
                      {movie.quality}
                    </span>
                    <span className="text-[9px] bg-gray-50 text-gray-450 border border-gray-100 dark:bg-gray-800/10 dark:text-gray-300 dark:border-gray-700 px-1 py-0.5 rounded truncate max-w-[90px]">
                      {movie.subtitle}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800/60 mt-3 pt-3 flex items-center justify-between">
                  <span className="text-[10px] opacity-75 font-medium font-mono text-gray-500">{toPersianNums(movie.year)}</span>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-emerald-600 font-mono">{formatCurrency(movie.salePrice || dbService.getSettings().defaultMoviePrice)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenSale(movie, e); }}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm shrink-0"
                      title="ثبت و صدور سریع فاکتور فروش برای این فیلم"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>فروش</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Operations Footer (Edit/Delete icons) */}
              <div className="bg-gray-50 dark:bg-[#1a2236]/30 px-3 py-1.5 flex justify-between items-center border-t border-gray-100 dark:border-slate-800" id={`movie-footer-${movie.id}`}>
                {movie.officialSite ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveBrowserUrl(movie.officialSite); }}
                    className="flex items-center gap-1 text-[9px] font-semibold text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 px-1.5 py-0.5 rounded transition-all"
                    title="مشاهده سایت مراجع و مشخصات در مرورگر سینمایی"
                  >
                    <Globe className="w-3 h-3" />
                    <span>سایت مرجع</span>
                  </button>
                ) : (
                  <span className="text-[9px] text-gray-400 italic">آدرس مرجع ندارد</span>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => handleOpenEdit(movie, e)}
                    className="p-1 text-gray-405 hover:text-indigo-600 transition-colors"
                    title="ویرایش فیلم"
                    id={`edit-movie-${movie.id}`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteMovie(movie.id, e)}
                    className="p-1 text-gray-405 hover:text-red-600 transition-colors"
                    title="حذف فیلم"
                    id={`delete-movie-${movie.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-slate-800 rounded-xl shadow-sm" id="movies-list-table-container">
          <table className="w-full text-right border-collapse text-xs" dir="rtl">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#141d2e] border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                <th className="p-3 w-16 text-center font-bold">پوستر</th>
                
                <th className="p-3 min-w-[150px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('titleFa'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <span>عنوان فارسی</span>
                      {sortBy === 'titleFa' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.titleFa}
                      onChange={(e) => setColFilters(prev => ({ ...prev, titleFa: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[150px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('titleEn' as any); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <span>عنوان انگلیسی</span>
                      {sortBy === ('titleEn' as any) && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.titleEn}
                      onChange={(e) => setColFilters(prev => ({ ...prev, titleEn: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[100px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('quality' as any); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <span>کیفیت</span>
                      {sortBy === ('quality' as any) && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.quality}
                      onChange={(e) => setColFilters(prev => ({ ...prev, quality: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[80px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('imdbRating'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <span>امتیاز IMDb</span>
                      {sortBy === 'imdbRating' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.imdbRating}
                      onChange={(e) => setColFilters(prev => ({ ...prev, imdbRating: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[80px]">
                  <div className="flex flex-col">
                    <button 
                      type="button"
                      onClick={() => { setSortBy('year'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                      className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <span>سال ساخت</span>
                      {sortBy === 'year' && (sortOrder === 'desc' ? '▼' : '▲')}
                    </button>
                    <input
                      type="text"
                      value={colFilters.year}
                      onChange={(e) => setColFilters(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="فیلتر..."
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal w-full"
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
                      className="h-7 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded text-[10px] px-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal w-full"
                    />
                  </div>
                </th>

                <th className="p-3 min-w-[110px]">
                  <button 
                    type="button"
                    onClick={() => { setSortBy('salePrice'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); }}
                    className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <span>قیمت فروش</span>
                    {sortBy === 'salePrice' && (sortOrder === 'desc' ? '▼' : '▲')}
                  </button>
                </th>

                <th className="p-3 w-[150px] text-center font-bold text-gray-700 dark:text-gray-300">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMovies.map((movie) => {
                const defaultPrice = movie.salePrice || dbService.getSettings().defaultMoviePrice;
                return (
                  <tr 
                    key={movie.id} 
                    onClick={() => setDetailMovie(movie)}
                    className="border-b border-gray-100 dark:border-slate-800/60 hover:bg-slate-50/55 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-2 text-center">
                      <div className="w-10 h-14 rounded overflow-hidden mx-auto shadow-sm">
                        <img 
                          src={getSafePosterUrl(movie.poster)} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </td>
                    <td className="p-3 font-bold text-gray-900 dark:text-gray-100">{movie.titleFa}</td>
                    <td className="p-3 text-gray-500 font-mono text-[11px]">{movie.titleEn}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                        {movie.quality}
                      </span>
                    </td>
                    <td className="p-3 text-amber-500 font-mono font-bold">★ {toPersianNums(movie.imdbRating)}</td>
                    <td className="p-3 font-mono text-gray-600 dark:text-gray-400">{toPersianNums(movie.year)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(movie.category || 'متفرقه').split(',').map(cat => (
                          <span key={cat} className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {cat.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-emerald-600 font-bold font-mono">
                      {formatCurrency(defaultPrice)}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handlePlayFile(movie.filePath, movie.originPeerIp)}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                          title="پخش ویدیو"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => handleOpenFolder(movie.filePath, movie.originPeerIp)}
                          className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                          title="باز کردن مسیر فایل"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleOpenSale(movie, e)}
                          className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                          title="ثبت فروش"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleOpenEdit(movie, e)}
                          className="p-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded transition-colors"
                          title="ویرایش"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteMovie(movie.id, e)}
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4" id="movies-pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 border border-gray-150 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
            id="movies-paged-prev"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <span className="text-xs font-semibold text-gray-650">
            صفحه {toPersianNums(currentPage)} از {toPersianNums(totalPages)}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 border border-gray-150 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
            id="movies-paged-next"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* FORM MODAL (Add/Edit Film) */}
      {showFormModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" 
          id="movie-form-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFormModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-100 dark:border-gray-800">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100" id="form-modal-title">
                {editingMovie ? `ویرایش فیلم: ${editingMovie.titleFa}` : 'افزودن فیلم جدید به لیست'}
              </h3>
              <button 
                onClick={() => setShowFormModal(false)}
                className="p-1 hover:bg-gray-250 dark:hover:bg-gray-700 text-gray-400 rounded-full transition-colors"
                id="close-form-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveMovie} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto" id="movie-catalog-form">
              {/* قالب ورود سریع اطلاعات با JSON */}
              <div className="p-4 bg-indigo-50/40 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-950 rounded-xl space-y-3 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">ورود سریع اطلاعات فیلم با قالب JSON</span>
                  <button
                    type="button"
                    onClick={loadExampleJson}
                    className="text-[9px] text-indigo-500 hover:text-indigo-650 dark:text-indigo-400 font-bold underline cursor-pointer"
                  >
                    بارگذاری نمونه قالب JSON
                  </button>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full h-20 p-2 bg-white dark:bg-slate-950 rounded-lg text-[10px] font-mono border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 resize-y"
                    placeholder='کد JSON اطلاعات فیلم را در اینجا قرار داده و دکمه "اعمال اطلاعات JSON" را بزنید...'
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleImportJson}
                      className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
                    >
                      اعمال اطلاعات JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* بخش جستجوی هوشمند TMDb */}
              <div className="p-4 bg-[#f8fafc] dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl space-y-3 mb-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">دریافت خودکار و هوشمند اطلاعات از سایت TMDb</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  می‌توانید نام فیلم را جستجو کنید تا اطلاعات و تصاویر آن به‌طور خودکار پر شوند. اگر فیلم پیدا نشد، لینک یا شناسه عددی آن را از سایت <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">themoviedb.org</a> وارد کنید.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Search Query */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 block">جستجوی نام فیلم (فارسی یا انگلیسی)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={tmdbSearchQuery}
                        onChange={(e) => setTmdbSearchQuery(e.target.value)}
                        className="flex-1 h-8 px-2.5 bg-white dark:bg-slate-950 rounded-lg text-xs border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                        placeholder="مثال: زودپز یا Zudpaz"
                      />
                      <button
                        type="button"
                        onClick={handleSearchTmdb}
                        disabled={isSearchingTmdb}
                        className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
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
                        className="flex-1 h-8 px-2.5 bg-white dark:bg-slate-950 rounded-lg text-xs border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                        placeholder="مثال: https://www.themoviedb.org/movie/82321 یا 82321"
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
                        const year = res.release_date ? res.release_date.substring(0, 4) : '';
                        const title = res.title || res.original_title;
                        const poster = res.poster_path ? `https://image.tmdb.org/t/p/w185${res.poster_path}` : '';
                        
                        return (
                          <div 
                            key={res.id}
                            className="p-1.5 bg-white dark:bg-slate-950 border border-gray-150 dark:border-slate-800 rounded-lg flex gap-2 items-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-right"
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
                                  const metadata = await TMDbService.fetchMetadata(res.id, 'movie');
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
                              className="h-6 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-indigo-400 rounded-md text-[9px] font-bold cursor-pointer transition-all shrink-0"
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
                {/* Persian title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">نام فارسی فیلم *</label>
                  <input
                    type="text"
                    required
                    value={formTitleFa}
                    onChange={(e) => setFormTitleFa(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: رستگاری در شاوشنگ"
                    id="input-title-fa"
                  />
                </div>

                {/* English title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">نام انگلیسی فیلم *</label>
                  <input
                    type="text"
                    required
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: The Shawshank Redemption"
                    id="input-title-en"
                  />
                </div>

                 {/* Category */}
                <div className="space-y-1.5 bg-gray-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800 md:col-span-1">
                  <label className="text-[10px] font-black text-gray-500 block mb-1">دسته‌بندی‌های فیلم * (امکان انتخاب همزمان چند دسته)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => {
                      const currentCats = formCategory ? formCategory.split(',').map(x => x.trim()) : [];
                      const isChecked = currentCats.includes(c);
                      return (
                        <label key={c} className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-750 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/10 transition-colors select-none text-[10.5px] font-bold text-gray-700 dark:text-gray-200">
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
                              // if empty, let's keep it as is or empty string
                              setFormCategory(updatedCats.join(', '));
                            }}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 dark:border-gray-700 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span>{c}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Collection Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">مجموعه (کالکشن - اختیاری)</label>
                  <input
                    type="text"
                    value={formCollectionName}
                    onChange={(e) => setFormCollectionName(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: ارباب حلقه‌ها"
                    id="input-collection-name"
                  />
                  {movies.length > 0 && Array.from(new Set(movies.map(m => m.collectionName).filter(Boolean))).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.from(new Set(movies.map(m => m.collectionName).filter(Boolean))).slice(0, 5).map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setFormCollectionName(col || '')}
                          className="px-1.5 py-0.5 bg-gray-150 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 text-[9px] rounded text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year of publish */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">سال ساخت</label>
                  <input
                    type="text"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: ۱۳۹۴ یا ۲۰۲۰"
                    id="input-year"
                  />
                </div>

                {/* Director */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">کارگردان</label>
                  <input
                    type="text"
                    value={formDirector}
                    onChange={(e) => setFormDirector(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="نام نویسنده/کارگردان"
                    id="input-director"
                  />
                </div>

                {/* Producer/Writer */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">نویسنده</label>
                  <input
                    type="text"
                    value={formWriter}
                    onChange={(e) => setFormWriter(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    id="input-writer"
                  />
                </div>

                {/* Actors lists */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 block">بازیگران اصلی (با ویرگول جدا کنید)</label>
                  <input
                    type="text"
                    value={formActors}
                    onChange={(e) => setFormActors(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: تیم رابینز، مورگان فریمن"
                    id="input-actors"
                  />
                </div>

                {/* Country */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">کشور سازنده</label>
                  <select
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    id="input-country"
                  >
                    <option value="ایران">ایران</option>
                    <option value="آمریکا">آمریکا</option>
                    <option value="کره جنوبی">کره جنوبی</option>
                    <option value="هند">هند</option>
                    <option value="فرانسه">فرانسه</option>
                    <option value="انگلستان">انگلستان</option>
                    <option value="ژاپن">ژاپن</option>
                    <option value="ایتالیا">ایتالیا</option>
                    <option value="اسپانیا">اسپانیا</option>
                    <option value="آلمان">آلمان</option>
                    <option value="متفرقه">متفرقه / سایر</option>
                  </select>
                </div>

                {/* Language */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">زبان فیلم</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    id="input-language"
                  >
                    <option value="دوبله فارسی">دوبله فارسی</option>
                    <option value="زبان اصلی">زبان اصلی</option>
                    <option value="دوزبانه (دوبله و زبان اصلی)">دوزبانه (دوبله و زبان اصلی)</option>
                  </select>
                </div>

                {/* IMDb score */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">امتیاز IMDB</label>
                  <input
                    type="text"
                    value={formImdbRating}
                    onChange={(e) => setFormImdbRating(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="۸.۵"
                    id="input-imdb"
                  />
                </div>

                {/* Quality */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">کیفیت فیلم</label>
                  <select
                    value={formQuality}
                    onChange={(e) => setFormQuality(e.target.value)}
                    className="w-full h-9 px-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    id="input-quality"
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

                {/* Subtitle status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block">زیرنویس / دوبله</label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                    id="input-subtitle"
                  />
                </div>
              </div>

              {/* Genres array multi-select with custom checked label styles */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-gray-500 block">ژانرهای فیلم (برای انتخاب علامت بزنید)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 h-[115px] overflow-y-auto">
                  {POPULAR_GENRES.map((g) => {
                    const isChecked = formGenres.includes(g);
                    return (
                      <label key={g} className="flex items-center gap-1.5 p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded cursor-pointer select-none text-[10.5px]">
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
                          className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer text-indigo-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{g}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Poster configuration with physical selector and fallbacks */}
              <div className="space-y-1.5 pt-1" id="movie-poster-field-group">
                <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block">پوستر فیلم (بارگذاری فایل یا درج لینک وب)</label>
                <div className="flex gap-3 items-start">
                  {formPoster && (
                    <div className="w-14 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shrink-0 shadow-sm relative group">
                      <img 
                        src={formPoster} 
                        alt="پوستر" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400";
                        }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={formPoster}
                        onChange={(e) => setFormPoster(e.target.value)}
                        className="flex-1 h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                        placeholder="آدرس اینترنتی تصویر یا مسیر فایل دیسک..."
                        id="input-poster"
                      />
                      <button
                        type="button"
                        onClick={handlePickPoster}
                        className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                        id="btn-pick-poster"
                      >
                        انتخاب فایل عکس...
                      </button>
                      {formPoster && formPoster.startsWith('http') && formFilePath && (
                        <button
                          type="button"
                          onClick={handleSavePosterLocally}
                          className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                          title="دانلود و ذخیره عکس پوستر در پوشه این فیلم"
                        >
                          ذخیره در پوشه فیلم
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1 overflow-x-auto pt-0.5 pb-1 shrink-0" id="presets-list">
                      <span className="text-[9px] text-gray-400 self-center ml-2 hidden sm:inline">انتخاب سریع:</span>
                      {PRESET_POSTERS.map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormPoster(preset.url)}
                          className={`px-2 py-0.5 text-[8.5px] rounded font-bold border transition-all shrink-0 cursor-pointer ${
                            formPoster === preset.url 
                              ? 'bg-indigo-600 text-white border-indigo-600' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-[#1a2236]/60 dark:border-gray-750 dark:text-gray-300'
                          }`}
                          id={`btn-preset-${i}`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Storage File Path (Satisfying Electron requirement) */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 block">مسیر فیزیکی فایل فیلم در سیستم یا سرور (امکان باز کردن پوشه و پخش مستقیم)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formFilePath}
                      onChange={(e) => setFormFilePath(e.target.value)}
                      className="w-full h-9 pl-4 pr-9 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-500"
                      placeholder="D:\Media\Movies\A.Separation.1080p.mkv"
                      id="input-filepath"
                    />
                    <FileVideo className="absolute right-3 top-2.5 w-4 h-4 text-emerald-500" />
                  </div>
                  <button
                    type="button"
                    onClick={handlePickFilePath}
                    className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                    id="btn-pick-filepath"
                  >
                    جستجوی فایل...
                  </button>
                </div>
                <p className="text-[9px] text-gray-400">قیمت محاسباتی در صدور فاکتورها طبق تنظیمات عمومی اعمال خواهد شد.</p>
              </div>

              {/* Reference Link Input */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-gray-500 block">لینک یا آدرس سایت مرجع (IMDb، فیلیمو، فیلم‌نت و...)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formOfficialSite}
                    onChange={(e) => setFormOfficialSite(e.target.value)}
                    className="w-full h-9 pl-4 pr-9 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-500"
                    placeholder="https://www.imdb.com/title/..."
                    id="input-officialsite"
                  />
                  <ExternalLink className="absolute right-3 top-2.5 w-4 h-4 text-indigo-500" />
                </div>
              </div>

              {/* Screenshots Gallery Input with Interactive Picker */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-gray-500 block">گالری اسکرین‌شات‌ها / تصاویر فرعی</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formGallery}
                      onChange={(e) => setFormGallery(e.target.value)}
                      className="w-full h-9 pl-4 pr-9 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                      placeholder="https://image1.jpg, https://image2.jpg..."
                      id="input-gallery-images"
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
                <p className="text-[8.5px] text-gray-400">می‌توانید آدرس تصاویر تحت وب وارد کنید یا با فشردن دکمه بالا اسکرین‌شات تصویری از هارد دیسک خود بیفزایید.</p>
              </div>

              {/* بخش مدیریت زیرنویس‌ها */}
              <div className="space-y-1.5 pt-2 border-t border-dashed border-gray-200 dark:border-gray-800">
                <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block">فایل‌های زیرنویس پیوست شده ({toPersianNums(formSubtitlesList.length.toString())})</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePickSubtitlePath}
                      className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن زیرنویس...</span>
                    </button>
                    {formFilePath && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.electronAPI && window.electronAPI.findMatchingSubtitles) {
                            try {
                              const res = await window.electronAPI.findMatchingSubtitles(formFilePath);
                              if (res && res.success && res.subtitles && res.subtitles.length > 0) {
                                setFormSubtitlesList(prev => {
                                  const combined = [...prev, ...res.subtitles];
                                  return Array.from(new Set(combined));
                                });
                                showToast(`تعداد ${toPersianNums(res.subtitles.length.toString())} زیرنویس هم‌نام پیدا و اضافه شد.`, 'success');
                              } else {
                                showToast('هیچ زیرنویس هم‌نامی در پوشه فیلم پیدا نشد.', 'info');
                              }
                            } catch (err: any) {
                              showToast('خطا در جستجوی زیرنویس: ' + err.message, 'error');
                            }
                          } else {
                            showToast('این ویژگی در شبیه‌ساز فعال نیست.', 'warning');
                          }
                        }}
                        className="h-8 px-3 bg-amber-650 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                        title="جستجوی زیرنویس‌های هم‌نام در پوشه فایل فیلم"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>جستجوی خودکار زیرنویس هم‌نام</span>
                      </button>
                    )}
                  </div>

                  {formSubtitlesList.length > 0 ? (
                    <div className="bg-gray-50 dark:bg-slate-900/65 p-3 rounded-lg border border-gray-150 dark:border-slate-800 space-y-1.5 max-h-[120px] overflow-y-auto">
                      {formSubtitlesList.map((subPath, index) => (
                        <div key={index} className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded-lg border border-gray-100 dark:border-slate-900 text-xs text-slate-700 dark:text-slate-300 font-mono">
                          <span className="truncate flex-1 pl-4 text-left direction-ltr" title={subPath}>
                            {toPersianNums((index + 1).toString())}. {subPath}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormSubtitlesList(prev => prev.filter((_, idx) => idx !== index));
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer transition-all shrink-0"
                            title="حذف زیرنویس"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 italic">هیچ فایل زیرنویسی برای این فیلم ثبت نشده است. با دکمه بالا زیرنویس اضافه کنید یا از دکمه جستجوی خودکار بهره ببرید.</div>
                  )}
                </div>
              </div>

              {/* Film synopsis / Narrative */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block">خلاصه داستان / توضیحات برای مشتری</label>
                <textarea
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full py-2 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 h-20 resize-none"
                  placeholder="وارد کردن خلاصه فیلم جهت معرفی مراجعین..."
                  id="input-summary"
                />
              </div>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-gray-150 dark:border-gray-800 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-850 text-xs font-semibold text-gray-650 dark:text-gray-300 cursor-pointer"
                  id="btn-cancel-form"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow cursor-pointer"
                  id="btn-submit-form"
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره‌سازی اطلاعات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL OVERLAY MODAL */}
      {detailMovie && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" 
          id="movie-detail-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailMovie(null);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row relative">
            
            {/* Close button */}
            <button 
              onClick={() => setDetailMovie(null)}
              className="absolute top-3 left-3 z-[31] p-1.5 bg-black/40 text-white hover:bg-black/60 rounded-full transition-colors"
              id="close-detail-modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Poster column */}
            <div className="w-full md:w-2/5 h-64 md:h-auto bg-gray-950 relative overflow-hidden shrink-0">
              <img 
                src={getSafePosterUrl(detailMovie.poster)} 
                alt={detailMovie.titleFa} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-transparent to-black/40"></div>
              <button
                onClick={() => setZoomedPoster(getSafePosterUrl(detailMovie.poster))}
                className="absolute bottom-3 right-3 p-2 bg-black/50 text-white rounded-lg hover:bg-black/75 transition-colors text-xs flex items-center gap-1.5 font-bold"
                id="btn-zoom-detail-poster"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>بزرگنمایی</span>
              </button>
            </div>

            {/* Meta column */}
            <div className="p-5 flex-1 flex flex-col justify-between" id="detail-meta-column">
              <div className="space-y-3.5">
                <div>
                <div className="flex flex-wrap gap-1">
                  {(detailMovie.category || 'متفرقه').split(',').map(cat => (
                    <span key={cat} className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold dark:bg-indigo-950 dark:text-indigo-300 shrink-0">{cat.trim()}</span>
                  ))}
                </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2">{detailMovie.titleFa}</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{detailMovie.titleEn} | {toPersianNums(detailMovie.year)}</p>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-h-24 overflow-y-auto">
                  {detailMovie.summary || <span className="italic text-gray-400">هیچ خلاصه‌ای ثبت نشده است.</span>}
                </div>

                {/* Characteristics table */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]" id="detail-char-table">
                  <div>
                    <span className="text-gray-400">کارگردان:</span> <strong className="text-gray-700 dark:text-gray-200">{detailMovie.director || 'نامشخص'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">کشور:</span> <strong className="text-gray-700 dark:text-gray-200">{detailMovie.country}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">زبان:</span> <strong className="text-gray-700 dark:text-gray-200">{detailMovie.language}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">رتبه:</span> <strong className="text-amber-500 font-bold font-mono">★ {toPersianNums(detailMovie.imdbRating)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">نویسنده:</span> <strong className="text-gray-700 dark:text-gray-200">{detailMovie.writer || 'نامشخص'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">زمان:</span> <strong className="text-gray-700 dark:text-gray-200">{toPersianNums(detailMovie.duration)}</strong>
                  </div>
                </div>

                {/* Subtitle status & Quality details */}
                <div className="flex gap-2" id="detail-qual-subtitle">
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-150 dark:border-gray-700 px-2.5 py-1 rounded font-bold">{detailMovie.quality}</span>
                  <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-150 dark:border-gray-700 px-2.5 py-1 rounded font-bold">{detailMovie.subtitle}</span>
                </div>

                {/* Official site clickable button */}
                {detailMovie.officialSite && (
                  <div className="pt-1.5 flex items-center gap-2 text-xs">
                    <span className="text-gray-400 font-bold">وب‌سایت مرجع / ساخت اثر:</span>
                    <a 
                      href={detailMovie.officialSite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline font-bold flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                      <span>{detailMovie.officialSite}</span>
                    </a>
                  </div>
                )}

                {/* Peer Network Indicators / Remote file handling */}
                {detailMovie.isPeerMedia && (
                  <div className="p-3.5 bg-indigo-50/50 dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/60 rounded-xl space-y-2 mt-2 leading-relaxed text-right">
                    <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                      <Network className="w-4 h-4 animate-bounce shrink-0" />
                      <strong className="text-[11px] font-black">فیلم روی هارد سیستم همکار قرار دارد</strong>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                      این آیتم متعلق به سیستم همکار با آی‌پی <code className="font-mono text-indigo-600 bg-indigo-500/10 px-1 rounded">{detailMovie.originPeerIp}</code> است. برای کپی به فلش مموری مشتری یا پخش آنلاین، ابتدا فایل را روی هارد خود کپی کنید.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.electronAPI || !window.electronAPI.selectDirectory) {
                            showAlert('انتخاب پوشه مقصد فقط در نسخه دسکتاپ ویندوز فعال است.', 'info');
                            return;
                          }
                          try {
                            const selectRes = await window.electronAPI.selectDirectory();
                            if (!selectRes.success || !selectRes.path) return;
                            const destDir = selectRes.path;
                            const fileName = detailMovie.filePath.replace(/\\/g, '/').split('/').pop() || 'movie.mkv';
                            const localDestPath = `${destDir}\\${fileName}`;
                            showToast('در حال آغاز فرآیند کپی فایل تحت شبکه محلی...');
                            const remoteUrl = `http://${detailMovie.originPeerIp}:3300/api/lan/download?path=${encodeURIComponent(detailMovie.filePath)}`;
                            const copyRes = await window.electronAPI.downloadLanFile(remoteUrl, localDestPath);
                            if (copyRes && copyRes.success) {
                              showToast('کپی فایل فیلم به هارد محلی شما با موفقیت به پایان رسید!', 'success');
                            } else {
                              showAlert('کپی ناموفق بود: ' + (copyRes ? copyRes.error : ''), 'error');
                            }
                          } catch (err: any) {
                            showAlert('خطا در کپی شبکه: ' + err.message, 'error');
                          }
                        }}
                        className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>کپی مستقیم از شبکه به فلش یا هارد رکوردر</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Screenshots Image Gallery */}
                {detailMovie.gallery && detailMovie.gallery.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800" id="detail-screengallery">
                    <span className="text-[10px] font-bold text-gray-400 block">گالری تصاویر و صحنه‌های فیلم:</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full scrollbar-thin scrollbar-thumb-gray-200">
                      {detailMovie.gallery.map((imgUrl, idx) => (
                        <img 
                          key={idx}
                          src={getSafePosterUrl(imgUrl)}
                          alt={`${detailMovie.titleFa} اسکرین شات ${idx + 1}`}
                          className="w-16 h-10 object-cover rounded border border-gray-200 dark:border-gray-750 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0 shadow-sm"
                          onClick={() => setSelectedGalleryImage(imgUrl)}
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Movie Collections Segment */}
                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800" id="detail-collections-section">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 block">📦 مجموعه فیلم (کالکشن):</span>
                    <button
                      type="button"
                      onClick={() => setShowAddColMovieBox(!showAddColMovieBox)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {showAddColMovieBox ? 'بستن فرم لینک' : '＋ افزودن فیلم به مجموعه'}
                    </button>
                  </div>

                  {/* Add movie to collection inline box */}
                  {showAddColMovieBox && (
                    <div className="bg-slate-50 dark:bg-slate-800/10 p-2.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="text-[10px] text-gray-400">
                        می‌توانید فیلم دیگری را جستجو کرده و به این مجموعه مرتبط کنید:
                      </div>
                      <input
                        type="text"
                        value={movieSearchText}
                        onChange={(e) => setMovieSearchText(e.target.value)}
                        placeholder="جستجوی فیلم برای مرتبط کردن (نام فارسی یا انگلیسی)..."
                        className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                      />
                      {movieSearchText.trim().length > 1 && (
                        <div className="max-h-36 overflow-y-auto border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 rounded divide-y divide-gray-100 dark:divide-gray-850">
                          {movies
                            .filter(m => m.id !== detailMovie.id && 
                              !(detailMovie.collectionName && m.collectionName && m.collectionName.trim().toLowerCase() === detailMovie.collectionName.trim().toLowerCase()) &&
                              (m.titleFa.toLowerCase().includes(movieSearchText.toLowerCase()) || 
                               m.titleEn.toLowerCase().includes(movieSearchText.toLowerCase()))
                            )
                            .slice(0, 5)
                            .map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  const defaultColName = detailMovie.collectionName || detailMovie.titleFa;
                                  const finalColName = window.prompt(
                                    `لطفاً نام کالکشن را تایید یا وارد کنید برای مرتبط‌سازی "${m.titleFa}" و "${detailMovie.titleFa}":`,
                                    defaultColName
                                  );
                                  if (finalColName && finalColName.trim()) {
                                    dbService.updateMovie(detailMovie.id, { collectionName: finalColName.trim() });
                                    dbService.updateMovie(m.id, { collectionName: finalColName.trim() });
                                    
                                    const updatedCurr = { ...detailMovie, collectionName: finalColName.trim() };
                                    setDetailMovie(updatedCurr);
                                    refreshData();
                                    setShowAddColMovieBox(false);
                                    setMovieSearchText('');
                                    showToast('فیلم‌ها با موفقیت به کالکشن مرتبط شدند 🎉', 'success');
                                  }
                                }}
                                className="w-full p-2 text-right hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors text-xs cursor-pointer"
                              >
                                <span className="font-bold text-gray-800 dark:text-gray-200 truncate">{m.titleFa}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{m.year}</span>
                              </button>
                            ))}
                          {movies.filter(m => m.id !== detailMovie.id && 
                            !(detailMovie.collectionName && m.collectionName && m.collectionName.trim().toLowerCase() === detailMovie.collectionName.trim().toLowerCase()) &&
                            (m.titleFa.toLowerCase().includes(movieSearchText.toLowerCase()) || 
                             m.titleEn.toLowerCase().includes(movieSearchText.toLowerCase()))
                          ).length === 0 && (
                            <div className="p-2 text-center text-xs text-gray-400">هیچ فیلمی یافت نشد.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* List of movies in this collection */}
                  {detailMovie.collectionName ? (() => {
                    const colMovies = movies.filter(m => m.collectionName && m.collectionName.trim().toLowerCase() === detailMovie.collectionName!.trim().toLowerCase());
                    const sortedParts = [...colMovies].sort((a, b) => parseInt(a.year || '0') - parseInt(b.year || '1'));
                    return sortedParts.length > 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-800/10 border border-gray-150 dark:border-gray-800 rounded-xl p-2.5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span>نام مجموعه: <strong className="text-indigo-600 dark:text-indigo-400 text-xs">{detailMovie.collectionName}</strong></span>
                          <span>شامل {toPersianNums(sortedParts.length)} قسمت</span>
                        </div>
                        
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {sortedParts.map((part) => {
                            const isCurrent = part.id === detailMovie.id;
                            return (
                              <div
                                key={part.id}
                                style={{ contentVisibility: 'auto' }}
                                onClick={() => {
                                  if (!isCurrent) setDetailMovie(part);
                                }}
                                className={`group p-1.5 rounded-lg border text-right transition-all flex items-center justify-between cursor-pointer ${
                                  isCurrent
                                    ? 'bg-indigo-500/5 border-indigo-200 dark:border-indigo-900/50'
                                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border-gray-150 dark:border-gray-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate flex-1 leading-snug">
                                  <img
                                    src={part.poster || PRESET_POSTERS[0].url}
                                    alt={part.titleFa}
                                    className="w-7 h-10 object-cover rounded border border-gray-100 dark:border-gray-800 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="truncate text-right">
                                    <div className="text-xs font-bold text-gray-800 dark:text-gray-250 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                      {part.titleFa}
                                      {isCurrent && <span className="mr-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">در حال مشاهده</span>}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                      {part.titleEn} | {toPersianNums(part.year)}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Direct action links within collection part item */}
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handlePlayFile(part.filePath, part.originPeerIp)}
                                    className="p-1 h-7 w-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 rounded cursor-pointer"
                                    title="پخش فیلم"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFolder(part.filePath, part.originPeerIp)}
                                    className="p-1 h-7 w-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-500 rounded cursor-pointer"
                                    title="پوشه فیلم"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                  </button>
                                  {!isCurrent && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`آیا مطمئن هستید که می‌خواهید "${part.titleFa}" را از این مجموعه حذف/خارج کنید؟`)) {
                                          dbService.updateMovie(part.id, { collectionName: undefined });
                                          if (detailMovie.id === part.id) {
                                            setDetailMovie({ ...detailMovie, collectionName: undefined });
                                          }
                                          refreshData();
                                          showToast('فیلم از مجموعه خارج گردید.');
                                        }
                                      }}
                                      className="p-1 h-7 w-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-450 hover:text-red-500 rounded text-xs cursor-pointer font-bold"
                                      title="حذف از این کالکشن"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  })() : (
                    <div className="text-[10px] text-gray-400 italic text-center py-2 bg-slate-50 dark:bg-slate-800/10 rounded-lg border border-dashed border-gray-200 dark:border-gray-805">
                      این فیلم متعلق به هیچ مجموعه‌ای نیست. با دکمه بالا می‌توانید قسمت‌های بعدی آن را مرتبط کنید.
                    </div>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 flex flex-col sm:flex-row gap-3" id="detail-action-buttons">
                {/* Sale direct registration */}
                <button
                  onClick={(e) => { setDetailMovie(null); handleOpenSale(detailMovie, e); }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow shadow-emerald-500/10 cursor-pointer"
                  id="btn-detail-sell"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>ثبت و صدور فاکتور ({formatCurrency(detailMovie.salePrice)})</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => { handlePlayFile(detailMovie.filePath, detailMovie.originPeerIp); }}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer"
                    title="پخش ویدیو ▶️"
                    id="btn-detail-play"
                  >
                    <Play className="w-4 h-4 fill-current text-indigo-500" />
                  </button>
                  <button
                    onClick={() => { handleOpenFolder(detailMovie.filePath, detailMovie.originPeerIp); }}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer"
                    title="موقعیت فیزیکی 📁"
                    id="btn-detail-explore"
                  >
                    <FolderOpen className="w-4 h-4 text-sky-500" />
                  </button>
                  <button
                    onClick={() => { handleExportSingleMovieJson(detailMovie); }}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer"
                    title="برون‌بری مشخصات به صورت فایل JSON 📥"
                    id="btn-detail-export-single"
                  >
                    <Download className="w-4 h-4 text-[#38bdf8]" />
                  </button>
                  {detailMovie.officialSite && (
                    <button
                      onClick={() => { setActiveBrowserUrl(detailMovie.officialSite); }}
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer flex items-center justify-center"
                      title="مشاهده سایت مرجع در مرورگر داخلی"
                      id="btn-detail-site"
                    >
                      <ExternalLink className="w-4 h-4 text-amber-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL SIMULATED VIDEO PLAYER MODAL ▶️ */}
      {playingMovie && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" 
          id="simulated-player-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPlayingMovie(null);
            }
          }}
        >
          <div className="bg-slate-950 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-slate-800 text-white flex flex-col">
            
            {/* Player Header */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-black/30">
              <span className="flex items-center gap-2 text-xs text-indigo-400">
                <Play className="w-4 h-4 text-indigo-400 fill-current animate-pulse" />
                <span>پخش‌کننده مدیا (Desktop Player Link)</span>
              </span>
              <h4 className="text-xs font-bold text-gray-200">{playingMovie.titleFa}</h4>
              <button 
                onClick={() => setPlayingMovie(null)}
                className="text-gray-400 hover:text-white p-1 rounded-full bg-slate-900 transition-colors"
                id="close-player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Play Area Canvas */}
            <div className="aspect-video bg-black flex flex-col items-center justify-center relative group" id="player-screen">
              {/* Virtual Film Poster underneath overlay */}
              <img 
                src={getSafePosterUrl(playingMovie.poster)} 
                alt={playingMovie.titleFa} 
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm pointer-events-none"
                referrerPolicy="no-referrer"
              />

              {/* Decorative Audio frequencies */}
              <div className="z-10 flex items-end gap-1 h-12" id="simulated-equalizer">
                <div className="w-1 bg-indigo-500 rounded-full h-8 animate-pulse"></div>
                <div className="w-1 bg-sky-500 rounded-full h-12 animate-pulse animation-delay-200"></div>
                <div className="w-1 bg-[#10b981] rounded-full h-6 animate-pulse animation-delay-500"></div>
                <div className="w-1 bg-purple-500 rounded-full h-10 animate-pulse animation-delay-300"></div>
              </div>

              <div className="z-10 mt-4 text-center">
                <p className="text-xs font-bold tracking-wide">{playingMovie.titleEn}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1 pr-4 pl-4 truncate">{playingMovie.filePath}</p>
              </div>

              {/* Action alert */}
              <span className="absolute bottom-4 left-4 text-[9px] text-[#38bdf8] bg-[#38bdf8]/10 py-1 px-2.5 rounded-full border border-[#38bdf8]/20 font-mono">
                DESKTOP_PROCESS_ACTIVE (electron-spawn_success)
              </span>
            </div>

            {/* Custom Control Bar */}
            <div className="px-5 py-4 bg-slate-900 space-y-3" dir="ltr" id="player-controls">
              {/* Timeline slider representation */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono gap-3.5 select-none">
                <span>01:14:02</span>
                <div className="flex-1 h-1 bg-slate-850 rounded-full relative overflow-hidden" id="timeline-track">
                  <div className="absolute left-0 top-0 bottom-0 bg-indigo-500 w-[45%]"></div>
                </div>
                <span>02:35:10</span>
              </div>

              {/* Control Triggers */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="p-1.5 hover:bg-slate-800 rounded transition-colors text-gray-300 hover:text-white" title="زیرنویس">CC</button>
                  <button className="p-1.5 hover:bg-slate-800 rounded transition-colors text-gray-300 hover:text-white" title="مسیر صدا">Audio Track</button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Play simulation */}
                  <div className="bg-white text-slate-950 p-2.5 rounded-full hover:scale-105 transition-transform cursor-pointer">
                    <Play className="w-4 h-4 fill-current text-slate-950 ml-0.5" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <div className="w-16 h-1 bg-slate-850 rounded" id="volume-track">
                    <div className="bg-indigo-500 h-full w-[80%] rounded"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PORTAL SIMULATED DIRECTORY PATH FOLDER EXPLORER 📁 */}
      {exploringFolder && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" 
          id="simulated-folder-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setExploringFolder(null);
            }
          }}
        >
          <div className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 flex flex-col">
            
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span>شبیه‌ساز فایل اکسپلورر دسکتاپ</span>
              </span>
              <button onClick={() => setExploringFolder(null)} className="text-gray-450 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body displaying Path */}
            <div className="p-5 space-y-4" id="folder-body">
              <p className="text-xs text-gray-550 dark:text-gray-300 mt-1 pb-1">سیستم‌عامل Electron دستور باز کردن پوشه فیزیکی زیر را در سیستم‌عامل کاربر اجرا کرده است:</p>
              
              <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-lg border border-gray-250 dark:border-slate-800 select-all font-mono text-[11px] text-[#38bdf8] select-all break-all leading-relaxed" dir="ltr">
                {exploringFolder.filePath.substring(0, exploringFolder.filePath.lastIndexOf('\\')) || 'D:\\Media\\Movies\\'}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-lg flex gap-3 text-xs text-blue-800 dark:text-gray-300" id="explorer-info-box">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <div className="leading-relaxed">
                  <p className="font-bold">مجموعه پیوند سیستم</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">در محیط واقعی Electron، دستور <code>shell.showItemInFolder</code> مسیر فوق را مستقیماً در نرم‌افزار Windows Explorer یا Mac Finder باز می‌کند.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 dark:bg-slate-850 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exploringFolder.filePath);
                  alert('مسیر فیزیکی فایل کپی شد: ' + exploringFolder.filePath);
                }}
                className="px-3 py-1.5 bg-gray-250 hover:bg-gray-300 dark:bg-slate-800 text-gray-750 dark:text-gray-300 rounded font-semibold transition-colors cursor-pointer"
                id="btn-copy-path"
              >
                کپی کردن مسیر فیزیکی
              </button>
              <button
                onClick={() => setExploringFolder(null)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-colors cursor-pointer"
                id="btn-close-folder"
              >
                تایید
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PORTER ZOOM LIGHTBOX MODAL */}
      {zoomedPoster && (
        <div 
          onClick={() => setZoomedPoster(null)} 
          className="fixed inset-0 z-[110] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          id="poster-lightbox-modal"
        >
          <img 
            src={zoomedPoster} 
            alt="پوستر زوم‌شده" 
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl animate-scaleIn bg-gray-950" 
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* DIRECT SALE REGISTER FORM MODAL 💰 */}
      {sellingMovie && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" 
          id="direct-sale-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSellingMovie(null);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-100 dark:border-gray-800 text-gray-850 dark:text-gray-150">
            {/* Header */}
            <div className="px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold dark:text-emerald-400">
                <DollarSign className="w-4 h-4 text-emerald-500 animate-bounce" />
                <span>ثبت فاکتور فروش برای فیلم</span>
              </span>
              <button onClick={() => setSellingMovie(null)} className="text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleRegisterSale} className="p-5 space-y-4" id="sale-registration-form">
              <div className="p-3 bg-indigo-50 dark:bg-slate-900 rounded-lg flex items-center gap-3 border border-indigo-100 dark:border-slate-800">
                <img src={getSafePosterUrl(sellingMovie.poster)} alt="" className="w-10 h-14 object-cover rounded shadow-sm" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="text-xs font-bold text-[#312e81] dark:text-gray-100">{sellingMovie.titleFa}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{sellingMovie.titleEn} ({toPersianNums(sellingMovie.year)})</p>
                  <p className="text-[10px] text-emerald-600 mt-1 font-mono">قیمت پایه فروش: {formatCurrency(sellingMovie.salePrice)}</p>
                </div>
              </div>

              {/* Customer Info (Read only indicator) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 block">اضافه شدن به سیستم سبد خرید</span>
                <p className="text-[11px] leading-relaxed text-gray-450 dark:text-gray-450">
                  این کالا مستقیماً پس از کلیک روی افزودن، به فاکتور تسویه‌نشده در بالای صفحه فرستاده می‌شود.
                </p>
              </div>

              {/* Real sale price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block columns-1">قیمت فروش برای مشتری (تومان)</label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-100 focus:outline-none focus:border-indigo-500"
                    id="sale-price-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block columns-1">کاهش / تخفیف جزئی (تومان)</label>
                  <input
                    type="number"
                    value={saleDiscount}
                    onChange={(e) => setSaleDiscount(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-red-500"
                    id="sale-discount-input"
                  />
                </div>
              </div>

              {/* Financial result estimation */}
              <div className="pt-2 text-[10px] text-gray-500 space-y-1 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between">
                  <span>سود ناخالص تقریبی این کالا:</span>
                  <span className="font-mono text-emerald-500 font-bold">
                    {formatCurrency(Math.max((salePrice - saleDiscount) - sellingMovie.purchasePrice, 0))}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setSellingMovie(null)}
                  className="px-4 py-2 border border-gray-205 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-semibold text-gray-650 cursor-pointer"
                  id="btn-cancel-sale"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white text-xs font-bold rounded-lg shadow cursor-pointer bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/15 flex items-center gap-1"
                  id="btn-confirm-sale"
                >
                  <span>افزودن به سبد خرید 🛒</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCREENSHOT GALLERY LIGHTBOX MODAL */}
      {selectedGalleryImage && (() => {
        const galleryList = detailMovie?.gallery || [];
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
                          ? 'border-indigo-500 scale-110 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-500/20' 
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

      {/* IN-APP CINEMATIC WEB BROWSER MODAL (Requested in #2) */}
      {activeBrowserUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4 animate-fadeIn" 
          id="in-app-browser-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveBrowserUrl(null);
            }
          }}
        >
          <div className="bg-slate-900 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-slate-700 flex flex-col">
            {/* Window title bar matching premium browsers */}
            <div className="px-4 py-3 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-full cursor-pointer hover:scale-105 active:scale-95" onClick={() => setActiveBrowserUrl(null)}></span>
                <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                <span className="text-[11px] font-bold font-sans mr-2.5 truncate max-w-[150px] sm:max-w-xs text-slate-200">{detailMovie?.titleFa || 'مرورگر سینمایی مدیا سنتر'}</span>
              </div>
              
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg w-full max-w-md mx-4">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  readOnly 
                  value={activeBrowserUrl} 
                  className="bg-transparent border-none text-[10px] font-mono text-slate-300 w-full focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2">
                <a 
                  href={activeBrowserUrl} 
                  target="_blank" 
                  rel="noreferrer noopener"
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>بازکردن مستقیم</span>
                </a>
                <button 
                  onClick={() => setActiveBrowserUrl(null)} 
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewport frame */}
            <div className="flex-1 bg-white relative">
              <iframe 
                src={activeBrowserUrl} 
                className="w-full h-full border-none" 
                title="IMDb Reference Website Frame"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
        </div>
      )}

      {/* SCAN PREVIEW MODAL */}
      <ScanPreviewModal
        isOpen={showScanPreviewModal}
        onClose={() => setShowScanPreviewModal(false)}
        items={scannedFiles}
        title="پیش‌نمایش فیلم‌های اسکن شده"
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
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">مدیریت و دانلود هوشمند گالری تصاویر TMDb</h3>
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
                    placeholder="یک پوشه در سیستم خود انتخاب کنید (مثلا: D:\Media\Movies\Zudpaz)"
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
                    <span className="text-[11px] font-bold text-gray-500 block">سایر تصاویر گالری فیلم (Scenes):</span>
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
                                <span className="text-[7px] font-bold text-white font-mono">gallery_{idx + 1}.jpg</span>
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
