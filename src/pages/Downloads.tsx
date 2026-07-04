/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../db/databaseService';
import { TMDbService } from '../utils/TMDbService';
import { getSafePosterUrl } from '../types';
import { showToast, showAlert, showConfirm } from '../utils/toast';
import { 
  Download, 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  Search, 
  X, 
  Clock, 
  Folder, 
  Settings as SettingsIcon, 
  AlertCircle,
  CheckCircle,
  ListOrdered,
  Sparkles,
  Link2,
  Tv,
  Film,
  Send,
  CloudLightning,
  TrendingUp,
  Cpu,
  ChevronRight,
  Database,
  Edit2,
  Clipboard,
  CheckSquare,
  Square,
  FileText,
  Settings2,
  RefreshCw,
  FolderOpen,
  Smartphone,
  Key
} from 'lucide-react';

export interface DownloadItem {
  id: string;
  title: string;
  mediaType: 'movie' | 'series' | 'other';
  tmdbId?: string;
  posterPath?: string;
  url: string;
  saveFolder: string;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'scheduled';
  progress: number; // 0 to 100
  bytesDownloaded: number;
  totalBytes: number;
  speedMbs: number;
  error?: string;
  addedAt: string;
  scheduledTime?: string; // e.g. "02:30"
  seriesId?: string;
  seasonNum?: number;
  episodeNum?: number;
  subtitlePath?: string;
}

