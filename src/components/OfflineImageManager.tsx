/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  FolderOpen, 
  Check, 
  Loader2, 
  Image as ImageIcon, 
  Globe, 
  AlertTriangle,
  Folder,
  FileImage,
  RefreshCw
} from 'lucide-react';
import { TMDbService } from '../utils/TMDbService';
import { toPersianNums } from '../pages/Dashboard';

// Helper to convert English numbers to Persian numbers
function formatPersian(val: any): string {
  if (typeof toPersianNums === 'function') {
    return toPersianNums(val);
  }
  return String(val);
}

interface OfflineImageManagerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: string;
  mediaType: 'movie' | 'series';
  mediaTitle: string;
  collectionName?: string;
  initialPoster: string;
  initialGallery?: string | string[];
  filePath?: string;
  onImagesSaved: (newPoster: string, newGallery: string[]) => void;
}

interface ImageItem {
  id: string;
  url: string;
  type: 'poster' | 'gallery';
  isLocal: boolean;
  isSelected: boolean;
  label: string;
}

export default function OfflineImageManager({
  isOpen,
  onClose,
  mediaId,
  mediaType,
  mediaTitle,
  collectionName,
  initialPoster,
  initialGallery,
  filePath,
  onImagesSaved
}: OfflineImageManagerProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [destPath, setDestPath] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingTmdb, setIsLoadingTmdb] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string>('');

  // 1. Initial State construction & TMDb discovery
  useEffect(() => {
    if (!isOpen) return;

    // Detect default folder path
    if (filePath) {
      const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
      if (lastSlash !== -1) {
        const folder = filePath.substring(0, lastSlash);
        const isWindows = filePath.includes('\\');
        setDestPath(folder + (isWindows ? '\\pic' : '/pic'));
      }
    }

    // Build list from current images
    const currentList: ImageItem[] = [];
    
    // Add current poster
    if (initialPoster) {
      const isLocal = !initialPoster.startsWith('http');
      currentList.push({
        id: 'current_poster',
        url: initialPoster,
        type: 'poster',
        isLocal,
        isSelected: !isLocal, // auto-select online images for downloading
        label: 'پوستر فعلی'
      });
    }

    // Add current gallery screenshots
    if (initialGallery) {
      const gallArr = Array.isArray(initialGallery) 
        ? initialGallery 
        : initialGallery.split(',').map((s: string) => s.trim()).filter(Boolean);
        
      gallArr.forEach((gUrl: string, idx: number) => {
        const isLocal = !gUrl.startsWith('http');
        currentList.push({
          id: `current_gallery_${idx}`,
          url: gUrl,
          type: 'gallery',
          isLocal,
          isSelected: !isLocal,
          label: `اسکرین‌شات ${idx + 1}`
        });
      });
    }

    setImages(currentList);

    // Try fetching from TMDb if possible to load alternatives
    loadAlternativeImages(currentList);
  }, [isOpen, initialPoster, initialGallery, filePath]);

  const loadAlternativeImages = async (currentList: ImageItem[]) => {
    if (!collectionName) return;
    
    // Extract TMDb ID from collectionName: "TMDb ID: 12345"
    const match = collectionName.match(/TMDb ID:\s*(\d+)/i);
    if (!match || !match[1]) return;

    const tmdbId = parseInt(match[1], 10);
    if (isNaN(tmdbId)) return;

    setIsLoadingTmdb(true);
    setTmdbError(null);

    try {
      const metadata = await TMDbService.fetchMetadata(tmdbId, mediaType === 'movie' ? 'movie' : 'tv');
      if (metadata) {
        const alternatives: ImageItem[] = [];

        // Alternative Poster
        if (metadata.posterPath && !currentList.some(item => item.url === metadata.posterPath)) {
          alternatives.push({
            id: 'tmdb_poster',
            url: metadata.posterPath,
            type: 'poster',
            isLocal: false,
            isSelected: false,
            label: 'پوستر پیشنهادی TMDb'
          });
        }

        // Alternative Backdrops
        if (metadata.backdropPath && !currentList.some(item => item.url === metadata.backdropPath)) {
          alternatives.push({
            id: 'tmdb_backdrop',
            url: metadata.backdropPath,
            type: 'gallery',
            isLocal: false,
            isSelected: false,
            label: 'بک‌دراپ اصلی TMDb'
          });
        }

        if (metadata.gallery && Array.isArray(metadata.gallery)) {
          metadata.gallery.forEach((gUrl: string, idx: number) => {
            if (!currentList.some(item => item.url === gUrl) && gUrl !== metadata.backdropPath) {
              alternatives.push({
                id: `tmdb_gallery_${idx}`,
                url: gUrl,
                type: 'gallery',
                isLocal: false,
                isSelected: false,
                label: `گالری پیشنهادی ${idx + 1}`
              });
            }
          });
        }

        setImages(prev => [...prev, ...alternatives]);
      }
    } catch (err: any) {
      console.error('Failed to load TMDB alternatives:', err);
      setTmdbError('عدم امکان برقراری ارتباط با TMDb برای دریافت تصاویر پیشنهادی');
    } finally {
      setIsLoadingTmdb(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setImages(prev => prev.map(item => {
      if (item.id === id) {
        // Toggle only if it's not already a local file (local files don't need downloading)
        if (item.isLocal) return item;
        return { ...item, isSelected: !item.isSelected };
      }
      return item;
    }));
  };

  const handleBrowseFolder = async () => {
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.selectDirectory) {
      alert('انتخاب پوشه فقط در نسخه دسکتاپ فعال است.');
      return;
    }
    const pathRes = await window.electronAPI.selectDirectory();
    if (pathRes && typeof pathRes === 'string') {
      setDestPath(pathRes);
    } else if (pathRes && pathRes.success && pathRes.path) {
      setDestPath(pathRes.path);
    }
  };

  const handleDownloadAndSave = async () => {
    const selectedToDownload = images.filter(img => img.isSelected && !img.isLocal);
    if (selectedToDownload.length === 0) {
      alert('لطفاً حداقل یک تصویر آنلاین را برای دانلود انتخاب کنید.');
      return;
    }

    if (!destPath) {
      alert('لطفاً ابتدا پوشه مقصد در هارد خود را برای ذخیره تصاویر انتخاب کنید.');
      await handleBrowseFolder();
      return;
    }

    setIsDownloading(true);
    setDownloadProgress('در حال شروع دانلود...');

    try {
      const isWindows = destPath.includes('\\');
      
      let finalLocalPoster = initialPoster;
      const finalLocalGallery: string[] = [];

      // Keep existing local gallery items that were not selected for redownload
      images.forEach(img => {
        if (img.isLocal) {
          if (img.type === 'poster') {
            finalLocalPoster = img.url;
          } else {
            finalLocalGallery.push(img.url);
          }
        }
      });

      let posterCounter = 1;
      let galleryCounter = 1;

      for (let i = 0; i < selectedToDownload.length; i++) {
        const img = selectedToDownload[i];
        setDownloadProgress(`در حال دریافت تصویر ${formatPersian(i + 1)} از ${formatPersian(selectedToDownload.length)}...`);
        
        // Define clean local filenames
        const cleanTitle = mediaTitle.replace(/[^a-zA-Z0-9آ-ی]/g, '_').substring(0, 30);
        let filename = '';
        if (img.type === 'poster') {
          filename = `poster_${cleanTitle}_${posterCounter++}`;
        } else {
          filename = `screenshot_${cleanTitle}_${galleryCounter++}`;
        }

        if (window.electronAPI && window.electronAPI.savePosterLocal) {
          const res = await window.electronAPI.savePosterLocal(img.url, destPath, filename);
          if (res && res.success && res.savedPath) {
            if (img.type === 'poster') {
              finalLocalPoster = res.savedPath;
            } else {
              finalLocalGallery.push(res.savedPath);
            }
          } else {
            console.error(`Failed to save image: ${img.url}`, res?.error);
          }
        }
      }

      // Complete
      setDownloadProgress('ذخیره‌سازی با موفقیت پایان یافت!');
      onImagesSaved(finalLocalPoster, finalLocalGallery);
      
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error: any) {
      console.error('Error in downloads:', error);
      alert('خطا در دانلود تصاویر: ' + error.message);
    } finally {
      setIsDownloading(false);
      setDownloadProgress('');
    }
  };

  const getSafeUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    // Local path formatting for browser visualization
    let formatted = url.replace(/\\/g, '/');
    if (!formatted.startsWith('file:///')) {
      if (formatted.startsWith('/')) {
        formatted = 'file://' + formatted;
      } else {
        formatted = 'file:///' + formatted;
      }
    }
    return formatted;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" id="offline-image-manager-modal">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#1e293b] w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col h-[85vh] text-right direction-rtl"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm md:text-base">
                  دانلود و مدیریت آفلاین تصاویر: {mediaTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  پوسترها و تصاویر گالری را بر روی هارد خود دانلود کنید تا در زمان قطع اینترنت نیز نمایش داده شوند.
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Folder Config Bar */}
          <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border-b border-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span>مسیر ذخیره‌سازی تصاویر در هارد شما:</span>
            </div>
            <div className="flex-1 flex gap-2 max-w-2xl">
              <input 
                type="text" 
                value={destPath} 
                onChange={(e) => setDestPath(e.target.value)}
                placeholder="مسیر پوشه در هارد (مثلاً D:\Media\Movies\pic)"
                className="flex-1 h-9 bg-white dark:bg-[#0f172a] border border-gray-250 dark:border-gray-750 px-3 rounded-lg text-xs font-mono text-left direction-ltr text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleBrowseFolder}
                className="h-9 px-3 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>انتخاب پوشه</span>
              </button>
            </div>
          </div>

          {/* Content Scroll Grid */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Status Info / Warning */}
            <div className="flex items-start gap-2.5 p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-lg text-xs leading-relaxed text-sky-800 dark:text-sky-300">
              <Globe className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block mb-0.5">آموزش کارکرد سیستم آفلاین:</strong>
                <p>
                  تصاویری که تیک خورده‌اند از آدرس‌های وب TMDB دریافت شده و به صورت فایل‌های محلی در پوشه انتخاب‌شده ذخیره می‌شوند. سیستم سپس این فایل‌های فیزیکی را جایگزین لینک‌های وب در دیتابیس می‌کند. تصاویری که دارای تگ <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1 py-0.2 rounded font-bold">آفلاین</span> هستند قبلاً روی هارد شما کپی شده‌اند.
                </p>
              </div>
            </div>

            {/* Main Images list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  <span>پوسترها و تصاویر موجود</span>
                </h4>
                {isLoadingTmdb && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال دریافت تصاویر بیشتر از TMDb...</span>
                  </div>
                )}
              </div>

              {images.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-xs border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  هیچ تصویر قابل نمایشی پیدا نشد.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="gallery-download-grid">
                  {images.map((img) => (
                    <div 
                      key={img.id}
                      onClick={() => handleToggleSelect(img.id)}
                      className={`relative rounded-xl border overflow-hidden cursor-pointer transition-all ${
                        img.isSelected 
                          ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/30' 
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      {/* Image Preview Container */}
                      <div className={`relative ${img.type === 'poster' ? 'aspect-[2/3]' : 'aspect-[16/10]'} bg-gray-100 dark:bg-slate-900 overflow-hidden`}>
                        <img 
                          src={getSafeUrl(img.url)} 
                          alt={img.label} 
                          className="w-full h-full object-cover select-none pointer-events-none hover:scale-105 transition-all duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // fallback
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400';
                          }}
                        />

                        {/* Top corner badge for Poster/Gallery */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black text-white shadow-sm ${
                            img.type === 'poster' ? 'bg-indigo-600' : 'bg-slate-700'
                          }`}>
                            {img.type === 'poster' ? 'پوستر' : 'صحنه فیلم'}
                          </span>
                        </div>

                        {/* Bottom Status label */}
                        <div className="absolute bottom-2 right-2 left-2 flex justify-between items-center">
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold shadow-sm ${
                            img.isLocal 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                          }`}>
                            {img.isLocal ? 'آفلاین' : 'نیاز به دانلود'}
                          </span>
                        </div>

                        {/* Checkbox overlay when selected */}
                        {!img.isLocal && (
                          <div className={`absolute inset-0 bg-indigo-950/15 flex items-center justify-center transition-all ${
                            img.isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                          }`}>
                            <div className={`p-1.5 rounded-full border transition-all shadow ${
                              img.isSelected 
                                ? 'bg-indigo-600 border-indigo-500 text-white scale-110' 
                                : 'bg-black/40 border-white/60 text-white/80'
                            }`}>
                              <Check className="w-4 h-4 stroke-[3px]" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info bar */}
                      <div className="p-2.5 bg-gray-50 dark:bg-slate-900 border-t border-gray-150 dark:border-gray-800 text-center">
                        <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
                          {img.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error banner from TMDb */}
            {tmdbError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-lg text-xs flex items-center gap-2 text-rose-800 dark:text-rose-300 shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{tmdbError}</span>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="p-4 border-t border-gray-150 dark:border-gray-800 shrink-0 flex items-center justify-between bg-gray-50 dark:bg-slate-900">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
              {isDownloading ? (
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{downloadProgress}</span>
                </div>
              ) : (
                <span>
                  تعداد تصاویر آماده دریافت: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{formatPersian(images.filter(i => i.isSelected && !i.isLocal).length)}</strong> مورد
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isDownloading}
                className="h-9 px-4 rounded-lg bg-gray-200 hover:bg-gray-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                انصراف
              </button>
              
              <button
                onClick={handleDownloadAndSave}
                disabled={isDownloading || images.filter(i => i.isSelected && !i.isLocal).length === 0}
                className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>دانلود و ذخیره آفلاین</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
