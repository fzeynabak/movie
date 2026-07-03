/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from './db/databaseService';
import { InternalVideoPlayer } from './components/InternalVideoPlayer';
import { AppSettings, CartItem, CustomerSession } from './types';
import { showToast } from './utils/toast';
import Dashboard from './pages/Dashboard';
import Movies from './pages/Movies';
import SeriesPage from './pages/Series';
import Downloads from './pages/Downloads';
import SalesPage from './pages/Sales';
import SettingsPage from './pages/Settings';
import ContactUs from './pages/ContactUs';
import AuthScreen from './components/AuthScreen';
import DBLogger from './components/DBLogger';
import CartBar from './components/CartBar';
import DesktopWidget from './components/DesktopWidget';
import { sendTelemetryToWordPress } from './utils/telemetry';
import { 
  LayoutDashboard, 
  Film, 
  Tv, 
  CreditCard, 
  Settings as SettingsIcon, 
  Monitor, 
  Minimize2, 
  Maximize, 
  X, 
  Database,
  HelpCircle,
  RefreshCw,
  FolderOpen,
  Info,
  Sun,
  Moon,
  Minus,
  Square,
  Lock,
  LogOut,
  Download
} from 'lucide-react';

export default function App() {
  const [hash, setHash] = useState(() => typeof window !== 'undefined' ? window.location.hash : '');

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isWidgetMode = hash === '#widget';

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem('parstech_user_logged_in') === 'true');
  const [sqliteActive, setSqliteActive] = useState<boolean>(() => dbService.getSqliteConnected());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'movies' | 'series' | 'sales' | 'settings' | 'contact' | 'dbtest'>('dashboard');
  const [appSettings, setAppSettings] = useState<AppSettings>(dbService.getSettings());
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showIpDropdown, setShowIpDropdown] = useState(false);
  const [dbPathDisplay, setDbPathDisplay] = useState<string>('دیتابیس: حافظه محلی مرورگر');
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ filePath: string; title: string; originPeerIp?: string; subtitlesList?: string[] } | null>(null);

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.maximizeWindow) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.closeWindow) {
      window.electronAPI.closeWindow();
    } else {
      if (window.confirm('آیا مایلید صفحه برنامه بسته شود؟')) {
        window.close();
      }
    }
  };

  const handleFullQuit = () => {
    if (typeof window !== 'undefined' && window.electronAPI && (window.electronAPI as any).quitApp) {
      (window.electronAPI as any).quitApp();
    } else {
      if (window.confirm('آیا مایل به خروج کامل از مدیریت رسانه هستید؟')) {
        window.close();
      }
    }
  };

  const refreshPath = () => {
    dbService.getDbFilePath().then(path => {
      setDbPathDisplay('مسیر دیتابیس لوکال: ' + path);
    });
  };

  useEffect(() => {
    refreshPath();
    const handleSync = () => {
      const freshSettings = dbService.getSettings();
      setAppSettings(freshSettings);
      setSqliteActive(dbService.getSqliteConnected());
      refreshPath();
    };

    if (window.electronAPI && window.electronAPI.getLocalIps) {
      window.electronAPI.getLocalIps().then(ips => {
        setLocalIps(ips || []);
      }).catch(err => console.error(err));
    }

    const handlePlayVideoInternal = (e: Event) => {
      const customEvent = e as CustomEvent<{ filePath: string; title: string; originPeerIp?: string; subtitlesList?: string[] }>;
      if (customEvent.detail) {
        setActiveVideo(customEvent.detail);
      }
    };

    window.addEventListener('db_synced_from_disk', handleSync);
    window.addEventListener('play_video_internal', handlePlayVideoInternal as EventListener);
    return () => {
      window.removeEventListener('db_synced_from_disk', handleSync);
      window.removeEventListener('play_video_internal', handlePlayVideoInternal as EventListener);
    };
  }, []);

  // Live Telemetry statistics integration with WordPress cofeclick.ir
  useEffect(() => {
    if (isLoggedIn) {
      sendTelemetryToWordPress('heartbeat').catch(console.error);
    }
  }, [isLoggedIn]);

  // Active Customer and Shopping Cart States (Multi-Session Customer Tabs)
  const [sessions, setSessions] = useState<CustomerSession[]>(() => {
    try {
      const saved = localStorage.getItem('mediacenter_customer_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Default session if nothing exists
    return [{
      id: 'default',
      customerName: localStorage.getItem('mediacenter_active_customer') || '',
      cart: (() => {
        try {
          const savedCart = localStorage.getItem('mediacenter_active_cart');
          return savedCart ? JSON.parse(savedCart) : [];
        } catch { return []; }
      })(),
      selectedDrivePath: localStorage.getItem('mediacenter_active_drive_path') || ''
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('mediacenter_active_session_id') || 'default';
  });

  // Derived state for the currently active tab/session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || { id: 'default', customerName: '', cart: [], selectedDrivePath: '' };
  const currentCustomer = activeSession.customerName;
  const cart = activeSession.cart;

  const setCurrentCustomer = (name: string) => {
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, customerName: name } : s));
  };

  const setCart = (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        const newCart = typeof updater === 'function' ? updater(s.cart) : updater;
        return { ...s, cart: newCart };
      }
      return s;
    }));
  };

  // Sync state to localStorage on modifications
  useEffect(() => {
    localStorage.setItem('mediacenter_customer_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('mediacenter_active_session_id', activeSessionId);
  }, [activeSessionId]);

  // Tab management helpers
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const handleAddSession = (customerName: string = '') => {
    const newSessionId = 'session_' + Math.random().toString(36).substring(2, 9);
    const newSession: CustomerSession = {
      id: newSessionId,
      customerName: customerName,
      cart: [],
      selectedDrivePath: ''
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSessionId);
    showToast('تب جدید برای مشتری باز شد.', 'success');
  };

  const handleCloseSession = (id: string) => {
    if (sessions.length <= 1) {
      showToast('حداقل یک تب مشتری باید باز بماند.', 'warning');
      return;
    }
    const index = sessions.findIndex(s => s.id === id);
    const isClosingActive = id === activeSessionId;
    
    // Create a backup list to avoid direct state mutate
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    
    if (isClosingActive) {
      const nextActiveIndex = index > 0 ? index - 1 : 0;
      if (remaining[nextActiveIndex]) {
        setActiveSessionId(remaining[nextActiveIndex].id);
      } else {
        setActiveSessionId(remaining[0].id);
      }
    }
    showToast('تب مشتری بسته شد.', 'info');
  };

  const handleUpdateDrivePath = (drivePath: string) => {
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, selectedDrivePath: drivePath } : s));
    localStorage.setItem('mediacenter_active_drive_path', drivePath);
  };

  // Cart operations helpers
  const handleAddToCart = (item: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...item,
      id: 'cart_' + Math.random().toString(36).substring(2, 9)
    };

    setCart(prev => {
      // 1. If it's a movie, avoid adding duplicate item of the same movie ID
      if (item.mediaType === 'movie') {
        const movieExists = prev.some(i => i.mediaId === item.mediaId && i.mediaType === 'movie');
        if (movieExists) {
          showToast('این فیلم قبلاً در سبد خرید شما وجود دارد.', 'info');
          return prev;
        }
        showToast('فیلم به سبد خرید اضافه شد.', 'success');
        return [...prev, newItem];
      }

      // 2. If it's a series, analyze and consolidate overlaps
      const mediaId = item.mediaId;
      
      // helper to extract season names (e.g. "فصل اول", "فصل دوم", "فصل منتخب") from details string
      const getSeasonName = (text: string): string | null => {
        const match = text.match(/فصل\s+([^\s\)\-\,]+)/);
        return match ? match[0] : null;
      };

      // 1. Adding full package (series_full)
      if (item.salesType === 'series_full') {
        // Remove ANY existing item related to this same series from the cart
        const filtered = prev.filter(i => i.mediaId !== mediaId);
        if (filtered.length < prev.length) {
          showToast('اقلام یا فصل‌های قبلی این سریال برداشته شد و کل سریال به فاکتور منتقل گردید.', 'success');
        } else {
          showToast('کل سریال به سبد خرید اضافه شد.', 'success');
        }
        return [...filtered, newItem];
      }

      // Check if there is already a full package for this series in the cart
      const hasFullSeries = prev.some(i => i.mediaId === mediaId && i.salesType === 'series_full');
      if (hasFullSeries) {
        showToast('این سریال به صورت کامل در سبد خرید موجود است و نیازی به بخش مجزا نیست.', 'info');
        return prev;
      }

      const incomingSeason = getSeasonName(item.details);

      // 2. Adding full season (series_season)
      if (item.salesType === 'series_season') {
        if (incomingSeason) {
          // Check if this season is already added
          const hasThisSeason = prev.some(i => i.mediaId === mediaId && i.salesType === 'series_season' && getSeasonName(i.details) === incomingSeason);
          if (hasThisSeason) {
            showToast(`این فصل (${incomingSeason}) قبلاً به سبد خرید اضافه شده است.`, 'info');
            return prev;
          }

          // Remove any single episodes or multi-episodes belonging to this exact season
          const filtered = prev.filter(i => {
            if (i.mediaId !== mediaId) return true;
            const existingSeason = getSeasonName(i.details);
            if (existingSeason === incomingSeason && (i.salesType === 'series_episode' || i.salesType === 'series_multi_episode')) {
              return false; // remove
            }
            return true;
          });

          if (filtered.length < prev.length) {
            showToast(`تک قسمت‌های مربوط به ${incomingSeason} برداشته شد و کل این فصل جایگزین شد.`, 'success');
          } else {
            showToast(`${incomingSeason} به سبد خرید اضافه شد.`, 'success');
          }
          return [...filtered, newItem];
        }
      }

      // 3. Adding single episode or multi-episodes (series_episode / series_multi_episode)
      if (item.salesType === 'series_episode' || item.salesType === 'series_multi_episode') {
        if (incomingSeason) {
          // If the entire season is already in the cart, do not add the episode
          const hasSeason = prev.some(i => i.mediaId === mediaId && i.salesType === 'series_season' && getSeasonName(i.details) === incomingSeason);
          if (hasSeason) {
            showToast(`کل ${incomingSeason} در سبد خرید وجود دارد و نیازی به تک قسمت نیست.`, 'info');
            return prev;
          }
        }
        showToast('آیتم انتخابی با موفقیت به سبد خرید اضافه شد.', 'success');
        return [...prev, newItem];
      }

      return [...prev, newItem];
    });
  };

  const handleRemoveCartItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleUpdateCartItemPrice = (id: string, price: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, salePrice: price } : item));
  };

  const handleInvoiceSettled = () => {
    setActiveTab('sales'); // Navigate directly to accounting page to view results
  };

  // Apply visual theme class (dark/light) to root HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (appSettings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [appSettings.theme]);

  // Quick theme toggler with database persistence
  const toggleTheme = () => {
    const newTheme = appSettings.theme === 'dark' ? 'light' : 'dark';
    const updatedSettings = {
      ...appSettings,
      theme: newTheme
    };
    dbService.updateSettings(updatedSettings);
    setAppSettings(updatedSettings);
    // Dispatch custom event to notify other mounted components (like settings page)
    window.dispatchEvent(new Event('theme_changed'));
  };

  // Deep linking callback: Go to movies or series catalog on request
  const handleViewMedia = (type: 'movie' | 'series', id: string) => {
    setActiveMediaId(id);
    if (type === 'movie') {
      setActiveTab('movies');
    } else {
      setActiveTab('series');
    }
  };

  if (isWidgetMode) {
    return <DesktopWidget />;
  }

  if (!isLoggedIn) {
    return (
      <AuthScreen 
        onLoginSuccess={(profile) => {
          localStorage.setItem('parstech_user_logged_in', 'true');
          setIsLoggedIn(true);
          // Auto load and apply settings that registered
          const freshSettings = dbService.getSettings();
          setAppSettings(freshSettings);
        }} 
      />
    );
  }

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'داشبورد / پیش‌خوان', 
      icon: LayoutDashboard,
      activeClass: 'bg-slate-700 dark:bg-slate-800 text-white shadow-lg shadow-slate-700/15',
      iconColor: 'text-slate-500 dark:text-slate-450',
      activeIconColor: 'text-white'
    },
    { 
      id: 'movies', 
      label: 'مدیریت فیلم‌ها', 
      icon: Film,
      activeClass: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/20',
      iconColor: 'text-rose-500 dark:text-rose-400',
      activeIconColor: 'text-white',
      badge: 'فیلم'
    },
    { 
      id: 'series', 
      label: 'مدیریت سریال‌ها', 
      icon: Tv,
      activeClass: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/20',
      iconColor: 'text-indigo-500 dark:text-indigo-400',
      activeIconColor: 'text-white',
      badge: 'سریال'
    },
    { 
      id: 'downloads', 
      label: 'مدیریت دانلودها (IDM)', 
      icon: Download,
      activeClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      activeIconColor: 'text-white',
      badge: 'IDM'
    },
    { 
      id: 'sales', 
      label: 'فروش و مدیریت مالی', 
      icon: CreditCard,
      activeClass: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15',
      iconColor: 'text-blue-500 dark:text-blue-400',
      activeIconColor: 'text-white'
    },
    { 
      id: 'settings', 
      label: 'تنظیمات مدیا سنتر', 
      icon: SettingsIcon,
      activeClass: 'bg-gray-800 dark:bg-gray-700 text-white shadow-lg shadow-gray-800/15',
      iconColor: 'text-gray-500 dark:text-gray-405',
      activeIconColor: 'text-white'
    },
    { 
      id: 'contact', 
      label: 'ارتباط با ما و پشتیبانی', 
      icon: HelpCircle,
      activeClass: 'bg-teal-600 text-white shadow-lg shadow-teal-600/15',
      iconColor: 'text-teal-500 dark:text-teal-400',
      activeIconColor: 'text-white'
    },
  ];

  return (
    <div className="h-screen max-h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-800 dark:text-gray-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white overflow-hidden" dir="rtl" id="app-root-shell">
      
      {/* 1. Desktop Menubar (Continuous Frameless window bar with drag & drop support) */}
      <header 
        className="h-14 bg-white/95 dark:bg-[#111827]/95 border-b border-gray-150 dark:border-gray-800/80 backdrop-blur-md flex items-center justify-between px-5 select-none shrink-0 transition-colors duration-300 shadow-sm z-30" 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        id="desktop-titlebar"
      >
        {/* Right section: System logo, Brand name, & Dynamic Simulated menus */}
        <div className="flex items-center gap-3.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="relative group/logo">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 group-hover/logo:scale-105 transition-all duration-300">
              <Tv className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-[#111827] shadow" title="دیتابیس متصل و فعال است"></span>
          </div>

          <div className="flex flex-col">
            <span className="text-[12px] font-black tracking-tight text-gray-900 dark:text-white leading-none">سامانه مدیریت رسانه</span>
            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 font-mono">MEDIA CENTER MANAGER</span>
          </div>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800/80 mr-3 hidden sm:block"></div>

          {/* Top-level Menu Options */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 relative">
            <div className="relative">
              <button 
                onClick={() => setShowFileMenu(!showFileMenu)} 
                className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-200 ${showFileMenu ? 'bg-gray-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'}`}
                id="menu-trigger-file"
              >
                فایل
              </button>
              {showFileMenu && (
                <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-[#1e293b] border border-gray-150 dark:border-gray-800/65 rounded-xl shadow-2xl py-2 w-48 z-50 animate-scaleIn" id="file-dropdown">
                  <div className="px-3 pb-1.5 mb-1.5 border-b border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 font-extrabold">بخش پایگاه‌داده</div>
                  <button 
                    onClick={() => { setShowFileMenu(false); setActiveTab('settings'); }}
                    className="w-full text-right px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-[11px] font-bold block text-indigo-600 dark:text-indigo-400 transition-colors"
                  >
                    پشتیبان‌گیری دیتابیس
                  </button>
                  <button 
                    onClick={() => { 
                      setShowFileMenu(false); 
                      if (typeof window !== 'undefined' && window.electronAPI && (window.electronAPI as any).openDesktopWidget) { 
                        (window.electronAPI as any).openDesktopWidget(); 
                      } else { 
                        alert('گجت دسکتاپ فقط در نسخه ویندوز فعال است.'); 
                      } 
                    }}
                    className="w-full text-right px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-[11px] font-bold block text-indigo-600 dark:text-indigo-400 transition-colors"
                  >
                    🚀 فعال‌سازی گجت دسکتاپ ویندوز
                  </button>
                  <button 
                    onClick={() => { setShowFileMenu(false); if (window.confirm('آیا مایلید تمام اطلاعات این برنامه را به فایل پیش‌فرض کارخانه برگردانید؟')) { dbService.resetDatabase(); window.location.reload(); } }}
                    className="w-full text-right px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/25 text-red-500 text-[11px] font-bold block transition-colors"
                  >
                    بازنشانی به حالت کارخانه
                  </button>

                  <div className="border-t border-gray-100 dark:border-gray-800 my-1.5"></div>
                  <div className="px-3 pb-1 mb-1 text-[10px] text-gray-400 font-extrabold">بستن نرم‌افزار</div>
                  <button 
                    onClick={() => { setShowFileMenu(false); handleFullQuit(); }}
                    className="w-full text-right px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/25 text-red-500 text-[11px] font-bold block transition-colors"
                  >
                    خروج کامل از برنامه
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Left Section: Quick Theme Switcher & Premium macOS-Style window controls */}
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>

          {/* Circular Glassmorphism Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full hover:bg-gray-105 active:bg-gray-150 dark:hover:bg-slate-800 dark:active:bg-slate-700 text-gray-500 dark:text-gray-300 flex items-center justify-center border border-gray-200 dark:border-gray-850 cursor-pointer shadow-sm transition-all duration-350"
            id="header-theme-toggle"
            title="تغییر تم برنامه (تاریک / روشن)"
          >
            {appSettings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20 animate-spin-slow" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 fill-indigo-500/20" />
            )}
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800/80 mx-1"></div>

          {/* Premium Custom Window Controls */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-[#131b2e] rounded-xl border border-gray-100 dark:border-gray-800/40 group/controls select-none"
            title="کنترل پنجره برنامه"
          >
            {/* Close Button - macOS Red style */}
            <button 
              onClick={handleClose} 
              className="w-3.5 h-3.5 rounded-full bg-red-400 dark:bg-red-500/90 hover:bg-red-500 dark:hover:bg-red-600 flex items-center justify-center transition-all duration-200 relative shadow-sm shadow-red-500/10 cursor-pointer"
              title="بستن نرم‌افزار"
            >
              <X className="w-2 h-2 text-white/95 opacity-0 group-hover/controls:opacity-100 transition-opacity duration-200" />
            </button>

            {/* Maximize Button - macOS Green style */}
            <button 
              onClick={handleMaximize} 
              className="w-3.5 h-3.5 rounded-full bg-emerald-400 dark:bg-emerald-500/90 hover:bg-emerald-500 dark:hover:bg-emerald-600 flex items-center justify-center transition-all duration-200 relative shadow-sm shadow-emerald-500/10 cursor-pointer"
              title="بزرگ یا کوچک کردن پنجره"
            >
              <Square className="w-1.5 h-1.5 text-white/95 opacity-0 group-hover/controls:opacity-100 transition-opacity duration-200" />
            </button>

            {/* Minimize Button - macOS Yellow/Amber style */}
            <button 
              onClick={handleMinimize} 
              className="w-3.5 h-3.5 rounded-full bg-amber-400 dark:bg-amber-500/90 hover:bg-amber-500 dark:hover:bg-amber-600 flex items-center justify-center transition-all duration-200 relative shadow-sm shadow-amber-500/10 cursor-pointer"
              title="پایین‌بردن پنجره برنامه"
            >
              <Minus className="w-2 h-2 text-white/95 opacity-0 group-hover/controls:opacity-100 transition-opacity duration-200" />
            </button>
          </div>

        </div>
      </header>

      {/* 2. Main Area: Sidebar Navigation & Content Area Grid */}
      <div className="flex-1 flex overflow-hidden" id="app-workspace">
        
        {/* Right Sidebar navigation (Farsi RTL compliant) */}
        <nav className="lg:w-60 md:w-20 bg-white dark:bg-[#1e293b] border-l border-gray-150 dark:border-gray-800 p-3 lg:p-4.5 flex flex-col justify-between select-none shrink-0 hidden md:flex transition-all duration-300" id="sidebar-navigation">
          <div className="space-y-6">
            <div className="pb-1 lg:block md:hidden">
              <span className="text-[10px] font-extrabold tracking-wider text-gray-400 block px-2.5 uppercase">منوی عملیاتی مدیا</span>
            </div>

            <div className="space-y-1.5" id="nav-pills">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center justify-between lg:justify-start gap-3 lg:px-3.5 px-0 h-11 text-[11.5px] font-bold rounded-xl transition-all duration-300 cursor-pointer border ${
                      isActive 
                        ? `${item.activeClass} border-transparent` 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-800/50 border-transparent hover:border-gray-200/40 dark:hover:border-slate-750'
                    }`}
                    id={`nav-link-${item.id}`}
                    title={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 ' + item.activeIconColor : item.iconColor}`} />
                      <span className="lg:block md:hidden overflow-hidden truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`lg:block md:hidden text-[9px] px-1.5 py-0.5 rounded-md font-extrabold ${
                        isActive 
                          ? 'bg-white/20 text-white animate-pulse' 
                          : item.id === 'movies'
                            ? 'bg-rose-500/10 text-rose-500'
                            : item.id === 'series'
                              ? 'bg-indigo-500/10 text-indigo-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-gray-150 dark:border-gray-800 my-3.5 pt-3.5 lg:block md:hidden">
              <span className="text-[10px] font-extrabold tracking-wider text-gray-400 block px-2.5 uppercase">امنیت و کاربری</span>
            </div>

            <div className="space-y-1.5">
              {/* Lock Button */}
              <button
                onClick={() => {
                  localStorage.removeItem('parstech_user_logged_in');
                  setIsLoggedIn(false);
                }}
                className="w-full flex items-center justify-center lg:justify-start gap-3 lg:px-3 px-0 h-11 text-xs font-bold rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all cursor-pointer"
                title="قفل کردن برنامه"
              >
                <Lock className="w-4.5 h-4.5 shrink-0 text-amber-500" />
                <span className="lg:block md:hidden overflow-hidden truncate">قفل کردن نرم‌افزار</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={() => {
                  if (window.confirm('آیا مایل به خروج از حساب کاربری خود هستید؟')) {
                    localStorage.removeItem('parstech_user_logged_in');
                    localStorage.removeItem('parstech_user_profile');
                    setIsLoggedIn(false);
                  }
                }}
                className="w-full flex items-center justify-center lg:justify-start gap-3 lg:px-3 px-0 h-11 text-xs font-bold rounded-xl text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                title="خروج از حساب"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0 text-red-500" />
                <span className="lg:block md:hidden overflow-hidden truncate">خروج از حساب</span>
              </button>
            </div>
          </div>

          {/* Quick instructions & branding */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-3 lg:p-3.5 rounded-xl space-y-2 lg:block md:hidden animate-scaleIn">
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded font-extrabold">نسخه 1.0.1</span>
            <p className="text-[10px] text-gray-450 leading-relaxed font-semibold">برنامه مدیریت فیلم و سریال های سیستم. طراحی و توسعه توسط خدمات کامپیوتری پارس تک (مصطفی اکرادی) 09380072019</p>
          </div>
        </nav>

        {/* Dynamic content rendering frame */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-5" id="main-content-canvas">
          
          {/* Global persistent multi-sales & Cart controls */}
          <CartBar 
            currentCustomer={currentCustomer}
            onChangeCustomer={setCurrentCustomer}
            cart={cart}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onUpdateCartItemPrice={handleUpdateCartItemPrice}
            onInvoiceSettled={handleInvoiceSettled}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onAddSession={handleAddSession}
            onCloseSession={handleCloseSession}
            onUpdateDrivePath={handleUpdateDrivePath}
          />

          {!sqliteActive && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-amber-900 dark:text-amber-305/90 animate-scaleIn shrink-0" id="sqlite-rebuild-alert-banner">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                  <Info className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-black">پایگاه‌داده فیزیکی SQLite هنوز کامپایل نشده است</span>
                  <p className="text-[11px] leading-relaxed opacity-95 font-bold">
                    به دلیل تفاوت نسخه پلتفرم، ماژول بومی <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono text-[10px]">better-sqlite3</code> روی ویندوز شما به کامپایل نیاز دارد. 
                    برای حل این مسئله و فعال‌سازی کامل ذخیره‌سازی در دیتابیس لوکال <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono text-[10px]">database_sqlite_v2.db</code>، کافیست دستور <code className="bg-amber-500/30 px-1.5 py-0.5 rounded font-mono text-xs text-amber-950 dark:text-white font-extrabold select-all">npm run rebuild</code> را در خط فرمان سیستم خود اجرا کنید. (در حال حاضر از شبیه‌ساز امن مرورگر استفاده می‌شود)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  showToast('برنامه با موفقیت به شبیه‌ساز ذخیره امن مرورگر منتقل شد و تمام امکانات فعال هستند.', 'success');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-amber-600/20 transition-all shrink-0 cursor-pointer self-stretch md:self-auto text-center"
              >
                شبیه‌ساز فعال است
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0">
            {activeTab === 'dashboard' && <Dashboard onViewMedia={handleViewMedia} />}
            {activeTab === 'movies' && (
              <Movies 
                onAddToCart={handleAddToCart} 
                activeCustomer={currentCustomer ? { id: 'c1', name: currentCustomer, phone: '' } : null} 
                initialSelectedId={activeMediaId}
                onClearInitialSelectedId={() => setActiveMediaId(null)}
              />
            )}
            {activeTab === 'series' && (
              <SeriesPage 
                onAddToCart={handleAddToCart} 
                activeCustomer={currentCustomer ? { id: 'c1', name: currentCustomer, phone: '' } : null} 
                initialSelectedId={activeMediaId}
                onClearInitialSelectedId={() => setActiveMediaId(null)}
              />
            )}
            {activeTab === 'downloads' && <Downloads />}
            {activeTab === 'sales' && <SalesPage />}
            {activeTab === 'settings' && (
              <SettingsPage 
                onSettingsChange={setAppSettings} 
                onLogout={() => {
                  localStorage.removeItem('parstech_user_logged_in');
                  setIsLoggedIn(false);
                }}
              />
            )}
            {activeTab === 'contact' && <ContactUs />}
          </div>
        </main>

      </div>

      {/* 3. Real-time SQL query audit console */}
      <DBLogger />

      {/* 4. ABOUT US MODAL OVERLAY */}
      {showAboutModal && (
        <div 
          className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAboutModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-gray-150 dark:border-gray-805 animate-scaleIn">
            <div className="p-5 text-center space-y-4">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow shadow-indigo-500/10">
                <Tv className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">نرم‌افزار مدیا سنتر (Media Center Manager)</h3>
                <p className="text-[11px] text-gray-400 font-mono mt-1">نسخه ۲.۴.۰ (Electron + SQLite + IndexedDB)</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed leading-loose">
                این برنامه برای مدیریت کامل فیلم‌ها و سریال‌ها، تنظیم فصول، مدیریت فاکتور با قابلیت فروش یکجای فصول به صورت دسکتاپ بر مبنای وب پیاده‌سازی شده است.
              </p>
              <button
                onClick={() => setShowAboutModal(false)}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                id="btn-close-about"
              >
                تایید و ادامه کار با سیستم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive mobile toolbar tab footer */}
      <div className="md:hidden h-14 bg-white dark:bg-[#1e293b] border-t border-gray-150 dark:border-gray-800 flex items-center justify-around z-30 select-none pb-0.5 no-print" id="mobile-toolbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-full cursor-pointer transition-all ${
                isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[8px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {activeVideo && (
        <InternalVideoPlayer
          filePath={activeVideo.filePath}
          title={activeVideo.title}
          subtitlesList={activeVideo.subtitlesList}
          originPeerIp={activeVideo.originPeerIp}
          onClose={() => setActiveVideo(null)}
          onPlayExternal={() => {
            if (window.electronAPI && window.electronAPI.playVideoFile) {
              window.electronAPI.playVideoFile(activeVideo.filePath, activeVideo.originPeerIp);
            }
          }}
        />
      )}

    </div>
  );
}