export default function Downloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => {
    try {
      const saved = localStorage.getItem('mediacenter_downloads_queue');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Pre-populate with some realistic/interesting mock queue items so the page isn't blank
    return [
      {
        id: 'dl-1',
        title: 'زودپز (Zoodpaz)',
        mediaType: 'movie',
        tmdbId: '123456',
        posterPath: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400',
        url: 'https://dl.parstech.ir/movies/zoodpaz_1080p.mp4',
        saveFolder: 'D:/Movies/Iranian',
        status: 'paused',
        progress: 45.2,
        bytesDownloaded: 852000000,
        totalBytes: 1880000000,
        speedMbs: 0,
        addedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'dl-2',
        title: 'سریال زخم کاری - فصل ۳',
        mediaType: 'series',
        tmdbId: '789012',
        posterPath: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&q=80&w=400',
        url: 'telegram://channel/parstech_media/episode_3_hq.mkv',
        saveFolder: 'E:/Series/ZahmKari',
        status: 'scheduled',
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 950000000,
        speedMbs: 0,
        scheduledTime: '02:00',
        addedAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'dl-3',
        title: 'تنها در خانه (Home Alone)',
        mediaType: 'movie',
        tmdbId: '972',
        posterPath: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400',
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        saveFolder: 'D:/Movies/Foreign',
        status: 'completed',
        progress: 100,
        bytesDownloaded: 1450000000,
        totalBytes: 1450000000,
        speedMbs: 0,
        addedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  });

  const [activeTab, setActiveTab] = useState<'all' | 'downloading' | 'completed' | 'queued' | 'scheduled'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [concurrentLimit, setConcurrentLimit] = useState<number>(() => {
    return Number(localStorage.getItem('mediacenter_downloads_concurrent') || '2');
  });
  
  // New Download Form Fields
  const [downloadUrl, setDownloadUrl] = useState('');
  const [mediaType, setMediaType] = useState<'movie' | 'series' | 'other'>('movie');
  const [saveFolder, setSaveFolder] = useState('D:/Downloads/Media');
  const [customTitle, setCustomTitle] = useState('');
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);
  const [selectedTmdbItem, setSelectedTmdbItem] = useState<any | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleTimeInput, setScheduleTimeInput] = useState('02:00');

  // Telegram helper state
  const [telegramLink, setTelegramLink] = useState('');
  const [telegramChannelName, setTelegramChannelName] = useState('parstech_media');
  const [telegramConnected, setTelegramConnected] = useState(true);

  // Edit Download state variables
  const [editingDownload, setEditingDownload] = useState<DownloadItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editSaveFolder, setEditSaveFolder] = useState('');
  const [editMediaType, setEditMediaType] = useState<'movie' | 'series' | 'other'>('movie');
  const [editSizeMb, setEditSizeMb] = useState<number>(100);
  const [editScheduled, setEditScheduled] = useState(false);
  const [editScheduledTime, setEditScheduledTime] = useState('02:00');

  // Telegram advanced size selection
  const [telegramSizeOption, setTelegramSizeOption] = useState<string>('17'); // Default to 17 MB for standard short clips or let user customize
  const [telegramCustomSizeMb, setTelegramCustomSizeMb] = useState<number>(17);

  // IDM Clipboard Multi-Grabber state variables
  const [showClipboardModal, setShowClipboardModal] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const [extractedLinks, setExtractedLinks] = useState<Array<{
    id: string;
    url: string;
    title: string;
    sizeMb: number;
    selected: boolean;
  }>>([]);
  const [grabberMediaType, setGrabberMediaType] = useState<'movie' | 'series' | 'other'>('movie');
  const [grabberSaveFolder, setGrabberSaveFolder] = useState('D:/Downloads/Media');

  // Series and Episode mappings and Telegram connection state variables
  const [existingSeries, setExistingSeries] = useState<any[]>([]);
  useEffect(() => {
    setExistingSeries(dbService.getSeries() || []);
    const handleSeriesChange = () => setExistingSeries(dbService.getSeries() || []);
    window.addEventListener('series_changed', handleSeriesChange);
    return () => window.removeEventListener('series_changed', handleSeriesChange);
  }, []);

  const handleSelectFolder = async () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      try {
        const folderPath = await window.electronAPI.selectDirectory();
        if (folderPath) {
          const pathStr = typeof folderPath === 'string' ? folderPath : (folderPath.path || '');
          if (pathStr) {
            return pathStr.replace(/\\/g, '/');
          }
        }
      } catch (e) {
        console.error("Directory selection error:", e);
      }
    }
    const presets = [
      'D:/Downloads/Telegram',
      'D:/Media/Movies',
      'D:/Media/Series',
      'E:/Downloads/IDM_Files',
      'C:/Users/Admin/Downloads'
    ];
    const userSelected = prompt(
      `در کلاینت تحت وب، لطفاً یکی از آدرس‌های پیش‌فرض را کپی کنید یا آدرس دلخواه تایپ کنید:\n\n` + 
      presets.map((p, idx) => `${idx + 1}. ${p}`).join('\n'),
      presets[0]
    );
    return userSelected ? userSelected.replace(/\\/g, '/') : null;
  };

  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('none');
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(1);
  const [selectedEpisodeNum, setSelectedEpisodeNum] = useState<number>(1);
  const [downloadSubtitle, setDownloadSubtitle] = useState<boolean>(false);

  const [grabberSelectedSeriesId, setGrabberSelectedSeriesId] = useState<string>('none');
  const [grabberSeasonNum, setGrabberSeasonNum] = useState<number>(1);
  const [grabberDownloadSubtitles, setGrabberDownloadSubtitles] = useState<boolean>(true);

  // New Telegram Web Explorer States
  const [downloadsViewTab, setDownloadsViewTab] = useState<'queue' | 'telegram_browser'>('queue');
  const [tgWebVersion, setTgWebVersion] = useState<'k' | 'a'>('k');
  const [telegramGrabUrl, setTelegramGrabUrl] = useState('');
  const [telegramGrabTitle, setTelegramGrabTitle] = useState('');
  const [telegramGrabMediaType, setTelegramGrabMediaType] = useState<'movie' | 'series' | 'other'>('movie');
  const [telegramGrabFolder, setTelegramGrabFolder] = useState('D:/Downloads/Telegram');
  const [telegramGrabSizeGb, setTelegramGrabSizeGb] = useState<number>(1.4);
  const [autoGrabClipboard, setAutoGrabClipboard] = useState(true);

  const lastClipboardRef = useRef('');

  useEffect(() => {
    if (!autoGrabClipboard || downloadsViewTab !== 'telegram_browser') return;

    const interval = setInterval(async () => {
      try {
        if (!document.hasFocus()) return;
        const text = await navigator.clipboard.readText();
        if (text && text.trim() !== lastClipboardRef.current) {
          const trimmed = text.trim();
          if (
            trimmed.includes('t.me/') || 
            trimmed.includes('telegram.me/') || 
            trimmed.includes('web.telegram.org') || 
            trimmed.startsWith('tg://')
          ) {
            lastClipboardRef.current = trimmed;
            setTelegramGrabUrl(trimmed);
            
            // Auto-parse a title
            let autoTitle = 'فیلم تلگرامی جدید';
            const parts = trimmed.split('/');
            const lastPart = parts[parts.length - 1];
            const secondLast = parts[parts.length - 2];
            if (Number(lastPart) && secondLast) {
              autoTitle = `فیلم کانال ${secondLast} (پست ${lastPart})`;
            } else if (lastPart && !lastPart.startsWith('#')) {
              autoTitle = `فایل تلگرام - ${decodeURIComponent(lastPart)}`;
            }
            setTelegramGrabTitle(autoTitle);
            showToast(`یک لینک تلگرام در کلیپ‌بورد شناسایی و بارگذاری شد! ✨`, 'success');
          }
        }
      } catch (e) {
        // clipboard access blocked
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [autoGrabClipboard, downloadsViewTab]);

  // Telegram direct connections
  const [telegramSessionActive, setTelegramSessionActive] = useState<boolean>(() => {
    return localStorage.getItem('parstech_telegram_connected') === 'true';
  });
  const [telegramPhoneInput, setTelegramPhoneInput] = useState('');
  const [telegramShowSmsModal, setTelegramShowSmsModal] = useState(false);
  const [telegramSmsCode, setTelegramSmsCode] = useState('');
  const [telegramSelectedTab, setTelegramSelectedTab] = useState<'saved' | 'channels' | 'search'>('saved');
  const [isConnectingTelegram, setIsConnectingTelegram] = useState(false);

  // Helper mapping Persian numbers
  const getSeasonPersianName = (num: number): string => {
    const map: { [key: number]: string } = {
      1: 'فصل اول',
      2: 'فصل دوم',
      3: 'فصل سوم',
      4: 'فصل چهارم',
      5: 'فصل پنجم',
      6: 'فصل ششم',
      7: 'فصل هفتم',
      8: 'فصل هشتم',
      9: 'فصل نهم',
      10: 'فصل دهم'
    };
    return map[num] || `فصل ${toPersianNums(num)}`;
  };

  const parsePersianNumberWord = (word: string): number => {
    if (!word) return 0;
    const clean = word.trim().replace(/‌/g, ' ');
    const map: { [key: string]: number } = {
      'اول': 1, 'نخست': 1, 'دوم': 2, 'سوم': 3, 'چهارم': 4, 'پنجم': 5,
      'ششم': 6, 'هفتم': 7, 'هشتم': 8, 'نهم': 9, 'دهم': 10,
      'یازدهم': 11, 'دوازدهم': 12, 'سیزدهم': 13, 'چهاردهم': 14, 'پانزدهم': 15,
      'شانزدهم': 16, 'هفدهم': 17, 'هجدهم': 18, 'نوزدهم': 19, 'بیستم': 20,
      'بیست و اول': 21, 'بیست و دوم': 22, 'بیست و سوم': 23, 'بیست و چهارم': 24, 'بیست و پنجم': 25,
      'بیست و ششم': 26, 'بیست و هفتم': 27, 'بیست و هشتم': 28, 'بیست و نهم': 29, 'سی ام': 30
    };
    return map[clean] || 0;
  };

  const convertPersianDigitsToEnglish = (str: string): string => {
    const p = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const a = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let res = str;
    for (let i = 0; i < 10; i++) {
      res = res.replace(new RegExp(p[i], 'g'), a[i]);
    }
    return res;
  };

  const extractNumber = (text: string, prefixKeyword: string): number => {
    const cleanText = convertPersianDigitsToEnglish(text);
    const regex = new RegExp(`${prefixKeyword}\\s+([^\\s\\s]+|\\d+)`, 'i');
    const match = cleanText.match(regex);
    if (match) {
      const val = match[1];
      if (/^\d+$/.test(val)) {
        return parseInt(val, 10);
      } else {
        return parsePersianNumberWord(val);
      }
    }
    return 0;
  };

  const parseSeasonAndEpisode = (title: string): { season: number; episode: number } => {
    const cleanTitle = title.toLowerCase();
    
    const s01e05Match = cleanTitle.match(/s(\d+)e(\d+)/i);
    if (s01e05Match) {
      return {
        season: parseInt(s01e05Match[1], 10),
        episode: parseInt(s01e05Match[2], 10)
      };
    }

    const epMatch = cleanTitle.match(/(?:ep|episode|ep_|\.e)(\d+)/i);
    let parsedEp = 1;
    if (epMatch) {
      parsedEp = parseInt(epMatch[1], 10);
    }

    let parsedSeason = 1;
    const persianSeason = extractNumber(cleanTitle, 'فصل');
    if (persianSeason > 0) {
      parsedSeason = persianSeason;
    }
    const persianEpisode = extractNumber(cleanTitle, 'قسمت');
    if (persianEpisode > 0) {
      parsedEp = persianEpisode;
    }

    return { season: parsedSeason, episode: parsedEp };
  };

  // Telegram mock message data
  const telegramSavedMessages = [
    {
      id: 'tg-m1',
      sender: 'Saved Messages',
      avatar: '💾',
      date: 'امروز، ۱۲:۳۰',
      fileName: 'Walking.Dead.The.Ones.Who.Live.S01E06.1080p.mkv',
      size: '950 مگابایت',
      sizeBytes: 950 * 1024 * 1024,
      text: 'قسمت ششم از فصل اول اسپین‌آف واکینگ دد (The Ones Who Live) با کیفیت فوق‌العاده',
      quality: '1080p Web-DL',
      hasSubtitle: true,
      subName: 'Walking.Dead.The.Ones.Who.Live.S01E06.srt',
      detectedSeriesId: 'none',
      detectedSeason: 1,
      detectedEpisode: 6
    },
    {
      id: 'tg-m2',
      sender: 'Saved Messages',
      avatar: '💾',
      date: 'امروز، ۱۰:۱۵',
      fileName: 'Zoodpaz.1080p.Web-DL.mp4',
      size: '1.3 گیگابایت',
      sizeBytes: 1300 * 1024 * 1024,
      text: 'فیلم سینمایی کمدی زودپز با بازی نوید محمدزاده و محسن تنابنده',
      quality: '1080p',
      hasSubtitle: false,
      detectedSeriesId: 'none',
      detectedSeason: 0,
      detectedEpisode: 0
    },
    {
      id: 'tg-m3',
      sender: 'Saved Messages',
      avatar: '💾',
      date: 'دیروز، ۱۸:۴۰',
      fileName: 'Breaking_Bad_S05E14_720p.mkv',
      size: '450 مگابایت',
      sizeBytes: 450 * 1024 * 1024,
      text: 'یکی از برترین قسمت‌های تاریخ تلویزیون (Ozymandias) از سریال برکینگ بد',
      quality: '720p HDTV',
      hasSubtitle: true,
      subName: 'Breaking_Bad_S05E14.srt',
      detectedSeriesId: 'none',
      detectedSeason: 5,
      detectedEpisode: 14
    },
    {
      id: 'tg-m4',
      sender: 'Saved Messages',
      avatar: '💾',
      date: '۴ روز پیش',
      fileName: 'Inside_Out_2_2024_1080p.mkv',
      size: '1.3 گیگابایت',
      sizeBytes: 1300 * 1024 * 1024,
      text: 'انیمیشن شاهکار درون و بیرون ۲ با دوبله فارسی دو زبانه و گلوری استودیو',
      quality: '1080p BluRay',
      hasSubtitle: false,
      detectedSeriesId: 'none',
      detectedSeason: 0,
      detectedEpisode: 0
    }
  ];

  const telegramChannelMessages = [
    {
      id: 'tg-c1',
      sender: 'پارس تک فیلم و سریال 📣',
      avatar: '🎬',
      date: 'امروز، ۱۱:۰۰',
      fileName: 'House.of.the.Dragon.S02E01.1080p.mkv',
      size: '940 مگابایت',
      sizeBytes: 940 * 1024 * 1024,
      text: 'شروع فصل دوم خاندان اژدها (House of the Dragon) قسمت اول با ترافیک نیم‌بها',
      quality: '1080p x265',
      hasSubtitle: true,
      subName: 'House.of.the.Dragon.S02E01.srt',
      detectedSeriesId: 'none',
      detectedSeason: 2,
      detectedEpisode: 1
    },
    {
      id: 'tg-c2',
      sender: 'پارس تک فیلم و سریال 📣',
      avatar: '🎬',
      date: 'امروز، ۱۰:۵۵',
      fileName: 'House.of.the.Dragon.S02E02.1080p.mkv',
      size: '945 مگابایت',
      sizeBytes: 945 * 1024 * 1024,
      text: 'خاندان اژدها فصل دوم قسمت دوم با زیرنویس فارسی اختصاصی چسبیده',
      quality: '1080p x265',
      hasSubtitle: true,
      subName: 'House.of.the.Dragon.S02E02.srt',
      detectedSeriesId: 'none',
      detectedSeason: 2,
      detectedEpisode: 2
    },
    {
      id: 'tg-c3',
      sender: 'پارس تک فیلم و سریال 📣',
      avatar: '🎬',
      date: 'دیروز، ۱۵:۲۰',
      fileName: 'The_Walking_Dead_Daryl_Dixon_S01E01_720p.mkv',
      size: '450 مگابایت',
      sizeBytes: 450 * 1024 * 1024,
      text: 'سریال فرعی جدید واکینگ دد: دریل دیکسون فصل اول قسمت اول',
      quality: '720p',
      hasSubtitle: true,
      subName: 'The_Walking_Dead_Daryl_Dixon_S01E01.srt',
      detectedSeriesId: 'none',
      detectedSeason: 1,
      detectedEpisode: 1
    }
  ];

  // Rich HTML/Markdown Link Extractor
  const handleExtractFromRichHTML = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            const htmlText = await blob.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const links = doc.querySelectorAll('a');
            
            if (links.length > 0) {
              const grabberLinks: any[] = [];
              links.forEach((a, index) => {
                const url = a.getAttribute('href');
                let text = a.textContent || '';
                
                if (url && (url.startsWith('http') || url.startsWith('telegram') || url.includes('t.me/'))) {
                  text = text.trim() || `لینک استخراج‌شده ${index + 1}`;
                  
                  let sizeMb = 450;
                  if (text.includes('1080') || text.includes('گیگ') || text.includes('GB')) {
                    sizeMb = 950;
                  } else if (text.includes('720')) {
                    sizeMb = 450;
                  } else if (text.includes('زیرنویس') || text.includes('srt')) {
                    sizeMb = 1;
                  }

                  grabberLinks.push({
                    id: `html-grab-${Date.now()}-${index}`,
                    url,
                    title: text,
                    sizeMb,
                    selected: true
                  });
                }
              });

              if (grabberLinks.length > 0) {
                setExtractedLinks(grabberLinks);
                setClipboardText('[استخراج‌شده از فرمت HTML کلیپ‌بورد غنی]');
                showToast(`${toPersianNums(grabberLinks.length)} لینک پیوست‌شده به همراه متن زیبای آن با موفقیت استخراج شد!`, 'success');
                return;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("HTML Clipboard API error:", e);
    }
    
    handleAnalyzeClipboardText();
  };

  // Active Download Queue Runner
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('mediacenter_downloads_queue', JSON.stringify(downloads));
  }, [downloads]);

  useEffect(() => {
    localStorage.setItem('mediacenter_downloads_concurrent', String(concurrentLimit));
  }, [concurrentLimit]);

  // Simulated download progress ticks
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDownloads(prev => {
        // Find how many are currently actively downloading
        const downloadingCount = prev.filter(d => d.status === 'downloading').length;
        
        // If we are under the limit, check if we can start queued items
        let updated = [...prev];
        let newlyStarted = 0;

        if (downloadingCount < concurrentLimit) {
          // Find first queued item to start
          for (let i = 0; i < updated.length; i++) {
            if (updated[i].status === 'queued' && (downloadingCount + newlyStarted) < concurrentLimit) {
              updated[i] = { ...updated[i], status: 'downloading', speedMbs: 0 };
              newlyStarted++;
            }
          }
        }

        // Ticks for downloading items
        let stateChanged = false;
        updated = updated.map(item => {
          if (item.status === 'downloading') {
            stateChanged = true;
            const simulatedSpeed = Number((Math.random() * 8 + 4).toFixed(1)); // 4 - 12 MB/s
            const bytesPerTick = simulatedSpeed * 1024 * 1024 * 0.5; // Tick every 500ms
            const nextBytes = Math.min(item.bytesDownloaded + bytesPerTick, item.totalBytes);
            const nextProgress = Number(((nextBytes / item.totalBytes) * 100).toFixed(1));
            
            if (nextBytes >= item.totalBytes) {
              // Completed! Add to movies/series automatically
              setTimeout(() => {
                handleCompleteMediaAddition(item);
              }, 100);

              return {
                ...item,
                progress: 100,
                bytesDownloaded: item.totalBytes,
                status: 'completed',
                speedMbs: 0
              };
            }

            return {
              ...item,
              bytesDownloaded: nextBytes,
              progress: nextProgress,
              speedMbs: simulatedSpeed
            };
          }
          return item;
        });

        return stateChanged || newlyStarted > 0 ? updated : prev;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [concurrentLimit]);

  // Auto Addition of finished downloaded movies/series into core databaseService
  const handleCompleteMediaAddition = (item: DownloadItem) => {
    try {
      const fileName = item.title.replace(/[\s\/:*?"<>|]+/g, '_');
      const filePath = `${item.saveFolder}/${fileName}.mp4`;
      const subtitlePath = item.subtitlePath || (item.url.toLowerCase().endsWith('.srt') ? item.url : `${item.saveFolder}/${fileName}.srt`);

      if (item.mediaType === 'series' && item.seriesId && item.seriesId !== 'none') {
        const series = dbService.getSeries().find(s => s.id === item.seriesId);
        if (series) {
          const seasonNum = item.seasonNum || 1;
          const epNum = item.episodeNum || 1;
          const seasonName = getSeasonPersianName(seasonNum);

          const updatedSeasons = JSON.parse(JSON.stringify(series.seasons || [])) as any[];
          
          let season = updatedSeasons.find(s => s.name === seasonName);
          if (!season) {
            season = {
              id: `se-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: seasonName,
              episodes: []
            };
            updatedSeasons.push(season);
          }

          let episode = season.episodes.find((e: any) => e.episodeNumber === epNum);
          if (episode) {
            episode.videoPath = filePath;
            episode.description = `دانلود شده به صورت خودکار توسط سیستم دانلود پارس تک.`;
            if (item.subtitlePath) {
              episode.subtitlesList = [item.subtitlePath];
            }
          } else {
            const newEp = {
              id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              episodeNumber: epNum,
              name: `قسمت ${toPersianNums(epNum)}`,
              videoPath: filePath,
              description: `دانلود شده به صورت خودکار توسط سیستم دانلود پارس تک.`,
              subtitlesList: item.subtitlePath ? [item.subtitlePath] : []
            };
            season.episodes.push(newEp);
          }

          dbService.updateSeries(series.id, { seasons: updatedSeasons });
          showToast(`قسمت ${toPersianNums(epNum)} از ${seasonName} سریال "${series.titleFa}" با موفقیت دانلود و آدرس‌دهی خودکار شد!`, 'success');
          
          window.dispatchEvent(new Event('series_changed'));
          return;
        }
      }

      showToast(`فایل "${item.title}" با موفقیت دانلود و به کاتالوگ شما اضافه شد!`, 'success');
      
      if (item.mediaType === 'movie') {
        const existing = dbService.getMovies().find(m => m.titleFa === item.title || m.titleEn === item.title);
        if (!existing) {
          dbService.addMovie({
            titleFa: item.title,
            titleEn: item.title,
            imdbRating: '8.1',
            year: '1402',
            genres: ['کمدی', 'اجتماعی'],
            category: 'ایرانی',
            filePath: filePath,
            poster: item.posterPath || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400',
            summary: `دانلود شده به صورت خودکار توسط سیستم مدیریت دانلود پارس تک. مسیر فایل: ${filePath}`,
            director: 'نامشخص',
            writer: 'نامشخص',
            actors: 'نامشخص',
            duration: '90',
            country: 'ایران',
            language: 'فارسی (دوبله)',
            quality: '1080p Web-DL',
            subtitle: 'سافت‌ساب فارسی',
            purchasePrice: 0,
            salePrice: 2000,
            collectionName: '',
            subtitlesList: item.subtitlePath ? [item.subtitlePath] : []
          });
        }
      } else if (item.mediaType === 'series') {
        const existing = dbService.getSeries().find(s => s.titleFa === item.title || s.titleEn === item.title);
        if (!existing) {
          dbService.addSeries({
            titleFa: item.title,
            titleEn: item.title,
            imdbRating: '7.8',
            year: '1403',
            genres: ['درام', 'جنایی'],
            category: 'ایرانی',
            poster: item.posterPath || 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&q=80&w=400',
            summary: `دانلود شده به صورت خودکار توسط سیستم مدیریت دانلود پارس تک.`,
            director: 'نامشخص',
            writer: 'نامشخص',
            actors: 'نامشخص',
            episodeDuration: '50',
            country: 'ایران',
            language: 'فارسی (دوبله)',
            quality: '1080p Web-DL',
            subtitle: 'سافت‌ساب فارسی',
            purchasePrice: 0,
            salePrice: 1500,
            seasons: [{ id: 'season-1', name: 'فصل اول', episodes: [] }],
            totalEpisodes: 10,
            myEpisodesCount: 10,
            releasedEpisodesCount: 10,
            isEnded: true,
            isEndedText: 'پایان یافته'
          });
        }
      }
      
      window.dispatchEvent(new Event('movies_changed'));
      window.dispatchEvent(new Event('series_changed'));
    } catch (e) {
      console.error("Auto addition of media failed", e);
    }
  };

  const handleStartDownload = (id: string) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status: 'downloading', error: undefined };
      }
      return d;
    }));
    showToast('دانلود آغاز شد', 'success');
  };

  const handlePauseDownload = (id: string) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status: 'paused', speedMbs: 0 };
      }
      return d;
    }));
    showToast('دانلود موقتاً متوقف شد', 'info');
  };

  const handleQueueDownload = (id: string) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status: 'queued', speedMbs: 0 };
      }
      return d;
    }));
    showToast('به صف دانلود اضافه شد', 'success');
  };

  const handleDeleteDownload = async (id: string) => {
    const confirm = await showConfirm('حذف دانلود', 'آیا مایل به حذف این فایل از صف دانلودها هستید؟ این کار دانلود را کنسل می‌کند.');
    if (confirm) {
      setDownloads(prev => prev.filter(d => d.id !== id));
      showToast('آیتم دانلود با موفقیت حذف شد', 'success');
    }
  };

  const handleOpenFolder = (folderPath: string) => {
    if (window.electronAPI && window.electronAPI.openFolderDirectory) {
      window.electronAPI.openFolderDirectory(folderPath)
        .then(res => {
          if (!res.success) showToast(res.error || 'پوشه پیدا نشد', 'error');
        });
    } else {
      showAlert(`این قابلیت فقط در کلاینت دسکتاپ فعال است. مسیر فایل شما: \n${folderPath}`, 'info', 'باز کردن پوشه');
    }
  };

  // TMDB Metadata Search Action inside Downloads Add dialog
  const handleSearchTmdb = async () => {
    if (!tmdbSearchQuery.trim()) {
      showToast('لطفا نام فیلم یا سریال را وارد کنید', 'warning');
      return;
    }
    setSearchingTmdb(true);
    setTmdbResults([]);
    try {
      let results: any[] = [];
      if (mediaType === 'movie') {
        results = await TMDbService.searchMovie(tmdbSearchQuery);
      } else {
        results = await TMDbService.searchTV(tmdbSearchQuery);
      }
      setTmdbResults(results.slice(0, 5));
      if (results.length === 0) {
        showToast('هیچ نتیجه‌ای در سرورهای بین‌المللی یافت نشد.', 'info');
      }
    } catch (e) {
      console.error(e);
      showToast('ارتباط با سرور TMDb برقرار نشد. (لطفاً اتصال اینترنت خود را چک کنید)', 'error');
    } finally {
      setSearchingTmdb(false);
    }
  };

  const handleSelectTmdbItem = (item: any) => {
    setSelectedTmdbItem(item);
    setCustomTitle(item.title || item.name || '');
    showToast(`رسانه انتخاب شد: ${item.title || item.name}`, 'success');
  };

  // Add a new download link to queue
  const handleAddDownloadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadUrl.trim()) {
      showToast('لطفاً لینک دانلود را وارد کنید.', 'warning');
      return;
    }

    const title = customTitle.trim() || selectedTmdbItem?.title || selectedTmdbItem?.name || 'دانلود فایل ناشناس';
    const poster = selectedTmdbItem?.poster_path 
      ? `https://image.tmdb.org/t/p/w400${selectedTmdbItem.poster_path}` 
      : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400';

    const cleanFileName = title.replace(/[\s\/:*?"<>|]+/g, '_');
    const subPath = downloadSubtitle ? `${saveFolder}/${cleanFileName}.srt`.replace(/\\/g, '/') : undefined;

    const newDl: DownloadItem = {
      id: `dl-${Date.now()}`,
      title,
      mediaType,
      tmdbId: selectedTmdbItem?.id ? String(selectedTmdbItem.id) : undefined,
      posterPath: poster,
      url: downloadUrl,
      saveFolder: saveFolder.replace(/\\/g, '/'),
      status: isScheduled ? 'scheduled' : 'queued',
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: mediaType === 'movie' ? 1900000000 : 850000000, // Simulated sizes
      speedMbs: 0,
      scheduledTime: isScheduled ? scheduleTimeInput : undefined,
      addedAt: new Date().toISOString(),
      seriesId: mediaType === 'series' ? selectedSeriesId : undefined,
      seasonNum: mediaType === 'series' ? selectedSeasonNum : undefined,
      episodeNum: mediaType === 'series' ? selectedEpisodeNum : undefined,
      subtitlePath: subPath
    };

    const listToAdd: DownloadItem[] = [newDl];

    if (downloadSubtitle) {
      const subDl: DownloadItem = {
        id: `dl-sub-${Date.now()}`,
        title: `${title} (زیرنویس فارسی اختصاصی)`,
        mediaType: 'other',
        url: downloadUrl.replace(/\.(mp4|mkv|avi|mov)$/i, '.srt'),
        saveFolder: saveFolder.replace(/\\/g, '/'),
        status: isScheduled ? 'scheduled' : 'queued',
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 150 * 1024, // 150 KB
        speedMbs: 0,
        scheduledTime: isScheduled ? scheduleTimeInput : undefined,
        addedAt: new Date().toISOString()
      };
      listToAdd.push(subDl);
    }

    setDownloads(prev => [...listToAdd, ...prev]);
    setShowAddModal(false);
    resetForm();
    showToast(`لینک دانلود "${title}" ${downloadSubtitle ? 'به همراه زیرنویس فارسی' : ''} با موفقیت اضافه شد.`, 'success');
  };

  const resetForm = () => {
    setDownloadUrl('');
    setMediaType('movie');
    setCustomTitle('');
    setTmdbSearchQuery('');
    setTmdbResults([]);
    setSelectedTmdbItem(null);
    setIsScheduled(false);
    setSelectedSeriesId('none');
    setSelectedSeasonNum(1);
    setSelectedEpisodeNum(1);
    setDownloadSubtitle(false);
  };

  // Telegram Quick Downloader simulation
  const handleAddTelegramDownload = () => {
    if (!telegramLink.trim()) {
      showToast('لطفا ابتدا لینک دانلود کانال را وارد کنید', 'warning');
      return;
    }
    // Simple parsing logic
    let parsedTitle = 'فایل تلگرامی';
    if (telegramLink.includes('t.me/') || telegramLink.includes('telegram:')) {
      const parts = telegramLink.split('/');
      const channelName = parts[parts.length - 2] || telegramChannelName;
      const msgId = parts[parts.length - 1];
      parsedTitle = `فایل کانال تلگرامی ${channelName} - پست ${msgId}`;
    }

    // Determine estimated size from selected option
    let estimatedSizeMb = 17;
    if (telegramSizeOption === 'custom') {
      estimatedSizeMb = telegramCustomSizeMb || 17;
    } else {
      estimatedSizeMb = Number(telegramSizeOption) || 17;
    }

    const totalBytes = estimatedSizeMb * 1024 * 1024;

    const newDl: DownloadItem = {
      id: `dl-tg-${Date.now()}`,
      title: parsedTitle,
      mediaType: 'movie',
      url: telegramLink,
      saveFolder: 'D:/TelegramDownloads',
      status: 'queued',
      progress: 0,
      bytesDownloaded: 0,
      totalBytes,
      speedMbs: 0,
      addedAt: new Date().toISOString()
    };

    setDownloads(prev => [newDl, ...prev]);
    setTelegramLink('');
    showToast(`لینک تلگرام آنالیز شد و با حجم تخمینی ${formatBytes(totalBytes)} به صف دانلود اضافه گردید.`, 'success');
  };

  const handleDownloadTelegramMessage = (msg: any) => {
    const poster = msg.fileName.toLowerCase().includes('walking') || msg.text.toLowerCase().includes('walking')
      ? 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&q=80&w=400'
      : msg.fileName.toLowerCase().includes('dragon')
        ? 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400'
        : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400';

    const cleanFileName = msg.fileName.replace(/[\s\/:*?"<>|]+/g, '_');
    const folder = 'D:/TelegramDownloads';
    const subPath = msg.hasSubtitle ? `${folder}/${cleanFileName}.srt`.replace(/\\/g, '/') : undefined;

    const mainDl: DownloadItem = {
      id: `dl-tg-${Date.now()}-main`,
      title: msg.fileName.replace(/\.(mp4|mkv|avi)$/i, ''),
      mediaType: msg.detectedEpisode > 0 ? 'series' : 'movie',
      posterPath: poster,
      url: `telegram://msg/${msg.id}/${msg.fileName}`,
      saveFolder: folder,
      status: 'queued',
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: msg.sizeBytes,
      speedMbs: 0,
      addedAt: new Date().toISOString(),
      seriesId: msg.detectedEpisode > 0 ? msg.detectedSeriesId : undefined,
      seasonNum: msg.detectedEpisode > 0 ? msg.detectedSeason : undefined,
      episodeNum: msg.detectedEpisode > 0 ? msg.detectedEpisode : undefined,
      subtitlePath: subPath
    };

    const listToAdd: DownloadItem[] = [mainDl];

    if (msg.hasSubtitle) {
      const subDl: DownloadItem = {
        id: `dl-tg-${Date.now()}-sub`,
        title: `${msg.fileName.replace(/\.(mp4|mkv|avi)$/i, '')} (زیرنویس تلگرامی)`,
        mediaType: 'other',
        url: `telegram://msg/${msg.id}/${msg.subName}`,
        saveFolder: folder,
        status: 'queued',
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 150 * 1024,
        speedMbs: 0,
        addedAt: new Date().toISOString()
      };
      listToAdd.push(subDl);
    }

    setDownloads(prev => [...listToAdd, ...prev]);
    showToast(`فایل "${msg.fileName}" ${msg.hasSubtitle ? 'به همراه زیرنویس فارسی' : ''} با موفقیت به صف دانلود IDM اضافه شد!`, 'success');
  };

  // Edit Download Handlers
  const handleOpenEditModal = (item: DownloadItem) => {
    setEditingDownload(item);
    setEditTitle(item.title);
    setEditUrl(item.url);
    setEditSaveFolder(item.saveFolder);
    setEditMediaType(item.mediaType);
    setEditSizeMb(Math.round(item.totalBytes / (1024 * 1024)));
    setEditScheduled(item.status === 'scheduled');
    setEditScheduledTime(item.scheduledTime || '02:00');
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDownload) return;
    if (!editTitle.trim()) {
      showToast('لطفاً عنوان را وارد کنید.', 'warning');
      return;
    }
    if (!editUrl.trim()) {
      showToast('لطفاً آدرس دانلود را وارد کنید.', 'warning');
      return;
    }

    setDownloads(prev => prev.map(d => {
      if (d.id === editingDownload.id) {
        const totalBytes = editSizeMb * 1024 * 1024;
        const bytesDownloaded = Math.min(d.bytesDownloaded, totalBytes);
        const progress = totalBytes > 0 ? Number(((bytesDownloaded / totalBytes) * 100).toFixed(1)) : 0;
        return {
          ...d,
          title: editTitle.trim(),
          url: editUrl.trim(),
          saveFolder: editSaveFolder.replace(/\\/g, '/'),
          mediaType: editMediaType,
          totalBytes,
          bytesDownloaded,
          progress,
          status: editScheduled ? 'scheduled' : (d.status === 'scheduled' ? 'queued' : d.status),
          scheduledTime: editScheduled ? editScheduledTime : undefined
        };
      }
      return d;
    }));

    setEditingDownload(null);
    showToast('تغییرات دانلود با موفقیت ذخیره شد.', 'success');
  };

  // IDM Clipboard / Multi-Grabber Handlers
  const handleAnalyzeClipboardText = () => {
    if (!clipboardText.trim()) {
      showToast('لطفا متنی را در کادر وارد یا پیست کنید.', 'warning');
      return;
    }

    // Broad Regex to extract valid URLs
    const urlRegex = /(https?:\/\/[^\s"':;<>]+|telegram:\/\/[^\s"':;<>]+|t\.me\/[^\s"':;<>]+)/gi;
    const matches = clipboardText.match(urlRegex) || [];
    
    if (matches.length === 0) {
      showToast('هیچ لینک معتبری در متن وارد شده پیدا نشد.', 'warning');
      return;
    }

    const uniqueUrls = Array.from(new Set(matches)) as string[];

    const grabberLinks = uniqueUrls.map((url: string, index) => {
      let friendlyTitle = '';
      try {
        const decodedUrl = decodeURIComponent(url);
        const lastSlash = decodedUrl.lastIndexOf('/');
        const filename = decodedUrl.substring(lastSlash + 1).split('?')[0];
        
        if (filename && filename.includes('.') && filename.length > 3) {
          friendlyTitle = filename;
        } else if (url.includes('t.me/') || url.includes('telegram:')) {
          const parts = url.split('/');
          const channelName = parts[parts.length - 2] || 'Telegram';
          const msgId = parts[parts.length - 1];
          friendlyTitle = `فایل تلگرامی کانال ${channelName} - پست ${msgId}`;
        } else {
          friendlyTitle = `فایل استخراج‌شده شماره ${index + 1}`;
        }
      } catch (e) {
        friendlyTitle = `فایل استخراج‌شده شماره ${index + 1}`;
      }

      // Default estimated size
      let defaultSizeMb = 450;
      if (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mkv')) {
        defaultSizeMb = 950;
      } else if (url.includes('t.me/') || url.includes('telegram:')) {
        defaultSizeMb = 17; // matches default user clip size!
      }

      return {
        id: `grab-${Date.now()}-${index}`,
        url,
        title: friendlyTitle,
        sizeMb: defaultSizeMb,
        selected: true
      };
    });

    setExtractedLinks(grabberLinks);
    showToast(`${toPersianNums(grabberLinks.length)} لینک معتبر با موفقیت استخراج شد. اکنون می‌توانید حجم یا نام تک‌تک آن‌ها را ویرایش یا به صورت گروهی اضافه کنید.`, 'success');
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setClipboardText(text);
          showToast('متن کپی شده کلیپ‌بورد سیستم درج شد.', 'success');
        } else {
          showToast('کلیپ‌بورد سیستم خالی است یا مرورگر اجازه خواندن نداد.', 'warning');
        }
      } else {
        // Fallback info
        showToast('خوانش مستقیم مسدود است؛ لطفاً متن کپی‌شده خود را با کلیدهای میانبر (Ctrl+V) درون کادر زیر پیست کنید.', 'info');
      }
    } catch (err) {
      showToast('خطا در دسترسی به کلیپ‌بورد. لطفاً متن را دستی درون کادر پیست کنید (Ctrl+V).', 'info');
    }
  };

  const handleAddGrabbedToQueue = () => {
    const selectedList = extractedLinks.filter(l => l.selected);
    if (selectedList.length === 0) {
      showToast('لطفاً حداقل یک لینک را از لیست زیر انتخاب کنید.', 'warning');
      return;
    }

    const listToAdd: DownloadItem[] = [];

    selectedList.forEach((item, idx) => {
      const poster = grabberMediaType === 'movie'
        ? 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400'
        : grabberMediaType === 'series'
          ? 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400';

      const parsed = parseSeasonAndEpisode(item.title);
      const cleanFileName = item.title.replace(/[\s\/:*?"<>|]+/g, '_');
      const subtitlePath = grabberDownloadSubtitles ? `${grabberSaveFolder}/${cleanFileName}.srt`.replace(/\\/g, '/') : undefined;

      const mainDl: DownloadItem = {
        id: `dl-grab-${Date.now()}-${idx}`,
        title: item.title,
        mediaType: grabberMediaType,
        posterPath: poster,
        url: item.url,
        saveFolder: grabberSaveFolder.replace(/\\/g, '/'),
        status: 'queued',
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: item.sizeMb * 1024 * 1024,
        speedMbs: 0,
        addedAt: new Date().toISOString(),
        seriesId: grabberMediaType === 'series' && grabberSelectedSeriesId !== 'none' ? grabberSelectedSeriesId : undefined,
        seasonNum: grabberMediaType === 'series' ? (grabberSelectedSeriesId !== 'none' ? grabberSeasonNum : parsed.season) : undefined,
        episodeNum: grabberMediaType === 'series' ? parsed.episode : undefined,
        subtitlePath
      };

      listToAdd.push(mainDl);

      if (grabberDownloadSubtitles) {
        const subDl: DownloadItem = {
          id: `dl-sub-grab-${Date.now()}-${idx}`,
          title: `${item.title} (زیرنویس فارسی اختصاصی)`,
          mediaType: 'other',
          url: item.url.replace(/\.(mp4|mkv|avi|mov)$/i, '.srt'),
          saveFolder: grabberSaveFolder.replace(/\\/g, '/'),
          status: 'queued',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 150 * 1024, // 150 KB
          speedMbs: 0,
          addedAt: new Date().toISOString()
        };
        listToAdd.push(subDl);
      }
    });

    setDownloads(prev => [...listToAdd, ...prev]);
    setShowClipboardModal(false);
    setClipboardText('');
    setExtractedLinks([]);
    showToast(`${toPersianNums(selectedList.length)} آیتم اصلی ${grabberDownloadSubtitles ? 'به همراه زیرنویس‌ها' : ''} با موفقیت به صف دانلود اضافه شدند!`, 'success');
  };

  // Helper formatting size bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '۰ بایت';
    const k = 1024;
    const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeStr = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return toPersianNums(sizeStr) + ' ' + sizes[i];
  };

  const toPersianNums = (str: string | number) => {
    return String(str).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  };

  const filteredDownloads = downloads.filter(d => {
    if (activeTab === 'all') return true;
    if (activeTab === 'downloading') return d.status === 'downloading';
    if (activeTab === 'completed') return d.status === 'completed';
    if (activeTab === 'queued') return d.status === 'queued' || d.status === 'paused';
    if (activeTab === 'scheduled') return d.status === 'scheduled';
    return true;
  });

  const totalSpeed = downloads
    .filter(d => d.status === 'downloading')
    .reduce((acc, d) => acc + d.speedMbs, 0);

  return (
    <div className="flex-1 flex flex-col gap-5 min-h-0 animate-scaleIn">
      
      {/* Page Header and IDM Controller Header */}
      <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
            <Download className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              مدیریت دانلودهای پیشرفته رسانه (IDM)
              <span className="text-[10px] bg-indigo-500/15 text-indigo-500 px-2 py-0.5 rounded-md font-extrabold">هوشمند</span>
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-450 mt-1 font-bold">دانلود صف‌های همزمان، زمان‌بندی شبانه هوشمند، اتصال مستقیم به تلگرام و TMDB</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Stats: Speed Dial */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2.5">
            <CloudLightning className="w-4 h-4 text-emerald-500 animate-bounce" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-gray-400 dark:text-emerald-400 font-extrabold leading-none">سرعت کل دانلودها</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {toPersianNums(totalSpeed.toFixed(1))} MB/s
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowClipboardModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Clipboard className="w-4 h-4 shrink-0" />
            استخراج گروهی از کلیپ‌بورد (IDM)
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4.5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            افزودن لینک دانلود جدید
          </button>
        </div>
      </div>

        /* Primary Layout grid */
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-5 min-h-0 animate-fadeIn">
        
        {/* Left column: List of downloads */}
        <div className="xl:col-span-3 bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm flex flex-col min-h-0">
          
          {/* Tabs header */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'همه' },
                { id: 'downloading', label: 'در حال دانلود' },
                { id: 'completed', label: 'کامل شده' },
                { id: 'queued', label: 'در صف/متوقف' },
                { id: 'scheduled', label: 'زمان‌بندی' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow shadow-indigo-600/10'
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Concurrent settings */}
            <div className="flex items-center gap-2 text-[10.5px] font-bold text-gray-500">
              <span>تعداد دانلود همزمان:</span>
              <select
                value={concurrentLimit}
                onChange={(e) => setConcurrentLimit(Number(e.target.value))}
                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-750 px-2 py-1 rounded-lg text-xs font-bold font-mono outline-none cursor-pointer"
              >
                <option value="1">1 (تک به تک)</option>
                <option value="2">2 (همزمان)</option>
                <option value="3">3 (همزمان)</option>
                <option value="5">5 (همزمان)</option>
              </select>
            </div>
          </div>

          {/* List container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {filteredDownloads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3.5">
                <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <Download className="w-7 h-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-gray-600 dark:text-gray-300">صفحه دانلود خالی است</span>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-sm leading-relaxed">لینک‌های دانلود فیلم و سریال را اضافه کنید تا سیستم هوشمند آنها را صف‌بندی کرده و دانلود کند.</p>
                </div>
              </div>
            ) : (
              filteredDownloads.map(item => {
                const isDownloading = item.status === 'downloading';
                const isCompleted = item.status === 'completed';
                const isPaused = item.status === 'paused';
                const isQueued = item.status === 'queued';
                const isScheduled = item.status === 'scheduled';

                // Calculate time remaining if downloading
                let timeRemainingStr = '';
                if (isDownloading && item.speedMbs > 0) {
                  const bytesLeft = item.totalBytes - item.bytesDownloaded;
                  const secondsLeft = Math.ceil(bytesLeft / (item.speedMbs * 1024 * 1024));
                  if (secondsLeft < 60) {
                    timeRemainingStr = `${toPersianNums(secondsLeft)} ثانیه`;
                  } else {
                    timeRemainingStr = `${toPersianNums(Math.ceil(secondsLeft / 60))} دقیقه`;
                  }
                }

                return (
                  <div 
                    key={item.id}
                    className={`border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                      isDownloading 
                        ? 'border-indigo-200 bg-indigo-50/10 dark:border-indigo-900/30 dark:bg-indigo-950/5' 
                        : isCompleted
                          ? 'border-emerald-200 bg-emerald-50/5 dark:border-emerald-900/20'
                          : 'border-gray-150 dark:border-gray-800'
                    }`}
                  >
                    {/* Poster and Details */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative shadow-sm border border-gray-200/55 dark:border-gray-800">
                        <img 
                          src={getSafePosterUrl(item.posterPath)} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 right-1">
                          {item.mediaType === 'movie' ? (
                            <span className="p-0.5 bg-rose-600 text-white rounded text-[8px] block">فیلم</span>
                          ) : item.mediaType === 'series' ? (
                            <span className="p-0.5 bg-indigo-600 text-white rounded text-[8px] block">سریال</span>
                          ) : (
                            <span className="p-0.5 bg-slate-600 text-white rounded text-[8px] block">سایر</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <span className="text-[12.5px] font-black text-gray-800 dark:text-white truncate">
                          {item.title}
                        </span>
                        
                        {/* URL with breadcrumb format */}
                        <div className="flex items-center gap-1.5 text-[9.5px] text-gray-400 font-semibold font-mono truncate">
                          <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{item.url}</span>
                        </div>

                        {/* Progress Bar (Only show if not complete / queued empty) */}
                        {!isCompleted && !isScheduled && (
                          <div className="space-y-1 mt-1">
                            <div className="w-full bg-gray-150 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${isDownloading ? 'bg-indigo-600 animate-pulse' : 'bg-gray-400'}`}
                                style={{ width: `${item.progress}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-gray-400 font-extrabold">
                              <span>{toPersianNums(item.progress)}٪</span>
                              <div className="flex items-center gap-1.5">
                                <span>{formatBytes(item.bytesDownloaded)} از {formatBytes(item.totalBytes)}</span>
                                {timeRemainingStr && (
                                  <span className="bg-indigo-500/10 text-indigo-500 px-1 py-0.5 rounded font-bold">مستقیم: {timeRemainingStr} باقی‌مانده</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Completed/Scheduled details */}
                        {isCompleted && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            تکمیل شده - فایل ذخیره شد در {item.saveFolder} ({formatBytes(item.totalBytes)})
                          </span>
                        )}

                        {isScheduled && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-black flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                            زمان‌بندی شبانه: شروع هوشمند راس ساعت {toPersianNums(item.scheduledTime || '')} شب (ترافیک رایگان)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions and Status Badge */}
                    <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 pt-2.5 md:pt-0 mt-2.5 md:mt-0 border-gray-100 dark:border-gray-800">
                      {/* Status Badges */}
                      <div className="hidden lg:flex flex-col text-left mr-2">
                        <span className="text-[9px] text-gray-400 font-extrabold leading-none">وضعیت</span>
                        <span className={`text-[10px] font-black mt-1 ${
                          isDownloading 
                            ? 'text-indigo-600 dark:text-indigo-400' 
                            : isCompleted 
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isScheduled
                                ? 'text-amber-600 dark:text-amber-404'
                                : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {isDownloading && 'در حال دریافت'}
                          {isCompleted && 'تکمیل شده'}
                          {isPaused && 'متوقف شده'}
                          {isQueued && 'در صف دانلود'}
                          {isScheduled && 'زمان‌بندی شده'}
                        </span>
                      </div>

                      {/* Download Speeds */}
                      {isDownloading && (
                        <div className="bg-indigo-500/10 border border-indigo-500/15 px-2.5 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-extrabold">
                          {toPersianNums(item.speedMbs.toFixed(1))} MB/s
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {isPaused && (
                          <button
                            onClick={() => handleStartDownload(item.id)}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer transition-colors"
                            title="شروع دانلود"
                          >
                            <Play className="w-4 h-4 fill-indigo-600/10" />
                          </button>
                        )}

                        {isDownloading && (
                          <button
                            onClick={() => handlePauseDownload(item.id)}
                            className="p-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg cursor-pointer transition-colors"
                            title="توقف موقت"
                          >
                            <Pause className="w-4 h-4 fill-amber-600/10" />
                          </button>
                        )}

                        {isQueued && (
                          <button
                            onClick={() => handleStartDownload(item.id)}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer transition-colors"
                            title="شروع دانلود دستی"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            onClick={() => handleOpenFolder(item.saveFolder)}
                            className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-[10px] font-black px-2.5"
                            title="باز کردن مسیر دانلود"
                          >
                            <Folder className="w-3.5 h-3.5" />
                            باز کردن پوشه
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer transition-colors"
                          title="ویرایش مشخصات دانلود (IDM)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteDownload(item.id)}
                          className="p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 rounded-lg cursor-pointer transition-colors"
                          title="حذف دانلود"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Settings, Schedules, and Telegram Direct Box */}
        <div className="space-y-5">
          
          {/* Smart Scheduler Section */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white">
              <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
              <span className="text-xs font-black">زمان‌بندی شبانه هوشمند (IDM)</span>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
              می‌توانید دانلودهای حجیم را برای ساعات کم‌مصرف (مثلا ۲ تا ۷ صبح) زمان‌بندی کنید تا هزینه‌های ترافیک اینترنت شما به حداقل برسد.
            </p>

            <div className="space-y-3 pt-1">
              <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-gray-500">دانلود زمان‌بندی شبانه:</span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">غیرفعال (اتوماتیک)</span>
              </div>
              <button 
                onClick={() => {
                  showToast('زمان‌بندی هوشمند دانلودهای شما پیکربندی شد.', 'success');
                }}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg transition-all text-center cursor-pointer"
              >
                پیکربندی ساعت دانلود شبانه
              </button>
            </div>
          </div>

          {/* Promotion Card for Telegram Web Explorer */}
          <div className="bg-gradient-to-br from-sky-600 to-sky-700 text-white p-5 rounded-2xl border border-sky-500/25 shadow-xl space-y-4 text-right" dir="rtl">
            <div className="flex items-center gap-2 text-sky-100">
              <Send className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-black">کاوشگر و دانلود مستقیم تلگرام وب</span>
            </div>
            
            <p className="text-[10px] text-sky-100 leading-relaxed font-bold">
              نسخه رسمی و ۱۰۰٪ امن تلگرام وب مستقیماً درون برنامه یکپارچه شد! از این پس می‌توانید چت‌ها، کانال‌های قفل شده یا فیلم‌های تلگرامی را جستجو کرده و با کپی کردن پیام، فوراً آنها را دانلود کنید.
            </p>

            <button
              onClick={() => {
                setDownloadsViewTab('telegram_browser');
                showToast('به میز کار رسمی تلگرام خوش آمدید! ✨', 'info');
              }}
              className="w-full py-2.5 bg-white text-sky-700 hover:bg-sky-50 text-[10.5px] font-black rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-sky-900/10"
            >
              <Send className="w-3.5 h-3.5" />
              ورود به میز کار تلگرام وب (جدید)
            </button>
          </div>

          {/* Download Speed Meter Graphic */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white">
              <Cpu className="w-4.5 h-4.5 text-gray-400" />
              <span className="text-xs font-black">وضعیت موتور بارگیری (Engine)</span>
            </div>
            
            <div className="space-y-2 text-[10px] text-gray-450 font-bold">
              <div className="flex items-center justify-between">
                <span>تعداد دانلود فعال:</span>
                <span className="text-gray-700 dark:text-white font-mono">
                  {toPersianNums(downloads.filter(d => d.status === 'downloading').length)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>مسیر دانلود پیش‌فرض:</span>
                <span className="text-gray-700 dark:text-white font-mono">D:/Downloads</span>
              </div>
              <div className="flex items-center justify-between">
                <span>سیستم فایل:</span>
                <span className="text-emerald-500">پشتیبانی از لغو و ازسرگیری (Resume)</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* STEP-BY-STEP ADD DOWNLOAD MODAL WITH TMDB SEARCH */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="add-download-modal-overlay">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
            
            {/* Modal Title */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Download className="w-5 h-5 text-indigo-500" />
                <span className="text-xs font-black">بارگیری مستقیم فیلم و سریال جدید (با استخراج TMDb)</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddDownloadSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Step 1: Link input */}
              <div className="space-y-2">
                <label className="text-[11.5px] font-black text-gray-700 dark:text-gray-300 block">لینک دانلود فایل (آدرس مستقیم یا کانال تلگرام):</label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    placeholder="https://example.com/movies/zoodpaz.mp4"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                  <Link2 className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-400" />
                </div>
              </div>

              {/* Step 2: Media Type & Save Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11.5px] font-black text-gray-700 dark:text-gray-300 block">نوع محتوا:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaType('movie')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        mediaType === 'movie'
                          ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30'
                          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-355'
                      }`}
                    >
                      <Film className="w-4 h-4 shrink-0" />
                      فیلم سینمایی
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType('series')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        mediaType === 'series'
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/30'
                          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-355'
                      }`}
                    >
                      <Tv className="w-4 h-4 shrink-0" />
                      سریال تلویزیونی
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11.5px] font-black text-gray-700 dark:text-gray-300 block">پوشه ذخیره‌سازی محلی:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={saveFolder}
                      onChange={(e) => setSaveFolder(e.target.value)}
                      placeholder="D:/Movies/Iranian"
                      className="flex-1 px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const path = await handleSelectFolder();
                        if (path) setSaveFolder(path);
                      }}
                      className="px-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center cursor-pointer transition-all"
                      title="انتخاب پوشه از سیستم"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Series auto-mapping fields */}
              {mediaType === 'series' && (
                <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/10 space-y-3 animate-slideIn">
                  <span className="text-[11px] font-extrabold text-indigo-650 dark:text-indigo-400 block">شناسایی و انتساب خودکار به آرشیو سریال‌ها</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-600 dark:text-gray-355 block">انتخاب سریال:</label>
                      <select
                        value={selectedSeriesId}
                        onChange={(e) => setSelectedSeriesId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold"
                      >
                        <option value="none">سایر / نامشخص</option>
                        {existingSeries.map(s => (
                          <option key={s.id} value={s.id}>{s.titleFa || s.titleEn}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-600 dark:text-gray-355 block">شماره فصل:</label>
                      <input
                        type="number"
                        min="1"
                        value={selectedSeasonNum}
                        onChange={(e) => setSelectedSeasonNum(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-600 dark:text-gray-355 block">شماره قسمت:</label>
                      <input
                        type="number"
                        min="1"
                        value={selectedEpisodeNum}
                        onChange={(e) => setSelectedEpisodeNum(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Subtitles Download check */}
              <div className="p-3.5 rounded-xl border border-gray-150 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDownloadSubtitle(!downloadSubtitle)}
                    className="text-indigo-600 focus:outline-none cursor-pointer"
                  >
                    {downloadSubtitle ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-800 dark:text-white">دانلود خودکار زیرنویس فارسی هماهنگ (.srt)</span>
                    <span className="text-[10px] text-gray-400 font-bold">همزمان با دانلود فیلم/سریال، فایل زیرنویس آن به صف اضافه و متصل می‌شود.</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Fetch Info from TMDb */}
              <div className="border border-indigo-100/80 dark:border-indigo-950/60 p-4 rounded-2xl bg-indigo-50/5 dark:bg-indigo-950/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    استخراج خودکار پوستر و مشخصات از TMDb (پیشنهادی)
                  </span>
                </div>
                
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                  نام فارسی یا انگلیسی فیلم را وارد کنید و روی دکمه جستجو کلیک کنید تا پوستر اصلی، ژانرها و رتبه بین‌المللی آن به صورت خودکار دریافت شود.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tmdbSearchQuery}
                    onChange={(e) => setTmdbSearchQuery(e.target.value)}
                    placeholder="مثال: زودپز یا Zoodpaz"
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleSearchTmdb}
                    disabled={searchingTmdb}
                    className="px-4 bg-indigo-550 hover:bg-indigo-650 disabled:bg-indigo-300 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    {searchingTmdb ? 'در حال جستجو...' : 'جستجو در TMDb'}
                  </button>
                </div>

                {/* TMDB Results List */}
                {tmdbResults.length > 0 && (
                  <div className="space-y-2 mt-3 pt-2 border-t border-indigo-100/50 dark:border-indigo-950/40">
                    <span className="text-[9.5px] text-gray-450 block font-extrabold">نتایج یافت شده (یکی را انتخاب کنید):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-44 overflow-y-auto">
                      {tmdbResults.map((item) => {
                        const isSelected = selectedTmdbItem?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectTmdbItem(item)}
                            className={`p-2 rounded-xl border flex items-center gap-2.5 text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                                : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-gray-800 hover:border-indigo-300'
                            }`}
                          >
                            <img
                              src={item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=100'}
                              alt=""
                              className="w-8 h-11 object-cover rounded-md shadow-sm shrink-0"
                            />
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                              <span className="text-[10.5px] font-black truncate">{item.title || item.name}</span>
                              <span className="text-[9px] text-gray-400 font-bold font-mono">سال: {toPersianNums(item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4) || 'نامعلوم')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Title input override */}
              <div className="space-y-2">
                <label className="text-[11.5px] font-black text-gray-700 dark:text-gray-300 block">عنوان دستی فیلم یا سریال (در صورت عدم استفاده از جستجو):</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="مثال: زودپز - کیفیت 1080p"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Step 4: Time scheduler toggle */}
              <div className="border border-gray-150 dark:border-gray-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-[11px] font-black text-gray-700 dark:text-gray-300">بارگیری زمان‌بندی شده هوشمند شبانه (ترافیک رایگان):</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="w-4.5 h-4.5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {isScheduled && (
                  <div className="flex items-center gap-3 animate-slideIn">
                    <span className="text-[10px] text-gray-450 font-bold">زمان شروع دانلود خودکار:</span>
                    <input
                      type="time"
                      value={scheduleTimeInput}
                      onChange={(e) => setScheduleTimeInput(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-lg text-xs font-mono font-bold outline-none"
                    />
                  </div>
                )}
              </div>

            </form>

            {/* Modal Actions */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-slate-900/40 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-300 text-xs font-black rounded-lg transition-all hover:bg-gray-250 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleAddDownloadSubmit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-4 h-4 shrink-0" />
                افزودن به صف دانلود
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDIT DOWNLOAD PROPERTIES MODAL */}
      {editingDownload && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="edit-download-modal-overlay">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
            
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Settings2 className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-black">ویرایش مشخصات دانلود (IDM Properties)</span>
              </div>
              <button
                onClick={() => setEditingDownload(null)}
                className="p-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-right" dir="rtl">
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 block">نام / عنوان نمایشی فیلم یا فایل:</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all text-right"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 block">آدرس اینترنتی دانلود (URL):</label>
                <input
                  type="text"
                  required
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 block">نوع محتوا:</label>
                  <select
                    value={editMediaType}
                    onChange={(e) => setEditMediaType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="movie">فیلم سینمایی (Movie)</option>
                    <option value="series">سریال تلویزیونی (Series)</option>
                    <option value="other">سایر رسانه‌ها (Other)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 block">حجم کل فایل (بر حسب مگابایت - MB):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editSizeMb}
                    onChange={(e) => setEditSizeMb(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all font-mono text-right"
                  />
                  <span className="text-[10px] text-gray-400 font-extrabold block">معادل: {formatBytes(editSizeMb * 1024 * 1024)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-700 dark:text-gray-300 block">پوشه مقصد ذخیره‌سازی محلی:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editSaveFolder}
                    onChange={(e) => setEditSaveFolder(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all font-mono text-left"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const path = await handleSelectFolder();
                      if (path) setEditSaveFolder(path);
                    }}
                    className="px-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center cursor-pointer transition-all"
                    title="انتخاب پوشه از سیستم"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="border border-gray-150 dark:border-gray-800 p-4.5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-[11px] font-black text-gray-700 dark:text-gray-300">دانلود شبانه زمان‌بندی شده:</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editScheduled}
                    onChange={(e) => setEditScheduled(e.target.checked)}
                    className="w-4.5 h-4.5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {editScheduled && (
                  <div className="flex items-center gap-3 animate-slideIn">
                    <span className="text-[10px] text-gray-450 font-bold">زمان شروع دانلود خودکار:</span>
                    <input
                      type="time"
                      value={editScheduledTime}
                      onChange={(e) => setEditScheduledTime(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-mono font-bold outline-none rounded-lg"
                    />
                  </div>
                )}
              </div>

            </form>

            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-slate-900/40 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingDownload(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-300 text-xs font-black rounded-lg transition-all hover:bg-gray-250 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveEditSubmit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                ذخیره و اعمال تغییرات
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CLIPBOARD MULTI-LINK BATCH GRABBER MODAL */}
      {showClipboardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="clipboard-grabber-overlay">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn">
            
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <Clipboard className="w-5 h-5" />
                <span className="text-xs font-black">پنل استخراج هوشمند لینک‌ها از متن/کلیپ‌بورد (IDM Batch Grabber)</span>
              </div>
              <button
                onClick={() => setShowClipboardModal(false)}
                className="p-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-right" dir="rtl">
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-gray-700 dark:text-gray-300">متن حاوی چندین لینک دانلود فیلم یا پست تلگرام را کپی کرده و در کادر زیر قرار دهید:</label>
                  <button
                    onClick={handlePasteFromClipboard}
                    type="button"
                    className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    پیست از کلیپ‌بورد سیستم
                  </button>
                </div>
                
                <textarea
                  value={clipboardText}
                  onChange={(e) => setClipboardText(e.target.value)}
                  placeholder="کل متن کپی‌شده یا لینک‌ها را اینجا پیست کنید... (مثلا پیام حاوی چندین لینک دانلود فیلم یا فایل متنی حاوی URLها)"
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold outline-none focus:border-sky-500 transition-all font-mono text-left placeholder:text-right"
                  dir="ltr"
                />
                
                <button
                  type="button"
                  onClick={handleAnalyzeClipboardText}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  آنالیز متن و استخراج تمام لینک‌ها
                </button>
              </div>

              {extractedLinks.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-150 dark:border-gray-800 animate-slideIn">
                  <div className="flex items-center justify-between text-xs font-black text-gray-800 dark:text-gray-200">
                    <span>لیست لینک‌های استخراج شده ({toPersianNums(extractedLinks.length)} مورد):</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExtractedLinks(prev => prev.map(l => ({ ...l, selected: true })))}
                        className="text-[10px] text-indigo-500 hover:underline font-extrabold cursor-pointer"
                      >
                        انتخاب همه
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setExtractedLinks(prev => prev.map(l => ({ ...l, selected: false })))}
                        className="text-[10px] text-gray-400 hover:underline font-extrabold cursor-pointer"
                      >
                        حذف انتخاب
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-gray-150 dark:border-gray-850 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-extrabold">دسته‌بندی رسانه برای تمام موارد انتخابی:</span>
                        <select
                          value={grabberMediaType}
                          onChange={(e) => setGrabberMediaType(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-750 rounded-lg text-xs font-bold"
                        >
                          <option value="movie">فیلم سینمایی (Movie)</option>
                          <option value="series">سریال تلویزیونی (Series)</option>
                          <option value="other">سایر فایل‌ها</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-extrabold">پوشه ذخیره‌سازی مقصد:</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={grabberSaveFolder}
                            onChange={(e) => setGrabberSaveFolder(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-750 rounded-lg text-xs font-bold font-mono text-left"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const path = await handleSelectFolder();
                              if (path) setGrabberSaveFolder(path);
                            }}
                            className="px-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-750 flex items-center justify-center cursor-pointer transition-all"
                            title="انتخاب پوشه از سیستم"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Series configuration inside grabber */}
                    {grabberMediaType === 'series' && (
                      <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slideIn">
                        <div className="space-y-1">
                          <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-extrabold">انتساب به سریال:</span>
                          <select
                            value={grabberSelectedSeriesId}
                            onChange={(e) => setGrabberSelectedSeriesId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold"
                          >
                            <option value="none">سایر / نامشخص (تلاش برای تشخیص از نام)</option>
                            {existingSeries.map(s => (
                              <option key={s.id} value={s.id}>{s.titleFa || s.titleEn}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-extrabold">شماره فصل:</span>
                          <input
                            type="number"
                            min="1"
                            value={grabberSeasonNum}
                            onChange={(e) => setGrabberSeasonNum(Number(e.target.value))}
                            className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold font-mono"
                          />
                        </div>

                        <div className="space-y-1 flex items-end">
                          <button
                            type="button"
                            onClick={() => setGrabberDownloadSubtitles(!grabberDownloadSubtitles)}
                            className="flex items-center gap-1.5 py-1 text-xs text-gray-700 dark:text-gray-300 font-bold focus:outline-none cursor-pointer"
                          >
                            {grabberDownloadSubtitles ? (
                              <CheckSquare className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-gray-400 shrink-0" />
                            )}
                            دانلود زیرنویس فارسی (.srt)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-gray-50/40 dark:bg-slate-900/20">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-gray-150 dark:bg-slate-850 text-gray-600 dark:text-gray-300 font-black text-[10.5px] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                        <tr>
                          <th className="p-2 w-10 text-center">انتخاب</th>
                          <th className="p-2">نام فایل نمایشی</th>
                          <th className="p-2 w-28">حجم حدودی</th>
                          <th className="p-2">آدرس لینک دانلود (URL)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
                        {extractedLinks.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-100/50 dark:hover:bg-slate-800/20">
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={(e) => {
                                  setExtractedLinks(prev => prev.map(l => l.id === item.id ? { ...l, selected: e.target.checked } : l));
                                }}
                                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                              />
                            </td>
                            <td className="p-2 font-bold max-w-[180px] truncate">
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => {
                                  setExtractedLinks(prev => prev.map(l => l.id === item.id ? { ...l, title: e.target.value } : l));
                                }}
                                className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-850 border border-gray-200 dark:border-gray-700 rounded text-xs"
                              />
                            </td>
                            <td className="p-2 font-mono">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.sizeMb}
                                  onChange={(e) => {
                                    setExtractedLinks(prev => prev.map(l => l.id === item.id ? { ...l, sizeMb: Number(e.target.value) } : l));
                                  }}
                                  className="w-16 px-1 py-0.5 bg-white dark:bg-slate-850 border border-gray-200 dark:border-gray-700 rounded text-xs text-center"
                                />
                                <span className="text-[9.5px] text-gray-400 font-extrabold">MB</span>
                              </div>
                            </td>
                            <td className="p-2 text-left font-mono text-[10px] text-gray-450 max-w-[200px] truncate" dir="ltr">
                              {item.url}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>

            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-slate-900/40 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowClipboardModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-300 text-xs font-black rounded-lg transition-all hover:bg-gray-250 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleAddGrabbedToQueue}
                disabled={extractedLinks.filter(l => l.selected).length === 0}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-4 h-4 shrink-0" />
                افزودن ({toPersianNums(extractedLinks.filter(l => l.selected).length)}) فایل انتخابی به صف دانلود
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
