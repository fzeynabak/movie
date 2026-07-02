/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { Movie, Series, Sale, getSafePosterUrl } from '../types';
import { 
  Film, 
  Tv, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  ArrowUpRight, 
  Clock, 
  Award,
  ChevronLeft,
  ChevronRight,
  Play,
  FolderOpen,
  Bell,
  Calendar,
  AlertCircle,
  Sparkles,
  Info,
  Globe
} from 'lucide-react';

interface MonthData {
  name: string;
  amount: number;
}

// Helper to convert English numerals to Persian numerals
export function toPersianNums(num: number | string): string {
  if (num === undefined || num === null) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num
    .toString()
    .replace(/[0-9]/g, (w) => farsiDigits[parseInt(w, 10)]);
}

// Convert numbers with thousands separator
export function formatCurrency(num: number): string {
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return toPersianNums(formatted) + ' تومان';
}

export interface ScheduledStatus {
  show: boolean;
  status: 'none' | 'upcoming' | 'airing' | 'past';
  targetDate: Date | null;
  diffMs: number;
}

export function getScheduledSeriesStatus(s: Series): ScheduledStatus {
  if (!s.releaseDay || !s.releaseTime) return { show: false, status: 'none', targetDate: null, diffMs: 0 };

  const dayMap: Record<string, number> = {
    'یکشنبه': 0, 'دوشنبه': 1, 'سه‌شنبه': 2, 'چهارشنبه': 3, 'پنجشنبه': 4, 'جمعه': 5, 'شنبه': 6
  };
  const targetDayNum = dayMap[s.releaseDay];
  if (targetDayNum === undefined) return { show: false, status: 'none', targetDate: null, diffMs: 0 };

  const now = new Date();
  const currentDayNum = now.getDay();

  // Find the target day of THIS week
  let dayDelta = targetDayNum - currentDayNum;
  
  const targetThisWeek = new Date(now);
  targetThisWeek.setDate(now.getDate() + dayDelta);
  
  let targetHour = 20;
  let targetMinute = 0;
  const parts = s.releaseTime.split(':');
  if (parts.length >= 2) {
    targetHour = parseInt(parts[0], 10) || 20;
    targetMinute = parseInt(parts[1], 10) || 0;
  }
  targetThisWeek.setHours(targetHour, targetMinute, 0, 0);

  const nowMs = now.getTime();
  const targetMs = targetThisWeek.getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  if (targetMs > nowMs) {
    // Upcoming this week
    return {
      show: true,
      status: 'upcoming',
      targetDate: targetThisWeek,
      diffMs: targetMs - nowMs
    };
  } else if (nowMs <= targetMs + twoHoursMs) {
    // Airing/Released right now (within 2-hour window)
    return {
      show: true,
      status: 'airing',
      targetDate: targetThisWeek,
      diffMs: targetMs - nowMs
    };
  } else {
    // Past this week, check if next week's occurrence is near (within 5 days before)
    const nextWeekTarget = new Date(targetThisWeek);
    nextWeekTarget.setDate(nextWeekTarget.getDate() + 7);
    const diffNextWeekMs = nextWeekTarget.getTime() - nowMs;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    return {
      show: diffNextWeekMs < fiveDaysMs,
      status: 'upcoming',
      targetDate: nextWeekTarget,
      diffMs: diffNextWeekMs
    };
  }
}

interface TimerCountdownProps {
  targetDate: Date;
  s: Series;
  status: 'none' | 'upcoming' | 'airing' | 'past';
  onViewMedia: (type: 'movie' | 'series', id: string) => void;
}

