/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, ArrowUpDown, Film, HardDrive, Info, CheckCircle, HelpCircle, AlertCircle, Loader2, Tv, ChevronDown, Check, Sparkles, Folder, FolderOpen, Edit2, ChevronRight } from 'lucide-react';
import { ScannedMediaItem } from '../utils/MediaScanner';
import { ImportService } from '../utils/ImportService';
import { toPersianNums } from '../pages/Dashboard';
import { showToast } from '../utils/toast';
import { dbService } from '../db/databaseService';
import { TMDbService } from '../utils/TMDbService';
import { ParsedMovie, ParsedSeries } from '../utils/FilenameParser';

interface ScanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ScannedMediaItem[];
  title?: string;
  defaultCategory?: string;
  onImportComplete?: () => void;
}

type SortField = 'title' | 'year' | 'size' | 'extension' | 'type';
type SortDirection = 'asc' | 'desc';

export const ScanPreviewModal: React.FC<ScanPreviewModalProps> = ({
  isOpen,
  onClose,
  items,
  title = 'پیش‌نمایش رسانه‌های اسکن شده',
  defaultCategory = 'خارجی',
  onImportComplete
}) => {
  if (!isOpen) return null;

  const [localItems, setLocalItems] = useState<ScannedMediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isImporting, setIsImporting] = useState(false);

  // Modals for batch actions
  const [showBatchSeriesModal, setShowBatchSeriesModal] = useState(false);
  const [showBatchMovieModal, setShowBatchMovieModal] = useState(false);

  // Batch Series form fields
  const [batchSeriesType, setBatchSeriesType] = useState<'existing' | 'new'>('new');
  const [batchSelectedSeriesId, setBatchSelectedSeriesId] = useState('');
  const [batchNewSeriesName, setBatchNewSeriesName] = useState('');
  const [batchSeriesSeason, setBatchSeriesSeason] = useState('1');
  const [batchSeriesEpType, setBatchSeriesEpType] = useState<'auto' | 'seq'>('auto');
  const [batchSeriesEpStart, setBatchSeriesEpStart] = useState('1');

  // Batch Movie form fields
  const [batchMovieName, setBatchMovieName] = useState('');

  // Collapsed states for folders
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Single Item manual editing states
  const [editingItem, setEditingItem] = useState<ScannedMediaItem | null>(null);
  const [editIsSeries, setEditIsSeries] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSeason, setEditSeason] = useState('1');
  const [editEpisodeNum, setEditEpisodeNum] = useState('1');

  const handleStartEditItem = (item: ScannedMediaItem) => {
    setEditingItem(item);
    setEditIsSeries(item.parsed.isSeries);
    if (item.parsed.isSeries) {
      setEditTitle((item.parsed as ParsedSeries).seriesName || '');
      setEditSeason((item.parsed as ParsedSeries).season || '1');
      setEditEpisodeNum((item.parsed as ParsedSeries).episodeNumber || '1');
    } else {
      setEditTitle((item.parsed as ParsedMovie).title || '');
      setEditSeason('1');
      setEditEpisodeNum('1');
    }
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;
    if (!editTitle.trim()) {
      showToast('لطفاً عنوان را وارد کنید.', 'warning');
      return;
    }

    const titleText = editTitle.trim();
    let updatedParsed: any;
    let updatedTmdb: any = null;
    let updatedMatchStatus: any = 'unknown';

    if (editIsSeries) {
      const sNum = parseInt(editSeason, 10) || 1;
      const epNum = parseInt(editEpisodeNum, 10) || 1;
      updatedParsed = {
        isSeries: true,
        seriesName: titleText,
        season: sNum.toString(),
        episodeNumber: epNum.toString(),
        episode: `S${sNum.toString().padStart(2, '0')}E${epNum.toString().padStart(2, '0')}`
      };

      try {
        const match = await TMDbService.findBestMatch({ isSeries: true, seriesName: titleText } as any, titleText);
        if (match) {
          updatedTmdb = match;
          updatedMatchStatus = 'matched';
        }
      } catch (e) {}
    } else {
      updatedParsed = {
        isSeries: false,
        title: titleText
      };

      try {
        const match = await TMDbService.findBestMatch({ isSeries: false, title: titleText } as any, titleText);
        if (match) {
          updatedTmdb = match;
          updatedMatchStatus = 'matched';
        }
      } catch (e) {}
    }

    setLocalItems(prev => prev.map(item => {
      if (item.file.fullPath === editingItem.file.fullPath) {
        return {
          ...item,
          parsed: updatedParsed,
          tmdb: updatedTmdb,
          matchStatus: updatedMatchStatus
        };
      }
      return item;
    }));

    setEditingItem(null);
    showToast('تغییرات فایل با موفقیت اعمال شد.', 'success');
  };

  // Synchronize localItems when items prop or open state changes
  useEffect(() => {
    if (isOpen) {
      setLocalItems(JSON.parse(JSON.stringify(items)));
      setSelectedPaths(new Set(items.map(item => item.file.fullPath)));
      
      // Auto-select first series if available
      const existingSeries = dbService.getSeries();
      if (existingSeries.length > 0) {
        setBatchSelectedSeriesId(existingSeries[0].id);
      }
    }
  }, [isOpen, items]);

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${toPersianNums(val.toString())} ${sizes[i]}`;
  };

  // Filter and Sort files
  const filteredAndSortedItems = useMemo(() => {
    // Filter
    let result = localItems.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const tmdbTitle = item.tmdb?.title || '';
      const tmdbOrigTitle = item.tmdb?.originalTitle || '';
      const parsedTitle = item.parsed.isSeries ? item.parsed.seriesName : item.parsed.title;
      const filename = item.file.filename;
      const folder = item.file.folder;

      return (
        tmdbTitle.toLowerCase().includes(searchLower) ||
        tmdbOrigTitle.toLowerCase().includes(searchLower) ||
        parsedTitle.toLowerCase().includes(searchLower) ||
        filename.toLowerCase().includes(searchLower) ||
        folder.toLowerCase().includes(searchLower)
      );
    });

    // Sort
    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'title') {
        valA = a.tmdb?.title || (a.parsed.isSeries ? a.parsed.seriesName : a.parsed.title);
        valB = b.tmdb?.title || (b.parsed.isSeries ? b.parsed.seriesName : b.parsed.title);
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, 'fa')
          : valB.localeCompare(valA, 'fa');
      }

      if (sortField === 'year') {
        valA = a.tmdb?.releaseDate?.substring(0, 4) || a.parsed.year || '0000';
        valB = b.tmdb?.releaseDate?.substring(0, 4) || b.parsed.year || '0000';
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (sortField === 'size') {
        valA = a.file.size;
        valB = b.file.size;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'extension') {
        valA = a.file.extension;
        valB = b.file.extension;
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (sortField === 'type') {
        valA = a.parsed.isSeries ? 'tv' : 'movie';
        valB = b.parsed.isSeries ? 'tv' : 'movie';
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return 0;
    });

    return result;
  }, [localItems, searchQuery, sortField, sortDirection]);

  // Group filteredAndSortedItems by folder
  const { groupedFolders, folderOrder } = useMemo(() => {
    const groups: Record<string, ScannedMediaItem[]> = {};
    const folders: string[] = [];
    filteredAndSortedItems.forEach(item => {
      const folder = item.file.folder || 'بدون پوشه';
      if (!groups[folder]) {
        groups[folder] = [];
        folders.push(folder);
      }
      groups[folder].push(item);
    });
    return { groupedFolders: groups, folderOrder: folders };
  }, [filteredAndSortedItems]);

  const toggleFolderCollapse = (folder: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const handleToggleFolderSelection = (folder: string, folderItems: ScannedMediaItem[]) => {
    const folderPaths = folderItems.map(item => item.file.fullPath);
    const allSelected = folderPaths.every(path => selectedPaths.has(path));
    const updated = new Set(selectedPaths);
    if (allSelected) {
      folderPaths.forEach(path => updated.delete(path));
    } else {
      folderPaths.forEach(path => updated.add(path));
    }
    setSelectedPaths(updated);
  };

  // Handle Sort Change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle Select All
  const handleSelectAll = () => {
    const allPaths = filteredAndSortedItems.map(item => item.file.fullPath);
    setSelectedPaths(new Set(allPaths));
  };

  // Handle Deselect All
  const handleDeselectAll = () => {
    setSelectedPaths(new Set());
  };

  // Handle Single Checkbox Change
  const handleToggleSelect = (path: string) => {
    const updated = new Set(selectedPaths);
    if (updated.has(path)) {
      updated.delete(path);
    } else {
      updated.add(path);
    }
    setSelectedPaths(updated);
  };

  // Calculate stats for selected files
  const { totalSelectedSize, selectedCount } = useMemo(() => {
    let size = 0;
    let count = 0;
    localItems.forEach(item => {
      if (selectedPaths.has(item.file.fullPath)) {
        size += item.file.size;
        count++;
      }
    });
    return { totalSelectedSize: size, selectedCount: count };
  }, [localItems, selectedPaths]);

  const isAllSelected = filteredAndSortedItems.length > 0 && 
    filteredAndSortedItems.every(item => selectedPaths.has(item.file.fullPath));

  const handleToggleAllCheckbox = () => {
    if (isAllSelected) {
      // Deselect all that are in the filtered list
      const updated = new Set(selectedPaths);
      filteredAndSortedItems.forEach(item => updated.delete(item.file.fullPath));
      setSelectedPaths(updated);
    } else {
      // Select all that are in the filtered list
      const updated = new Set(selectedPaths);
      filteredAndSortedItems.forEach(item => updated.add(item.file.fullPath));
      setSelectedPaths(updated);
    }
  };

  // Handle Batch Type Toggle (Toggle movie/series)
  const handleBatchToggleType = () => {
    if (selectedPaths.size === 0) return;
    setLocalItems(prev => prev.map(item => {
      if (selectedPaths.has(item.file.fullPath)) {
        const isCurrentlySeries = item.parsed.isSeries;
        if (isCurrentlySeries) {
          // Change to Movie
          return {
            ...item,
            parsed: {
              isSeries: false,
              title: (item.parsed as ParsedSeries).seriesName || item.file.filename,
              year: item.parsed.year,
              resolution: item.parsed.resolution,
              source: item.parsed.source,
              codec: item.parsed.codec
            } as ParsedMovie,
            tmdb: null,
            matchStatus: 'unknown'
          } as ScannedMediaItem;
        } else {
          // Change to Series
          return {
            ...item,
            parsed: {
              isSeries: true,
              seriesName: (item.parsed as ParsedMovie).title || item.file.filename,
              season: '1',
              episodeNumber: '1',
              episode: 'S01E01',
              year: item.parsed.year,
              resolution: item.parsed.resolution,
              source: item.parsed.source,
              codec: item.parsed.codec
            } as ParsedSeries,
            tmdb: null,
            matchStatus: 'unknown'
          } as ScannedMediaItem;
        }
      }
      return item;
    }));
    showToast('نوع رسانه فایل‌های انتخاب شده با موفقیت تغییر یافت.', 'success');
  };

  // Apply batch assignment for series
  const handleApplyBatchSeries = async () => {
    let finalSeriesName = '';
    
    if (batchSeriesType === 'existing') {
      const existing = dbService.getSeries().find(s => s.id === batchSelectedSeriesId);
      if (!existing) {
        showToast('لطفا یک سریال معتبر انتخاب کنید.', 'warning');
        return;
      }
      finalSeriesName = existing.titleFa;
    } else {
      if (!batchNewSeriesName.trim()) {
        showToast('لطفا نام سریال جدید را وارد کنید.', 'warning');
        return;
      }
      finalSeriesName = batchNewSeriesName.trim();
    }

    const seasonNum = parseInt(batchSeriesSeason, 10) || 1;
    const startEp = parseInt(batchSeriesEpStart, 10) || 1;

    // Fetch TMDb / Existing match ONCE before the loop to avoid rate limits and UI freezing
    let batchTmdb: any = null;
    const existingList = dbService.getSeries();
    const existingSeries = existingList.find(s => 
      s.titleFa.toLowerCase().trim() === finalSeriesName.toLowerCase().trim() ||
      s.titleEn.toLowerCase().trim() === finalSeriesName.toLowerCase().trim()
    );

    if (existingSeries) {
      batchTmdb = {
        id: existingSeries.officialSite ? parseInt(existingSeries.officialSite.split('/').pop() || '0', 10) : undefined,
        title: existingSeries.titleFa,
        originalTitle: existingSeries.titleEn,
        posterPath: existingSeries.poster,
        backdropPath: existingSeries.poster,
        overview: existingSeries.summary,
        releaseDate: existingSeries.year,
        rating: parseFloat(existingSeries.imdbRating) || 0.0,
        genres: existingSeries.genres || [],
        cast: existingSeries.actors ? existingSeries.actors.split(', ') : [],
        director: existingSeries.director ? existingSeries.director.split(', ') : [],
        runtime: parseInt(existingSeries.episodeDuration) || 45,
        countries: [existingSeries.country || ''],
        gallery: existingSeries.gallery || []
      };
    } else {
      try {
        const tmdbMatch = await TMDbService.findBestMatch({ isSeries: true, seriesName: finalSeriesName } as any, finalSeriesName);
        if (tmdbMatch) {
          batchTmdb = tmdbMatch;
        }
      } catch (err) {
        console.error('TMDb matching failed for batch series:', err);
      }
    }

    const updatedItems = [...localItems];
    let selectedIndex = 0;
    
    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      if (selectedPaths.has(item.file.fullPath)) {
        let epNum = startEp + selectedIndex;
        if (batchSeriesEpType === 'auto') {
          const filename = item.file.filename;
          const sMatch = filename.match(/[Ee](\d+)\b/);
          let extractedNum = NaN;
          if (sMatch) {
            extractedNum = parseInt(sMatch[1], 10);
          } else {
            const epMatch = filename.match(/(?:ep|episode|قسمت)\s*[-_.]*(\d+)/i);
            if (epMatch) {
              extractedNum = parseInt(epMatch[1], 10);
            } else {
              const anyNumbers = filename.match(/\d+/g);
              if (anyNumbers && anyNumbers.length > 0) {
                extractedNum = parseInt(anyNumbers[anyNumbers.length - 1], 10);
              }
            }
          }
          
          if (!isNaN(extractedNum)) {
            epNum = extractedNum;
          } else {
            epNum = startEp + selectedIndex;
          }
        }

        item.parsed = {
          isSeries: true,
          seriesName: finalSeriesName,
          season: seasonNum.toString(),
          episodeNumber: epNum.toString(),
          episode: `S${seasonNum.toString().padStart(2, '0')}E${epNum.toString().padStart(2, '0')}`
        } as ParsedSeries;

        if (batchTmdb) {
          item.tmdb = { ...batchTmdb };
          item.matchStatus = 'matched';
        } else {
          item.matchStatus = 'unknown';
        }
        selectedIndex++;
      }
    }

    setLocalItems(updatedItems);
    setShowBatchSeriesModal(false);
    showToast(`تعداد ${toPersianNums(selectedIndex.toString())} فایل به عنوان فصل ${toPersianNums(seasonNum.toString())} سریال "${finalSeriesName}" تعیین شد.`, 'success');
  };

  // Apply batch assignment for movie
  const handleApplyBatchMovie = async () => {
    if (!batchMovieName.trim()) {
      showToast('لطفا نام فیلم را وارد کنید.', 'warning');
      return;
    }

    const movieTitle = batchMovieName.trim();

    // Fetch TMDb / Existing match ONCE before the loop to avoid rate limits and UI freezing
    let batchTmdb: any = null;
    const existingList = dbService.getMovies();
    const existingMovie = existingList.find(m => 
      m.titleFa.toLowerCase().trim() === movieTitle.toLowerCase().trim() ||
      m.titleEn.toLowerCase().trim() === movieTitle.toLowerCase().trim()
    );

    if (existingMovie) {
      batchTmdb = {
        id: existingMovie.officialSite ? parseInt(existingMovie.officialSite.split('/').pop() || '0', 10) : undefined,
        title: existingMovie.titleFa,
        originalTitle: existingMovie.titleEn,
        posterPath: existingMovie.poster,
        backdropPath: existingMovie.poster,
        overview: existingMovie.summary,
        releaseDate: existingMovie.year,
        rating: parseFloat(existingMovie.imdbRating) || 0.0,
        genres: existingMovie.genres || [],
        cast: existingMovie.actors ? existingMovie.actors.split(', ') : [],
        director: existingMovie.director ? existingMovie.director.split(', ') : [],
        runtime: parseInt(existingMovie.duration) || 120,
        countries: [existingMovie.country || ''],
        gallery: existingMovie.gallery || []
      };
    } else {
      try {
        const tmdbMatch = await TMDbService.findBestMatch({ isSeries: false, title: movieTitle } as any, movieTitle);
        if (tmdbMatch) {
          batchTmdb = tmdbMatch;
        }
      } catch (err) {
        console.error('TMDb matching failed for batch movie:', err);
      }
    }

    const updatedItems = [...localItems];
    let selectedIndex = 0;

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      if (selectedPaths.has(item.file.fullPath)) {
        item.parsed = {
          isSeries: false,
          title: movieTitle
        } as ParsedMovie;

        if (batchTmdb) {
          item.tmdb = { ...batchTmdb };
          item.matchStatus = 'matched';
        } else {
          item.matchStatus = 'unknown';
        }
        selectedIndex++;
      }
    }

    setLocalItems(updatedItems);
    setShowBatchMovieModal(false);
    showToast(`تعداد ${toPersianNums(selectedIndex.toString())} فایل به عنوان فیلم "${movieTitle}" تعیین شد.`, 'success');
  };

  // Handle Import Action
  const handleImport = async () => {
    if (selectedPaths.size === 0) {
      showToast('لطفاً حداقل یک فایل را جهت ورود انتخاب کنید.', 'warning');
      return;
    }

    setIsImporting(true);
    showToast('در حال درون‌ریزی فایل‌های انتخاب شده به دیتابیس...', 'info');

    try {
      const selectedItems = localItems.filter(item => selectedPaths.has(item.file.fullPath));
      const { successCount, failedCount, moviesCount, seriesCount } = await ImportService.importItems(selectedItems, defaultCategory);

      if (successCount > 0) {
        let message = 'ورود فایل‌ها تکمیل شد: ';
        if (moviesCount > 0) {
          message += `${toPersianNums(moviesCount.toString())} فیلم سینمایی `;
        }
        if (seriesCount > 0) {
          if (moviesCount > 0) message += 'و ';
          message += `${toPersianNums(seriesCount.toString())} قسمت سریال `;
        }
        message += 'با موفقیت به دیتابیس اضافه شد.';
        
        showToast(message, 'success');
        
        if (failedCount > 0) {
          showToast(`${toPersianNums(failedCount.toString())} مورد با خطا مواجه شد.`, 'error');
        }
        if (onImportComplete) {
          onImportComplete();
        }
        onClose();
      } else {
        showToast('هیچ فایلی وارد دیتابیس نشد.', 'error');
      }
    } catch (err: any) {
      console.error('Import process crash:', err);
      showToast(`خطای جدی در ورود اطلاعات: ${err.message || err}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-6">
        {/* Modal panel */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-950 text-right shadow-2xl transition-all w-full max-w-6xl flex flex-col h-[85vh] border border-slate-100 dark:border-slate-800">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-500" />
                <span>{title}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تعداد {toPersianNums(items.length.toString())} فایل شناسایی و با TMDb مطابقت داده شد.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isImporting}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col md:flex-row gap-4 items-center justify-between pb-4">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="جستجو در نام فیلم، نام فایل یا پوشه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                style={{ direction: 'rtl' }}
              />
            </div>

            {/* Quick Bulk Select Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors cursor-pointer"
              >
                انتخاب همه فایل‌ها ({toPersianNums(localItems.length.toString())})
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              >
                لغو انتخاب همه
              </button>
            </div>
          </div>

          {/* Batch Action Bar */}
          {selectedPaths.size > 0 && (
            <div className="mx-6 my-3 p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-800 dark:text-indigo-300">
                <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
                <span>مدیریت و انتساب گروهی ({toPersianNums(selectedPaths.size.toString())} فایل انتخاب شده):</span>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    const existingSeries = dbService.getSeries();
                    if (existingSeries.length > 0 && !batchSelectedSeriesId) {
                      setBatchSelectedSeriesId(existingSeries[0].id);
                    }
                    setShowBatchSeriesModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 cursor-pointer"
                >
                  <Tv className="w-4 h-4" />
                  <span>انتساب گروهی به سریال</span>
                </button>

                <button
                  onClick={() => setShowBatchMovieModal(true)}
                  className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/10 flex items-center gap-2 cursor-pointer"
                >
                  <Film className="w-4 h-4" />
                  <span>انتساب گروهی به فیلم</span>
                </button>

                <button
                  onClick={handleBatchToggleType}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span>تغییر نوع (فیلم ⇄ سریال)</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Area (Scrollable) */}
          <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/10">
            {filteredAndSortedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <Info className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm">هیچ فایلی مطابق جستجوی شما پیدا نشد.</p>
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 sticky top-0 z-10 backdrop-blur-sm">
                    <th className="px-4 py-3 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleAllCheckbox}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 w-16 text-center">پوستر</th>
                    <th 
                      onClick={() => handleSort('title')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>عنوان (TMDb / پارس شده)</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('year')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors select-none text-center w-20"
                    >
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>سال</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('type')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors select-none text-center w-28"
                    >
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>نوع رسانه</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold text-center w-36">وضعیت تطابق</th>
                    <th className="px-4 py-3 font-semibold">پوشه و فایل اصلی</th>
                    <th 
                      onClick={() => handleSort('size')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors select-none text-left w-28"
                    >
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>حجم</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {folderOrder.map((folder) => {
                    const folderItems = groupedFolders[folder] || [];
                    const isCollapsed = collapsedFolders[folder];
                    const folderPaths = folderItems.map(item => item.file.fullPath);
                    const isFolderAllSelected = folderPaths.every(path => selectedPaths.has(path));
                    const isFolderSomeSelected = folderPaths.some(path => selectedPaths.has(path)) && !isFolderAllSelected;

                    return (
                      <React.Fragment key={folder}>
                        {/* Folder Header Row */}
                        <tr className="bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60">
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isFolderAllSelected}
                              ref={el => {
                                if (el) {
                                  el.indeterminate = isFolderSomeSelected;
                                }
                              }}
                              onChange={() => handleToggleFolderSelection(folder, folderItems)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                            />
                          </td>
                          <td colSpan={6} className="px-4 py-2.5">
                            <div className="flex items-center justify-between w-full">
                              <button
                                type="button"
                                onClick={() => toggleFolderCollapse(folder)}
                                className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-sky-400 transition-colors select-none cursor-pointer w-full text-right"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4.5 h-4.5 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4.5 h-4.5 text-slate-400" />
                                )}
                                {isCollapsed ? (
                                  <Folder className="w-4.5 h-4.5 text-amber-500 fill-amber-500/20" />
                                ) : (
                                  <FolderOpen className="w-4.5 h-4.5 text-amber-500 fill-amber-500/20" />
                                )}
                                <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] mr-1" style={{ direction: 'ltr' }}>
                                  {folder}
                                </span>
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600 dark:text-slate-400 font-bold mr-2">
                                  {toPersianNums(folderItems.length.toString())} فایل
                                </span>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-left font-mono text-[11px] text-slate-400">
                            {formatBytes(folderItems.reduce((acc, curr) => acc + curr.file.size, 0))}
                          </td>
                        </tr>

                        {/* Folder Files (Render only if not collapsed) */}
                        {!isCollapsed && folderItems.map((item) => {
                          const isSelected = selectedPaths.has(item.file.fullPath);
                          const matched = item.matchStatus === 'matched' && item.tmdb;
                          const poster = matched ? item.tmdb?.posterPath : null;
                          const isTV = item.parsed.isSeries;

                          const displayTitle = matched 
                            ? item.tmdb?.title 
                            : (isTV ? item.parsed.seriesName : item.parsed.title);
                          
                          const displayOrigTitle = matched
                            ? item.tmdb?.originalTitle
                            : '';

                          const displayYear = matched
                            ? item.tmdb?.releaseDate?.substring(0, 4)
                            : item.parsed.year || 'Unknown';

                          return (
                            <tr 
                              key={item.file.fullPath}
                              className={`hover:bg-indigo-50/10 dark:hover:bg-indigo-950/5 transition-colors border-b border-slate-100 dark:border-slate-800/30 ${
                                isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(item.file.fullPath)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                                />
                              </td>

                              {/* Poster */}
                              <td className="px-4 py-3 text-center">
                                {poster ? (
                                  <img 
                                    src={poster} 
                                    alt="Poster" 
                                    className="w-10 h-14 object-cover rounded shadow-md border border-slate-200 dark:border-slate-800 mx-auto"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-14 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 mx-auto">
                                    <Film className="w-5 h-5" />
                                  </div>
                                )}
                              </td>

                              {/* Title & original title & Edit trigger */}
                              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-xs">
                                <div className="flex items-center gap-2">
                                  <div className="truncate font-bold text-[13px]" title={displayTitle}>
                                    {displayTitle}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditItem(item)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                                    title="ویرایش دستی مشخصات"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {isTV && (
                                  <div className="text-[10px] text-indigo-600 dark:text-sky-400 font-extrabold mt-0.5">
                                    {toPersianNums((item.parsed as ParsedSeries).episode || '')}
                                  </div>
                                )}
                                {displayOrigTitle && (
                                  <div className="text-xs text-slate-400 font-mono truncate mt-0.5" style={{ direction: 'ltr', textAlign: 'right' }}>
                                    {displayOrigTitle}
                                  </div>
                                )}
                              </td>

                              {/* Year */}
                              <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 font-mono">
                                {displayYear !== 'Unknown' ? toPersianNums(displayYear) : 'Unknown'}
                              </td>

                              {/* Type (Movie / TV) */}
                              <td className="px-4 py-3 text-center">
                                {isTV ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30">
                                    سریال تلویزیونی
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
                                    فیلم سینمایی
                                  </span>
                                )}
                              </td>

                              {/* Match Status */}
                              <td className="px-4 py-3 text-center">
                                {item.matchStatus === 'matched' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>شناسایی شد</span>
                                  </span>
                                ) : item.matchStatus === 'failed' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>خطای سرور</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>تنظیم نشده</span>
                                  </span>
                                )}
                              </td>

                              {/* File details (original filename & folder) */}
                              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                                <div className="truncate text-slate-700 dark:text-slate-300 font-mono" style={{ direction: 'ltr', textAlign: 'right' }} title={item.file.filename}>
                                  {item.file.filename}
                                </div>
                              </td>

                              {/* Size */}
                              <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 text-left">
                                {formatBytes(item.file.size)}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Selected stats with disk icon */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span>
                تعداد{' '}
                <strong className="text-slate-900 dark:text-slate-200">
                  {toPersianNums(selectedCount.toString())}
                </strong>{' '}
                فایل انتخاب شده به حجم{' '}
                <strong className="text-slate-900 dark:text-slate-200">
                  {formatBytes(totalSelectedSize)}
                </strong>
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                بستن
              </button>
              
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || selectedPaths.size === 0}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ورود اطلاعات...</span>
                  </>
                ) : (
                  <span>وارد کردن به دیتابیس ({toPersianNums(selectedPaths.size.toString())} مورد)</span>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Batch Series Assignment Modal */}
      {showBatchSeriesModal && (
        <div className="fixed inset-0 z-[1100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowBatchSeriesModal(false)} />
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-right shadow-2xl transition-all w-full max-w-md p-6 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h4 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-indigo-500" />
                  <span>انتساب گروهی به سریال</span>
                </h4>
                <button
                  onClick={() => setShowBatchSeriesModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                {/* Series Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">سریال مقصد:</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setBatchSeriesType('existing')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        batchSeriesType === 'existing'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      سریال‌های موجود
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchSeriesType('new')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        batchSeriesType === 'new'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      سریال جدید
                    </button>
                  </div>
                </div>

                {/* Series selector or Input */}
                {batchSeriesType === 'existing' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">انتخاب سریال:</label>
                    <select
                      value={batchSelectedSeriesId}
                      onChange={(e) => setBatchSelectedSeriesId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                      style={{ direction: 'rtl' }}
                    >
                      {dbService.getSeries().map(s => (
                        <option key={s.id} value={s.id}>
                          {s.titleFa} ({s.year})
                        </option>
                      ))}
                      {dbService.getSeries().length === 0 && (
                        <option value="" disabled>هیچ سریالی در دیتابیس موجود نیست</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">نام سریال (فارسی یا انگلیسی):</label>
                    <input
                      type="text"
                      placeholder="مثال: آکتور یا Actor"
                      value={batchNewSeriesName}
                      onChange={(e) => setBatchNewSeriesName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                      style={{ direction: 'rtl' }}
                    />
                  </div>
                )}

                {/* Season selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">شماره فصل:</label>
                  <input
                    type="number"
                    min="1"
                    value={batchSeriesSeason}
                    onChange={(e) => setBatchSeriesSeason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-mono text-left"
                  />
                </div>

                {/* Episode numbering option */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">شماره‌گذاری قسمت‌ها:</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="epType"
                        checked={batchSeriesEpType === 'auto'}
                        onChange={() => setBatchSeriesEpType('auto')}
                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:bg-slate-800 cursor-pointer"
                      />
                      <span>استخراج خودکار از نام فایل‌ها (هوشمند)</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="epType"
                        checked={batchSeriesEpType === 'seq'}
                        onChange={() => setBatchSeriesEpType('seq')}
                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:bg-slate-800 cursor-pointer"
                      />
                      <span>شماره‌گذاری ترتیبی (پشت سر هم)</span>
                    </label>
                  </div>
                </div>

                {/* Sequence Start Input */}
                {batchSeriesEpType === 'seq' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">شروع شماره‌گذاری از قسمت:</label>
                    <input
                      type="number"
                      min="1"
                      value={batchSeriesEpStart}
                      onChange={(e) => setBatchSeriesEpStart(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-mono text-left"
                    />
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex gap-2 justify-end mt-6 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBatchSeriesModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchSeries}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  اعمال روی فایل‌ها
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Movie Assignment Modal */}
      {showBatchMovieModal && (
        <div className="fixed inset-0 z-[1100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowBatchMovieModal(false)} />
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-right shadow-2xl transition-all w-full max-w-md p-6 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h4 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Film className="w-5 h-5 text-violet-500" />
                  <span>انتساب گروهی به فیلم سینمایی</span>
                </h4>
                <button
                  onClick={() => setShowBatchMovieModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">نام فیلم (فارسی یا انگلیسی):</label>
                  <input
                    type="text"
                    placeholder="مثال: زودپز یا Zudpaz"
                    value={batchMovieName}
                    onChange={(e) => setBatchMovieName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                    style={{ direction: 'rtl' }}
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    با ثبت این مورد، تمام فایل‌های انتخاب شده به عنوان نسخه‌های مختلف این فیلم تعریف شده و مشخصات آنها از TMDb دریافت خواهد شد.
                  </p>
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex gap-2 justify-end mt-6 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBatchMovieModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchMovie}
                  className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-md cursor-pointer"
                >
                  اعمال روی فایل‌ها
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Item Editing Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[1110] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setEditingItem(null)} />
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-right shadow-2xl transition-all w-full max-w-md p-6 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h4 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-500" />
                  <span>تنظیم عنوان و قسمت فایل</span>
                </h4>
                <button
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs text-slate-500 dark:text-slate-400 font-mono break-all text-left" style={{ direction: 'ltr' }}>
                  <span className="font-semibold block mb-1 text-slate-400 select-none">نام فایل:</span>
                  {editingItem.file.filename}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">نوع رسانه:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!editIsSeries}
                        onChange={() => setEditIsSeries(false)}
                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:bg-slate-800 cursor-pointer"
                      />
                      <span>فیلم سینمایی</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={editIsSeries}
                        onChange={() => setEditIsSeries(true)}
                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:bg-slate-800 cursor-pointer"
                      />
                      <span>سریال تلویزیونی</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {editIsSeries ? 'نام سریال (فارسی یا انگلیسی):' : 'عنوان فیلم (فارسی یا انگلیسی):'}
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                    placeholder={editIsSeries ? 'مثال: شهرزاد' : 'مثال: زودپز'}
                    style={{ direction: 'rtl' }}
                  />
                </div>

                {editIsSeries && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">شماره فصل:</label>
                      <input
                        type="number"
                        min="1"
                        value={editSeason}
                        onChange={(e) => setEditSeason(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">شماره قسمت:</label>
                      <input
                        type="number"
                        min="1"
                        value={editEpisodeNum}
                        onChange={(e) => setEditEpisodeNum(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-mono text-left"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex gap-2 justify-end mt-6 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditItem}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
