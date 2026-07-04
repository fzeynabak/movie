/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../db/databaseService';
import { CartItem, Sale, CustomerSession } from '../types';
import { toPersianNums, formatCurrency } from '../pages/Dashboard';
import { showToast, showAlert, showConfirm } from '../utils/toast';
import { generateCinemaInvoiceImage } from '../utils/CinemaInvoiceGenerator';
import { 
  Users, 
  ShoppingCart, 
  Plus, 
  Search, 
  UserPlus, 
  UserCheck, 
  FolderOpen, 
  Trash2, 
  Play, 
  X, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  RefreshCw,
  FolderClosed,
  MoreHorizontal,
  HardDrive,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

interface CartBarProps {
  currentCustomer: string;
  onChangeCustomer: (name: string) => void;
  cart: CartItem[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onUpdateCartItemPrice: (id: string, price: number) => void;
  onInvoiceSettled: () => void;
  
  // Multi-session props
  sessions: CustomerSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onAddSession: (customerName?: string) => void;
  onCloseSession: (id: string) => void;
  onUpdateDrivePath: (drivePath: string) => void;
}

export default function CartBar({
  currentCustomer,
  onChangeCustomer,
  cart,
  onRemoveItem,
  onClearCart,
  onUpdateCartItemPrice,
  onInvoiceSettled,
  
  sessions,
  activeSessionId,
  onSelectSession,
  onAddSession,
  onCloseSession,
  onUpdateDrivePath
}: CartBarProps) {
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [customerInput, setCustomerInput] = useState('');
  const [suggestedCustomers, setSuggestedCustomers] = useState<string[]>([]);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [saveInvoiceLocal, setSaveInvoiceLocal] = useState(true);

  // Copy Progress State
  const [copyProgress, setCopyProgress] = useState<Record<string, {
    progress: number;
    bytesCopied: number;
    totalBytes: number;
    speedMbs: number;
    completed: boolean;
    error?: string;
  }>>({});

  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const currentCopyIndicesRef = useRef<Record<string, { current: number; total: number }>>({});
  const cancelledCopiesRef = useRef<Record<string, boolean>>({});

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
      .replace(/[^\w\s\u0600-\u06FF-]/g, '') // Keep English, Persian characters, digits, spaces, and hyphens
      .trim()
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
  };

  const cleanFolderName = (name: string): string => {
    if (!name) return 'Folder';
    return name.replace(/[\\/:*?"<>|]/g, '').trim();
  };

  const getCopyDestinationRelativePath = (item: CartItem, sourcePath: string): string => {
    const ext = sourcePath.substring(sourcePath.lastIndexOf('.')) || '.mkv';
    
    if (item.mediaType === 'series') {
      const series = dbService.getSeries().find(s => s.id === item.mediaId);
      const rawFolderName = series ? (series.titleEn || series.titleFa) : item.mediaTitle;
      const folderName = cleanFolderName(rawFolderName);
      
      let seasonNum = 1;
      let episodeNum = 1;
      let found = false;
      
      if (series && series.seasons) {
        for (let sIdx = 0; sIdx < series.seasons.length; sIdx++) {
          const season = series.seasons[sIdx];
          let currentSeasonNum = sIdx + 1;
          const sName = season.name;
          const sMatch = sName.match(/\d+/);
          if (sMatch) {
            currentSeasonNum = parseInt(sMatch[0]);
          } else {
            if (sName.includes('اول')) currentSeasonNum = 1;
            else if (sName.includes('دوم')) currentSeasonNum = 2;
            else if (sName.includes('سوم')) currentSeasonNum = 3;
            else if (sName.includes('چهارم')) currentSeasonNum = 4;
            else if (sName.includes('پنجم')) currentSeasonNum = 5;
            else if (sName.includes('ششم')) currentSeasonNum = 6;
            else if (sName.includes('هفتم')) currentSeasonNum = 7;
            else if (sName.includes('هشتم')) currentSeasonNum = 8;
            else if (sName.includes('نهم')) currentSeasonNum = 9;
            else if (sName.includes('دهم')) currentSeasonNum = 10;
          }
          
          for (const ep of season.episodes) {
            if (ep.videoPath === sourcePath) {
              seasonNum = currentSeasonNum;
              episodeNum = ep.episodeNumber;
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      
      if (!found) {
        const filename = sourcePath.substring(sourcePath.lastIndexOf('/') + 1).substring(sourcePath.lastIndexOf('\\') + 1);
        const sMatch = filename.match(/[Ss](?:eason)?\s*[-_.]?\s*(\d+)/i);
        const epMatch = filename.match(/[Ee](?:pisode)?\s*[-_.]?\s*(\d+)/i) || filename.match(/\b(\d+)\b/);
        if (sMatch) seasonNum = parseInt(sMatch[1]);
        if (epMatch) episodeNum = parseInt(epMatch[1]);
      }
      
      const sStr = String(seasonNum).padStart(2, '0');
      const eStr = String(episodeNum).padStart(2, '0');
      
      const cleanSeriesTitle = cleanTitleForFilename(series?.titleEn || series?.titleFa || item.mediaTitle);
      const filename = `${cleanSeriesTitle}-s${sStr}e${eStr}${ext}`;
      
      return `${folderName}/${filename}`;
    } else {
      // Movie
      const movie = dbService.getMovies().find(m => m.id === item.mediaId);
      const rawFolderName = movie ? (movie.titleEn || movie.titleFa) : item.mediaTitle;
      const folderName = cleanFolderName(rawFolderName);
      
      const cleanMovieTitle = cleanTitleForFilename(movie?.titleEn || movie?.titleFa || item.mediaTitle);
      const filename = `${cleanMovieTitle}${ext}`;
      
      return `${folderName}/${filename}`;
    }
  };

  const copyCartItemToUsb = async (item: CartItem): Promise<boolean> => {
    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const destDir = activeSession.selectedDrivePath;
    if (!destDir) {
      showAlert('لطفاً ابتدا از بخش انتخاب مشتری، مسیر فلش دیسک (USB) مقصد را مشخص کنید.', 'warning', 'مسیر فلش انتخاب نشده');
      return false;
    }
    
    const pathsToCopy = item.videoPaths && item.videoPaths.length > 0 ? item.videoPaths : (item.filePath ? [item.filePath] : []);
    if (pathsToCopy.length === 0) {
      showAlert(`مسیری برای فایل‌های ${item.mediaTitle} ثبت نشده است. امکان کپی وجود ندارد.`, 'error');
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
          continue; // Skip copying since it already exists
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
    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const destDir = activeSession.selectedDrivePath;
    if (!destDir) {
      showAlert('لطفاً ابتدا از بخش انتخاب مشتری، مسیر فلش دیسک (USB) مقصد را مشخص کنید.', 'warning', 'مسیر فلش انتخاب نشده');
      return;
    }
    
    if (cart.length === 0) {
      showAlert('سبد خرید شما خالی است.', 'warning');
      return;
    }
    
    setIsCopyingAll(true);
    showToast('شروع کپی صف‌به‌صف تمامی اقلام به فلش دیسک مشتری...', 'info');
    
    for (const item of cart) {
      if (copyProgress[item.id]?.completed) {
        continue;
      }
      
      const success = await copyCartItemToUsb(item);
      if (!success) {
        const resume = await showConfirm(`خطایی در کپی "${item.mediaTitle}" رخ داد. آیا مایلید کپی سایر اقلام باقی‌مانده را ادامه دهید؟`, 'خطا در کپی');
        if (!resume) {
          break;
        }
      }
    }
    
    setIsCopyingAll(false);
    showToast('عملیات کپی کلی صف تمام شد.', 'success');
  };

  const handleSelectDrive = async () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      try {
        const dir = await window.electronAPI.selectDirectory();
        if (dir) {
          onUpdateDrivePath(dir);
          showToast(`مسیر فلش دیسک با موفقیت روی "${dir}" تنظیم شد.`, 'success');
        }
      } catch (err) {
        showToast('خطا در انتخاب مسیر فلش: ' + (err as Error).message, 'error');
      }
    } else {
      // Browser simulation
      const mockPaths = ['F:\\Movies', 'G:\\مشتری', '/Volumes/USB_DRIVE', '/media/usb0'];
      const randomPath = mockPaths[Math.floor(Math.random() * mockPaths.length)];
      onUpdateDrivePath(randomPath);
      showToast(`[شبیه‌ساز] مسیر فلش روی "${randomPath}" شبیه‌سازی شد.`, 'success');
    }
  };

  // Auto-suggest list based on historical sales
  const allCustomers = React.useMemo(() => {
    try {
      const sales = dbService.getSales();
      const names = sales.map(s => s.customerName).filter(Boolean);
      return Array.from(new Set(names));
    } catch {
      return [];
    }
  }, [showCustomerModal, showInvoiceModal]);

  useEffect(() => {
    if (customerInput.trim() === '') {
      setSuggestedCustomers(allCustomers.slice(0, 5));
    } else {
      const filtered = allCustomers.filter(c => 
        c.toLowerCase().includes(customerInput.toLowerCase())
      );
      setSuggestedCustomers(filtered);
    }
  }, [customerInput, allCustomers]);

  const handleSelectSuggested = (name: string) => {
    setCustomerInput(name);
    onChangeCustomer(name);
    setShowCustomerModal(false);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerInput.trim() === '') {
      alert('لطفاً نام مشتری را وارد کنید.');
      return;
    }
    onChangeCustomer(customerInput.trim());
    setShowCustomerModal(false);
  };

  const handleClearCustomer = async () => {
    const isConfirmed = await showConfirm('آیا مایلید مشتری فعلی و سبد خرید را بازنشانی کنید؟', 'بازنشانی سبد خرید');
    if (isConfirmed) {
      onChangeCustomer('');
      onClearCart();
      setCustomerInput('');
    }
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.salePrice, 0);
  const cartTotal = Math.max(cartSubtotal - discountInput, 0);

  const handlePlayFile = async (filePath: string) => {
    if (!filePath) {
      showAlert('مسیری برای این فایل ثبت نشده است.', 'warning');
      return;
    }
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.playVideoFile(filePath);
        if (res && !res.success) {
          showAlert('خطا در پخش فایل: ' + res.error, 'error');
        }
      } catch (err) {
        console.error('Failed to play natively:', err);
      }
    } else {
      showAlert(`پورت سیستم: پخش فیلم به نرم‌افزار پیش‌فرض سیستم فرستاده می‌شود.\n\nمسیر فایل:\n${filePath}`, 'info', 'شبیه‌ساز پخش فیلم');
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    if (!filePath) {
      showAlert('مسیری برای این فایل ثبت نشده است.', 'warning');
      return;
    }
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.openFileInExplorer(filePath);
        if (res && !res.success) {
          showAlert('خطا در باز کردن پوشه: ' + res.error, 'error');
        }
      } catch (err) {
        console.error('Failed to open folder natively:', err);
      }
    } else {
      showAlert(`شبیه‌ساز مرورگر: پوشه حاوی این فایل در سیستم باز می‌شود.\n\nمسیر فایل:\n${filePath}`, 'info', 'نمایش در پوشه');
    }
  };

  // Finalize Invoice and register sales
  const handleCheckoutInvoice = async () => {
    if (!currentCustomer) {
      showAlert('لطفاً ابتدا نام مشتری فاکتور را وارد کنید.', 'warning');
      setShowCustomerModal(true);
      return;
    }
    if (cart.length === 0) {
      showAlert('سبد خرید شما خالی است! فیلم یا سریالی را اضافه کنید.', 'warning');
      return;
    }

    try {
      const totalPurchasePrice = cart.reduce((sum, item) => sum + item.purchasePrice, 0);
      const totalSaleBeforeDiscount = cartSubtotal;

      // Generate and save cinema invoice image if USB is selected
      const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
      const destDir = activeSession.selectedDrivePath;
      let invoiceSavedMsg = '';
      
      const settings = dbService.getSettings();
      const isInvoiceSavingEnabled = settings.saveInvoiceToUsbEnabled !== false;
      
      if (destDir && isInvoiceSavingEnabled && saveInvoiceLocal) {
        const shopName = settings.shopName || 'کلوپ فیلم و سریال پارس';
        const shopPhone = settings.shopPhone || '۰۹۱۲۳۴۵۶۷۸۹';
        const shopAddress = settings.shopAddress || 'تهران، خیابان رسانه، پلاک ۱لوپ فیلم';
        
        const invoiceDataUrl = generateCinemaInvoiceImage(
          currentCustomer,
          cart,
          discountInput,
          cartTotal,
          shopName,
          shopPhone,
          shopAddress
        );
        
        if (invoiceDataUrl) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const cleanCustName = currentCustomer.replace(/[\\/:*?"<>|]/g, '').trim();
          const filename = `invoice-${cleanCustName}-${timestamp}.png`;
          
          if (window.electronAPI && window.electronAPI.saveInvoiceImage) {
            const saveRes = await window.electronAPI.saveInvoiceImage(destDir, invoiceDataUrl, filename);
            if (saveRes && saveRes.success) {
              invoiceSavedMsg = `\n\n📸 تصویر فاکتور با تم سینمایی با نام "${filename}" با موفقیت در پوشه فلش ذخیره شد!`;
            } else {
              invoiceSavedMsg = `\n\n⚠️ تصویر فاکتور به دلیل خطا در پوشه فلش ذخیره نشد: ${saveRes?.error || 'خطای ناشناخته'}`;
            }
          } else {
            // Browser download fallback
            const link = document.createElement('a');
            link.href = invoiceDataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            invoiceSavedMsg = `\n\n📸 [شبیه‌ساز] تصویر فاکتور با تم سینمایی دانلود شد.`;
          }
        }
      }

      // Create a single unified parent transaction for accounting
      dbService.addSale({
        customerName: currentCustomer,
        mediaId: cart[0]?.mediaId || 'multi_checkout',
        mediaTitle: cart[0]?.mediaTitle + (cart.length > 1 ? ` و ${cart.length - 1} رسانه دیگر` : ''),
        mediaType: cart[0]?.mediaType || 'movie',
        salesType: cart[0]?.salesType || 'movie',
        details: `فاکتور تجمیعی (${cart.length} قلم کالا)`,
        purchasePrice: totalPurchasePrice,
        salePrice: totalSaleBeforeDiscount,
        discount: discountInput,
        items: cart
      } as any);

      // Clear Cart & values
      onClearCart();
      setDiscountInput(0);
      setShowInvoiceModal(false);
      onInvoiceSettled();

      showAlert(`فاکتور فروش تجمیعی برای آقای/خانم "${currentCustomer}" شامل ${cart.length} اثر با موفقیت صادر و ثبت شد.${invoiceSavedMsg}`, 'success', 'عملیات موفقیت‌آمیز');
    } catch (err) {
      showAlert('خطا در ثبت فاکتور مالی: ' + (err as Error).message, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Premium Multi-Customer Tabs & Storage Controller */}
      <div className="w-full bg-slate-900/40 dark:bg-slate-950/50 p-2.5 rounded-xl border border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 select-none" id="customer-tabs-controller">
        {/* Right side: Tabs */}
        <div className="flex items-center flex-wrap gap-1.5">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const itemsCount = session.cart.length;
            return (
              <div 
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group px-3 py-2 h-9 rounded-lg flex items-center gap-2 cursor-pointer transition-all border ${isActive ? 'bg-indigo-600 text-white border-indigo-500/50 shadow-md shadow-indigo-600/10 font-black text-xs' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5 text-[11px] font-bold'}`}
              >
                <Users className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />
                <span>{session.customerName || 'مشتری بدون نام'}</span>
                {itemsCount > 0 && (
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${isActive ? 'bg-white text-indigo-950' : 'bg-indigo-505/20 text-indigo-400'}`}>
                    {toPersianNums(itemsCount)}
                  </span>
                )}
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseSession(session.id);
                    }}
                    className="p-0.5 hover:bg-black/20 rounded-md text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="بستن تب مشتری"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button 
            onClick={() => onAddSession()}
            className="w-9 h-9 bg-white/5 hover:bg-indigo-600/25 border border-white/5 hover:border-indigo-500/20 text-gray-300 hover:text-white rounded-lg flex items-center justify-center transition-all cursor-pointer"
            title="ایجاد تب مشتری جدید"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Left side: USB drive selector */}
        {(() => {
          const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
          const hasDrive = !!activeSession.selectedDrivePath;
          return (
            <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 text-[11px] font-bold self-start md:self-auto">
              <HardDrive className={`w-4 h-4 ${hasDrive ? 'text-emerald-400 animate-pulse' : 'text-amber-500'}`} />
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-gray-450">مسیر فلش دیسک (USB) مشتری</span>
                <span className={`font-mono ${hasDrive ? 'text-emerald-400' : 'text-amber-500'}`}>
                  {hasDrive ? activeSession.selectedDrivePath : 'انتخاب نشده ⚠️'}
                </span>
              </div>
              <button
                onClick={handleSelectDrive}
                className="mr-3 h-7 px-2.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
              >
                <FolderOpen className="w-3 h-3" />
                <span>{hasDrive ? 'تغییر مسیر' : 'انتخاب فلش دیسک'}</span>
              </button>
            </div>
          );
        })()}
      </div>

      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4.5 shadow-xl border border-indigo-900/60 flex flex-col md:flex-row items-center justify-between gap-4 select-none relative overflow-hidden" id="customer-cart-bar">
      
      {/* Absolute ambient lights */}
      <span className="absolute -left-12 -top-12 w-32 h-32 bg-indigo-505/10 rounded-full blur-2xl pointer-events-none"></span>
      <span className="absolute -right-12 -bottom-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></span>

      {/* Right Section: Customer Details */}
      <div className="flex items-center gap-3.5 z-10 w-full md:w-auto">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${currentCustomer ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30' : 'bg-white/10 text-gray-300'}`}>
          {currentCustomer ? <UserCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-indigo-300 tracking-wider block uppercase">سیستم ثبت فاکتور چندگانه</span>
            {currentCustomer && (
              <button 
                onClick={handleClearCustomer}
                className="text-[9px] px-1.5 py-0.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded hover:text-red-300 cursor-pointer transition-colors"
                title="پاک کردن مشتری و سبد خرید"
              >
                انصراف
              </button>
            )}
          </div>
          {currentCustomer ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-black text-white">مشتری فعال: <span className="text-emerald-400">{currentCustomer}</span></span>
              <button 
                onClick={() => { setCustomerInput(currentCustomer); setShowCustomerModal(true); }}
                className="text-[10px] text-gray-300 hover:text-white underline cursor-pointer"
              >
                (ویرایش)
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setCustomerInput(''); setShowCustomerModal(true); }}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-250 hover:text-white mt-1 cursor-pointer transition-colors"
              id="btn-select-customer-trigger"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>انتخاب یا ثبت نام مشتری جدید...</span>
            </button>
          )}
        </div>
      </div>

      {/* Left Section: Cart Summary & Launch Drawer */}
      <div className="flex items-center justify-between md:justify-end gap-3.5 z-10 w-full md:w-auto border-t border-white/5 md:border-none pt-3 md:pt-0">
        <div className="text-right flex flex-col items-start md:items-end">
          <span className="text-[10px] text-indigo-300 font-extrabold">کالاهای موقت در سبد</span>
          <span className="text-xs font-black mt-0.5 text-gray-100">
            {toPersianNums(cart.length)} عدد رسانه <span className="text-gray-400">|</span> <span className="text-indigo-400">{formatCurrency(cartSubtotal)}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button 
              onClick={onClearCart}
              className="p-2 bg-white/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl transition-all cursor-pointer border border-white/5 hover:border-red-500/20"
              title="خالی کردن سبد خرید"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (cart.length === 0) {
                showAlert('سبد خرید شما در حال حاضر خالی است. ابتدا فیلم یا سریالی اضافه نمایید.', 'warning');
                return;
              }
              setShowInvoiceModal(true);
            }}
            className={`h-11 px-4.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition-all cursor-pointer ${cart.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/25 active:scale-95' : 'bg-white/5 text-gray-400 border border-white/5'}`}
            id="btn-view-invoice-panel"
          >
            <ShoppingCart className={`w-4 h-4 ${cart.length > 0 ? 'animate-bounce' : ''}`} />
            <span>مشاهده و تسویه حساب فاکتور</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.5 bg-white text-indigo-950 font-black text-[9px] rounded-full">
                {toPersianNums(cart.length)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======= REGISTRATION/SELECT CUSTOMER DIALOG ======= */}
      {showCustomerModal && (
        <div 
          className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4" 
          id="modal-select-customer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCustomerModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 w-full max-w-md rounded-2xl shadow-2xl border border-gray-150 dark:border-gray-805 overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
              <h3 className="text-xs font-extrabold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>تعیین یا انتخاب مشتری فعال</span>
              </h3>
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">نام یا اطلاعات تماس مشتری</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerInput}
                    onChange={(e) => setCustomerInput(e.target.value)}
                    className="w-full h-10 px-3 pl-9 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-extrabold border border-gray-250 dark:border-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-indigo-600"
                    placeholder="مثال: عرفان عباسی یا 0912..."
                    id="customer-input-field"
                    autoFocus
                  />
                  <Users className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Suggestions from Previous Sales */}
              {suggestedCustomers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-gray-450 block">مشتریان پر تکرار قبلی:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedCustomers.map((c, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleSelectSuggested(c)}
                        className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-950 text-indigo-650 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-slate-700 transition-all cursor-pointer"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-indigo-600/20"
                >
                  تایید نام مشتری
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======= DETAILED FULL INVOICE SHOPPING CART OVERLAY ======= */}
      {showInvoiceModal && (
        <div 
          className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4" 
          id="modal-invoice-checkout"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInvoiceModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-[#151d30] text-gray-800 dark:text-gray-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-150 dark:border-gray-805 overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-900 dark:text-white">پیش‌نویس فاکتور فروش چندگانه</h3>
                  <p className="text-[9px] text-gray-400 font-mono mt-0.5">ثبت چند رسانه مکرر بر روی یک فاکتور مستقل</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 hover:bg-gray-250 dark:hover:bg-slate-800 rounded-lg text-gray-400"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Bill Details Banner */}
            <div className="px-6 py-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100/50 dark:border-indigo-950/40 text-xs font-semibold flex flex-wrap gap-x-8 gap-y-2 shrink-0 justify-between items-center">
              <div className="flex gap-x-6 items-center">
                <span>مشتری فاکتور: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{currentCustomer}</strong></span>
                <span className="text-gray-300 dark:text-slate-800">|</span>
                <span>تعداد اقلام: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{toPersianNums(cart.length)} رسانه</strong></span>
                <span className="text-gray-300 dark:text-slate-800">|</span>
                <span>تاریخ ثبت: <strong className="font-mono text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('fa-IR')}</strong></span>
              </div>
              
              <button
                type="button"
                onClick={() => { setShowInvoiceModal(false); setShowCustomerModal(true); }}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline text-[10px]"
              >
                تغییر مشتری یا شماره همراه...
              </button>
            </div>

            {/* Table Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 dark:border-gray-800 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="pb-3 text-right">عنوان رسانه</th>
                    <th className="pb-3 text-right">نوع محصول</th>
                    <th className="pb-3 text-right">مشخصات ترخیصی</th>
                    <th className="pb-3 text-right">قیمت (تومان)</th>
                    <th className="pb-3 text-left">عملیات سریع دیسک و کپی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {cart.map((item, index) => (
                    <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/10">
                      <td className="py-4.5 font-bold text-gray-900 dark:text-white">
                        {item.mediaTitle}
                      </td>
                      <td className="py-4.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.mediaType === 'movie' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'}`}>
                          {item.mediaType === 'movie' ? 'فیلم سینمایی' : 'سریال / فصل'}
                        </span>
                      </td>
                      <td className="py-4.5 text-gray-500 dark:text-gray-300 text-[11px]">
                        {item.details}
                      </td>
                      <td className="py-4.5">
                        <input
                          type="number"
                          value={item.salePrice}
                          onChange={(e) => onUpdateCartItemPrice(item.id, Number(e.target.value) || 0)}
                          className="w-24 h-8 px-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-md font-bold font-mono text-center text-xs text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-4.5 text-left">
                        {(() => {
                          const progressInfo = copyProgress[item.id];
                          return (
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                                {/* File Video Direct Play */}
                                {item.filePath && (
                                  <button
                                    onClick={() => handlePlayFile(item.filePath)}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                    title="پخش مستقیم برای راستی‌آزمایی"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}
                                
                                {/* Open Folder in OS */}
                                {item.filePath && (
                                  <button
                                    onClick={() => handleOpenFolder(item.filePath)}
                                    className="p-1.5 bg-indigo-50 hover:bg-indigo-150 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[9.5px] font-bold"
                                    title="باز کردن مسیر پوشه در اکسپلورر ویندوز جهت کپی سریع"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    <span>پوشه فایل</span>
                                  </button>
                                )}

                                {/* Direct USB copy button */}
                                {(item.filePath || (item.videoPaths && item.videoPaths.length > 0)) && (
                                  <button
                                    onClick={() => copyCartItemToUsb(item)}
                                    disabled={progressInfo && !progressInfo.completed && !progressInfo.error}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[9.5px] font-extrabold ${progressInfo?.completed ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow shadow-blue-600/30 disabled:opacity-80'}`}
                                    title="انتقال خودکار و کپی سریع به فلش مموری مشتری"
                                  >
                                    {progressInfo?.completed ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>کپی شد</span>
                                      </>
                                    ) : progressInfo && !progressInfo.completed && !progressInfo.error ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                                        <span>در حال کپی... (%{toPersianNums(progressInfo.progress)})</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>کپی به فلش</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Cancel Copy Button */}
                                {progressInfo && !progressInfo.completed && !progressInfo.error && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelCopy(item.id)}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer flex items-center justify-center animate-pulse"
                                    title="لغو کپی فایل"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => onRemoveItem(item.id)}
                                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded-lg transition-colors cursor-pointer mr-3"
                                  title="حذف از سبد خرید"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Extra copy statistics / progress bar */}
                              {progressInfo && (
                                <div className="w-full max-w-[240px] mt-1 space-y-1 text-right">
                                  <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold">
                                    {progressInfo.error ? (
                                      <span className="text-red-400 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />
                                        <span>{progressInfo.error}</span>
                                      </span>
                                    ) : progressInfo.completed ? (
                                      <span className="text-emerald-500 font-extrabold">کپی با موفقیت تکمیل شد</span>
                                    ) : (
                                      <>
                                        <span className="font-mono text-[9px] text-indigo-400">{toPersianNums(progressInfo.speedMbs.toFixed(1))} MB/s</span>
                                        <span>{toPersianNums(Math.round(progressInfo.bytesCopied / (1024 * 1024)))} / {toPersianNums(Math.round(progressInfo.totalBytes / (1024 * 1024)))} MB</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${progressInfo.error ? 'bg-red-500' : progressInfo.completed ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}
                                      style={{ width: `${progressInfo.progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {dbService.getSettings().saveInvoiceToUsbEnabled !== false && (
                <div className="mt-4 p-4 bg-emerald-500/5 dark:bg-slate-800/40 border border-emerald-500/20 rounded-xl flex items-center justify-between" id="checkout-save-invoice-switch">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">ذخیره تصویر فاکتور در فلش مشتری</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">تصویر فاکتور به صورت خودکار در ریشه فلش دیسک کپی می‌شود.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={saveInvoiceLocal}
                      onChange={(e) => setSaveInvoiceLocal(e.target.checked)}
                      className="sr-only peer"
                      id="checkout-invoice-toggle-checkbox"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              )}
              
              {/* Note for copier store */}
              <div className="mt-8 p-3.5 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-950/20 text-xs text-amber-800 dark:text-amber-400/90 rounded-xl flex items-start gap-2">
                <FolderClosed className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed leading-loose">
                  پس از فشرده کردن دکمه <strong className="font-extrabold text-amber-950 dark:text-amber-300">باز کردن پوشه کپی</strong>، پوشه فیلم یا فایل سریال در فایل اکسپلورر باز شده و فایل های مربوطه هایلایت میشوند. میتوانید به آسانی فایل را مستقیماً بر روی هارد دیسک یا فلش مشتری کپی کنید و در فاکتور نیز قیمت را سفارشی‌سازی کنید.
                </div>
              </div>
            </div>

            {/* Invoice Total Panel (Footer) */}
            <div className="p-6 border-t border-gray-150 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 shrink-0 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-6 text-xs">
                
                {/* Cart Subtotal */}
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 font-bold block">مجموع ناخالص</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(cartSubtotal)}</span>
                </div>

                <span className="text-gray-350 dark:text-slate-800 text-lg hidden md:inline">/</span>

                {/* Discount */}
                <div className="text-right space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold block">تخفیف کلی فاکتور (تومان)</span>
                  <input
                    type="number"
                    value={discountInput || ''}
                    onChange={(e) => setDiscountInput(Number(e.target.value) || 0)}
                    className="w-36 h-9 px-2 bg-white dark:bg-slate-805 border border-gray-250 dark:border-gray-700 rounded-lg font-bold font-mono text-xs text-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: ۵۰۰۰"
                  />
                </div>

                <span className="text-gray-350 dark:text-slate-800 text-lg hidden md:inline">=</span>

                {/* Cart Total */}
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 font-bold block">مبلغ قابل پرداخت فاکتور</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 md:flex-none px-5 h-11 bg-gray-200 hover:bg-gray-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ویرایش سبد خرید
                </button>
                <button
                  type="button"
                  onClick={handleCopyAllToUsb}
                  disabled={cart.length === 0 || isCopyingAll}
                  className="flex-1 md:flex-none px-5 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-600/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCopyingAll ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      <span>در حال کپی گروهی...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4.5 h-4.5" />
                      <span>کپی صف‌به‌صف همه به فلش</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCheckoutInvoice}
                  disabled={cart.length === 0}
                  className="flex-1 md:flex-none px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  id="btn-finalize-checklist"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-450" />
                  <span>ثبت نهایی فاکتور و ذخیره در آرشیو</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  </div>
  );
}