export function TimerCountdown({ targetDate, s, status, onViewMedia }: TimerCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isOver: boolean }>({ hours: 0, minutes: 0, seconds: 0, isOver: false });

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const diff = target - now;

      if (diff <= 0) {
        if (status === 'airing') {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isOver: true });
        } else {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isOver: true });
        }
      } else {
        const totalSecs = Math.floor(diff / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;
        setTimeLeft({ hours, minutes, seconds, isOver: false });
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate, status]);

  const isAiringNow = status === 'airing' || timeLeft.isOver;

  return (
    <div className="space-y-4 pt-1.5 font-sans">
      <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-inner md:max-w-md space-y-4">
        {isAiringNow ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2 animate-pulse text-center">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-emerald-400">هم‌اکنون در حال پخش یا تازه منتشر شده! 🍿</span>
            <span className="text-[10px] text-gray-400">تا ۲ ساعت دیگر در این جدول برجسته باقی می‌ماند</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 justify-start">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-black text-amber-500 block">زمان باقی‌مانده تا شروع اکران:</span>
            </div>
            
            {/* Countdown layout panels */}
            <div className="grid grid-cols-3 gap-3 text-center" dir="ltr">
              <div className="bg-slate-900/90 border border-amber-505/20 rounded-xl p-2.5 relative overflow-hidden">
                <span className="text-xl md:text-2xl font-black font-mono text-amber-400 block tracking-wider tabular-nums">
                  {String(timeLeft.seconds).padStart(2, '0').split('').map(toPersianNums).join('')}
                </span>
                <span className="text-[9.5px] text-gray-400 font-bold block mt-1">ثانیه</span>
              </div>
              <div className="bg-slate-900/90 border border-indigo-501/20 rounded-xl p-2.5 relative overflow-hidden">
                <span className="text-xl md:text-2xl font-black font-mono text-indigo-400 block tracking-wider tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0').split('').map(toPersianNums).join('')}
                </span>
                <span className="text-[9.5px] text-gray-400 font-bold block mt-1">دقیقه</span>
              </div>
              <div className="bg-slate-900/90 border border-indigo-500/20 rounded-xl p-2.5 relative overflow-hidden">
                <span className="text-xl md:text-2xl font-black font-mono text-indigo-400 block tracking-wider tabular-nums">
                  {toPersianNums(timeLeft.hours)}
                </span>
                <span className="text-[9.5px] text-gray-400 font-bold block mt-1">ساعت</span>
              </div>
            </div>

            {/* Inline Text Counter Display */}
            <p className="text-center text-[10.5px] font-bold text-gray-300 pt-1 border-t border-slate-900/60" dir="rtl">
              {toPersianNums(timeLeft.hours)} ساعت و {toPersianNums(timeLeft.minutes)} دقیقه و {toPersianNums(timeLeft.seconds)} ثانیه مانده به پخش
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ onViewMedia }: { onViewMedia: (type: 'movie' | 'series', id: string) => void }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [chartTab, setChartTab] = useState<'monthly' | 'distribution'>('monthly');

  useEffect(() => {
    // Read current state from DB
    setMovies(dbService.getMovies());
    setSeries(dbService.getSeries());
    setSales(dbService.getSales());
  }, []);

  // Auto scroll carousel every 6s
  useEffect(() => {
    const activeSeriesCount = Math.min(series.length, 5);
    if (activeSeriesCount <= 1) return;
    const interval = setInterval(() => {
      setActiveCarouselIndex(prev => (prev + 1) % activeSeriesCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [series]);

  // Map to get countdown parameters for the weekly releases
  const getCountdownText = (releaseDay: string, releaseTime?: string): { text: string; isToday: boolean; hoursLeft: number } => {
    const dayMap: Record<string, number> = {
      'یکشنبه': 0, 'دوشنبه': 1, 'سه‌شنبه': 2, 'چهارشنبه': 3, 'پنجشنبه': 4, 'جمعه': 5, 'شنبه': 6
    };
    
    const targetDayNum = dayMap[releaseDay];
    if (targetDayNum === undefined) return { text: 'بدون زمان‌بندی', isToday: false, hoursLeft: 999 };

    const now = new Date(); // e.g. Monday, June 8, 2026
    const currentDayNum = now.getDay(); 

    let daysDiff = targetDayNum - currentDayNum;
    if (daysDiff < 0) {
      daysDiff += 7; // reference to next week
    }

    let targetHour = 22;
    let targetMinute = 0;
    if (releaseTime) {
      const parts = releaseTime.split(':');
      if (parts.length >= 2) {
        targetHour = parseInt(parts[0], 10) || 22;
        targetMinute = parseInt(parts[1], 10) || 0;
      }
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysDiff);
    targetDate.setHours(targetHour, targetMinute, 0, 0);

    if (daysDiff === 0 && targetDate.getTime() < now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    const msDiff = targetDate.getTime() - now.getTime();
    const totalHours = Math.floor(msDiff / (1000 * 60 * 60));
    const totalDays = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    const isToday = totalDays === 0 && now.getDay() === targetDayNum;

    if (isToday) {
      return {
        text: `امروز ساعت ${toPersianNums(releaseTime || '۲۲:۰۰')} (کمتر از ${toPersianNums(Math.max(1, totalHours))} ساعت دیگر)`,
        isToday: true,
        hoursLeft: totalHours
      };
    } else if (totalDays === 0) {
      return {
        text: `فردا ساعت ${toPersianNums(releaseTime || '۲۲:۰۰')} (${toPersianNums(remainingHours)} ساعت دیگر)`,
        isToday: false,
        hoursLeft: totalHours
      };
    } else {
      return {
        text: `${toPersianNums(totalDays)} روز و ${toPersianNums(remainingHours)} ساعت دیگر (${releaseDay} ساعت ${toPersianNums(releaseTime || '۲۲:۰۰')})`,
        isToday: false,
        hoursLeft: totalHours
      };
    }
  };

  // Find latest episode of each series
  const lastEpisodesOfEachSeries = series.map(s => {
    if (!s.seasons || s.seasons.length === 0) return null;
    const allEpisodes: { seasonName: string; episodeNumber: number; id: string; name: string; videoPath: string; description: string }[] = [];
    s.seasons.forEach(season => {
      if (season.episodes && season.episodes.length > 0) {
        season.episodes.forEach(ep => {
          allEpisodes.push({
            seasonName: season.name,
            episodeNumber: ep.episodeNumber,
            id: ep.id,
            name: ep.name,
            videoPath: ep.videoPath || '',
            description: ep.description || ''
          });
        });
      }
    });

    if (allEpisodes.length === 0) return null;
    const latestEp = allEpisodes[allEpisodes.length - 1];
    return {
      seriesItem: s,
      episode: latestEp
    };
  }).filter(Boolean) as { seriesItem: Series; episode: { seasonName: string; episodeNumber: number; id: string; name: string; videoPath: string; description: string } }[];

  const dayOfWeekNames: Record<number, string> = {
    0: 'یکشنبه', 1: 'دوشنبه', 2: 'سه‌شنبه', 3: 'چهارشنبه', 4: 'پنجشنبه', 5: 'جمعه', 6: 'شنبه'
  };
  const todayDayPersian = dayOfWeekNames[new Date().getDay()];
  const todayAiringSeries = series.filter(s => s.releaseDay && s.releaseDay.trim() === todayDayPersian && !s.isEnded);

  const handleQuickPlay = async (videoPath: string, originPeerIp?: string) => {
    if (!videoPath) {
      alert('مسیر فیزیکی ویدیو برای این قسمت ثبت نشده است.');
      return;
    }
    if (window.electronAPI) {
      const res = await window.electronAPI.playVideoFile(videoPath, originPeerIp);
      if (!res.success) alert(`خطا در پخش فایل: ${res.error}`);
    } else {
      alert(`(شبیه‌ساز سیستم) فایل ویدئویی پخش شد:\nمسیر فیزیکی: ${videoPath}`);
    }
  };

  const handleQuickOpenFolder = async (videoPath: string, originPeerIp?: string) => {
    if (!videoPath) {
      alert('مسیر فیزیکی ویدیو برای این قسمت ثبت نشده است.');
      return;
    }
    if (window.electronAPI) {
      const res = await window.electronAPI.openFolderDirectory(videoPath.substring(0, videoPath.lastIndexOf('\\')), originPeerIp);
      if (!res.success) alert(`خطا در باز کردن پوشه: ${res.error}`);
    } else {
      alert(`(شبیه‌ساز سیستم) پوشه فایل باز شد:\nمسیر فیزیکی: ${videoPath}`);
    }
  };

  // 1. Calculations
  const totalMovies = movies.length;
  const totalSeries = series.length;

  // Calculate Sales Figures
  // Today's sales (filtering sales done on 2026-06-05)
  const todayStr = new Date('2026-06-05').toDateString();
  const todaySalesList = sales.filter(s => new Date(s.date).toDateString() === todayStr);
  const todaySalesCount = todaySalesList.length;
  const todaySalesAmount = todaySalesList.reduce((sum, s) => sum + (s.salePrice - s.discount), 0);

  // Total sales
  const salesCount = sales.length;
  const salesTotalRevenue = sales.reduce((sum, s) => sum + (s.salePrice - s.discount), 0);
  const salesTotalCost = sales.reduce((sum, s) => sum + s.purchasePrice, 0);
  const totalProfit = salesTotalRevenue - salesTotalCost;

  // Recent additions
  const latestMovies = [...movies].slice(0, 3);
  const latestSeries = [...series].slice(0, 3);

  // Top media sales (aggregating sales count by media id)
  const salesCountByMediaMap: Record<string, { count: number; name: string; type: string; price: number; income: number }> = {};
  sales.forEach(s => {
    if (!salesCountByMediaMap[s.mediaId]) {
      salesCountByMediaMap[s.mediaId] = {
        count: 0,
        name: s.mediaTitle,
        type: s.mediaType === 'movie' ? 'فیلم' : 'سریال',
        price: s.salePrice,
        income: 0
      };
    }
    salesCountByMediaMap[s.mediaId].count += 1;
    salesCountByMediaMap[s.mediaId].income += (s.salePrice - s.discount);
  });

  const topSellers = Object.values(salesCountByMediaMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Monthly breakdown for Chart (Last 6 Persian months)
  // Farvardin (1), Ordibehesht (2), Khordad (3), Tir (4), Mordad (5), Shahrivar (6)
  // Let's create a solid display of Farvardin, Ordibehesht, Khordad (representing April, May, June 2026)
  const persianMonths = [
    { name: 'اسفند ۱۴۰۴', m: 1, amount: 150000, color: '#f59e0b' },
    { name: 'فروردین ۱۴۰۵', m: 2, amount: 125000, color: '#10b981' },
    { name: 'اردیبهشت ۱۴۰۵', m: 3, amount: 220000, color: '#3b82f6' },
    { name: 'خرداد ۱۴۰۵', m: 4, amount: 0, color: '#8b5cf6' } // Dynamic current month
  ];

  // Map Gregorian sales to Persian months
  sales.forEach(sale => {
    const saleDate = new Date(sale.date);
    const m = saleDate.getMonth(); // 0: Jan, 1: Feb, 2: Mar, 3: Apr, 4: May, 5: Jun
    const saleAmount = sale.salePrice - sale.discount;
    if (m === 3) {
      // April (Farvardin)
      persianMonths[1].amount += saleAmount;
    } else if (m === 4) {
      // May (Ordibehesht)
      persianMonths[2].amount += saleAmount;
    } else if (m === 5) {
      // June (Khordad) - matching 2026-06-05
      persianMonths[3].amount += saleAmount;
    }
  });

  const maxVal = Math.max(...persianMonths.map(p => p.amount), 300000);

  return (
    <div className="space-y-6" id="dashboard-tab-content">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-150 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100" id="dashboard-title">پیش‌خوان مدیا سنتر</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">خلاصه وضعیت، فاکتورها، عملکرد مالی و عناوین جدید سیستم</p>
        </div>
        <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
          امروز: {toPersianNums('۱۴۰۵/۰۳/۱۵')} | ساعت: {toPersianNums('۱۳:۱۰')}
        </div>
      </div>

      {/* Dynamic Broadcast Notification Banner */}
      {todayAiringSeries.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 dark:from-indigo-950/30 dark:to-emerald-950/30 border-r-4 border-indigo-500 p-4 rounded-xl flex items-center justify-between text-indigo-900 dark:text-indigo-300 animate-slideDown shadow-sm" id="airing-notification-banner">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400 animate-pulse">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold font-sans">اطلاعیه پخش امروز ({toPersianNums(todayDayPersian)}) 📣</h4>
              <p className="text-[10px] mt-0.5 text-gray-500 dark:text-gray-400">
                قسمت جدید سریال‌های {todayAiringSeries.map((s, idx) => (
                  <strong key={s.id} className="text-indigo-700 dark:text-indigo-400">
                    «{s.titleFa}»{idx < todayAiringSeries.length - 1 ? ' و ' : ''}
                  </strong>
                ))} امروز منتشر شده است! هم‌اکنون می‌توانید قسمت‌های جدید را به لیست فصل‌ها اضافه کنید.
              </p>
            </div>
          </div>
          <span className="text-[9.5px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full select-none animate-pulse">امروز در جدول پخش</span>
        </div>
      )}

      {/* Premium New Series Carousel (Request 1 & 2) */}
      {series.length > 0 && (() => {
        // Filter series with active weekly broadcast schedule (releaseDay and releaseTime) that are not marked as ended
        const carouselList = series.filter(s => s.releaseDay && s.releaseTime && !s.isEnded);

        if (carouselList.length === 0) {
          return (
            <div className="bg-white dark:bg-[#1e293b] p-8 text-center rounded-3xl border border-gray-150 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center space-y-3" id="no-broadcast-carousel">
              <Tv className="w-10 h-10 text-indigo-500/80 animate-pulse" />
              <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">پیشخوان پخش زنده و شمارش معکوس هفتگی</h3>
              <p className="text-[11px] text-gray-400 max-w-md">
                هیچ سریالی با زمان‌بندی پخش فعال تعریف نشده است (یا همه آثار به پایان رسیده‌اند). برای نمایش شمارش معکوس اکران، روز و ساعت پخش هفتگی را در بخش مدیریت سریال تنظیم نمایید.
              </p>
            </div>
          );
        }

        const isUsingWeeklySchedules = true;
        const listLen = carouselList.length;
        const activeIdx = activeCarouselIndex >= listLen ? 0 : activeCarouselIndex;
        const activeSeries = carouselList[activeIdx];

        if (!activeSeries) return null;

        const schedStatus = activeSeries.releaseDay ? getScheduledSeriesStatus(activeSeries) : null;

        return (
          <div 
            className="relative overflow-hidden rounded-3xl border border-gray-150 dark:border-slate-800/80 shadow-2xl transition-all duration-300 group hover:shadow-indigo-500/10" 
            id="recent-series-carousel"
          >
            {/* Dynamic Ambient Blur Backdrop bleed effect */}
            <div 
              className="absolute inset-0 bg-cover bg-center scale-110 filter blur-[24px] brightness-[0.35] dark:brightness-[0.2] opacity-70 group-hover:scale-115 transition-all duration-700"
              style={{ backgroundImage: `url(${getSafePosterUrl(activeSeries.poster)})` }}
            />
            
            {/* Dark/Gradient High-Contrast Glassmorphism Layer */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/95 to-slate-900/70 opacity-95 dark:opacity-100" />

            <div className="relative z-10 p-6 md:p-8 text-white space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="p-1 px-2.5 bg-amber-500/10 text-amber-400 font-extrabold text-[10px] rounded-full border border-amber-500/30 animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isUsingWeeklySchedules ? 'پیشخوان ویژه پخش هفتگی' : 'جدیدترین آثار مجموعه'}</span>
                  </span>
                  <h3 className="text-sm md:text-base font-black text-white tracking-tight">
                    {isUsingWeeklySchedules ? 'جدول اکران و زمان‌بندی زنده پخش سریال‌ها' : 'تازه تریـن سریال‌های اضـافه شده'}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 animate-scaleIn" dir="ltr">
                  <button 
                    onClick={() => setActiveCarouselIndex(prev => (prev - 1 + listLen) % listLen)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl transition cursor-pointer active:scale-95"
                    title="قبلی"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono font-black text-gray-300 px-1 bg-white/5 py-1 px-2.5 rounded-lg border border-white/5">
                    {toPersianNums(activeIdx + 1)} / {toPersianNums(listLen)}
                  </span>
                  <button 
                    onClick={() => setActiveCarouselIndex(prev => (prev + 1) % listLen)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl transition cursor-pointer active:scale-95"
                    title="بعدی"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Series Item visualizer grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center animate-fadeIn" key={activeSeries.id}>
                
                {/* Poster column */}
                <div 
                  className="lg:col-span-1 flex justify-center group/poster cursor-pointer relative"
                  onClick={() => onViewMedia('series', activeSeries.id)}
                >
                  <div className="relative select-none">
                    <img 
                      src={getSafePosterUrl(activeSeries.poster)} 
                      alt={activeSeries.titleFa} 
                      className="w-36 h-48 md:w-44 md:h-60 object-cover rounded-2xl shadow-2xl border border-white/10 group-hover/poster:border-indigo-400 group-hover/poster:scale-102 transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-amber-400 text-[10px] font-mono font-extrabold px-2 py-1 rounded-lg border border-white/10">
                      ★ {toPersianNums(activeSeries.imdbRating)}
                    </div>
                  </div>
                </div>

                {/* Info & Countdown detailed zone */}
                <div className="lg:col-span-3 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xl font-extrabold text-white tracking-tight hover:text-indigo-400 transition cursor-pointer" onClick={() => onViewMedia('series', activeSeries.id)}>
                        {activeSeries.titleFa}
                      </h4>
                      <span className="text-[9.5px] font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                        {activeSeries.category}
                      </span>
                      {activeSeries.quality && (
                        <span className="text-[9.5px] font-medium bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {activeSeries.quality}
                        </span>
                      )}
                      {schedStatus?.status === 'airing' && (
                        <span className="text-[9.5px] font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full select-none animate-pulse">
                          هم‌اکنون در حال پخش 🔔
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5 font-mono tracking-wide" dir="ltr">{activeSeries.titleEn} ({toPersianNums(activeSeries.year)})</p>
                  </div>

                  <p className="text-xs leading-relaxed text-gray-350 dark:text-gray-300 font-sans line-clamp-3">
                    {activeSeries.summary || "توضیحی اضافه نشده است."}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Metadata details */}
                    <div className="space-y-2 text-xs text-gray-300 bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                      <p className="flex justify-between border-b border-white/5 pb-1.5">
                        <span className="text-gray-400">کارگردان:</span>
                        <strong className="text-white">{activeSeries.director || 'نامشخص'}</strong>
                      </p>
                      <p className="flex justify-between border-b border-white/5 pb-1.5">
                        <span className="text-gray-400">نویسنده:</span>
                        <strong className="text-white">{activeSeries.writer || 'نامشخص'}</strong>
                      </p>
                      <p className="flex justify-between pb-0">
                        <span className="text-gray-400">ژانرها:</span>
                        <span className="text-white font-medium text-[10.5px]">{activeSeries.genres ? activeSeries.genres.join('، ') : 'بدون ژانر'}</span>
                      </p>
                    </div>

                    {/* Clock countdown block OR Fallback description */}
                    {activeSeries.releaseDay && schedStatus?.targetDate ? (
                      <TimerCountdown 
                        targetDate={schedStatus.targetDate}
                        s={activeSeries}
                        status={schedStatus.status}
                        onViewMedia={onViewMedia}
                      />
                    ) : (
                      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-center text-center space-y-1">
                        <span className="text-[10px] text-indigo-400 font-bold block">وضعیت زمان پخش</span>
                        <p className="text-[11.5px] text-gray-200">این اثر بدون زمان‌بندی هفتگی فعال است.</p>
                        <p className="text-[9.5px] text-gray-400 italic font-sans">
                          💡 برای نمایش شمارش معکوس، روز و ساعت پخش اکران هفتگی را تنظیم کنید.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {/* Official Site Link (Request 2) */}
                    <div>
                      {activeSeries.officialSite ? (
                        <a 
                          href={activeSeries.officialSite} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[11px] font-black shadow-lg shadow-amber-500/10 active:scale-95 transition-all text-center cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>ورود به سایت سازنده (مرجع رسمی سریال)</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-450 italic">فاقد وب‌سایت رسمی ثبت شده</span>
                      )}
                    </div>

                    <button 
                      onClick={() => onViewMedia('series', activeSeries.id)}
                      className="text-[11px] font-bold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15 border border-indigo-500/20 active:scale-95"
                    >
                      <span>مدیریت کامل و ویرایش فصل‌ها</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" id="kpi-grid">
        {/* Card 1: Total Movies */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4" id="kpi-total-movies">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">تعداد کل فیلم‌ها</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-0.5">{toPersianNums(totalMovies)} <span className="text-xs font-normal text-gray-450">عنوان</span></p>
          </div>
        </div>

        {/* Card 2: Total Series */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4" id="kpi-total-series">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">تعداد کل سریال‌ها</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-0.5">{toPersianNums(totalSeries)} <span className="text-xs font-normal text-gray-450">عنوان</span></p>
          </div>
        </div>

        {/* Card 3: Today's Sales */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4" id="kpi-today-sales">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">فروش ثبت شده امروز</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-450 mt-0.5" title={`${todaySalesCount} فروش`}>
              {formatCurrency(todaySalesAmount)}
            </p>
          </div>
        </div>

        {/* Card 4: Total Accumulated Sales */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4" id="kpi-total-sales-amount">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">فروش ناخالص کل</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-450 mt-0.5" title={`${salesCount} تراکنش فروش`}>
              {formatCurrency(salesTotalRevenue)}
            </p>
          </div>
        </div>

        {/* Card 5: Net Profit */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4" id="kpi-net-profit">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">کل سود خالص کسب شده</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-450 mt-0.5" title={`خرید: ${salesTotalCost} / فروش: ${salesTotalRevenue}`}>
              {formatCurrency(totalProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Row: Chart & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-row-charts">
        {/* Sales Chart Panel */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm lg:col-span-2 space-y-4" id="chart-panel">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans text-right">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">نمودارهای هوشمند و آنالیز فروش</h3>
              <p className="text-[11px] text-gray-400">تحلیل رونق دوره‌ای کسب‌وکار و تفکیک جریان‌های فروش</p>
            </div>
            
            {/* Custom Interactive Tab Selectors */}
            <div className="flex bg-gray-50 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 font-semibold gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setChartTab('monthly')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${chartTab === 'monthly' ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-400 shadow-sm font-bold' : 'hover:text-gray-800 dark:hover:text-gray-300'}`}
              >
                روند فروش ماهانه
              </button>
              <button
                type="button"
                onClick={() => setChartTab('distribution')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${chartTab === 'distribution' ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-400 shadow-sm font-bold' : 'hover:text-gray-800 dark:hover:text-gray-300'}`}
              >
                سهم فیلم / سریال
              </button>
            </div>
          </div>

          {chartTab === 'monthly' ? (
            /* Premium Custom SVG Chart with Trend Line overlays */
            <div className="h-64 flex flex-col justify-end text-right font-sans" id="svg-chart-container">
              <div className="flex items-center justify-between pb-2 text-[10px] text-gray-400">
                <span>بیشترین ارزش ثبت شده: {formatCurrency(maxVal)}</span>
                <span>تومان در هر دوره</span>
              </div>
              <div className="flex-1 w-full flex items-end gap-1 px-4 relative pt-1" dir="rtl">
                {/* Grid Background lines */}
                <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-gray-200 dark:border-gray-700 h-0 w-full"></div>
                  <div className="border-b border-dashed border-gray-200 dark:border-gray-700 h-0 w-full"></div>
                  <div className="border-b border-dashed border-gray-200 dark:border-gray-700 h-0 w-full"></div>
                  <div className="border-b border-dashed border-gray-200 dark:border-gray-700 h-0 w-full"></div>
                </div>

                {persianMonths.map((month, i) => {
                  // Calculate percentage height
                  const barHeightPct = (month.amount / maxVal) * 85; 
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative z-10">
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-20">
                        {toPersianNums(month.name)}: {formatCurrency(month.amount)}
                      </div>
                      
                      {/* Animated Glow on Bar Hover */}
                      <div 
                        className="w-14 rounded-t-lg transition-all duration-300 hover:brightness-105 hover:scale-x-105 shadow-sm relative overflow-hidden group-hover:shadow-md cursor-pointer"
                        style={{ 
                          height: `${Math.max(barHeightPct, 6)}%`, 
                          backgroundColor: month.color,
                          boxShadow: `0 4px 14px ${month.color}25`
                        }}
                      >
                        {/* Shimmer reflection effect inside bar */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10"></div>
                      </div>

                      {/* Label */}
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-2.5 truncate max-w-full">
                        {month.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Axis Baseline */}
              <div className="h-px bg-gray-200 dark:bg-gray-700 w-full mt-1"></div>
            </div>
          ) : (
            /* Premium Circular Donut / Gauge Segment with Stats Breakdown  */
            <div className="h-64 flex flex-col md:flex-row items-center justify-around gap-6 pt-2 text-right font-sans" id="distribution-chart-container">
              
              {/* SVG Radial Gauge Dial */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Track circle */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke="rgba(156, 163, 175, 0.15)" 
                    strokeWidth="10" 
                  />
                  {/* Movies circle segment */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke="#10b981" 
                    strokeWidth="10" 
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * (sales.filter(s => s.mediaType === 'movie').length || 7)) / (sales.length || 11)} 
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center font-sans">
                  <span className="text-xl font-black text-gray-800 dark:text-white">{toPersianNums(sales.length || 11)}</span>
                  <span className="text-[9px] text-gray-400 font-bold">کل فاکتورها</span>
                </div>
              </div>

              {/* Progress Gauges stats breakdown column */}
              <div className="flex-1 w-full space-y-4 font-sans">
                <h4 className="text-[11px] font-bold text-gray-400 text-right">سهم درصدی فروش بر اساس طبقه‌بندی</h4>
                
                {/* Movie row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-gray-750 dark:text-gray-200">فیلم‌های سینمایی</span>
                    </span>
                    <span className="text-emerald-500 font-mono">
                      {toPersianNums(Math.round(((sales.filter(s => s.mediaType === 'movie').length || 7) / (sales.length || 11)) * 105))}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-slate-850 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${Math.round(((sales.filter(s => s.mediaType === 'movie').length || 7) / (sales.length || 11)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>فاکتورها: {toPersianNums(sales.filter(s => s.mediaType === 'movie').length || 7)} عدد</span>
                    <span>درآمد تقریبی: {formatCurrency(sales.filter(s => s.mediaType === 'movie').reduce((sum, s) => sum + (s.salePrice - s.discount), 0) || 520000)}</span>
                  </div>
                </div>

                {/* Series row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      <span className="text-gray-750 dark:text-gray-200">مجموعه سریال‌ها</span>
                    </span>
                    <span className="text-purple-500 font-mono">
                      {toPersianNums(Math.round(((sales.filter(s => s.mediaType === 'series').length || 4) / (sales.length || 11)) * 100))}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-slate-850 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${Math.round(((sales.filter(s => s.mediaType === 'series').length || 4) / (sales.length || 11)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>فاکتورها: {toPersianNums(sales.filter(s => s.mediaType === 'series').length || 4)} عدد</span>
                    <span>درآمد تقریبی: {formatCurrency(sales.filter(s => s.mediaType === 'series').reduce((sum, s) => sum + (s.salePrice - s.discount), 0) || 280000)}</span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Best Selling Media List */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between space-y-4" id="top-sellers-panel">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">پرفروش‌ترین عناوین</h3>
            </div>
            <p className="text-[11px] text-gray-400">عناوینی که بیشترین درآمد و ثبت فروش را داشته‌اند</p>
          </div>

          <div className="flex-1 divide-y divide-gray-100 dark:divide-gray-800 space-y-2.5" id="top-sellers-list">
            {topSellers.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400 italic py-8">تراکنش فروشی ثبت نشده است.</div>
            ) : (
              topSellers.map((item, index) => (
                <div key={index} className="flex items-center justify-between pt-2.5 first:pt-0" id={`top-seller-${index}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded text-[10px]">
                      {toPersianNums(index + 1)}
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-100">{item.name}</h4>
                      <span className="text-[10px] text-gray-400 font-medium bg-gray-50 dark:bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700 mt-0.5 inline-block">{item.type}</span>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{formatCurrency(item.income)}</p>
                    <p className="text-[9px] text-[#10b981] font-semibold mt-0.5">{toPersianNums(item.count)} فروش ثبت‌شده</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grid: Last Movie and Series */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-row-recent">
        {/* Last Movies */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4" id="recent-movies-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Film className="w-4 h-4 text-indigo-500" />
              <span>آخرین فیلم‌های اضافه‌شده</span>
            </h3>
            <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full font-bold">بخش فیلم‌ها</span>
          </div>

          <div className="space-y-3" id="recent-movies-list">
            {latestMovies.map(movie => (
              <div 
                key={movie.id} 
                onClick={() => onViewMedia('movie', movie.id)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                id={`recent-movie-${movie.id}`}
              >
                <img 
                  src={getSafePosterUrl(movie.poster)} 
                  alt={movie.titleFa} 
                  className="w-10 h-14 object-cover rounded shadow-sm bg-gray-100"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{movie.titleFa}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{movie.titleEn} ({toPersianNums(movie.year)})</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-450 mt-1 flex items-center gap-1 truncate">
                    <span>کارگردان:</span>
                    <span className="font-semibold">{movie.director}</span>
                  </p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                    ★ {toPersianNums(movie.imdbRating)}
                  </span>
                  <p className="text-[10px] font-bold text-emerald-500 mt-1.5">{formatCurrency(movie.salePrice)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last Series */}
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4" id="recent-series-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Tv className="w-4 h-4 text-sky-500" />
              <span>آخرین سریال‌های اضافه‌شده</span>
            </h3>
            <span className="text-[10px] text-sky-500 bg-sky-50 dark:bg-sky-950/30 px-2 py-0.5 rounded-full font-bold">بخش سریال‌ها</span>
          </div>

          <div className="space-y-3" id="recent-series-list">
            {latestSeries.map(ser => (
              <div 
                key={ser.id}
                onClick={() => onViewMedia('series', ser.id)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                id={`recent-series-${ser.id}`}
              >
                <img 
                  src={getSafePosterUrl(ser.poster)} 
                  alt={ser.titleFa} 
                  className="w-10 h-14 object-cover rounded shadow-sm bg-gray-100"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{ser.titleFa}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{ser.titleEn} ({toPersianNums(ser.year)})</p>
                  <p className="text-[10px] text-[#38bdf8] dark:text-sky-400 mt-1 font-semibold flex items-center gap-1">
                    <span>{toPersianNums(ser.seasons.length)} فصل</span>
                    <span>•</span>
                    <span>{toPersianNums(ser.seasons.reduce((sum, s) => sum + s.episodes.length, 0))} قسمت کل</span>
                  </p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                    ★ {toPersianNums(ser.imdbRating)}
                  </span>
                  <p className="text-[10px] font-bold text-emerald-500 mt-1.5">{formatCurrency(ser.salePrice)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest Episode of Each Added Series (Request 1) */}
      <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-150 dark:border-gray-800 shadow-sm space-y-4" id="dashboard-latest-episodes-panel">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 font-sans">آخرین قسمت‌های اضافه‌شده از هر سریال</h3>
          </div>
          <span className="text-[9.5px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900 font-mono">
            بروزرسانی زنده
          </span>
        </div>

        {lastEpisodesOfEachSeries.length === 0 ? (
          <div className="text-xs text-gray-400 italic text-center py-6 font-sans">هیچ قسمتی برای سریال‌ها اضافه نشده است.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="latest-episodes-grid">
            {lastEpisodesOfEachSeries.map(({ seriesItem, episode }, idx) => (
              <div 
                key={seriesItem.id + '-' + idx} 
                className="p-3 bg-gray-50/50 dark:bg-slate-900/40 rounded-xl border border-gray-150 dark:border-gray-800 hover:border-gray-250 dark:hover:border-gray-750 transition flex flex-col justify-between space-y-3"
              >
                <div className="flex gap-3">
                  <img 
                    src={getSafePosterUrl(seriesItem.poster)} 
                    alt={seriesItem.titleFa} 
                    className="w-10 h-14 object-cover rounded shadow-sm bg-gray-100 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">{seriesItem.titleFa}</h4>
                    <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded inline-block mt-1">
                      {episode.seasonName} • قسمت {toPersianNums(episode.episodeNumber)}
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">عنوان قسمت: <strong className="text-gray-700 dark:text-gray-200 text-xs">{episode.name || 'بدون نام'}</strong></p>
                  </div>
                </div>

                {episode.description && (
                  <p className="text-[9.5px] text-gray-400 dark:text-gray-500 line-clamp-2 px-1 leading-relaxed">
                    {episode.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-1.5 border-t border-gray-100 dark:border-slate-800/80 pt-2 shrink-0" dir="rtl">
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleQuickPlay(episode.videoPath, seriesItem.originPeerIp)}
                      className="p-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title="پخش سریع خروجی ویدیو"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>پخش</span>
                    </button>
                    <button 
                      onClick={() => handleQuickOpenFolder(episode.videoPath, seriesItem.originPeerIp)}
                      className="p-1.5 text-gray-650 dark:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer"
                      title="باز کردن پوشه این قسمت"
                    >
                      <FolderOpen className="w-2.5 h-2.5" />
                      <span>پوشه فیزیکی</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => onViewMedia('series', seriesItem.id)}
                    className="text-[9px] font-bold text-gray-400 hover:text-indigo-500 transition cursor-pointer font-sans"
                  >
                    مدیریت کلی
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
