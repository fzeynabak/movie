import React, { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { Movie, Series, Season, Episode } from '../types';
import { showToast } from '../utils/toast';
import { 
  Download, 
  Clipboard, 
  FolderOpen, 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Plus, 
  ExternalLink,
  Video,
  FileText,
  Settings,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface DownloadTask {
  id: string;
  url: string;
  label: string;
  mediaType: 'series' | 'movie';
  mediaId: string;
  mediaTitle: string;
  seasonId?: string;
  seasonNum?: number;
  episodeNum?: number;
  quality: string;
  isSubtitle: boolean;
  status: 'idle' | 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  bytesWritten: number;
  totalBytes: number;
  speedMbs: number;
  timeElapsed: number;
  error?: string;
  targetPath?: string;
}

const PERSIAN_NUMBERS_MAP: { [key: string]: number } = {
  'اول': 1, 'یک': 1, 'یكم': 1, 'یکام': 1, 'نخست': 1,
  'دوم': 2, 'دو': 2,
  'سوم': 3, 'سه': 3,
  'چهارم': 4, 'چهار': 4,
  'پنجم': 5, 'پنج': 5,
  'ششم': 6, 'شش': 6,
  'هفتم': 7, 'هفت': 7,
  'هشتم': 8, 'هشت': 8,
  'نهم': 9, 'نه': 9,
  'دهم': 10, 'ده': 10,
  'یازدهم': 11, 'یازده': 11,
  'دوازدهم': 12, 'دوازده': 12,
  'سیزدهم': 13, 'سیزده': 13,
  'چهاردهم': 14, 'چهارده': 14,
  'پانزدهم': 15, 'پانزده': 15,
  'شانزدهم': 16, 'شانزده': 16,
  'هفدهم': 17, 'هفده': 17,
  'هجدهم': 18, 'هجده': 18,
  'نوزدهم': 19, 'نوزده': 19,
  'بیستم': 20, 'بیست': 20,
  'بیست و اول': 21, 'بیست و یک': 21,
  'بیست و دوم': 22, 'بیست و دو': 22,
  'بیست و سوم': 23, 'بیست و سه': 23,
  'بیست و چهارم': 24, 'بیست و چهار': 24,
  'بیست و پنجم': 25, 'بیست و پنج': 25,
  'بیست و ششم': 26, 'بیست و شش': 26,
  'بیست و هفتم': 27, 'بیست و هفت': 27,
  'بیست و هشتم': 28, 'بیست و هشت': 28,
  'بیست و نهم': 29, 'بیست و نه': 29,
  'سیام': 30, 'سی': 30, 'سی و اول': 31, 'سی و یک': 31,
  'سی و دوم': 32, 'سی و دو': 32,
  'سی و سوم': 33, 'سی و سه': 33,
  'سی و چهارم': 34, 'سی و چهار': 34,
  'سی و پنجم': 35, 'سی و پنج': 35,
  'سی و ششم': 36, 'سی و شش': 36,
  'سی و هفتم': 37, 'سی و هفت': 37,
  'سی و هشتم': 38, 'سی و هشت': 38,
  'سی و نهم': 39, 'سی و نه': 39,
  'چهلم': 40, 'چهل': 40
};

// Clean and normalize Persian text for regex matching
function normalizePersianText(text: string): string {
  if (!text) return '';
  return text
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200B-\u200D]/g, ' ') // half-space to standard space
    .replace(/\s+/g, ' ')
    .trim();
}

// Convert numbers in Persian words/digits to integer
function parseNumberValue(text: string): number | null {
  if (!text) return null;
  const clean = normalizePersianText(text);
  
  // Try direct digits first
  const matchDigits = clean.match(/\d+/);
  if (matchDigits) {
    return parseInt(matchDigits[0], 10);
  }

  // Search in Persian Words map
  for (const word of Object.keys(PERSIAN_NUMBERS_MAP)) {
    if (clean.includes(word)) {
      return PERSIAN_NUMBERS_MAP[word];
    }
  }
  return null;
}

