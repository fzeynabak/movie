/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  X, 
  Settings, 
  Subtitles, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Video,
  ListVideo,
  SkipForward,
  SkipBack,
  Sliders,
  Type,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { toPersianNums } from '../pages/Dashboard';
import { showToast } from '../utils/toast';

interface PlaylistItem {
  id: string;
  filePath: string;
  title: string;
  subtitlesList?: string[];
  seasonName?: string;
  episodeName?: string;
}

interface InternalVideoPlayerProps {
  filePath: string;
  title: string;
  subtitlesList?: string[];
  originPeerIp?: string;
  playlist?: PlaylistItem[];
  currentEpisodeId?: string;
  onClose: () => void;
  onPlayExternal: () => void;
}

export function InternalVideoPlayer({ 
  filePath, 
  title, 
  subtitlesList = [],
  originPeerIp, 
  playlist = [],
  currentEpisodeId,
  onClose,
  onPlayExternal 
}: InternalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Dynamic Player States (supporting playlist changes)
  const [currentFilePath, setCurrentFilePath] = useState(filePath);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [activeEpisodeId, setActiveEpisodeId] = useState(currentEpisodeId || '');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [subtitleFile, setSubtitleFile] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<{ start: number; end: number; text: string }[]>([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState('');
  const [availableSubtitles, setAvailableSubtitles] = useState<string[]>(subtitlesList);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(-1);
  
  // Advanced Features
  const [isMini, setIsMini] = useState(false); // Floating PiP Mode
  const [showPlaylistSidebar, setShowPlaylistSidebar] = useState(true);
  const [subtitleDelay, setSubtitleDelay] = useState(0); // in seconds
  const [subtitleSize, setSubtitleSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');
  const [subtitleColor, setSubtitleColor] = useState<'white' | 'yellow' | 'green'>('yellow');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [delayToastText, setDelayToastText] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null); // Autoplay next countdown
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if props change initially
  useEffect(() => {
    setCurrentFilePath(filePath);
    setCurrentTitle(title);
    setAvailableSubtitles(subtitlesList);
    setActiveEpisodeId(currentEpisodeId || '');
    setSubtitleDelay(0);
    setCurrentSubtitleText('');
    setSubtitles([]);
    setSubtitleFile(null);
    setSelectedSubIndex(-1);
    setCountdown(null);
    
    // Auto show playlist sidebar only if we actually have playlist items
    setShowPlaylistSidebar(playlist.length > 0);
  }, [filePath, title, subtitlesList, currentEpisodeId, playlist]);

  // Safe video source URL helper
  const getSourceUrl = (pathStr: string, ip?: string) => {
    if (!pathStr) return '';
    if (ip && ip.trim()) {
      return `http://${ip.trim()}:3300/api/lan/download?path=${encodeURIComponent(pathStr)}`;
    }
    let formatted = pathStr.replace(/\\/g, '/');
    if (!formatted.startsWith('file:///')) {
      if (formatted.startsWith('/')) {
        formatted = 'file://' + formatted;
      } else {
        formatted = 'file:///' + formatted;
      }
    }
    return formatted;
  };

  const videoSrc = React.useMemo(() => {
    return getSourceUrl(currentFilePath, originPeerIp);
  }, [currentFilePath, originPeerIp]);

  // Playlist Navigation
  const currentItemIndex = playlist.findIndex(item => item.id === activeEpisodeId);
  const hasNext = playlist.length > 0 && currentItemIndex !== -1 && currentItemIndex < playlist.length - 1;
  const hasPrev = playlist.length > 0 && currentItemIndex !== -1 && currentItemIndex > 0;

  const playPlaylistItem = (item: PlaylistItem) => {
    setCurrentFilePath(item.filePath);
    setCurrentTitle(item.title);
    setActiveEpisodeId(item.id);
    setSubtitleDelay(0);
    setCurrentSubtitleText('');
    setSubtitles([]);
    setSubtitleFile(null);
    setSelectedSubIndex(-1);
    setAvailableSubtitles(item.subtitlesList || []);
    setCountdown(null);
    setIsPlaying(true);
    
    if (videoRef.current) {
      videoRef.current.src = getSourceUrl(item.filePath, originPeerIp);
      videoRef.current.load();
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error(err);
        showToast('پخش خودکار با خطا مواجه شد.', 'error');
      });
    }
  };

  const handlePlayNext = () => {
    if (hasNext) {
      const nextItem = playlist[currentItemIndex + 1];
      playPlaylistItem(nextItem);
      showToast(`پخش قسمت بعدی: ${nextItem.episodeName || nextItem.title}`);
    }
  };

  const handlePlayPrev = () => {
    if (hasPrev) {
      const prevItem = playlist[currentItemIndex - 1];
      playPlaylistItem(prevItem);
      showToast(`پخش قسمت قبلی: ${prevItem.episodeName || prevItem.title}`);
    }
  };

  // Trigger countdown for next episode when video ends
  useEffect(() => {
    if (countdown !== null) {
      if (countdown === 0) {
        setCountdown(null);
        handlePlayNext();
      } else {
        countdownIntervalRef.current = setTimeout(() => {
          setCountdown(prev => (prev !== null ? prev - 1 : null));
        }, 1000);
      }
    }
    return () => {
      if (countdownIntervalRef.current) clearTimeout(countdownIntervalRef.current);
    };
  }, [countdown]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (hasNext) {
      setCountdown(5); // 5-second countdown
    }
  };

  // Subtitle delay Toast helper
  const triggerDelayToast = (delaySec: number) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const msValue = Math.round(delaySec * 1000);
    const sign = msValue > 0 ? '+' : '';
    setDelayToastText(`تنظیم همزمانی زیرنویس: ${toPersianNums(sign + msValue)} میلی‌ثانیه`);
    toastTimeoutRef.current = setTimeout(() => {
      setDelayToastText(null);
    }, 2000);
  };

  // Handle controls visibility on mouse move
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isMini && !showSettingsMenu) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Global and MPV Hotkeys listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        if (isFullscreen) {
          toggleFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        seek(10);
      } else if (e.key === 'ArrowLeft') {
        seek(-10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        adjustVolume(0.05);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        adjustVolume(-0.05);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'p' || e.key === 'P') {
        // Toggle Mini / Picture in Picture
        setIsMini(prev => !prev);
      } 
      // MPV Hotkeys for Subtitle Delay
      else if (e.key === 'z' || e.key === 'Z') {
        // Delay subtitles (Z key in MPV - subtract delay, showing earlier)
        setSubtitleDelay(prev => {
          const next = prev - 0.1;
          triggerDelayToast(next);
          return next;
        });
      } else if (e.key === 'x' || e.key === 'X') {
        // Advance subtitles (X key in MPV - add delay, showing later)
        setSubtitleDelay(prev => {
          const next = prev + 0.1;
          triggerDelayToast(next);
          return next;
        });
      } else if (e.key === 's' || e.key === 'S') {
        // Reset delay to zero
        setSubtitleDelay(0);
        triggerDelayToast(0);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    handleMouseMove();

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [isPlaying, isFullscreen, isMini, subtitleDelay, activeEpisodeId, showSettingsMenu]);

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      setCountdown(null); // Cancel countdown if playing
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('HTML5 video play failed:', err);
        showToast('خطا در پخش ویدیو. احتمالاً فرمت کدک ویدیو توسط مرورگر برنامه پشتیبانی نمی‌شود. دکمه پخش خارجی را بزنید.', 'error');
      });
    }
  };

  // Adjust current seek time
  const seek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  // Handle progress bar drag/click
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Adjust volume
  const adjustVolume = (delta: number) => {
    if (!videoRef.current) return;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    videoRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const val = parseFloat(e.target.value);
    videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  // Speed adjust
  const handleRateChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  // Fullscreen management
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '۰۰:۰۰';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Super basic SRT parser
  const parseSRT = (data: string, fileName: string) => {
    try {
      const blocks = data.replace(/\r/g, '').split('\n\n');
      const parsedSubs = blocks.map((block) => {
        const lines = block.split('\n');
        if (lines.length < 3) return null;
        
        const timeLine = lines[1];
        const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3})/);
        
        if (!timeMatch) return null;
        
        const parseTime = (tStr: string) => {
          const parts = tStr.replace(',', '.').split(':');
          return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
        };
        
        const start = parseTime(timeMatch[1]);
        const end = parseTime(timeMatch[2]);
        const text = lines.slice(2).join('<br/>').replace(/<[^>]*>/g, ''); // strip other tags
        
        return { start, end, text };
      }).filter(Boolean) as { start: number; end: number; text: string }[];
      
      setSubtitles(parsedSubs);
      setSubtitleFile(fileName);
      showToast('زیرنویس با موفقیت بارگذاری شد.');
    } catch (e) {
      console.error(e);
      showToast('خطا در تحلیل فایل زیرنویس.', 'error');
    }
  };

  // Load custom subtitle file
  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (file.name.endsWith('.srt')) {
        parseSRT(content, file.name);
      } else {
        showToast('لطفا فقط فایل با پسوند .srt انتخاب کنید.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  const loadLocalSubtitle = async (subPath: string, index: number) => {
    if (!subPath) return;
    const winIdx = subPath.lastIndexOf('\\');
    const nixIdx = subPath.lastIndexOf('/');
    const idx = Math.max(winIdx, nixIdx);
    const fileName = idx !== -1 ? subPath.substring(idx + 1) : subPath;

    if (window.electronAPI && window.electronAPI.readTextFile) {
      try {
        const res = await window.electronAPI.readTextFile(subPath);
        if (res && res.success && res.content) {
          parseSRT(res.content, fileName);
          setSelectedSubIndex(index);
        } else {
          showToast('خطا در خواندن فایل زیرنویس: ' + (res?.error || ''), 'error');
        }
      } catch (err: any) {
        showToast('خطا در بارگذاری زیرنویس: ' + err.message, 'error');
      }
    } else {
      showToast('بارگذاری فایل زیرنویس محلی در شبیه‌ساز فعال نیست.', 'warning');
    }
  };

  // Initial subtitle loading or auto-detection
  useEffect(() => {
    if (availableSubtitles && availableSubtitles.length > 0) {
      loadLocalSubtitle(availableSubtitles[0], 0);
    } else if (currentFilePath && window.electronAPI && window.electronAPI.findMatchingSubtitles) {
      window.electronAPI.findMatchingSubtitles(currentFilePath).then(res => {
        if (res && res.success && res.subtitles && res.subtitles.length > 0) {
          setAvailableSubtitles(res.subtitles);
          loadLocalSubtitle(res.subtitles[0], 0);
        }
      }).catch(err => {
        console.error('Failed to auto-detect subtitles on player launch:', err);
      });
    }
  }, [availableSubtitles, currentFilePath]);

  // Subtitle synchronization loop
  useEffect(() => {
    if (subtitles.length === 0) {
      setCurrentSubtitleText('');
      return;
    }
    
    // Apply MPV subtitle delay adjustment (delay in seconds)
    const adjustedTime = currentTime + subtitleDelay;
    
    const activeSub = subtitles.find(s => adjustedTime >= s.start && adjustedTime <= s.end);
    if (activeSub) {
      setCurrentSubtitleText(activeSub.text);
    } else {
      setCurrentSubtitleText('');
    }
  }, [currentTime, subtitles, subtitleDelay]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed z-[9999] bg-black text-white flex select-none overflow-hidden transition-all duration-300 ${
        isMini 
          ? 'bottom-4 right-4 w-[400px] h-[225px] rounded-xl border border-indigo-500/50 hover:border-indigo-500 shadow-2xl shadow-indigo-950/40' 
          : 'inset-0'
      }`}
      style={{ direction: 'ltr' }}
    >
      
      {/* 1. Main player core section (Always visible) */}
      <div className="flex-1 flex flex-col relative h-full bg-black overflow-hidden justify-center items-center">
        
        {/* HTML5 video tag */}
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full cursor-pointer"
          style={{ 
            objectFit: aspectRatio === 'contain' ? 'contain' : aspectRatio === 'cover' ? 'cover' : 'fill'
          }}
          onClick={togglePlay}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onDurationChange={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          }}
          onEnded={handleVideoEnded}
          autoPlay
        />

        {/* Cinematic Custom Subtitle overlays */}
        {currentSubtitleText && (
          <div 
            className={`absolute left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg text-center max-w-[90%] border border-white/10 pointer-events-none drop-shadow-xl font-sans tracking-wide leading-relaxed transition-all duration-150 ${
              isMini 
                ? 'bottom-6 px-3 py-1 font-semibold text-xs border-none' 
                : `${subtitleSize === 'sm' ? 'bottom-20 text-sm px-4 py-1.5' : subtitleSize === 'md' ? 'bottom-22 text-lg px-4.5 py-2' : subtitleSize === 'lg' ? 'bottom-24 text-xl md:text-2xl px-5.5 py-2' : 'bottom-26 text-2xl md:text-3xl px-7 py-2.5 font-bold'}`
            } ${
              subtitleColor === 'white' ? 'text-white' : subtitleColor === 'yellow' ? 'text-yellow-400' : 'text-emerald-400'
            }`}
            style={{ direction: 'rtl' }}
            dangerouslySetInnerHTML={{ __html: currentSubtitleText }}
          />
        )}

        {/* Auto-Play Next Episode Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center z-[110] p-6 text-center animate-fade-in" style={{ direction: 'rtl' }}>
            <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-2xl max-w-sm shadow-2xl shadow-indigo-950/20 text-center flex flex-col items-center">
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2">پخش قسمت بعدی</span>
              <h3 className="text-sm font-extrabold text-white mb-6">
                {playlist[currentItemIndex + 1]?.episodeName || playlist[currentItemIndex + 1]?.title || 'قسمت بعدی'}
              </h3>
              
              {/* Circular Graphic Countdown */}
              <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="34" className="stroke-slate-800" strokeWidth="4" fill="transparent" />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="34" 
                    className="stroke-indigo-500 transition-all duration-1000" 
                    strokeWidth="4" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={(2 * Math.PI * 34) * (1 - countdown / 5)}
                  />
                </svg>
                <span className="absolute font-mono text-xl font-black text-indigo-400">{toPersianNums(countdown)}</span>
              </div>

              <div className="flex gap-2.5 w-full">
                <button
                  onClick={() => {
                    setCountdown(null);
                    handlePlayNext();
                  }}
                  className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg"
                >
                  پخش فوری
                </button>
                <button
                  onClick={() => setCountdown(null)}
                  className="flex-1 h-9 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
                >
                  لغو
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Subtitle Delay MPV feedback toast */}
        {delayToastText && (
          <div 
            className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-indigo-600 border border-indigo-400 text-white font-sans text-xs font-black px-4 py-2 rounded-full shadow-lg z-[120] animate-pulse"
            style={{ direction: 'rtl' }}
          >
            {delayToastText}
          </div>
        )}

        {/* A. Controls overlay for Normal Full Mode */}
        {!isMini && (
          <>
            {/* Top Bar Overlay */}
            <div 
              className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent p-5 flex items-center justify-between transition-all duration-300 z-50 ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white cursor-pointer transition-colors"
                  title="خروج از پخش‌کننده"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-white text-left">
                  <h2 className="text-xs font-bold truncate max-w-[280px] md:max-w-xl font-sans" style={{ direction: 'rtl' }}>
                    {currentTitle}
                  </h2>
                  <p className="text-[9px] text-white/40 truncate max-w-[280px] md:max-w-lg font-mono">
                    {currentFilePath}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* External Player link */}
                <button
                  onClick={onPlayExternal}
                  className="flex items-center gap-1.5 px-3.5 h-8.5 bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  style={{ direction: 'rtl' }}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                  <span>پخش با نرم‌افزار خارجی (VLC / MPV)</span>
                </button>

                {/* Shrink / Mini Player Mode toggle */}
                <button
                  onClick={() => setIsMini(true)}
                  className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-lg border border-white/10 cursor-pointer transition-colors"
                  title="کوچک کردن صفحه (درون‌برنامه)"
                >
                  <Minimize2 className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
            </div>

            {/* Bottom Controls Overlay */}
            <div 
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-16 pb-5 px-5 flex flex-col gap-3.5 transition-all duration-300 z-50 ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              {/* Timeline slider */}
              <div className="flex items-center gap-4 w-full">
                <span className="text-xs font-mono text-white/80 w-16 text-right">
                  {toPersianNums(formatTime(currentTime))}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleTimelineChange}
                  className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:bg-white/30 transition-all"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
                <span className="text-xs font-mono text-white/80 w-16 text-left">
                  {toPersianNums(formatTime(duration))}
                </span>
              </div>

              {/* Controls bar layout */}
              <div className="flex items-center justify-between w-full">
                
                {/* 1. Right Controls: Player Navigation & Playback buttons */}
                <div className="flex items-center gap-3">
                  {/* Prev Episode (for series playlist) */}
                  {playlist.length > 0 && (
                    <button
                      onClick={handlePlayPrev}
                      disabled={!hasPrev}
                      className={`p-1.5 rounded-full hover:bg-white/10 cursor-pointer transition-colors ${!hasPrev ? 'opacity-30 cursor-not-allowed text-white/40' : 'text-white'}`}
                      title="قسمت قبلی"
                    >
                      <SkipBack className="w-5 h-5 fill-current" />
                    </button>
                  )}

                  <button
                    onClick={() => seek(-10)}
                    className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                    title="۱۰ ثانیه عقب"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="p-3 bg-white hover:bg-indigo-50 text-indigo-950 rounded-full cursor-pointer transition-all transform hover:scale-105 shadow-lg shadow-indigo-950/40"
                    title={isPlaying ? 'توقف' : 'پخش'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={() => seek(10)}
                    className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                    title="۱۰ ثانیه جلو"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>

                  {/* Next Episode (for series playlist) */}
                  {playlist.length > 0 && (
                    <button
                      onClick={handlePlayNext}
                      disabled={!hasNext}
                      className={`p-1.5 rounded-full hover:bg-white/10 cursor-pointer transition-colors ${!hasNext ? 'opacity-30 cursor-not-allowed text-white/40' : 'text-white'}`}
                      title="قسمت بعدی"
                    >
                      <SkipForward className="w-5 h-5 fill-current" />
                    </button>
                  )}

                  {/* Volume Slider & controls */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={toggleMute}
                      className="p-2 text-white/75 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4.5 h-4.5 text-red-400" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <span className="text-[10px] text-white/50 font-mono w-8">
                      {isMuted ? '۰٪' : toPersianNums(Math.round(volume * 100)) + '٪'}
                    </span>
                  </div>
                </div>

                {/* 2. Center: Help disclaimer info */}
                <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-white/40 bg-white/5 border border-white/10 px-3.5 py-1 rounded-full font-sans">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span style={{ direction: 'rtl' }}>
                    کلید‌های جهت‌نما برای عقب/جلو و صدا. کلید <b>Z</b> و <b>X</b> برای همگام‌سازی زیرنویس (مانند MPV).
                  </span>
                </div>

                {/* 3. Left Controls: Subs, Speed, Settings, Aspect, Sidebar, Fullscreen */}
                <div className="flex items-center gap-2.5">
                  
                  {/* Playlist sidebar toggle */}
                  {playlist.length > 0 && (
                    <button
                      onClick={() => setShowPlaylistSidebar(prev => !prev)}
                      className={`px-3 h-8 border rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                        showPlaylistSidebar 
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' 
                          : 'border-white/20 hover:bg-white/10 text-white'
                      }`}
                      title="لیست پخش سریال"
                    >
                      <ListVideo className="w-4 h-4" />
                      <span className="font-sans" style={{ direction: 'rtl' }}>لیست پخش</span>
                    </button>
                  )}

                  {/* Playback rate settings */}
                  <div className="relative group">
                    <button className="px-2.5 h-8 border border-white/20 hover:bg-white/10 text-white rounded text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1">
                      <span>{playbackRate}x</span>
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-full right-0 mb-1.5 bg-zinc-950 border border-white/15 rounded-lg shadow-xl py-1 hidden group-hover:block w-20 text-center z-[100] overflow-hidden">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleRateChange(rate)}
                          className={`w-full py-1.5 text-xs hover:bg-white/10 cursor-pointer block font-mono ${playbackRate === rate ? 'text-indigo-400 font-bold bg-white/5' : 'text-white/80'}`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtitle selection */}
                  <div className="relative group">
                    <button className="px-2.5 h-8 border border-white/20 hover:bg-white/10 text-white rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5">
                      <Subtitles className="w-4 h-4 text-indigo-400" />
                      <span className="truncate max-w-[95px]" style={{ direction: 'rtl' }}>
                        {subtitleFile ? subtitleFile : 'بدون زیرنویس'}
                      </span>
                    </button>
                    <div className="absolute bottom-full right-0 mb-1.5 bg-zinc-950 border border-white/15 rounded-lg shadow-2xl py-1.5 hidden group-hover:block w-52 max-h-48 overflow-y-auto text-right z-[100] p-1 space-y-1">
                      {availableSubtitles.length > 0 && (
                        <>
                          <span className="px-2 py-1 text-[10px] text-gray-500 block border-b border-white/5 pb-1">لیست زیرنویس‌های هماهنگ:</span>
                          {availableSubtitles.map((subPath, index) => {
                            const winIdx = subPath.lastIndexOf('\\');
                            const nixIdx = subPath.lastIndexOf('/');
                            const idx = Math.max(winIdx, nixIdx);
                            const name = idx !== -1 ? subPath.substring(idx + 1) : subPath;
                            const isSelected = selectedSubIndex === index;

                            return (
                              <button
                                key={index}
                                onClick={() => loadLocalSubtitle(subPath, index)}
                                className={`w-full text-right py-1.5 px-2 text-[11px] hover:bg-white/10 cursor-pointer rounded block truncate font-sans ${isSelected ? 'text-indigo-400 font-bold bg-white/5' : 'text-white/80'}`}
                                title={subPath}
                              >
                                {toPersianNums((index + 1).toString())}. {name}
                              </button>
                            );
                          })}
                          <div className="border-t border-white/5 my-1" />
                        </>
                      )}

                      <label className="w-full text-right py-1.5 px-2 text-[11px] hover:bg-white/10 cursor-pointer rounded block font-sans text-indigo-400 font-bold">
                        <span>➕ بارگذاری فایل جدید (.srt)...</span>
                        <input
                          type="file"
                          accept=".srt"
                          onChange={(e) => {
                            handleSubtitleUpload(e);
                            setSelectedSubIndex(-1);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Subtitle & advanced settings button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettingsMenu(prev => !prev)}
                      className={`p-2 border rounded cursor-pointer transition-all ${showSettingsMenu ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-white/20 hover:bg-white/10 text-white'}`}
                      title="تنظیمات پیشرفته زیرنویس"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                    
                    {showSettingsMenu && (
                      <div className="absolute bottom-full right-0 mb-2.5 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl p-4 w-72 text-right z-[100] space-y-4" style={{ direction: 'rtl' }}>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                            <Sliders className="w-4 h-4" />
                            تنظیمات پیشرفته پخش
                          </h4>
                          <button onClick={() => setShowSettingsMenu(false)} className="text-white/50 hover:text-white">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 1. Subtitle Delay */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold block">همگام‌سازی زیرنویس (تاخیر)</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSubtitleDelay(prev => {
                                  const next = prev - 0.25;
                                  triggerDelayToast(next);
                                  return next;
                                });
                              }}
                              className="bg-zinc-800 hover:bg-zinc-700 text-xs px-2.5 py-1 rounded cursor-pointer text-white font-sans"
                            >
                              ۰.۲۵- ثانیه (عقب)
                            </button>
                            <span className="flex-1 text-center font-mono text-xs font-black text-white bg-zinc-900 border border-white/5 py-1 rounded">
                              {toPersianNums((subtitleDelay > 0 ? '+' : '') + Math.round(subtitleDelay * 1000))}ms
                            </span>
                            <button
                              onClick={() => {
                                setSubtitleDelay(prev => {
                                  const next = prev + 0.25;
                                  triggerDelayToast(next);
                                  return next;
                                });
                              }}
                              className="bg-zinc-800 hover:bg-zinc-700 text-xs px-2.5 py-1 rounded cursor-pointer text-white font-sans"
                            >
                              ۰.۲۵+ ثانیه (جلو)
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setSubtitleDelay(0);
                              triggerDelayToast(0);
                            }}
                            className="w-full text-center text-[9px] text-indigo-400 font-bold hover:underline py-0.5 block"
                          >
                            بازنشانی تاخیر به صفر
                          </button>
                        </div>

                        {/* 2. Subtitle Size */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold block">اندازه متن زیرنویس</label>
                          <div className="grid grid-cols-4 gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/5">
                            {(['sm', 'md', 'lg', 'xl'] as const).map(sz => (
                              <button
                                key={sz}
                                onClick={() => setSubtitleSize(sz)}
                                className={`py-1 text-[10px] rounded font-sans cursor-pointer font-bold ${subtitleSize === sz ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-zinc-800 hover:text-white'}`}
                              >
                                {sz === 'sm' ? 'کوچک' : sz === 'md' ? 'متوسط' : sz === 'lg' ? 'بزرگ' : 'خیلی بزرگ'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Subtitle Color */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold block">رنگ قلم زیرنویس</label>
                          <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/5">
                            {(['white', 'yellow', 'green'] as const).map(col => (
                              <button
                                key={col}
                                onClick={() => setSubtitleColor(col)}
                                className={`py-1 text-[10px] rounded font-sans cursor-pointer font-bold flex items-center justify-center gap-1 ${subtitleColor === col ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-zinc-800 hover:text-white'}`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${col === 'white' ? 'bg-white' : col === 'yellow' ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                                {col === 'white' ? 'سفید' : col === 'yellow' ? 'زرد ملایم' : 'سبز گلاسی'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aspect ratio option */}
                  <button
                    onClick={() => {
                      const ratios: ('contain' | 'cover' | 'fill')[] = ['contain', 'cover', 'fill'];
                      const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
                      setAspectRatio(ratios[nextIdx]);
                      showToast(`نسبت تصویر: ${ratios[nextIdx] === 'contain' ? 'اصلی' : ratios[nextIdx] === 'cover' ? 'برش عریض' : 'تمام‌صفحه کشیده'}`);
                    }}
                    className="px-2.5 h-8 border border-white/20 hover:bg-white/10 text-white rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                    title="تغییر ابعاد تصویر"
                  >
                    <Video className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-sans" style={{ direction: 'rtl' }}>
                      {aspectRatio === 'contain' ? 'اصلی' : aspectRatio === 'cover' ? 'عریض' : 'کامل'}
                    </span>
                  </button>

                  {/* Fullscreen toggle */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 text-white/75 hover:text-white rounded-full hover:bg-white/10 cursor-pointer transition-colors"
                    title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* B. Simple Controls overlay for Mini PiP Mode on Hover */}
        {isMini && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 z-50">
            {/* Mini Player Title Header */}
            <div className="absolute top-2 inset-x-2 flex justify-between items-center px-1">
              <span className="text-[10px] text-gray-300 font-sans truncate max-w-[200px]" style={{ direction: 'rtl' }}>
                {currentTitle}
              </span>
              <div className="flex gap-1 shrink-0">
                {/* Maximize back to full */}
                <button
                  onClick={() => setIsMini(false)}
                  className="p-1 text-indigo-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                  title="بزرگ کردن صفحه"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                {/* Close completely */}
                <button
                  onClick={onClose}
                  className="p-1 text-red-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                  title="بستن پلیر"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mini Player Central buttons */}
            <div className="flex items-center gap-4">
              {playlist.length > 0 && (
                <button
                  onClick={handlePlayPrev}
                  disabled={!hasPrev}
                  className={`p-1.5 text-white/80 hover:text-white ${!hasPrev ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>
              )}
              
              <button
                onClick={togglePlay}
                className="p-2.5 bg-indigo-600 text-white rounded-full hover:scale-105 transition-all shadow"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {playlist.length > 0 && (
                <button
                  onClick={handlePlayNext}
                  disabled={!hasNext}
                  className={`p-1.5 text-white/80 hover:text-white ${!hasNext ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>

            {/* Bottom mini timeline bar */}
            <div className="absolute bottom-1.5 inset-x-3 flex justify-between items-center text-[8.5px] font-mono text-gray-400">
              <span>{toPersianNums(formatTime(currentTime))}</span>
              <div className="flex-1 mx-2 bg-white/20 h-0.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
              </div>
              <span>{toPersianNums(formatTime(duration))}</span>
            </div>
          </div>
        )}

      </div>

      {/* 2. Right Episode Playlist Sidebar (Only visible when playlist is active, not in mini mode) */}
      {!isMini && playlist.length > 0 && showPlaylistSidebar && (
        <div 
          className="w-80 h-full border-l border-slate-800 bg-zinc-950 flex flex-col shrink-0 animate-slide-in-right z-[60]"
          style={{ direction: 'rtl' }}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-black text-indigo-400 flex items-center gap-2">
              <ListVideo className="w-4.5 h-4.5" />
              لیست پخش سریال ({toPersianNums(playlist.length)} قسمت)
            </h3>
            <button
              onClick={() => setShowPlaylistSidebar(false)}
              className="p-1 hover:bg-slate-800 rounded text-gray-400 hover:text-white transition-colors"
              title="بستن منو"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Playlist Items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-900/50">
            {playlist.map((item, idx) => {
              const isActive = item.id === activeEpisodeId;
              return (
                <button
                  key={item.id}
                  onClick={() => playPlaylistItem(item)}
                  className={`w-full text-right p-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 border ${
                    isActive 
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-200' 
                      : 'border-transparent hover:bg-slate-900 text-gray-300 hover:text-white'
                  }`}
                >
                  {/* Playlist number / indicator */}
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-gray-400'
                  }`}>
                    {isActive ? (
                      <div className="flex gap-0.5 items-end h-2 w-2 justify-center">
                        <span className="w-0.5 bg-white animate-pulse" style={{ height: '80%' }} />
                        <span className="w-0.5 bg-white animate-pulse" style={{ height: '40%', animationDelay: '0.15s' }} />
                        <span className="w-0.5 bg-white animate-pulse" style={{ height: '100%', animationDelay: '0.3s' }} />
                      </div>
                    ) : (
                      toPersianNums(idx + 1)
                    )}
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] text-gray-500 font-bold font-sans">
                        {item.seasonName || 'فصل اصلی'}
                      </span>
                    </div>
                    <p className={`text-[11.5px] font-bold truncate mt-0.5 ${isActive ? 'text-indigo-400' : ''}`}>
                      {item.episodeName || item.title}
                    </p>
                    <p className="text-[8.5px] text-gray-500 truncate mt-0.5 font-mono text-left" dir="ltr">
                      {item.filePath}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
