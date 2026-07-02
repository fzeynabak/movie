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
  HelpCircle,
  Video
} from 'lucide-react';
import { toPersianNums } from '../pages/Dashboard';
import { showToast } from '../utils/toast';

interface InternalVideoPlayerProps {
  filePath: string;
  title: string;
  subtitlesList?: string[];
  originPeerIp?: string;
  onClose: () => void;
  onPlayExternal: () => void;
}

export function InternalVideoPlayer({ 
  filePath, 
  title, 
  subtitlesList = [],
  originPeerIp, 
  onClose, 
  onPlayExternal 
}: InternalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get Safe video source URL
  const videoSrc = React.useMemo(() => {
    if (!filePath) return '';
    if (originPeerIp && originPeerIp.trim()) {
      // Stream via peer HTTP server
      return `http://${originPeerIp.trim()}:3300/api/lan/download?path=${encodeURIComponent(filePath)}`;
    }
    // Local file protocol
    let formatted = filePath.replace(/\\/g, '/');
    if (!formatted.startsWith('file:///')) {
      if (formatted.startsWith('/')) {
        formatted = 'file://' + formatted;
      } else {
        formatted = 'file:///' + formatted;
      }
    }
    return formatted;
  }, [filePath, originPeerIp]);

  // Handle controls visibility on mouse move
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        seek(10);
      } else if (e.key === 'ArrowLeft') {
        seek(-10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        adjustVolume(0.1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        adjustVolume(-0.1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    handleMouseMove();

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
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

  useEffect(() => {
    if (subtitlesList && subtitlesList.length > 0) {
      setAvailableSubtitles(subtitlesList);
      loadLocalSubtitle(subtitlesList[0], 0);
    } else if (filePath && window.electronAPI && window.electronAPI.findMatchingSubtitles) {
      window.electronAPI.findMatchingSubtitles(filePath).then(res => {
        if (res && res.success && res.subtitles && res.subtitles.length > 0) {
          setAvailableSubtitles(res.subtitles);
          loadLocalSubtitle(res.subtitles[0], 0);
        }
      }).catch(err => {
        console.error('Failed to auto-detect subtitles on player launch:', err);
      });
    }
  }, [subtitlesList, filePath]);

  // Subtitle synchronization loop
  useEffect(() => {
    if (subtitles.length === 0) return;
    
    const activeSub = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);
    if (activeSub) {
      setCurrentSubtitleText(activeSub.text);
    } else {
      setCurrentSubtitleText('');
    }
  }, [currentTime, subtitles]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ direction: 'ltr' }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-contain cursor-pointer"
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
        onEnded={() => setIsPlaying(false)}
        autoPlay
      />

      {/* Rendered Custom Subtitle */}
      {currentSubtitleText && (
        <div 
          className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/75 text-white font-sans text-xl md:text-2xl px-5 py-2 rounded-lg text-center max-w-[85%] border border-white/10 pointer-events-none drop-shadow-lg leading-relaxed z-40"
          style={{ direction: 'rtl' }}
          dangerouslySetInnerHTML={{ __html: currentSubtitleText }}
        />
      )}

      {/* Top Bar Overlay */}
      <div 
        className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-5 flex items-center justify-between transition-all duration-300 z-50 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-white">
            <h2 className="text-sm font-bold truncate max-w-[280px] md:max-w-xl font-sans" style={{ direction: 'rtl' }}>
              {title}
            </h2>
            <p className="text-[10px] text-white/50 truncate max-w-[280px] md:max-w-lg font-mono text-left">
              {filePath}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick External Player Link */}
          <button
            onClick={onPlayExternal}
            className="flex items-center gap-1.5 px-3.5 h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            style={{ direction: 'rtl' }}
          >
            <ExternalLink className="w-4 h-4" />
            <span>پخش با نرم‌افزار خارجی (VLC / PotPlayer)</span>
          </button>
        </div>
      </div>

      {/* Bottom Controls Overlay */}
      <div 
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent pt-12 pb-5 px-5 flex flex-col gap-4 transition-all duration-300 z-50 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Timeline Slider */}
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

        {/* Buttons Control Row */}
        <div className="flex items-center justify-between w-full">
          {/* Right section: Play/Pause/Rewind */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => seek(-10)}
              className="p-1.5 text-white/75 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
              title="۱۰ ثانیه عقب"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 bg-white hover:bg-indigo-50 text-indigo-950 rounded-full cursor-pointer transition-all transform hover:scale-105 shadow-md"
              title={isPlaying ? 'توقف' : 'پخش'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button
              onClick={() => seek(10)}
              className="p-1.5 text-white/75 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
              title="۱۰ ثانیه جلو"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume controls */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={toggleMute}
                className="p-2 text-white/75 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
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
            </div>
          </div>

          {/* Center section: unsupported codec disclaimer */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-white/40 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span style={{ direction: 'rtl' }}>
              اگر پخش به مشکل خورد یا صدا نداشت، می‌توانید دکمه بالا سمت راست را برای باز کردن در نرم‌افزارهای تخصصی مثل VLC یا PotPlayer کلیک کنید.
            </span>
          </div>

          {/* Left section: aspect ratio, rate, subs, fullscreen */}
          <div className="flex items-center gap-3">
            {/* Speed selection */}
            <div className="relative group">
              <button className="px-2.5 h-8 border border-white/20 hover:bg-white/10 text-white rounded text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1">
                <span>{playbackRate}x</span>
                <Settings className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-full right-0 mb-1 bg-zinc-950 border border-white/15 rounded shadow-xl py-1 hidden group-hover:block w-20 text-center z-[100]">
                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className={`w-full py-1 text-xs hover:bg-white/15 cursor-pointer block font-mono ${playbackRate === rate ? 'text-indigo-400 font-bold' : 'text-white/80'}`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle selection & upload */}
            <div className="relative group">
              <button className="px-2.5 h-8 border border-white/20 hover:bg-white/10 text-white rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5">
                <Subtitles className="w-4 h-4" />
                <span className="truncate max-w-[100px]" style={{ direction: 'rtl' }}>
                  {subtitleFile ? subtitleFile : 'زیرنویس'}
                </span>
              </button>
              <div className="absolute bottom-full right-0 mb-1 bg-zinc-950 border border-white/15 rounded shadow-xl py-1 hidden group-hover:block w-52 max-h-48 overflow-y-auto text-right z-[100] p-1 space-y-1">
                {availableSubtitles.length > 0 && (
                  <>
                    <span className="px-2 py-1 text-[10px] text-gray-500 block border-b border-white/5 pb-1">لیست زیرنویس‌ها:</span>
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
                          className={`w-full text-right py-1 px-2 text-[11px] hover:bg-white/15 cursor-pointer rounded block truncate font-sans ${isSelected ? 'text-indigo-400 font-bold bg-white/5' : 'text-white/80'}`}
                          title={subPath}
                        >
                          {toPersianNums((index + 1).toString())}. {name}
                        </button>
                      );
                    })}
                    <div className="border-t border-white/5 my-1" />
                  </>
                )}

                <label className="w-full text-right py-1 px-2 text-[11px] hover:bg-white/15 cursor-pointer rounded block font-sans text-indigo-400 font-bold">
                  <span>➕ بارگذاری فایل جدید...</span>
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

            {/* Aspect ratio */}
            <button
              onClick={() => {
                const ratios: ('contain' | 'cover' | 'fill')[] = ['contain', 'cover', 'fill'];
                const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
                setAspectRatio(ratios[nextIdx]);
                showToast(`نسبت تصویر: ${ratios[nextIdx] === 'contain' ? 'پیش‌فرض' : ratios[nextIdx] === 'cover' ? 'برش عریض' : 'تمام‌صفحه تلفیقی'}`);
              }}
              className="px-2.5 h-8 border border-white/20 hover:bg-white/10 text-white rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
              title="تغییر ابعاد تصویر"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="font-sans" style={{ direction: 'rtl' }}>
                {aspectRatio === 'contain' ? 'اصلی' : aspectRatio === 'cover' ? 'عریض' : 'کامل'}
              </span>
            </button>

            {/* Fullscreen */}
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
    </div>
  );
}