export default function Downloads() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [moviesList, setMoviesList] = useState<Movie[]>([]);
  
  // Selection states
  const [targetType, setTargetType] = useState<'series' | 'movie'>('series');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  
  const [savePath, setSavePath] = useState<string>(() => {
    return localStorage.getItem('parstech_download_save_path') || 'C:\\MediaDownloads';
  });

  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isDownloadingQueue, setIsDownloadingQueue] = useState<boolean>(false);
  const [currentActiveTaskId, setCurrentActiveTaskId] = useState<string | null>(null);

  // Load catalogs on mount & event triggers
  const loadCatalogs = () => {
    setSeriesList(dbService.getSeries());
    setMoviesList(dbService.getMovies());
  };

  useEffect(() => {
    loadCatalogs();
    window.addEventListener('db_synced_from_disk', loadCatalogs);
    return () => window.removeEventListener('db_synced_from_disk', loadCatalogs);
  }, []);

  // Update default selections when catalogs or target changes
  useEffect(() => {
    if (targetType === 'series' && seriesList.length > 0 && !selectedSeriesId) {
      setSelectedSeriesId(seriesList[0].id);
    } else if (targetType === 'movie' && moviesList.length > 0 && !selectedMovieId) {
      setSelectedMovieId(moviesList[0].id);
    }
  }, [targetType, seriesList, moviesList]);

  // Update selected season when series selection changes
  useEffect(() => {
    if (selectedSeriesId) {
      const series = seriesList.find(s => s.id === selectedSeriesId);
      if (series && series.seasons && series.seasons.length > 0) {
        setSelectedSeasonId(series.seasons[0].id);
      } else {
        setSelectedSeasonId('');
      }
    }
  }, [selectedSeriesId, seriesList]);

  // Subscribe to electron IPC download-task-progress events
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onDownloadTaskProgress) {
      window.electronAPI.onDownloadTaskProgress((data) => {
        setTasks(prev => prev.map(task => {
          if (task.id === data.id) {
            return {
              ...task,
              progress: data.progress,
              bytesWritten: data.bytesWritten,
              totalBytes: data.totalBytes,
              speedMbs: data.speedMbs,
              timeElapsed: data.timeElapsed || 0,
              status: data.completed ? 'completed' : task.status === 'cancelled' ? 'cancelled' : 'downloading',
              error: data.error
            };
          }
          return task;
        }));
      });
    }
  }, []);

  // Save selected path to localstorage
  const handleSelectSaveDirectory = async () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      try {
        const res = await window.electronAPI.selectDirectory();
        if (res.success && res.path) {
          setSavePath(res.path);
          localStorage.setItem('parstech_download_save_path', res.path);
          showToast('مسیر ذخیره دانلودها بروزرسانی شد.', 'success');
        }
      } catch (err: any) {
        showToast('خطا در انتخاب پوشه: ' + err.message, 'error');
      }
    } else {
      showToast('انتخاب پوشه فقط در نسخه ویندوز دسکتاپ فعال است.', 'info');
    }
  };

  // Launch Telegram app with tg:// protocol
  const handleLaunchTelegram = async () => {
    if (window.electronAPI && (window.electronAPI as any).openTelegram) {
      try {
        showToast('در حال اجرای نرم‌افزار تلگرام...', 'info');
        const res = await (window.electronAPI as any).openTelegram();
        if (res.success) {
          showToast(res.fallback ? 'تلگرام وب در مرورگر باز شد.' : 'تلگرام با موفقیت اجرا شد.', 'success');
        } else {
          showToast('خطا در اجرای تلگرام: ' + res.error, 'error');
        }
      } catch (err: any) {
        showToast('خطا در اجرای تلگرام: ' + err.message, 'error');
      }
    } else {
      showToast('این قابلیت فقط در نسخه دسکتاپ ویندوز فعال است.', 'info');
    }
  };

  // Auto parsing function (IDM Clipboard Style)
  const extractAndAddTasks = async (clipboardOnly: boolean) => {
    let htmlContent = '';
    let textContent = '';

    if (clipboardOnly) {
      if (window.electronAPI && (window.electronAPI as any).readClipboardHTML) {
        try {
          const res = await (window.electronAPI as any).readClipboardHTML();
          if (res.success) {
            htmlContent = res.html || '';
            textContent = res.text || '';
          }
        } catch (e) {
          showToast('خطا در خواندن کلیپ‌بورد.', 'error');
          return;
        }
      } else {
        showToast('دسترسی به کلیپ‌بورد در این نسخه شبیه‌سازی شده است. از کادر متنی پایین استفاده کنید.', 'info');
        return;
      }
    } else {
      textContent = rawTextInput;
      htmlContent = ''; // Text only
    }

    if (!htmlContent && !textContent) {
      showToast('محتوایی جهت استخراج یافت نشد! ابتدا متن یا پست‌های تلگرام را کپی کنید.', 'warning');
      return;
    }

    const parsedLinks: Array<{ url: string; text: string }> = [];

    // 1. Parse HTML links (perfect for Rich Text copied from websites/Telegram messages with embedded hyperlinks)
    if (htmlContent) {
      const anchorRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = anchorRegex.exec(htmlContent)) !== null) {
        const url = match[1];
        const innerText = match[2].replace(/<[^>]*>/g, '').trim();
        if (url.startsWith('http') && !parsedLinks.some(l => l.url === url)) {
          parsedLinks.push({ url, text: innerText });
        }
      }
    }

    // 2. Parse raw plain text links as fallback
    if (textContent) {
      const rawUrlRegex = /(https?:\/\/[^\s"'<>\(\)]+)/gi;
      let match;
      while ((match = rawUrlRegex.exec(textContent)) !== null) {
        const url = match[0];
        // Clean URL from trailing punctuation
        const cleanUrl = url.replace(/[.,;:]$/, '');
        if (!parsedLinks.some(l => l.url === cleanUrl)) {
          // Find context line for the link
          const lines = textContent.split('\n');
          const contextLine = lines.find(line => line.includes(url)) || 'قسمت جدید';
          parsedLinks.push({ url: cleanUrl, text: contextLine.replace(url, '').trim() });
        }
      }
    }

    if (parsedLinks.length === 0) {
      showToast('هیچ لینک یا متنی حاوی هایپرلینک پیدا نشد.', 'warning');
      return;
    }

    // Construct DownloadTask records
    const newTasks: DownloadTask[] = parsedLinks.map((item, index) => {
      const url = item.url;
      const label = item.text || 'دانلود مدیا';
      
      // Determine if it's a subtitle file
      const isSubtitle = url.toLowerCase().endsWith('.srt') || url.toLowerCase().endsWith('.vtt') || label.includes('زیرنویس');

      // Parsers
      let seasonNum = 1;
      let episodeNum = index + 1;
      let quality = '1080p';

      // Parse from URL filename first
      const filename = url.split('/').pop() || '';
      const sMatches = filename.match(/s(\d+)/i) || label.match(/فصل\s+(\d+|[آ-ی]+)/i);
      if (sMatches) {
        const parsedS = parseNumberValue(sMatches[1]);
        if (parsedS !== null) seasonNum = parsedS;
      }

      const eMatches = filename.match(/e(\d+)/i) || filename.match(/ep(\d+)/i) || label.match(/قسمت\s+(\d+|[آ-ی]+)/i);
      if (eMatches) {
        const parsedE = parseNumberValue(eMatches[1]);
        if (parsedE !== null) episodeNum = parsedE;
      }

      const qMatches = filename.match(/(\d+p)/i) || label.match(/(\d+p)/i);
      if (qMatches) {
        quality = qMatches[1].toLowerCase();
      }

      const currentSeries = seriesList.find(s => s.id === selectedSeriesId);
      const currentMovie = moviesList.find(m => m.id === selectedMovieId);

      return {
        id: 'dl_' + Math.random().toString(36).substring(2, 9),
        url,
        label,
        mediaType: targetType,
        mediaId: targetType === 'series' ? selectedSeriesId : selectedMovieId,
        mediaTitle: targetType === 'series' ? (currentSeries?.titleFa || 'سریال') : (currentMovie?.titleFa || 'فیلم'),
        seasonNum: targetType === 'series' ? seasonNum : undefined,
        episodeNum: targetType === 'series' ? episodeNum : undefined,
        quality,
        isSubtitle,
        status: 'idle',
        progress: 0,
        bytesWritten: 0,
        totalBytes: 0,
        speedMbs: 0,
        timeElapsed: 0
      };
    });

    setTasks(prev => [...prev, ...newTasks]);
    showToast(`تعداد ${newTasks.length} لینک دانلود با موفقیت استخراج و به صف اضافه شد.`, 'success');
    setRawTextInput('');
  };

  // Create a new Series inline
  const handleCreateNewSeriesInline = () => {
    const titleFa = prompt('نام سریال فارسی جدید را وارد کنید:');
    if (!titleFa) return;
    try {
      const added = dbService.addSeries({
        category: 'خارجی',
        titleFa,
        titleEn: titleFa,
        year: String(new Date().getFullYear()),
        director: 'نامشخص',
        writer: 'نامشخص',
        actors: 'نامشخص',
        episodeDuration: '50',
        genres: ['درام'],
        poster: '',
        summary: 'ثبت شده از طریق دانلودر هوشمند',
        purchasePrice: 0,
        salePrice: 1500,
        country: 'خارجی',
        language: 'فارسی (زیرنویس)',
        imdbRating: '7.5',
        quality: '1080p WebDL',
        subtitle: 'دارد',
        seasons: []
      });
      loadCatalogs();
      setSelectedSeriesId(added.id);
      showToast(`سریال جدید "${titleFa}" با موفقیت ایجاد و انتخاب شد.`, 'success');
    } catch (e: any) {
      showToast('خطا در ساخت سریال: ' + e.message, 'error');
    }
  };

  // Create new Season inline
  const handleCreateNewSeasonInline = () => {
    if (!selectedSeriesId) {
      showToast('ابتدا باید یک سریال انتخاب کنید.', 'warning');
      return;
    }
    const name = prompt('نام یا شماره فصل را وارد کنید (مثال: فصل اول):');
    if (!name) return;
    try {
      const added = dbService.addSeason(selectedSeriesId, name);
      if (added) {
        loadCatalogs();
        setSelectedSeasonId(added.id);
        showToast(`فصل "${name}" با موفقیت ایجاد و انتخاب شد.`, 'success');
      }
    } catch (e: any) {
      showToast('خطا در ساخت فصل: ' + e.message, 'error');
    }
  };

  // Delete task from list
  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && task.status === 'downloading') {
      if (window.electronAPI && window.electronAPI.cancelDownloadFile) {
        await window.electronAPI.cancelDownloadFile(id);
      }
    }
    setTasks(prev => prev.filter(t => t.id !== id));
    if (currentActiveTaskId === id) {
      setCurrentActiveTaskId(null);
    }
    showToast('آیتم از صف حذف شد.', 'info');
  };

  // Format bytes for readable display
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Start processing download queue
  const startQueueDownload = async () => {
    if (tasks.length === 0) {
      showToast('هیچ تسکی در صف دانلود وجود ندارد.', 'warning');
      return;
    }
    
    const idleTasks = tasks.filter(t => t.status === 'idle' || t.status === 'failed' || t.status === 'cancelled');
    if (idleTasks.length === 0) {
      showToast('تمام تسک‌ها قبلاً دانلود شده‌اند یا در حال دانلود هستند.', 'info');
      return;
    }

    setIsDownloadingQueue(true);
    showToast('صف دانلود آغاز شد...', 'success');

    // Run sequentially to prevent network choke and disk writing locks
    for (const task of tasks) {
      if (task.status === 'idle' || task.status === 'failed' || task.status === 'cancelled') {
        setCurrentActiveTaskId(task.id);
        await executeDownloadTask(task);
      }
    }
    setIsDownloadingQueue(false);
    setCurrentActiveTaskId(null);
    showToast('اجرای صف دانلود به پایان رسید.', 'success');
  };

  const stopQueueDownload = async () => {
    setIsDownloadingQueue(false);
    if (currentActiveTaskId) {
      if (window.electronAPI && window.electronAPI.cancelDownloadFile) {
        await window.electronAPI.cancelDownloadFile(currentActiveTaskId);
      }
      setTasks(prev => prev.map(t => t.id === currentActiveTaskId ? { ...t, status: 'cancelled' } : t));
    }
    setCurrentActiveTaskId(null);
    showToast('صف دانلود متوقف شد.', 'warning');
  };

  // Execute single download task and update the database on success
  const executeDownloadTask = (task: DownloadTask): Promise<boolean> => {
    return new Promise(async (resolve) => {
      if (!window.electronAPI || !window.electronAPI.downloadInternetFile) {
        showToast('دانلودر اینترنتی فقط در نسخه ویندوز و دسکتاپ فعال است.', 'error');
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', error: 'سیستم‌عامل نامعتبر یا عدم دسترسی به دیسک' } : t));
        return resolve(false);
      }

      // Generate pristine path and filename
      const fileExt = task.url.split('?')[0].split('.').pop() || (task.isSubtitle ? 'srt' : 'mkv');
      const cleanExt = fileExt.length <= 4 ? fileExt : task.isSubtitle ? 'srt' : 'mkv';
      
      let destFolder = savePath;
      let filename = '';

      if (task.mediaType === 'series') {
        const series = seriesList.find(s => s.id === task.mediaId);
        const seriesFolder = series ? series.titleFa.replace(/[\\/:*?"<>|]/g, '') : 'Series';
        const seasonName = series?.seasons.find(se => se.id === selectedSeasonId)?.name || `Season ${task.seasonNum}`;
        const cleanSeasonFolder = seasonName.replace(/[\\/:*?"<>|]/g, '');
        
        destFolder = `${savePath}\\${seriesFolder}\\${cleanSeasonFolder}`;
        filename = `E${String(task.episodeNum).padStart(2, '0')}.${cleanExt}`;
      } else {
        const movie = moviesList.find(m => m.id === task.mediaId);
        const movieFolder = movie ? movie.titleFa.replace(/[\\/:*?"<>|]/g, '') : 'Movies';
        
        destFolder = `${savePath}\\${movieFolder}`;
        filename = `${movieFolder}.${cleanExt}`;
      }

      const fullDestPath = `${destFolder}\\${filename}`;

      // Update state to pending/downloading
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'downloading', targetPath: fullDestPath } : t));

      try {
        const res = await window.electronAPI.downloadInternetFile(task.id, task.url, fullDestPath);
        if (res.success) {
          // Success! Now associate and update database
          if (task.mediaType === 'series') {
            await integrateSeriesEpisodeToDB(task, fullDestPath);
          } else {
            await integrateMovieToDB(task, fullDestPath);
          }

          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', progress: 100 } : t));
          
          // Trigger catalog refresh in App
          window.dispatchEvent(new Event('db_synced_from_disk'));
          resolve(true);
        } else {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', error: res.error } : t));
          resolve(false);
        }
      } catch (err: any) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed', error: err.message } : t));
        resolve(false);
      }
    });
  };

  // Add or update the series episode in database on successful download
  const integrateSeriesEpisodeToDB = async (task: DownloadTask, localPath: string) => {
    try {
      const series = dbService.getSeries().find(s => s.id === task.mediaId);
      if (!series) return;

      const season = series.seasons.find(se => se.id === selectedSeasonId);
      if (!season) return;

      const episodeNumber = task.episodeNum || 1;

      // Check if episode already exists in this season
      const existingEpisode = season.episodes.find(ep => ep.episodeNumber === episodeNumber);

      if (existingEpisode) {
        // Update existing episode path
        if (task.isSubtitle) {
          // Add to subtitles list
          const currentSubs = existingEpisode.subtitlesList || [];
          if (!currentSubs.includes(localPath)) {
            currentSubs.push(localPath);
          }
          dbService.updateEpisode(task.mediaId, season.id, existingEpisode.id, {
            subtitlesList: currentSubs
          });
        } else {
          // Update video path
          dbService.updateEpisode(task.mediaId, season.id, existingEpisode.id, {
            videoPath: localPath,
            description: `دانلود شده با کیفیت ${task.quality}`
          });
        }
      } else {
        // Create new episode
        const newEp: Omit<Episode, 'id'> = {
          episodeNumber: episodeNumber,
          name: `قسمت ${episodeNumber}`,
          videoPath: task.isSubtitle ? '' : localPath,
          description: `دانلود شده با کیفیت ${task.quality}`,
          subtitlesList: task.isSubtitle ? [localPath] : []
        };
        dbService.addEpisode(task.mediaId, season.id, newEp);
      }

      showToast(`قسمت ${episodeNumber} سریال "${series.titleFa}" در دیتابیس ثبت و آدرس‌دهی شد.`, 'success');
    } catch (e: any) {
      console.error('Error integrating with DB:', e);
    }
  };

  // Update movie in database on successful download
  const integrateMovieToDB = async (task: DownloadTask, localPath: string) => {
    try {
      const movie = dbService.getMovies().find(m => m.id === task.mediaId);
      if (!movie) return;

      if (task.isSubtitle) {
        // Add to movie subtitles
        const currentSubs = movie.subtitle ? movie.subtitle.split(',') : [];
        if (!currentSubs.includes(localPath)) {
          currentSubs.push(localPath);
        }
        dbService.updateMovie(movie.id, {
          subtitle: currentSubs.join(',')
        });
      } else {
        dbService.updateMovie(movie.id, {
          filePath: localPath,
          quality: task.quality
        });
      }

      showToast(`فیلم "${movie.titleFa}" در دیتابیس ثبت و آدرس‌دهی شد.`, 'success');
    } catch (e: any) {
      console.error('Error integrating movie with DB:', e);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full text-right" dir="rtl" id="downloads-page-container">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Download className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            دانلودر هوشمند و کانکتور تلگرام
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-relaxed">
            کدهای دانلود و پست‌های کپی‌شده تلگرام را مستقیماً وارد کنید. سیستم بصورت اتوماتیک شماره قسمت، کیفیت و فرمت را استخراج کرده، دانلود نموده و فورا به کاتالوگ سریال‌ها متصل می‌کند.
          </p>
        </div>

        {/* Telegram Direct launcher and folder selection */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleLaunchTelegram}
            className="h-10 px-4 bg-[#24A1DE] hover:bg-[#208ebe] text-white text-[12px] font-black rounded-xl transition-all shadow-md shadow-[#24a1de]/20 flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>اجرای مستقیم تلگرام ویندوز</span>
          </button>
          
          <button
            onClick={handleSelectSaveDirectory}
            className="h-10 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-[12px] font-black rounded-xl transition-all border border-gray-200 dark:border-gray-700 flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-indigo-500" />
            <span>تغییر پوشه ذخیره</span>
          </button>
        </div>
      </div>

      {/* Save path and Status indicators */}
      <div className="bg-white dark:bg-[#111827]/70 border border-gray-150 dark:border-gray-800/80 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[12px] font-bold text-gray-600 dark:text-gray-300">مسیر پیش‌فرض ذخیره‌سازی:</span>
          <code className="font-mono text-xs text-indigo-600 bg-indigo-500/10 dark:bg-indigo-500/5 px-2 py-1 rounded-lg border border-indigo-500/20">{savePath}</code>
        </div>
        <div className="text-[11px] font-bold text-gray-400">
          کلیدهای میانبر: کپی فایل تلگرام به راحتی توسط IDM یا این ماژول قابل دانلود است.
        </div>
      </div>

      {/* Grid: Inputs, Parsers & Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Setup & Clipboard parser (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-gray-150 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-5">
            <h2 className="text-[14px] font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              ۱. هدف‌گیری رسانه مقصد
            </h2>

            {/* Target selection */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTargetType('series')}
                  className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-all ${targetType === 'series' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/80'}`}
                >
                  سریال تلویزیونی
                </button>
                <button
                  onClick={() => setTargetType('movie')}
                  className={`flex-1 h-9 rounded-lg text-[12px] font-bold transition-all ${targetType === 'movie' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/80'}`}
                >
                  فیلم سینمایی
                </button>
              </div>

              {targetType === 'series' ? (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-gray-400">انتخاب سریال مقصد:</label>
                      <button 
                        onClick={handleCreateNewSeriesInline}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>سریال جدید</span>
                      </button>
                    </div>
                    <select
                      value={selectedSeriesId}
                      onChange={(e) => setSelectedSeriesId(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-250 dark:border-gray-750 rounded-xl text-[12px] font-bold focus:outline-none focus:border-indigo-500"
                    >
                      {seriesList.map(s => (
                        <option key={s.id} value={s.id}>{s.titleFa} ({s.year})</option>
                      ))}
                      {seriesList.length === 0 && <option>هیچ سریالی یافت نشد</option>}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-gray-400">انتخاب فصل:</label>
                      <button 
                        onClick={handleCreateNewSeasonInline}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>فصل جدید</span>
                      </button>
                    </div>
                    <select
                      value={selectedSeasonId}
                      onChange={(e) => setSelectedSeasonId(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-250 dark:border-gray-750 rounded-xl text-[12px] font-bold focus:outline-none focus:border-indigo-500"
                    >
                      {seriesList.find(s => s.id === selectedSeriesId)?.seasons.map(se => (
                        <option key={se.id} value={se.id}>{se.name}</option>
                      ))}
                      {(!selectedSeriesId || seriesList.find(s => s.id === selectedSeriesId)?.seasons.length === 0) && (
                        <option value="">ابتدا یک فصل بسازید</option>
                      )}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400">انتخاب فیلم سینمایی:</label>
                  <select
                    value={selectedMovieId}
                    onChange={(e) => setSelectedMovieId(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-250 dark:border-gray-750 rounded-xl text-[12px] font-bold focus:outline-none focus:border-indigo-500"
                  >
                    {moviesList.map(m => (
                      <option key={m.id} value={m.id}>{m.titleFa} ({m.year})</option>
                    ))}
                    {moviesList.length === 0 && <option>هیچ فیلمی یافت نشد</option>}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-gray-150 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-[14px] font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              ۲. کپی و استخراج هوشمند
            </h2>

            <button
              onClick={() => extractAndAddTasks(true)}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-black rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Clipboard className="w-5 h-5" />
              <span>📋 استخراج هوشمند از کلیپ‌بورد (IDM)</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-extrabold">یا پیست دستی متن حاوی لینک</span>
              <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
            </div>

            <div className="space-y-3">
              <textarea
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                placeholder="متن پست تلگرام یا کدهای دانلود را اینجا پیست کنید..."
                className="w-full h-32 p-3 text-[12px] font-bold bg-gray-50 dark:bg-slate-800/40 border border-gray-250 dark:border-gray-750 rounded-xl focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              ></textarea>
              <button
                onClick={() => extractAndAddTasks(false)}
                className="w-full h-10 bg-gray-100 hover:bg-gray-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-100 text-[11px] font-black rounded-lg transition-all cursor-pointer"
              >
                آنالیز و استخراج کدهای دانلود
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Active Download Queue & Processing (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-gray-150 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-5">
            
            {/* Header controls */}
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-black text-gray-900 dark:text-white">
                  لیست دانلودها و صف فعال ({tasks.length} تسک)
                </h2>
                {isDownloadingQueue && (
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-full animate-pulse">
                    در حال اجرای صف...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isDownloadingQueue ? (
                  <button
                    onClick={stopQueueDownload}
                    className="h-8 px-4 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>توقف صف</span>
                  </button>
                ) : (
                  <button
                    onClick={startQueueDownload}
                    disabled={tasks.length === 0}
                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>آغاز دانلود صف</span>
                  </button>
                )}

                <button
                  onClick={() => setTasks([])}
                  disabled={tasks.length === 0}
                  className="h-8 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-500 text-[11px] font-black rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  title="پاک کردن کامل لیست"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Downloader tasks list */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {tasks.map((task) => {
                const isCurrentlyActive = currentActiveTaskId === task.id;
                
                return (
                  <div 
                    key={task.id}
                    className={`border rounded-xl p-4 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      isCurrentlyActive 
                        ? 'bg-indigo-500/5 border-indigo-500/50 shadow-sm shadow-indigo-500/5' 
                        : task.status === 'completed'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : task.status === 'failed'
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-gray-50/50 dark:bg-slate-900/40 border-gray-150 dark:border-gray-800/80'
                    }`}
                  >
                    
                    {/* Task Info */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        {task.isSubtitle ? (
                          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <Video className="w-4 h-4 text-indigo-500 shrink-0" />
                        )}
                        <span className="text-[12px] font-bold text-gray-800 dark:text-gray-150 truncate leading-relaxed">
                          {task.label || task.url}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {task.mediaTitle}
                        </span>
                        {task.mediaType === 'series' && (
                          <>
                            <span>•</span>
                            <span>قسمت {task.episodeNum}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="bg-gray-100 dark:bg-slate-800 px-1.5 rounded">{task.quality}</span>
                        <span>•</span>
                        <span className="truncate max-w-xs font-mono" title={task.url}>{task.url}</span>
                      </div>

                      {/* Download Progress details (visible during download or completed) */}
                      {(task.status === 'downloading' || task.status === 'completed' || task.progress > 0) && (
                        <div className="space-y-1 pt-1">
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex justify-between items-center text-[9px] font-mono font-black text-gray-500">
                            <span>{task.progress}%</span>
                            <div className="flex gap-2">
                              {task.bytesWritten > 0 && (
                                <span>{formatBytes(task.bytesWritten)} از {formatBytes(task.totalBytes)}</span>
                              )}
                              {task.status === 'downloading' && (
                                <span className="text-indigo-600 dark:text-indigo-400">سرعت: {task.speedMbs.toFixed(2)} MB/s</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Error text */}
                      {task.status === 'failed' && task.error && (
                        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {task.error}
                        </p>
                      )}
                    </div>

                    {/* Action buttons & status badge */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      
                      {/* Badge status */}
                      <div className="text-left">
                        {task.status === 'idle' && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 text-[9px] font-black rounded-lg">
                            در انتظار
                          </span>
                        )}
                        {task.status === 'pending' && (
                          <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-lg animate-pulse">
                            آماده‌سازی
                          </span>
                        )}
                        {task.status === 'downloading' && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-lg flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            در حال دانلود
                          </span>
                        )}
                        {task.status === 'completed' && (
                          <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-black rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            تکمیل شد
                          </span>
                        )}
                        {task.status === 'failed' && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[9px] font-black rounded-lg flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            خطا در دانلود
                          </span>
                        )}
                        {task.status === 'cancelled' && (
                          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded-lg flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            لغو شده
                          </span>
                        )}
                      </div>

                      {/* Delete / cancel */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors flex items-center justify-center cursor-pointer"
                        title="حذف تسک"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {tasks.length === 0 && (
                <div className="p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <Download className="w-6 h-6" />
                  </div>
                  <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200">صف دانلود خالی است</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-sm leading-relaxed">
                    با کلیک روی دکمه استخراج هوشمند کلیپ‌بورد یا وارد کردن متن‌ها و لینک‌ها در کادر سمت راست، تسک‌های دانلودی را به این بخش هدایت کنید.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Guide Card */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-[13px] font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <HelpCircle className="w-4.5 h-4.5" />
              راهنمای استفاده از کپی هوشمند تلگرام (IDM Style):
            </h3>
            <ul className="list-disc list-inside text-[11px] text-indigo-950/80 dark:text-indigo-300/80 space-y-1.5 font-bold leading-relaxed">
              <li>یک یا چند پست دانلود سریال را در نرم‌افزار تلگرام انتخاب کرده و کپی کنید (کلیک راست {`>`} Copy).</li>
              <li>در این صفحه، دکمه بنفش رنگ <strong>«استخراج هوشمند از کلیپ‌بورد»</strong> را بزنید.</li>
              <li>برنامه با قدرت پردازش بالا، تمام هایپرلینک‌های مخفی در متن‌ها را استخراج کرده و شماره قسمت‌ها و کیفیت‌ها را تشخیص می‌دهد.</li>
              <li>مسیر ذخیره‌سازی را تعیین کرده و روی <strong>«آغاز دانلود صف»</strong> کلیک کنید تا تک‌تک قسمت‌ها دانلود و خودکار آدرس‌دهی شوند.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
