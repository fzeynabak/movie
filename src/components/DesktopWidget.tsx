import React, { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { Movie, Series, getSafePosterUrl } from '../types';
import { 
  Clock, 
  Calendar, 
  Film, 
  Tv, 
  RefreshCw, 
  X, 
  ChevronLeft, 
  Flame, 
  BellRing,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

const PERSIAN_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// Sat = 0, Sun = 1, ..., Fri = 6
const getPersianDayIndex = (dayStr: string) => {
  const clean = dayStr.trim();
  if (clean.includes('یکشنبه')) return 1;
  if (clean.includes('دوشنبه')) return 2;
  if (clean.includes('سه‌شنبه') || clean.includes('سه شنبه')) return 3;
  if (clean.includes('چهارشنبه')) return 4;
  if (clean.includes('پنجشنبه') || clean.includes('پنج شنبه')) return 5;
  if (clean.includes('جمعه')) return 6;
  if (clean.includes('شنبه')) return 0;
  return -1;
};

const getTodayPersianIndex = () => {
  const day = new Date().getDay(); // 0 (Sun) to 6 (Sat)
  const map: Record<number, number> = {
    6: 0, // Sat
    0: 1, // Sun
    1: 2, // Mon
    2: 3, // Tue
    3: 4, // Wed
    4: 5, // Thu
    5: 6, // Fri
  };
  return map[day] ?? 0;
};

const getDaysDiff = (targetIdx: number, todayIdx: number, releaseTime?: string) => {
  if (targetIdx === -1) return 999;
  let diff = targetIdx - todayIdx;
  if (diff < 0) {
    diff += 7;
  }
  
  // If the release day is today, compare hours/minutes to see if it already passed.
  if (diff === 0 && releaseTime) {
    try {
      const now = new Date();
      const [rHour, rMin] = releaseTime.split(':').map(Number);
      const nowHour = now.getHours();
      const nowMin = now.getMinutes();
      if (nowHour > rHour || (nowHour === rHour && nowMin >= rMin)) {
        return 7; // Next week
      }
    } catch {
      // ignore
    }
  }
  return diff;
};

// Converts Persian digits for layout consistency
const toPersianNums = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.toString().replace(/[0-9]/g, (w) => farsiDigits[parseInt(w, 10)]);
};

export default function DesktopWidget() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [scheduledList, setScheduledList] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'recent' | 'schedule'>('schedule'); // Default to schedule with nearest countdown
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [weekday, setWeekday] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const isLight = theme === 'light';

  // Load actual movie and series catalog with proximity sorting
  useEffect(() => {
    try {
      const allMovies = dbService.getMovies() || [];
      const allSeries = dbService.getSeries() || [];
      
      const sortedMovies = [...allMovies].sort((a, b) => {
        return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
      });

      const sortedSeries = [...allSeries].sort((a, b) => {
        return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
      });

      setMovies(sortedMovies);
      setSeriesList(sortedSeries);

      // Filter and sort scheduled list: only show series with releaseDay
      const scheduled = sortedSeries.filter(s => s.releaseDay && s.releaseDay.trim() !== '');
      const todayIdx = getTodayPersianIndex();
      
      scheduled.sort((a, b) => {
        const aIdx = getPersianDayIndex(a.releaseDay || '');
        const bIdx = getPersianDayIndex(b.releaseDay || '');
        const diffA = getDaysDiff(aIdx, todayIdx, a.releaseTime);
        const diffB = getDaysDiff(bIdx, todayIdx, b.releaseTime);
        if (diffA !== diffB) {
          return diffA - diffB;
        }
        const timeA = a.releaseTime || '00:00';
        const timeB = b.releaseTime || '00:00';
        return timeA.localeCompare(timeB);
      });

      setScheduledList(scheduled);
      
      // Default to the first series (which is the closest weekly release)
      if (scheduled.length > 0) {
        setSelectedSeriesId(prev => {
          // Keep selection if it exists in new list, otherwise select first
          return scheduled.some(s => s.id === prev) ? prev : scheduled[0].id;
        });
      } else {
        setSelectedSeriesId('');
      }
    } catch (e) {
      console.error("Failed to load widget database items:", e);
    }
  }, [refreshKey]);

  // Clock ticking real-time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setCurrentTime(timeStr);

      const dateStr = now.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setCurrentDate(dateStr);

      const weekdayStr = now.toLocaleDateString('fa-IR', { weekday: 'long' });
      setWeekday(weekdayStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseWidget = () => {
    if (typeof window !== 'undefined' && window.electronAPI && (window.electronAPI as any).closeDesktopWidget) {
      (window.electronAPI as any).closeDesktopWidget();
    }
  };

  const handleOpenMainApp = () => {
    if (typeof window !== 'undefined' && window.electronAPI && (window.electronAPI as any).showMainWindow) {
      (window.electronAPI as any).showMainWindow();
    }
  };

  // Recent 4 added media items
  const recentMedia = [
    ...movies.slice(0, 2).map(m => ({ ...m, type: 'فیلم' as const })),
    ...seriesList.slice(0, 2).map(s => ({ ...s, type: 'سریال' as const }))
  ].sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime()).slice(0, 4);

  const selectedSeries = scheduledList.find(s => s.id === selectedSeriesId);

  return (
    <div 
      className={`w-[330px] h-[490px] rounded-3xl p-5 border flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.4)] select-none font-sans overflow-hidden transition-all duration-300 relative ${
        isLight 
          ? 'bg-slate-50/95 border-slate-300 text-slate-900' 
          : 'bg-slate-950/85 backdrop-blur-xl border-slate-800 text-slate-100'
      }`}
      dir="rtl"
      id="desktop-widget-container"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Dynamic Ambient Background Glows */}
      {!isLight && (
        <>
          <div className="absolute top-[-50px] right-[-50px] w-45 h-45 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-55px] left-[-55px] w-45 h-45 rounded-full bg-violet-600/10 blur-3xl pointer-events-none"></div>
        </>
      )}

      {/* Widget Header Row */}
      <div 
        className={isLight ? 'flex items-center justify-between border-b border-slate-200 pb-3' : 'flex items-center justify-between border-b border-slate-900 p-0 pb-3'}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-5.5 h-5.5 rounded bg-indigo-600 flex items-center justify-center text-xs font-black text-white shadow shadow-indigo-600/30">
            پ
          </div>
          <div className="flex flex-col">
            <span className={`text-[11px] font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>گجت دسکتاپ پارس‌تک</span>
            <span className={`text-[8px] font-bold font-mono tracking-tight mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>MEDIA DESKTOP GADGET</span>
          </div>
        </div>

        {/* Action Buttons: Refresh, Day/Night theme toggler, Close */}
        <div className="flex items-center gap-1">
          {/* Day/Night Toggler */}
          <button 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
              isLight 
                ? 'bg-amber-100/60 border-amber-250 text-amber-600 hover:bg-amber-200' 
                : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={isLight ? "حالت شب" : "حالت روز"}
          >
            {isLight ? <Moon className="w-3.5 h-3.5 fill-current" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
              isLight 
                ? 'bg-slate-200/80 border-slate-300 text-slate-650 hover:bg-slate-300' 
                : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          
          <button 
            onClick={handleCloseWidget}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
              isLight 
                ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' 
                : 'bg-red-950/20 hover:bg-red-900/80 border-red-900/20 hover:border-red-650 text-red-400 hover:text-white'
            }`}
            title="بستن گجت"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clock & Calendar Section */}
      <div className={`py-2 px-3 border rounded-2xl flex items-center justify-between shadow-inner ${
        isLight 
          ? 'bg-indigo-50/60 border-indigo-150/70' 
          : 'bg-indigo-950/25 border-indigo-900/10'
      }`} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isLight ? 'text-indigo-650' : 'text-indigo-400'}`} />
          <span className={`text-sm font-black font-mono leading-none tracking-wide ${isLight ? 'text-indigo-950' : 'text-white'}`}>
            {currentTime}
          </span>
        </div>
        <div className="text-left flex flex-col items-end">
          <span className={`text-[10px] font-black ${isLight ? 'text-slate-650' : 'text-slate-300'}`}>{weekday}</span>
          <span className={`text-[9px] font-extrabold mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-450'}`}>{currentDate}</span>
        </div>
      </div>

      {/* Selected Schedule Prominent Display on Top (User requested) */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {selectedSeries ? (
          <div className={`p-2.5 border rounded-2xl flex items-center gap-2.5 transition-all duration-300 ${
            isLight 
              ? 'bg-indigo-50 border-indigo-200/80' 
              : 'bg-indigo-600/15 border-indigo-500/20'
          }`}>
            <div className={`w-8.5 h-11.5 rounded-lg overflow-hidden shrink-0 border ${isLight ? 'border-indigo-200' : 'border-indigo-500/30'}`}>
              <img 
                src={getSafePosterUrl(selectedSeries.poster) || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=150'} 
                alt={selectedSeries.titleFa}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <span className={`text-[8.5px] font-black ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>📺 زمان پخش سریال انتخابی:</span>
              <h3 className={`text-[10.5px] font-black tracking-tight mt-0.5 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {selectedSeries.titleFa}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9.5px] font-black ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>{selectedSeries.releaseDay}</span>
                <span className={`text-[9.5px] font-black font-mono ${isLight ? 'text-slate-650' : 'text-slate-300'}`}>
                  ساعت {toPersianNums(selectedSeries.releaseTime || '--/--')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className={`py-3 px-3 border border-dotted rounded-2xl text-center text-[10px] font-bold ${
            isLight ? 'bg-slate-100 border-slate-300 text-slate-500' : 'bg-slate-900/30 border-slate-800 text-slate-500'
          }`}>
            هیچ سریالی با زمان‌پخش فعال یافت نشد.
          </div>
        )}
      </div>

      {/* Tabs Selector: Recent vs Upcoming */}
      <div className={`flex p-1 rounded-xl border ${
        isLight ? 'bg-slate-200/50 border-slate-300/60' : 'bg-slate-900/50 border-slate-900'
      }`} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 text-center py-1.5 rounded-lg text-[9.5px] font-extrabold transition-all duration-200 cursor-pointer ${
            activeTab === 'schedule' 
              ? 'bg-indigo-600 text-white shadow' 
              : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BellRing className="w-3 h-3 inline-block ml-1 shrink-0" />
          پیش‌نمایش زمان‌پخش ({scheduledList.length})
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 text-center py-1.5 rounded-lg text-[9.5px] font-extrabold transition-all duration-200 cursor-pointer ${
            activeTab === 'recent' 
              ? 'bg-indigo-600 text-white shadow' 
              : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3 h-3 inline-block ml-1 shrink-0" />
          ثبت‌شده‌های اخیر
        </button>
      </div>

      {/* Widget Center Scrollable Area */}
      <div 
        className="flex-1 my-2.5 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {activeTab === 'recent' ? (
          /* TAB 1: RECENT MEDIA LIST */
          recentMedia.length > 0 ? (
            recentMedia.map((item) => (
              <div 
                key={item.id}
                className={`p-2 border rounded-xl flex gap-2.5 transition-all duration-200 ${
                  isLight 
                    ? 'bg-white hover:bg-slate-100/75 border-slate-200' 
                    : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-900 hover:border-slate-800'
                }`}
              >
                <div className="w-9 h-12 bg-black rounded overflow-hidden shrink-0 border border-slate-800/20">
                  <img 
                    src={getSafePosterUrl(item.poster) || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=150'} 
                    alt={item.titleFa}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[7.5px] px-1 py-0.2 rounded font-black text-white ${item.type === 'فیلم' ? 'bg-indigo-600/80' : 'bg-emerald-600/85'}`}>
                      {item.type}
                    </span>
                    <span className="text-[9px] font-extrabold text-amber-500 font-mono">★ {toPersianNums(item.imdbRating || '6.5')}</span>
                  </div>
                  <h4 className={`text-[10px] font-black truncate leading-none mb-0.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {item.titleFa}
                  </h4>
                  <p className="text-[8px] font-bold text-slate-400 truncate font-mono uppercase leading-none">{item.titleEn}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Film className="w-8 h-8 text-slate-500 mb-2" />
              <span className="text-[10px] font-bold text-slate-400">هیچ فیلم یا سریالی ثبت نشده است.</span>
            </div>
          )
        ) : (
          /* TAB 2: SERIES UPCOMING WEEKLY SCHEDULE LIST (Sorted by nearest release proximity) */
          scheduledList.length > 0 ? (
            scheduledList.map((item) => {
              const isSelected = item.id === selectedSeriesId;
              return (
                <div 
                  key={item.id}
                  onClick={() => setSelectedSeriesId(item.id)}
                  className={`p-2 border rounded-xl flex items-center justify-between gap-1.5 transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? isLight 
                        ? 'bg-indigo-100/85 border-indigo-400 text-indigo-950 font-black shadow-sm'
                        : 'bg-indigo-650/85 border-indigo-500 text-white font-black'
                      : isLight 
                        ? 'bg-white hover:bg-slate-100/60 border-slate-200 text-slate-700' 
                        : 'bg-slate-900/30 hover:bg-slate-900/70 border-slate-900 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-11 bg-black rounded overflow-hidden shrink-0 border border-slate-800/10">
                      <img 
                        src={getSafePosterUrl(item.poster) || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=150'} 
                        alt={item.titleFa}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-[10px] font-black truncate leading-none mb-1 ${
                        isSelected 
                          ? 'text-indigo-900 dark:text-white' 
                          : isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}>
                        {item.titleFa}
                      </h4>
                      <div className="flex items-center gap-1">
                        <span className={`text-[7.5px] px-1 rounded font-black border leading-none py-0.5 ${
                          isSelected 
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/25' 
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 border-transparent'
                        }`}>پخش هفتگی</span>
                        {item.imdbRating && <span className="text-[8.5px] text-amber-500 font-bold leading-none">★ {toPersianNums(item.imdbRating)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Release Schedule Day & Time Badge */}
                  <div className={`text-left flex flex-col items-end gap-0.5 px-2 py-1 rounded-lg shrink-0 border ${
                    isSelected 
                      ? 'bg-indigo-605 border-indigo-400 text-white' 
                      : isLight 
                        ? 'bg-indigo-50/50 border-indigo-100 text-indigo-700' 
                        : 'bg-indigo-950/20 border-indigo-950/35 text-indigo-400'
                  }`}>
                    <span className="text-[9px] font-black">{item.releaseDay}</span>
                    <span className="text-[8px] font-bold font-mono tracking-wider">{toPersianNums(item.releaseTime || '--/--')}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-1.5">
              <Tv className="w-8 h-8 text-slate-500" />
              <p className="text-[10px] font-black text-slate-450">هیچ سریالی با پخش هفتگی نیست.</p>
              <p className="text-[8px] text-slate-500 max-w-[210px] leading-relaxed font-bold">
                در ویرایش سریال، فیلد «روز پخش» و «ساعت پخش» را تنظیم نمایید تا در اینجا لیست شوند.
              </p>
            </div>
          )
        )}
      </div>

      {/* Widget Footer Row */}
      <div className={`border-t pt-3 flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-900'}`} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="text-[8.5px] text-slate-500 font-bold font-mono">PARSTECH MEDIA v1.2.0</span>
        <button 
          onClick={handleOpenMainApp}
          className={`text-[9.5px] font-black cursor-pointer flex items-center gap-0.5 hover:underline shrink-0 ${
            isLight ? 'text-indigo-600 hover:text-indigo-500' : 'text-indigo-400 hover:text-indigo-300'
          }`}
        >
          <span>نمایش نرم‌افزار اصلی</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
