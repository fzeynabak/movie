import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface JalaliDatePickerProps {
  value: string; // "1405/03/30" format
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

// Solid G2J and J2G helper algorithms for exact Shamsi/Gregorian conversion
export function gregorianToJalali(gy: number, gm: number, gd: number): { y: number; m: number; d: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  let jm = (days < 186) ? (1 + Math.floor(days / 31)) : (7 + Math.floor((days - 186) / 30));
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { y: jy, m: jm, d: jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  let gy = (jy <= 979) ? 0 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? ((jm - 1) * 31) : (((jm - 7) * 30) + 186));
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  gy += 100 * Math.floor(days / 36524);
  days %= 36524;
  if (days >= 365) days++;
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (let i = 1; i <= 12; i++) {
    if (gd <= sal_a[i]) {
      gm = i;
      break;
    }
    gd -= sal_a[i];
  }
  return new Date(gy, gm - 1, gd);
}

export function getTodayJalali(): { y: number; m: number; d: number } {
  const today = new Date();
  let sysYear = today.getFullYear();
  
  // If system year is already shamsi (between 1300 and 1500), return it directly
  if (sysYear >= 1350 && sysYear <= 1450) {
    return { y: sysYear, m: today.getMonth() + 1, d: today.getDate() };
  }
  
  let res = gregorianToJalali(sysYear, today.getMonth() + 1, today.getDate());
  if (res.y < 1380 || res.y > 1420) {
    res.y = 1405; // Fallback to current year 1405
  }
  return res;
}

function isJalaliLeap(y: number): boolean {
  const r = (y - 474) % 2820;
  return (((r + 474) + 38) * 31) % 128 < 31;
}

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// Make a dynamic selection range for Shamsi years
const START_YEAR = 1350;
const END_YEAR = 1450;
const YEARS_LIST = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

// Helper to convert any English numbers inside a string to Persian
export function toPersianDigits(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = val.toString();
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.split('').map(char => {
    const index = englishDigits.indexOf(char);
    return index > -1 ? persianDigits[index] : char;
  }).join('');
}

export function formatPersianCurrency(val: number | string | any): string {
  if (val === undefined || val === null) return '۰';
  const rawNum = typeof val === 'object' && val.toNumber ? val.toNumber() : parseFloat(val.toString() || '0');
  const formattedEng = Math.round(rawNum).toLocaleString('en-US');
  return toPersianDigits(formattedEng);
}

export default function JalaliDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ شمسی...',
  className = '',
  label
}: JalaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Active viewing year and month
  const [currentYear, setCurrentYear] = useState(1405);
  const [currentMonth, setCurrentMonth] = useState(3); // 1-indexed

  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize state when value changes or calendar gets opened
  useEffect(() => {
    if (value && value.includes('/')) {
      const parts = value.split('/');
      let y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      if (y && m) {
        if (y < 1350 || y > 1450) {
          y = 1405; // Force correct current Shamsi year
        }
        setCurrentYear(y);
        setCurrentMonth(m);
      }
    } else {
      const today = getTodayJalali();
      setCurrentYear(today.y);
      setCurrentMonth(today.m);
    }
  }, [value, isOpen]);

  // Handle outside click dismissal
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const daysInMonth = (y: number, m: number): number => {
    if (m <= 6) return 31;
    if (m <= 11) return 30;
    return isJalaliLeap(y) ? 30 : 29;
  };

  const getMonthDaysData = () => {
    const totalDays = daysInMonth(currentYear, currentMonth);
    const firstDayGDate = jalaliToGregorian(currentYear, currentMonth, 1);
    
    // Day of week index translated (0 = Saturday, 6 = Friday)
    const firstDayOfWeek = (firstDayGDate.getDay() + 1) % 7;

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  };

  const handleDaySelect = (d: number) => {
    const formatted = `${currentYear}/${String(currentMonth).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => Math.max(START_YEAR, prev - 1));
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => Math.min(END_YEAR, prev + 1));
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handlePrevYear = () => {
    setCurrentYear(prev => Math.max(START_YEAR, prev - 1));
  };

  const handleNextYear = () => {
    setCurrentYear(prev => Math.min(END_YEAR, prev + 1));
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {label && <label className="block text-[10px] font-bold text-slate-400 mb-1">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={toPersianDigits(value)}
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder}
          onClickCapture={(e) => {
            // Put focus and move cursor to end for better accessibility
            const target = e.currentTarget;
            target.focus();
          }}
          className="w-full pr-9 pl-3 py-2 border rounded-xl text-xs font-bold font-mono text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer text-center select-none"
        />
        <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-[99999] p-4 w-72 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl animate-in fade-in duration-100 zoom-in-95">
          {/* Enhanced Pager Header for 100% Click Reliability (Solves OS Select overlays closing popovers) */}
          <div className="flex items-center justify-between gap-1 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            {/* Year Navigation controls */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-1 py-0.5">
              <button 
                type="button" 
                onClick={handlePrevYear} 
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-xs transition-colors"
                title="سال قبل"
              >
                -
              </button>
              <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100 px-2 select-none">
                {toPersianDigits(currentYear)}
              </span>
              <button 
                type="button" 
                onClick={handleNextYear} 
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-xs transition-colors"
                title="سال بعد"
              >
                +
              </button>
            </div>

            {/* Month Navigation controls */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-1 py-0.5">
              <button 
                type="button" 
                onClick={handlePrevMonth} 
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] transition-colors"
                title="ماه قبل"
              >
                ◀
              </button>
              <span className="text-xs font-black text-slate-850 dark:text-slate-100 px-1 w-16 text-center select-none font-sans">
                {MONTH_NAMES[currentMonth - 1]}
              </span>
              <button 
                type="button" 
                onClick={handleNextMonth} 
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] transition-colors"
                title="ماه بعد"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Weekday indicator letters */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            {WEEK_DAYS.map((day, idx) => (
              <div key={idx} className={idx === 6 ? 'text-rose-500' : ''}>{day}</div>
            ))}
          </div>

          {/* Calendar grid of days */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {getMonthDaysData().map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              
              const isSelected = value === `${currentYear}/${String(currentMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
              
              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  onClick={() => handleDaySelect(day)}
                  className={`py-1.5 rounded-lg font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                      : 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {/* Actions Footer */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const today = getTodayJalali();
                const todayStr = `${today.y}/${String(today.m).padStart(2, '0')}/${String(today.d).padStart(2, '0')}`;
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 text-[10px] font-bold transition-all"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-all"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
