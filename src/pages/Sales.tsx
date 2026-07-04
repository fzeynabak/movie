/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { Sale } from '../types';
import { toPersianNums, formatCurrency } from './Dashboard';
import { showToast, showAlert, showConfirm } from '../utils/toast';
import { 
  CreditCard, 
  Search, 
  Trash2, 
  Printer, 
  Calendar, 
  TrendingUp, 
  X, 
  Award, 
  DollarSign, 
  FileText, 
  User, 
  Scale,
  Percent,
  Check,
  FolderOpen,
  Copy,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [drivePath, setDrivePath] = useState(() => {
    return localStorage.getItem('mediacenter_active_drive_path') || '';
  });
  
  const [copyProgress, setCopyProgress] = useState<Record<string, {
    progress: number;
    bytesCopied: number;
    totalBytes: number;
    speedMbs: number;
    completed: boolean;
    error?: string;
  }>>({});
  
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  
  const currentCopyIndicesRef = React.useRef<Record<string, { current: number, total: number }>>({});
  const cancelledCopiesRef = React.useRef<Record<string, boolean>>({});

  const handleCancelCopy = async (itemId: string) => {
    cancelledCopiesRef.current[itemId] = true;
    if (window.electronAPI && window.electronAPI.cancelCopy) {
      await window.electronAPI.cancelCopy(itemId);
    }
    setCopyProgress(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        completed: false,
        error: 'عملیات کپی توسط اپراتور لغو شد.'
      }
    }));
    showToast('عملیات کپی لغو شد.', 'info');
  };

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onCopyProgress) {
      window.electronAPI.onCopyProgress((data) => {
        setCopyProgress(prev => {
          const indexInfo = currentCopyIndicesRef.current[data.id];
          let displayProgress = data.progress;
          let displayCompleted = data.completed;
          
          if (indexInfo && indexInfo.total > 1) {
            const currentFileIndex = indexInfo.current;
            const totalFiles = indexInfo.total;
            displayProgress = Math.round(((currentFileIndex * 100) + data.progress) / totalFiles);
            displayCompleted = data.completed && (currentFileIndex === totalFiles - 1);
          }
          
          return {
            ...prev,
            [data.id]: {
              progress: displayProgress,
              bytesCopied: data.bytesCopied,
              totalBytes: data.totalBytes,
              speedMbs: data.speedMbs,
              completed: !!displayCompleted,
              error: data.error
            }
          };
        });
      });
    }
  }, []);

  const cleanTitleForFilename = (title: string): string => {
    if (!title) return 'media';
    return title
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const cleanFolderName = (name: string): string => {
    if (!name) return 'Folder';
    return name.replace(/[\\/:*?"<>|]/g, '').trim();
  };

  const getCopyDestinationRelativePath = (item: any, sourcePath: string): string => {
    const ext = sourcePath.substring(sourcePath.lastIndexOf('.')) || '.mkv';
    
    if (item.mediaType === 'series') {
      const series = dbService.getSeries().find(s => s.id === item.mediaId);
      const rawFolderName = series ? (series.titleEn || series.titleFa) : item.mediaTitle;
      const folderName = cleanFolderName(rawFolderName);
      
      const sNum = item.seasonNumber !== undefined ? item.seasonNumber : 1;
      const eNum = item.episodeNumber !== undefined ? item.episodeNumber : 1;
      const sStr = sNum.toString().padStart(2, '0');
      const eStr = eNum.toString().padStart(2, '0');
      
      const cleanSeriesTitle = cleanTitleForFilename(series?.titleEn || series?.titleFa || item.mediaTitle);
      const filename = `${cleanSeriesTitle}-s${sStr}e${eStr}${ext}`;
      
      return `${folderName}/${filename}`;
    } else {
      const movie = dbService.getMovies().find(m => m.id === item.mediaId);
      const rawFolderName = movie ? (movie.titleEn || movie.titleFa) : item.mediaTitle;
      const folderName = cleanFolderName(rawFolderName);
      
      const cleanMovieTitle = cleanTitleForFilename(movie?.titleEn || movie?.titleFa || item.mediaTitle);
      const filename = `${cleanMovieTitle}${ext}`;
      
      return `${folderName}/${filename}`;
    }
  };

  const getMediaPaths = (item: any) => {
    if (item.videoPaths && item.videoPaths.length > 0) {
      return item.videoPaths;
    }
    if (item.filePath) {
      return [item.filePath];
    }
    
    // Dynamically look up in db Cache as fallback
    if (item.mediaType === 'movie') {
      const movie = dbService.getMovies().find(m => m.id === item.mediaId);
      if (movie && movie.filePath) {
        return [movie.filePath];
      }
    } else if (item.mediaType === 'series') {
      const series = dbService.getSeries().find(s => s.id === item.mediaId);
      if (series) {
        // Find if there's episode file matching details
        const eps = (dbService as any).getEpisodes ? (dbService as any).getEpisodes(series.id) : [];
        if (eps && eps.length > 0) {
          return eps.map((e: any) => e.filePath).filter(Boolean);
        }
      }
    }
    return [];
  };

  const handleSelectDrive = async () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      try {
        const dir = await window.electronAPI.selectDirectory();
        if (dir) {
          setDrivePath(dir);
          localStorage.setItem('mediacenter_active_drive_path', dir);
          showToast(`مسیر فلش دیسک با موفقیت روی "${dir}" تنظیم شد.`, 'success');
        }
      } catch (err) {
        showToast('خطا در انتخاب مسیر فلش: ' + (err as Error).message, 'error');
      }
    } else {
      const mockPaths = ['F:\\Movies', 'G:\\مشتری', '/Volumes/USB_DRIVE', '/media/usb0'];
      const randomPath = mockPaths[Math.floor(Math.random() * mockPaths.length)];
      setDrivePath(randomPath);
      localStorage.setItem('mediacenter_active_drive_path', randomPath);
      showToast(`[شبیه‌ساز] مسیر فلش روی "${randomPath}" شبیه‌سازی شد.`, 'success');
    }
  };

  const copySaleItemToUsb = async (item: any): Promise<boolean> => {
    const destDir = drivePath;
    if (!destDir) {
      showAlert('لطفاً ابتدا از بالای فاکتور، مسیر فلش دیسک (USB) مقصد را مشخص کنید.', 'warning', 'مسیر فلش انتخاب نشده');
      return false;
    }
    
    const pathsToCopy = getMediaPaths(item);
    if (pathsToCopy.length === 0) {
      showAlert(`مسیری برای فایل‌های ${item.mediaTitle} پیدا نشد. امکان کپی وجود ندارد.`, 'warning');
      return false;
    }
    
    // Clear cancelled state
    cancelledCopiesRef.current[item.id] = false;

    setCopyProgress(prev => ({
      ...prev,
      [item.id]: {
        progress: 0,
        bytesCopied: 0,
        totalBytes: 0,
        speedMbs: 0,
        completed: false
      }
    }));
    
    currentCopyIndicesRef.current[item.id] = { current: 0, total: pathsToCopy.length };
    
    if (window.electronAPI && window.electronAPI.copyFileToUsb) {
      let copyCount = 0;
      for (let i = 0; i < pathsToCopy.length; i++) {
        // Instant abort if cancelled by user
        if (cancelledCopiesRef.current[item.id]) {
          break;
        }

        const sourcePath = pathsToCopy[i];
        currentCopyIndicesRef.current[item.id].current = i;
        
        const customRelativePath = getCopyDestinationRelativePath(item, sourcePath);
        const absoluteDestPath = `${destDir}/${customRelativePath}`.replace(/\\/g, '/');
        
        let alreadyExists = false;
        if (window.electronAPI.existsFile) {
          try {
            const destCheck = await window.electronAPI.existsFile(absoluteDestPath);
            const sourceCheck = await window.electronAPI.existsFile(sourcePath);
            // Verify BOTH exists and the sizes match exactly
            if (destCheck && destCheck.exists && sourceCheck && sourceCheck.exists && destCheck.size === sourceCheck.size) {
              alreadyExists = true;
            }
          } catch (err) {
            console.error('Error checking file existence and size:', err);
          }
        }
        
        if (alreadyExists) {
          const overallProgress = Math.round(((i * 100) + 100) / pathsToCopy.length);
          const isOverallCompleted = (i === pathsToCopy.length - 1);
          setCopyProgress(prev => ({
            ...prev,
            [item.id]: {
              progress: overallProgress,
              bytesCopied: 0,
              totalBytes: 0,
              speedMbs: 0,
              completed: isOverallCompleted
            }
          }));
          continue;
        }
        
        copyCount++;
        try {
          const res = await window.electronAPI.copyFileToUsb(sourcePath, destDir, item.id, customRelativePath);
          if (res && !res.success) {
            // Check if failure is due to user abort
            if (cancelledCopiesRef.current[item.id]) {
              break;
            }
            setCopyProgress(prev => ({
              ...prev,
              [item.id]: {
                ...prev[item.id],
                completed: false,
                error: res.error || 'خطای کپی فایل'
              }
            }));
            showToast(`خطا در کپی ${item.mediaTitle}: ${res.error}`, 'error');
            return false;
          }
        } catch (err) {
          if (cancelledCopiesRef.current[item.id]) {
            break;
          }
          setCopyProgress(prev => ({
            ...prev,
            [item.id]: {
              ...prev[item.id],
              completed: false,
              error: (err as Error).message
            }
          }));
          showToast(`خطا در ارتباط کپی فایل: ${(err as Error).message}`, 'error');
          return false;
        }
      }
      
      if (cancelledCopiesRef.current[item.id]) {
        return false;
      }

      setCopyProgress(prev => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          progress: 100,
          completed: true
        }
      }));
      if (copyCount === 0) {
        showToast(`رسانه ${item.mediaTitle} قبلاً کپی شده بود (رد شد).`, 'success');
      } else {
        showToast(`رسانه ${item.mediaTitle} با موفقیت به فلش منتقل شد!`, 'success');
      }
      return true;
    } else {
      showToast(`شبیه‌ساز مرورگر: کپی کردن فایل‌های ${item.mediaTitle} به فلش دیسک آغاز شد...`, 'info');
      
      for (let i = 0; i < pathsToCopy.length; i++) {
        currentCopyIndicesRef.current[item.id].current = i;
        await new Promise<void>((resolveSim) => {
          let fileProgress = 0;
          const totalBytes = 500 * 1024 * 1024;
          const speedMbs = 45.2;
          
          const interval = setInterval(() => {
            fileProgress += 25;
            if (fileProgress >= 100) {
              fileProgress = 100;
              clearInterval(interval);
              
              setCopyProgress(prev => {
                const overallProgress = Math.round(((i * 100) + 100) / pathsToCopy.length);
                return {
                  ...prev,
                  [item.id]: {
                    progress: overallProgress,
                    bytesCopied: totalBytes,
                    totalBytes,
                    speedMbs: 0,
                    completed: i === pathsToCopy.length - 1
                  }
                };
              });
              resolveSim();
            } else {
              setCopyProgress(prev => {
                const overallProgress = Math.round(((i * 100) + fileProgress) / pathsToCopy.length);
                return {
                  ...prev,
                  [item.id]: {
                    progress: overallProgress,
                    bytesCopied: Math.round(totalBytes * (fileProgress / 100)),
                    totalBytes,
                    speedMbs,
                    completed: false
                  }
                };
              });
            }
          }, 200);
        });
      }
      showToast(`[شبیه‌ساز] فایل‌های ${item.mediaTitle} به پوشه مجازی فلش کپی شد!`, 'success');
      return true;
    }
  };

  const handleCopyAllToUsb = async () => {
    const destDir = drivePath;
    if (!destDir) {
      showAlert('لطفاً ابتدا از بالای فاکتور، مسیر فلش دیسک (USB) مقصد را مشخص کنید.', 'warning', 'مسیر فلش انتخاب نشده');
      return;
    }
    
    if (!selectedSaleDetail) return;
    
    const items = selectedSaleDetail.items && selectedSaleDetail.items.length > 0 
      ? selectedSaleDetail.items 
      : [{
          id: selectedSaleDetail.id,
          mediaId: selectedSaleDetail.mediaId,
          mediaTitle: selectedSaleDetail.mediaTitle,
          mediaType: selectedSaleDetail.mediaType,
          details: selectedSaleDetail.details,
          salePrice: selectedSaleDetail.salePrice,
          purchasePrice: selectedSaleDetail.purchasePrice,
          filePath: (selectedSaleDetail as any).filePath || '',
          videoPaths: (selectedSaleDetail as any).videoPaths || []
        }];

    setIsCopyingAll(true);
    showToast('شروع کپی صف‌به‌صف تمامی اقلام فاکتور به فلش دیسک مشتری...', 'info');
    
    for (const item of items) {
      if (copyProgress[item.id]?.completed) {
        continue;
      }
      
      const success = await copySaleItemToUsb(item);
      if (!success) {
        const resume = await showConfirm(`خطایی در کپی "${item.mediaTitle}" رخ داد. آیا مایلید کپی سایر اقلام باقی‌مانده را ادامه دهید؟`, 'خطا در کپی');
        if (!resume) {
          break;
        }
      }
    }
    
    setIsCopyingAll(false);
    showToast('عملیات کپی گروهی اقلام فاکتور با موفقیت به پایان رسید.', 'success');
  };

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setSales(dbService.getSales());
    setShopSettings(dbService.getSettings());
  };

  const handleDeleteSale = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('آیا از حذف این فاکتور فروش و بازگرداندن مقادیر مالی اطمینان دارید؟')) {
      dbService.deleteSale(id);
      refreshData();
      if (selectedSaleDetail && selectedSaleDetail.id === id) {
        setSelectedSaleDetail(null);
      }
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    if (!filePath) {
      alert('مسیری برای این فایل ثبت نشده است.');
      return;
    }
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.openFileInExplorer(filePath);
        if (res && !res.success) {
          alert('خطا در باز کردن پوشه: ' + res.error);
        }
      } catch (err) {
        console.error('Failed to open folder natively:', err);
      }
    } else {
      alert('(شبیه‌ساز مرورگر) پوشه حاوی این فایل در سیستم باز می‌شود.\nمسیر فایل: ' + filePath);
    }
  };

  // Convert Gregorian JS Date string into Persian Calendar date format (approximate/elegant string parser)
  const formatPersianDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      // Let's output a premium styled date string in Persian
      const y = date.getFullYear() === 2026 ? '۱۴۰۵' : '۱۴۰۴';
      let m = 'خرداد';
      const mIdx = date.getMonth(); // 0: Jan, 1: Feb, 2: Mar, 3: Apr, 4: May, 5: Jun
      if (mIdx === 3) m = 'فروردین';
      else if (mIdx === 4) m = 'اردیبهشت';
      else if (mIdx === 5) m = 'خرداد';
      else if (mIdx === 2) m = 'اسفند';
      
      const d = toPersianNums(date.getDate());
      return `${d} ${m} ${y}`;
    } catch {
      return toPersianNums('۱۵ خرداد ۱۴۰۵');
    }
  };

  // Financial calculations
  const totalRevenue = sales.reduce((sum, s) => sum + (s.salePrice - s.discount), 0);
  const totalCost = sales.reduce((sum, s) => sum + s.purchasePrice, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
  const totalProfit = totalRevenue - totalCost;

  // Filter List Logic
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.mediaTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.details.toLowerCase().includes(searchQuery.toLowerCase());

    // Basic date checking
    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && new Date(sale.date) >= new Date(filterStartDate);
    }
    if (filterEndDate) {
      matchesDate = matchesDate && new Date(sale.date) <= new Date(filterEndDate);
    }

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6" id="sales-tab-content">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-150 dark:border-gray-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100" id="sales-title">ثبت فروش و حسابداری</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">حسابرسی امور مالی، مشاهده کل درآمدها، سود فیلم‌ها و سریال‌ها به تفکیک جزئیات فاکتور</p>
        </div>
      </div>

      {/* Grid KPI Cards financial */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="sales-kpi-grid">
        {/* Card 1: Sales counts */}
        <div className="bg-white dark:bg-[#1e293b] p-4.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold">کل فاکتورهای صادره</p>
            <p className="text-base font-extrabold text-gray-850 dark:text-gray-100 mt-0.5">{toPersianNums(sales.length)} برگ سند</p>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-white dark:bg-[#1e293b] p-4.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold">کل مبلغ ناخالص دریافتی</p>
            <p className="text-base font-extrabold text-[#f59e0b] mt-0.5">{formatCurrency(totalRevenue + totalDiscount)}</p>
          </div>
        </div>

        {/* Card 3: Total discounts */}
        <div className="bg-white dark:bg-[#1e293b] p-4.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 rounded-lg">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold">تخفیف کل ثبت‌شده</p>
            <p className="text-base font-extrabold text-red-500 mt-0.5">{formatCurrency(totalDiscount)}</p>
          </div>
        </div>

        {/* Card 4: Net Profit */}
        <div className="bg-white dark:bg-[#1e293b] p-4.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#10b981] rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold">کل سود خالص کسب شده</p>
            <p className="text-base font-extrabold text-[#10b981] mt-0.5" title={`هزینه اولیه خرید: ${formatCurrency(totalCost)}`}>
              {formatCurrency(totalProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Query filters row */}
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4" id="sales-queries">
        {/* Dynamic query searching */}
        <div className="flex-1 relative flex items-center">
          <Search className="absolute right-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام مشتری، نام فیلم/سریال فروخته شده..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 h-10 bg-gray-50 dark:bg-slate-800/80 rounded-lg text-xs font-semibold border border-gray-150 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            id="sales-search-input"
          />
        </div>

        {/* Dynamic date selectors constraint */}
        <div className="flex items-center gap-2 text-xs text-gray-505" id="date-constraints">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>محدوده از:</span>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="h-10 px-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-150 dark:border-gray-700 text-xs font-mono text-gray-750 dark:text-gray-200"
          />
          <span>الی:</span>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="h-10 px-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-150 dark:border-gray-700 text-xs font-mono text-gray-750 dark:text-gray-200"
          />
          {(filterStartDate || filterEndDate) && (
            <button
              onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 rounded"
              title="پاک کردن فیلتر تاریخ"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sales Transactions grid / table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden" id="sales-table-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs" dir="rtl" id="sales-history-table">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-505 dark:text-gray-300 border-b border-gray-150 dark:border-gray-850 font-bold">
              <tr>
                <th className="p-4">شماره سند / تاریخ</th>
                <th className="p-4">خریدار</th>
                <th className="p-4">نام عنوان مدیا</th>
                <th className="p-4">نوع و ویژگی فروش</th>
                <th className="p-4">مبلغ فاکتور (خالص)</th>
                <th className="p-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800" id="sales-table-rows">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">هیچ صورت‌حساب مالی متناسب با این فیلتر ثبت نشده است.</td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr 
                    key={sale.id}
                    onClick={() => setSelectedSaleDetail(sale)}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                    id={`sale-row-${sale.id}`}
                  >
                    {/* ID / Date */}
                    <td className="p-4">
                      <span className="font-mono text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-850 px-1.5 py-0.5 rounded font-bold">#{sale.id.slice(-4).toUpperCase()}</span>
                      <p className="text-[10px] text-gray-400 mt-1">{formatPersianDate(sale.date)}</p>
                    </td>

                    {/* Customer */}
                    <td className="p-4 font-bold text-gray-850 dark:text-gray-150 flex items-center gap-1.5 mt-2.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{sale.customerName}</span>
                    </td>

                    {/* Title */}
                    <td className="p-4">
                      {sale.items && sale.items.length > 0 ? (
                        <>
                          <p className="text-gray-900 dark:text-gray-100 font-extrabold">
                            {sale.items[0].mediaTitle} {sale.items.length > 1 && `و ${toPersianNums(sale.items.length - 1)} قلم دیگر...`}
                          </p>
                          <span className="text-[10.5px] text-gray-450 dark:text-gray-400 font-mono-none">({toPersianNums(sale.items.length)} رسانه منتخب)</span>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-900 dark:text-gray-100 font-extrabold">{sale.mediaTitle}</p>
                          <span className="text-[10.5px] text-gray-400 font-mono">({sale.mediaType === 'movie' ? 'فیلم' : 'مجموعه سریال'})</span>
                        </>
                      )}
                    </td>

                    {/* Sales Type detail */}
                    <td className="p-4 font-medium text-gray-550 dark:text-gray-300">
                      <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded px-2 py-0.5 text-[10px] font-bold">
                        {sale.items && sale.items.length > 0 ? 'فروش فاکتور تجمیعی چند قلم' : sale.details}
                      </span>
                    </td>

                    {/* Sale Price and discounts */}
                    <td className="p-4 font-mono font-bold text-emerald-600 dark:text-[#10b981]">
                      {formatCurrency(sale.salePrice - sale.discount)}
                      {sale.discount > 0 && (
                        <p className="text-[9.5px] text-red-500 font-semibold mt-0.5">تخفیف: {formatCurrency(sale.discount)}</p>
                      )}
                    </td>

                    {/* Operations */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {/* Invoice preview */}
                        <button
                          onClick={() => setSelectedSaleDetail(sale)}
                          className="p-1 px-2.5 bg-gray-50 hover:bg-gray-150 dark:bg-slate-800 dark:hover:bg-slate-705 text-gray-650 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700 text-[10px] font-bold cursor-pointer"
                          title="نمایش فاکتور"
                        >
                          مشاهده فاکتور
                        </button>
                        {/* Delete sale entry */}
                        <button
                          onClick={(e) => handleDeleteSale(sale.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="لغو و بازگرداندن فروش"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE CUSTOMER RECEIPT INVOICE MODAL 📄 */}
      {selectedSaleDetail && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto cursor-pointer animate-fadeIn" 
          onClick={() => setSelectedSaleDetail(null)}
          id="invoice-modal"
        >
          <div 
            className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-200 dark:border-gray-800 text-gray-850 dark:text-gray-150 flex flex-col max-h-[92vh] print:max-h-none print:overflow-visible cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal actions panel top */}
            <div className="px-5 py-3.5 bg-gray-50 dark:bg-slate-850 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between z-10 no-print shrink-0">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Printer className="w-4 h-4 text-indigo-500" />
                <span>صدور فاکتور رسمی و چاپی</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all animate-pulse"
                  id="btn-print-action"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ فاکتور</span>
                </button>
                <button 
                  onClick={() => setSelectedSaleDetail(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>بستن فاکتور</span>
                </button>
              </div>
            </div>

            {/* USB Drive Selector Panel */}
            <div className="px-5 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-gray-700 no-print shrink-0">
              <div className="flex items-center gap-2 text-right">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-gray-300">مسیر فلش دیسک (USB) مشتری:</span>
                <span className="font-mono text-[10.5px] text-emerald-400 font-extrabold">{drivePath || 'انتخاب نشده ⚠️'}</span>
              </div>
              <button
                onClick={handleSelectDrive}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9.5px] font-black rounded transition-all cursor-pointer"
              >
                {drivePath ? 'تغییر مسیر' : 'انتخاب فلش دیسک'}
              </button>
            </div>

            {/* Scrollable container to prevent overflow issues */}
            <div className="flex-1 overflow-y-auto print:overflow-visible print:max-h-none">
              
              {/* Visual Invoice Paper - Printable printable section */}
              <div className="p-6 space-y-6 bg-white text-slate-900 font-sans print:p-0" id="invoice-printable-area">

                
                {/* Header Invoice branding */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-gray-900">
                  <div className="text-right">
                    <h1 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-1.5 font-extrabold">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      <span>{shopSettings?.shopName || 'خدمات کامپیوتری پارس تک'}</span>
                    </h1>
                    {shopSettings?.shopAddress ? (
                      <p className="text-[10px] text-gray-550 mt-1 font-bold">آدرس: {shopSettings.shopAddress}</p>
                    ) : (
                      <p className="text-[10px] text-gray-500 mt-1 font-bold">بزرگ‌ترین مرجع آفلاین فیلم، سریال و انیمیشن</p>
                    )}
                    {shopSettings?.shopPhone && (
                      <p className="text-[10px] text-gray-550 mt-0.5 font-bold">تلفن: {toPersianNums(shopSettings.shopPhone)}</p>
                    )}
                  </div>
                  <div className="text-left leading-relaxed">
                    <div className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-bold inline-block font-sans">فاکتور رسمی فروش دیجیتال</div>
                    <p className="text-[10px] text-gray-550 mt-1.5 font-bold font-mono">سند شماره: SMC-{selectedSaleDetail.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                {/* Invoice details, cashier & customer */}
                <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-50 p-4 rounded-lg border border-slate-205">
                  <div className="space-y-1">
                    <p className="text-gray-500 text-[10px]">خریدار گرامی:</p>
                    <strong className="text-gray-900 text-xs font-extrabold">{selectedSaleDetail.customerName}</strong>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-gray-500 text-[10px]">تاریخ صدور فاکتور:</p>
                    <strong className="text-gray-900 font-bold">{formatPersianDate(selectedSaleDetail.date)}</strong>
                  </div>
                  <div className="space-y-1 col-span-2 border-t border-slate-200 pt-2 mt-1">
                    <p className="text-gray-500 text-[10px]">متصدی / صندوق‌دار:</p>
                    <strong className="text-slate-800">مدیریت دپارتمان فروش</strong>
                  </div>
                </div>

                 {/* Items Table details */}
                <div className="space-y-2">
                  <p className="text-[10.5px] font-bold text-gray-900 border-r-2 border-indigo-600 pr-1.5 matches-title">شرح اقلام صورت‌حساب:</p>
                  <table className="w-full text-right text-[11px] border border-slate-200 font-sans" dir="rtl">
                    <thead className="bg-[#f1f5f9] text-gray-700 border-b border-slate-200 font-extrabold">
                      <tr>
                        <th className="p-2 border-l border-slate-200">کد مدیا</th>
                        <th className="p-2 border-l border-slate-200">شرح عنوان رسانه</th>
                        <th className="p-2 border-l border-slate-200">نوع فروش مدیا</th>
                        <th className="p-2 text-left border-l border-slate-200">قیمت (تومان)</th>
                        <th className="p-2 text-center no-print bg-gray-100" style={{ width: '150px' }}>عملیات دیسک / فلش</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedSaleDetail.items && selectedSaleDetail.items.length > 0 ? (
                        selectedSaleDetail.items.map((item, index) => {
                          const progressInfo = copyProgress[item.id];
                          const hasPath = !!getMediaPaths(item).length;
                          return (
                            <tr key={item.id || index} className="text-gray-900">
                              <td className="p-2 border-l border-slate-200 font-mono">#{item.mediaId.slice(-4).toUpperCase()}</td>
                              <td className="p-2 border-l border-slate-200 font-bold text-indigo-950">{item.mediaTitle}</td>
                              <td className="p-2 border-l border-slate-200 text-gray-500">{item.details}</td>
                              <td className="p-2 text-left font-mono border-l border-slate-200 font-bold">{formatCurrency(item.salePrice)}</td>
                              <td className="p-2 text-center no-print bg-gray-50/50">
                                <div className="flex flex-col items-center gap-1.5">
                                  <div className="flex items-center gap-1 justify-center">
                                    {hasPath ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            const paths = getMediaPaths(item);
                                            if (paths.length > 0) handleOpenFolder(paths[0]);
                                          }}
                                          className="px-1.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-black flex items-center gap-0.5 cursor-pointer transition-colors"
                                          title="باز کردن پوشه"
                                        >
                                          <FolderOpen className="w-3 h-3" />
                                          <span>پوشه</span>
                                        </button>
                                        
                                        <button
                                          onClick={() => copySaleItemToUsb(item)}
                                          disabled={progressInfo && !progressInfo.completed && !progressInfo.error}
                                          className={`px-1.5 py-1 rounded text-[9px] font-black flex items-center gap-0.5 cursor-pointer transition-all ${progressInfo?.completed ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-80'}`}
                                          title="کپی مستقیم به فلش"
                                        >
                                          {progressInfo?.completed ? (
                                            <>
                                              <Check className="w-3 h-3 text-emerald-600" />
                                              <span>کپی شد</span>
                                            </>
                                          ) : progressInfo && !progressInfo.completed && !progressInfo.error ? (
                                            <>
                                              <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                                              <span>% {progressInfo.progress}</span>
                                            </>
                                          ) : (
                                            <span>کپی به فلش</span>
                                          )}
                                        </button>

                                        {progressInfo && !progressInfo.completed && !progressInfo.error && (
                                          <button
                                            type="button"
                                            onClick={() => handleCancelCopy(item.id)}
                                            className="px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[9px] font-black flex items-center justify-center cursor-pointer transition-colors animate-pulse ml-1"
                                            title="لغو کپی"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-gray-400 text-[8.5px] font-bold">بدون فایل</span>
                                    )}
                                  </div>
                                  
                                  {progressInfo && (
                                    <div className="w-full max-w-[120px] text-center">
                                      <div className="w-full bg-gray-200 dark:bg-slate-700 h-1 rounded overflow-hidden">
                                        <div 
                                          className={`h-full ${progressInfo.error ? 'bg-red-500' : progressInfo.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                          style={{ width: `${progressInfo.progress}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        (() => {
                          const legacyItem = {
                            id: selectedSaleDetail.id,
                            mediaId: selectedSaleDetail.mediaId,
                            mediaTitle: selectedSaleDetail.mediaTitle,
                            mediaType: selectedSaleDetail.mediaType,
                            details: selectedSaleDetail.details,
                            salePrice: selectedSaleDetail.salePrice,
                            purchasePrice: selectedSaleDetail.purchasePrice,
                            filePath: (selectedSaleDetail as any).filePath || '',
                            videoPaths: (selectedSaleDetail as any).videoPaths || []
                          };
                          const progressInfo = copyProgress[legacyItem.id];
                          const hasPath = !!getMediaPaths(legacyItem).length;
                          return (
                            <tr className="text-gray-950">
                              <td className="p-2 border-l border-slate-200 font-mono">#{selectedSaleDetail.mediaId.slice(-4).toUpperCase()}</td>
                              <td className="p-2 border-l border-slate-200 font-bold text-indigo-950">{selectedSaleDetail.mediaTitle}</td>
                              <td className="p-2 border-l border-slate-200 text-gray-500">{selectedSaleDetail.details}</td>
                              <td className="p-2 text-left font-mono border-l border-slate-200 font-bold">{formatCurrency(selectedSaleDetail.salePrice)}</td>
                              <td className="p-2 text-center no-print bg-gray-50/50">
                                <div className="flex flex-col items-center gap-1.5">
                                  <div className="flex items-center gap-1 justify-center">
                                    {hasPath ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            const paths = getMediaPaths(legacyItem);
                                            if (paths.length > 0) handleOpenFolder(paths[0]);
                                          }}
                                          className="px-1.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-black flex items-center gap-0.5 cursor-pointer transition-colors"
                                          title="باز کردن پوشه"
                                        >
                                          <FolderOpen className="w-3 h-3" />
                                          <span>پوشه</span>
                                        </button>
                                        
                                        <button
                                          onClick={() => copySaleItemToUsb(legacyItem)}
                                          disabled={progressInfo && !progressInfo.completed && !progressInfo.error}
                                          className={`px-1.5 py-1 rounded text-[9px] font-black flex items-center gap-0.5 cursor-pointer transition-all ${progressInfo?.completed ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-80'}`}
                                          title="کپی مستقیم به فلش"
                                        >
                                          {progressInfo?.completed ? (
                                            <>
                                              <Check className="w-3 h-3 text-emerald-600" />
                                              <span>کپی شد</span>
                                            </>
                                          ) : progressInfo && !progressInfo.completed && !progressInfo.error ? (
                                            <>
                                              <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                                              <span>% {progressInfo.progress}</span>
                                            </>
                                          ) : (
                                            <span>کپی به فلش</span>
                                          )}
                                        </button>

                                        {progressInfo && !progressInfo.completed && !progressInfo.error && (
                                          <button
                                            type="button"
                                            onClick={() => handleCancelCopy(legacyItem.id)}
                                            className="px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[9px] font-black flex items-center justify-center cursor-pointer transition-colors animate-pulse ml-1"
                                            title="لغو کپی"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-gray-400 text-[8.5px] font-bold">بدون فایل</span>
                                    )}
                                  </div>
                                  
                                  {progressInfo && (
                                    <div className="w-full max-w-[120px] text-center">
                                      <div className="w-full bg-gray-200 dark:bg-slate-700 h-1 rounded overflow-hidden">
                                        <div 
                                          className={`h-full ${progressInfo.error ? 'bg-red-500' : progressInfo.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                          style={{ width: `${progressInfo.progress}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })()
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculations tally */}
                <div className="grid grid-cols-2 pt-2 border-t-2 border-slate-300 text-xs gap-y-1.5" dir="rtl">
                  <div className="text-gray-500 font-bold">بهای ناخالص فاکتور:</div>
                  <div className="text-left font-mono text-gray-900">{formatCurrency(selectedSaleDetail.salePrice)}</div>

                  {selectedSaleDetail.discount > 0 && (
                    <>
                      <div className="text-red-500 font-bold">تخفیف نقدی مشتری:</div>
                      <div className="text-left font-mono text-red-500">-{formatCurrency(selectedSaleDetail.discount)}</div>
                    </>
                  )}

                  <div className="text-gray-900 font-black text-sm border-t border-slate-200 pt-2 col-span-2 flex justify-between">
                    <span>مبلغ قابل پرداخت نهایی:</span>
                    <span className="font-mono text-lg text-emerald-600 font-extrabold">{formatCurrency(selectedSaleDetail.salePrice - selectedSaleDetail.discount)}</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-dashed border-slate-300 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>تسویه شده / پرداخت نقدی</span>
                  </span>
                  <span className="italic font-bold">مهر و امضای: {shopSettings?.shopName || 'صندوق‌دار'}</span>
                </div>

              </div>

            </div>

            {/* Modal Action Panel Bottom (Prominent close option) */}
            <div className="px-5 py-3.5 bg-gray-50 dark:bg-slate-850 border-t border-gray-150 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0 no-print">
              <button
                type="button"
                onClick={handleCopyAllToUsb}
                disabled={isCopyingAll}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCopyingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال کپی گروهی...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی گروهی همه اقلام فاکتور به فلش</span>
                  </>
                )}
              </button>

              <button 
                onClick={() => setSelectedSaleDetail(null)}
                className="px-5 py-1.5 bg-gray-200 hover:bg-gray-250 dark:bg-slate-800 dark:hover:bg-slate-705 text-gray-650 dark:text-gray-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                بستن فاکتور (برگشت)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
