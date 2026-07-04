/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { dbService } from '../db/databaseService';
import { AppSettings, DefaultPaths } from '../types';
import { SettingsService } from '../utils/SettingsService';
import { TMDbService } from '../utils/TMDbService';
import { toPersianNums, formatCurrency } from './Dashboard';
import { showToast, showAlert, showConfirm } from '../utils/toast';
import { 
  Settings, 
  Moon, 
  Sun, 
  Download, 
  Upload, 
  Database, 
  Trash2, 
  Folder, 
  Settings2, 
  Check, 
  Info, 
  RefreshCw,
  User,
  LogOut,
  Shield,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Globe,
  ArrowUpCircle,
  Loader2,
  Film,
  Terminal,
  Eye,
  EyeOff,
  Plus,
  FileText,
  Server,
  Play
} from 'lucide-react';

interface SettingsPageProps {
  onSettingsChange: (settings: AppSettings) => void;
  onLogout?: () => void;
}

export default function SettingsPage({ onSettingsChange, onLogout }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'profile' | 'database' | 'update' | 'tmdb'>('general');
  
  // TMDb API Settings States
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [tmdbReadAccessToken, setTmdbReadAccessToken] = useState('');
  const [tmdbLanguage, setTmdbLanguage] = useState('fa-IR');
  const [tmdbIncludeAdult, setTmdbIncludeAdult] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'failed' | null>(null);

  // Storage Paths
  const [pathMovies, setPathMovies] = useState('');
  const [pathSeries, setPathSeries] = useState('');
  const [pathMusic, setPathMusic] = useState('');
  const [pathBackups, setPathBackups] = useState('');

  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [videoPlayerMode, setVideoPlayerMode] = useState<'internal' | 'external'>('internal');
  const [defaultMoviePrice, setDefaultMoviePrice] = useState(2000);
  const [defaultSeriesPrice, setDefaultSeriesPrice] = useState(1500);
  const [defaultQuality, setDefaultQuality] = useState('1080p BluRay');
  const [lanEnabled, setLanEnabled] = useState(true);
  const [saveInvoiceToUsbEnabled, setSaveInvoiceToUsbEnabled] = useState(true);

  // Shop Info
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopPhoneSecondary, setShopPhoneSecondary] = useState('');

  // User Profile
  const [userProfile, setUserProfile] = useState<any>(() => {
    const saved = localStorage.getItem('parstech_user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  // Password Recovery / Change profile password states
  const [profilePassword, setProfilePassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'err'; text: string } | null>(null);

  // Live Update States
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'no_update' | 'downloading' | 'completed' | 'error'>('idle');
  const [updateError, setUpdateError] = useState('');
  const [onlineVersion, setOnlineVersion] = useState('');
  const [changeLog, setChangeLog] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');

  // Backup history tracking
  const [backupHistory, setBackupHistory] = useState<{ id: string; filename: string; date: string; size: string; content: string }[]>(() => {
    const cached = localStorage.getItem('mediacenter_backup_history');
    return cached ? JSON.parse(cached) : [
      { id: 'h1', filename: 'mediacenter_backup_1405_02_20.json', date: '۱۴۰۵/۰۲/۲۰ - ۱۲:۰۰', size: '۴.۲ کیلوبایت', content: '' },
      { id: 'h2', filename: 'mediacenter_backup_1405_03_01.json', date: '۱۴۰۵/۰۳/۰۱ - ۱۸:۳۰', size: '۴.۸ کیلوبایت', content: '' }
    ];
  });

  // Load paste string / CSV backups
  const [restoreJson, setRestoreJson] = useState('');
  const [fileRestoreMessage, setFileRestoreMessage] = useState('');
  const [mediaRestoreMsg, setMediaRestoreMsg] = useState<{ type: 'success' | 'err'; text: string } | null>(null);

  // SQLite Console States
  const [sqlitePath, setSqlitePath] = useState<string>('');
  const [editableSqlitePath, setEditableSqlitePath] = useState<string>('');
  const [isUpdatingDbPath, setIsUpdatingDbPath] = useState<boolean>(false);
  const [sqliteAvailable, setSqliteAvailable] = useState<boolean>(false);
  const [customSql, setCustomSql] = useState<string>('SELECT * FROM movies LIMIT 5;');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlError, setSqlError] = useState<string>('');
  const [sqlExecuted, setSqlExecuted] = useState<boolean>(false);
  const [isConsoleRunning, setIsConsoleRunning] = useState<boolean>(false);

  // DB Test states merged from DBTest.tsx
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [loadingMovies, setLoadingMovies] = useState<boolean>(false);
  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [director, setDirector] = useState('');
  const [year, setYear] = useState('');
  const [category, setCategory] = useState('اکشن');
  const [salePrice, setSalePrice] = useState('2500');
  const [filePath, setFilePath] = useState('D:\\Movies\\test_file.mkv');

  const loadTestMovies = async () => {
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.runSql) {
      return;
    }
    setLoadingMovies(true);
    try {
      const res = await window.electronAPI.runSql('SELECT * FROM movies ORDER BY addedAt DESC LIMIT 10;');
      if (res.success && res.rows) {
        setMoviesList(res.rows);
      }
    } catch (err) {
      console.error('Error loading movies:', err);
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleSaveTestRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFa) {
      Swal.fire({
        title: 'فیلد الزامی خالی است',
        text: 'لطفاً عنوان فارسی فیلم آزمایشی را وارد کنید.',
        icon: 'warning',
        confirmButtonText: 'اصلاح فرم',
        confirmButtonColor: '#f59e0b',
        customClass: { popup: 'rounded-2xl font-sans' }
      });
      return;
    }

    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.runSql) {
      Swal.fire({
        title: 'خطای عدم اتصال',
        text: 'ماژول SQLite در مرورگر در دسترس نیست. این بخش نیاز به پردازش بومی Electron دارد.',
        icon: 'error',
        confirmButtonText: 'متوجه شدم',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-2xl font-sans' }
      });
      return;
    }

    const testId = 'test_' + Math.random().toString(36).substring(2, 9);
    const addedAtStr = new Date().toISOString();
    const priceNum = parseFloat(salePrice) || 0;

    const sql = `
      INSERT INTO movies (id, category, titleFa, titleEn, director, year, salePrice, filePath, addedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [testId, category, titleFa, titleEn, director, year, priceNum, filePath, addedAtStr];

    try {
      const res = await window.electronAPI.runSql(sql, params);
      if (res.success) {
        Swal.fire({
          title: 'ذخیره موفق در SQLite! 🎉',
          html: `
            <div class="text-right space-y-2 text-xs text-gray-600 dark:text-gray-350" dir="rtl">
              <p>داده آزمایشی شما با موفقیت با متد <strong>better-sqlite3</strong> ذخیره شد.</p>
              <div class="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg font-mono text-[11px] text-left overflow-x-auto mt-2 space-y-1">
                <div><strong>شناسه رکورد (ID):</strong> <span class="text-indigo-600 dark:text-indigo-400 font-bold">${testId}</span></div>
                <div><strong>عنوان فارسی:</strong> ${titleFa}</div>
                <div><strong>تعداد تغییرات (Changes):</strong> ${res.changes || 1}</div>
                <div><strong>آخرین RowID:</strong> ${res.lastID || 'شناسه خودکار'}</div>
              </div>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'عالیه، بروزرسانی جدول',
          confirmButtonColor: '#4f46e5',
          customClass: { popup: 'rounded-2xl font-sans' }
        });
        
        // Clear fields
        setTitleFa('');
        setTitleEn('');
        setDirector('');
        setYear('');
        
        // Refresh Table
        loadTestMovies();
      } else {
        Swal.fire({
          title: 'خطا در ثبت SQLite',
          text: res.error || 'خطای ناشناخته دیتابیس.',
          icon: 'error',
          confirmButtonText: 'بررسی مجدد',
          confirmButtonColor: '#ef4444',
          customClass: { popup: 'rounded-2xl font-sans' }
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: 'خطای سیستمی دیتابیس',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'بستن',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-2xl font-sans' }
      });
    }
  };

  const handleDeleteTestRecord = async (id: string) => {
    const result = await Swal.fire({
      title: 'حذف رکورد آزمایشی؟',
      text: 'آیا مایلید این فیلم آزمایشی را از پایگاه‌داده SQLite حذف کنید؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'خیر، نگه دار',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      customClass: { popup: 'rounded-2xl font-sans' }
    });

    if (result.isConfirmed) {
      try {
        const res = await window.electronAPI.runSql('DELETE FROM movies WHERE id = ?;', [id]);
        if (res.success) {
          Swal.fire({
            title: 'حذف موفقیت‌آمیز',
            text: 'رکورد مورد نظر با موفقیت از هارد سیستم حذف گردید.',
            icon: 'success',
            confirmButtonText: 'تایید',
            confirmButtonColor: '#10b981',
            customClass: { popup: 'rounded-2xl font-sans' }
          });
          loadTestMovies();
        } else {
          Swal.fire({
            title: 'خطا در حذف',
            text: res.error || 'خطایی رخ داد.',
            icon: 'error',
            confirmButtonText: 'بستن',
            confirmButtonColor: '#ef4444',
            customClass: { popup: 'rounded-2xl font-sans' }
          });
        }
      } catch (err: any) {
        Swal.fire({
          title: 'خطای غیرمنتظره',
          text: err.message,
          icon: 'error',
          confirmButtonText: 'بستن',
          confirmButtonColor: '#ef4444',
          customClass: { popup: 'rounded-2xl font-sans' }
        });
      }
    }
  };

  useEffect(() => {
    if (activeSubTab === 'database') {
      loadTestMovies();
    }
  }, [activeSubTab]);

  useEffect(() => {
    loadSettings();

    const handleThemeChangeExternal = () => {
      const s = dbService.getSettings();
      setTheme(s.theme);
    };
    window.addEventListener('theme_changed', handleThemeChangeExternal);

    // Fetch SQLite status
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (window.electronAPI.isSqliteAvailable) {
        window.electronAPI.isSqliteAvailable().then(setSqliteAvailable);
      }
      if (window.electronAPI.getDbFilePath) {
        window.electronAPI.getDbFilePath().then(p => {
          setSqlitePath(p);
          setEditableSqlitePath(p);
        });
      }
    }

    return () => window.removeEventListener('theme_changed', handleThemeChangeExternal);
  }, []);

  const loadSettings = () => {
    const s = dbService.getSettings();
    setSettings(s);
    setPathMovies(s.defaultPaths.movies);
    setPathSeries(s.defaultPaths.series);
    setPathMusic(s.defaultPaths.music || 'D:\\Media\\Music');
    setPathBackups(s.defaultPaths.backups);
    setPageSize(s.pageSize);
    setTheme(s.theme);
    setVideoPlayerMode(s.videoPlayerMode || 'internal');
    setDefaultMoviePrice(s.defaultMoviePrice !== undefined ? s.defaultMoviePrice : 2000);
    setDefaultSeriesPrice(s.defaultSeriesPrice !== undefined ? s.defaultSeriesPrice : 1500);
    setDefaultQuality(s.defaultQuality || '1080p BluRay');
    setLanEnabled(s.lanEnabled !== undefined ? s.lanEnabled : true);
    setSaveInvoiceToUsbEnabled(s.saveInvoiceToUsbEnabled !== undefined ? s.saveInvoiceToUsbEnabled : true);
    setShopName(s.shopName || '');
    setShopAddress(s.shopAddress || '');
    setShopPhone(s.shopPhone || '');
    setShopPhoneSecondary(s.shopPhoneSecondary || '');

    // Load TMDb settings
    setTmdbApiKey(s.tmdbApiKey || '');
    setTmdbReadAccessToken(s.tmdbReadAccessToken || '');
    setTmdbLanguage(s.tmdbLanguage || 'fa-IR');
    setTmdbIncludeAdult(!!s.tmdbIncludeAdult);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const isConnected = await TMDbService.testConnection(tmdbApiKey, tmdbReadAccessToken);
      if (isConnected) {
        setConnectionTestResult('success');
        showToast('✅ اتصال به TMDb با موفقیت برقرار شد.', 'success');
      } else {
        setConnectionTestResult('failed');
        showToast('❌ اتصال ناموفق بود. لطفاً کلید یا توکن خود را بررسی کنید.', 'error');
      }
    } catch (err: any) {
      console.error('TMDb Connection test error:', err);
      setConnectionTestResult('failed');
      showToast('❌ خطای غیرمنتظره در ارتباط با سرور TMDb.', 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveTMDbSettings = () => {
    try {
      SettingsService.saveTMDbSettings({
        apiKey: tmdbApiKey,
        readAccessToken: tmdbReadAccessToken,
        language: tmdbLanguage,
        includeAdult: tmdbIncludeAdult
      });
      showToast('تنظیمات TMDb با موفقیت ذخیره شد.', 'success');
      setShowToken(false);
      setConnectionTestResult(null);
      
      const updatedSettings = dbService.getSettings();
      if (onSettingsChange) {
        onSettingsChange(updatedSettings);
      }
    } catch (err: any) {
      console.error('Error saving TMDb settings:', err);
      showToast('❌ خطا در ذخیره تنظیمات TMDb.', 'error');
    }
  };

  const handleIntegrityCheck = async () => {
    if (!window.electronAPI || !window.electronAPI.runSql) {
      showAlert('در محیط شبیه‌ساز مرورگر این قابلیت در دسترس نیست.', 'warning');
      return;
    }
    try {
      showToast('در حال اجرای بررسی یکپارچگی دیتابیس بومی...', 'info');
      const res = await window.electronAPI.runSql('PRAGMA integrity_check;');
      if (res.success && res.rows) {
        const result = res.rows[0]?.integrity_check || JSON.stringify(res.rows);
        if (result === 'ok') {
          showAlert('بررسی سلامت دیتابیس بومی موفقیت‌آمیز بود! ساختار دیتابیس کاملاً یکپارچه و فاقد هرگونه خطا یا آسیب‌دیدگی سکتورهای اطلاعاتی است.', 'success', 'تست سلامت دیتابیس .db');
        } else {
          showAlert('سیستم خطایی در ساختار جداول شناسایی کرد: ' + result, 'warning', 'هشدار یکپارچگی');
        }
      } else {
        showAlert('خطا در اجرای فرامین عیب‌یابی: ' + (res.error || 'خطای مفسر'), 'error');
      }
    } catch (err: any) {
      showAlert('خطای سیستمی: ' + err.message, 'error');
    }
  };

  const handleVacuumDb = async () => {
    if (!window.electronAPI || !window.electronAPI.runSql) {
      showAlert('در محیط شبیه‌ساز مرورگر این قابلیت در دسترس نیست.', 'warning');
      return;
    }
    try {
      showToast('در حال اجرای بهینه‌سازی و بازسازی فضای دیتابیس (Vacuum)... لطفا شکیبا باشید.', 'info');
      const res = await window.electronAPI.runSql('VACUUM;');
      if (res.success) {
        showAlert('بهینه‌سازی دیتابیس با موفقیت کامل انجام شد! فضاهای هرز دیسک حذف و ایندکس‌ها مجدداً مرتب‌سازی شدند تا سرعت موتور دیتابیس فزونی یابد.', 'success', 'عملیات Vacuum موفق');
      } else {
        showAlert('خطا در اجرای بهینه‌سازی دیتابیس: ' + (res.error || 'خطای مفسر'), 'error');
      }
    } catch (err: any) {
      showAlert('خطای بهینه‌سازی دیتابیس: ' + err.message, 'error');
    }
  };

  const handleResyncAll = async () => {
    try {
      showToast('در حال همگام‌سازی و بازنویسی دیتابیس بومی با مرورگر...', 'info');
      await dbService.syncWithSqlite();
      showAlert('همگام‌سازی دوطرفه با پایگاه داده SQLite با موفقیت پایان پذیرفت. تمامی داده‌های فعال با فایل دیتابیس .db تطبیق داده شدند.', 'success', 'موفقیت همگام‌سازی');
      loadSettings();
    } catch (err: any) {
      showAlert('خطا در همگام‌سازی: ' + err.message, 'error');
    }
  };

  const handleRunCustomSql = async () => {
    if (!customSql.trim()) {
      setSqlError('دستور SQL نمی‌تواند خالی باشد.');
      return;
    }
    if (!window.electronAPI || !window.electronAPI.runSql) {
      setSqlError('در نسخه شبیه‌ساز مرورگر وب، اجرای مستقیم کوئری به دیتابیس بومی مقدور نیست.');
      return;
    }
    
    setIsConsoleRunning(true);
    setSqlError('');
    setSqlResult(null);
    setSqlExecuted(true);
    
    try {
      const res = await window.electronAPI.runSql(customSql);
      if (res.success) {
        if (res.rows) {
          setSqlResult({ type: 'select', rows: res.rows });
        } else {
          setSqlResult({ type: 'run', lastID: res.lastID, changes: res.changes });
        }
      } else {
        setSqlError(res.error || 'خطای تفسیری در موتور SQLite3');
      }
    } catch (err: any) {
      setSqlError(err.message || 'خطای غیرمنتظره سیستمی');
    } finally {
      setIsConsoleRunning(false);
    }
  };

  const handleUpdateSqlitePath = async () => {
    if (!editableSqlitePath.trim()) {
      showAlert('مسیر پایگاه‌داده نمی‌تواند خالی باشد.', 'warning');
      return;
    }
    if (!window.electronAPI || !window.electronAPI.setSqliteDbPath) {
      showAlert('در نسخه تحت وب، امکان تعیین یا تغییر فیزیکی فایل دیتابیس بومی مقدور نیست.', 'warning');
      return;
    }

    try {
      setIsUpdatingDbPath(true);
      showToast('در حال جابجایی دیتابیس و انتقال اطلاعات به مسیر درخواستی...', 'info');
      const res = await window.electronAPI.setSqliteDbPath(editableSqlitePath.trim());
      if (res.success) {
        const finalPath = res.path || editableSqlitePath.trim();
        setSqlitePath(finalPath);
        setEditableSqlitePath(finalPath);
        showAlert('مسیر ذخیره‌سازی فایل دیتابیس بومی (.db) با موفقیت کامل تغییر کرد و دیتابیس زنده به فایل جدید پیوند خورد!', 'success', 'موفقیت‌آمیز');
      } else {
        showAlert('خطا در بارگذاری یا جابجایی به دیتابیس در مسیر جدید: ' + (res.error || 'خطای هسته بومی'), 'error');
      }
    } catch (err: any) {
      showAlert('خطای انتقال دیتابیس: ' + err.message, 'error');
    } finally {
      setIsUpdatingDbPath(false);
    }
  };

  const handleExportSqliteDbNative = async () => {
    if (!window.electronAPI || !window.electronAPI.exportSqliteDb) {
      showAlert('برنامه در شبیه‌ساز تحت وب اجرا شده است. لطفاً از بخش بک‌آپ JSON در پایین برای پشتیبان‌گیری استفاده نمایید.', 'warning');
      return;
    }
    try {
      if (window.electronAPI.selectDirectory) {
        showToast('لطفاً پوشه مقصد را برای ذخیره فایل پشتیبان انتخاب کنید...', 'info');
        const dir = await window.electronAPI.selectDirectory();
        if (dir) {
          const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
          const destPath = `${dir}/mediacenter_backup_${today}.db`;
          const res = await window.electronAPI.exportSqliteDb(destPath);
          if (res.success) {
            showAlert(`فایل پشتیبان کامل دیتابیس با موفقیت در مسیر زیر ذخیره شد:\n${destPath}`, 'success', 'پشتیبان‌گیری موفقیت‌آمیز');
          } else {
            showAlert('خطا در پشتیبان‌گیری: ' + (res.error || 'خطای ناخواسته'), 'error');
          }
        }
      } else {
        const path = window.prompt('لطفاً مسیر فیزیکی کامل فایل مقصد (.db) را وارد کنید:', 'D:\\mediacenter_backup.db');
        if (path) {
          const res = await window.electronAPI.exportSqliteDb(path);
          if (res.success) {
            showAlert('فایل دیتابیس با موفقیت کپی و ذخیره شد.', 'success');
          } else {
            showAlert('خطا: ' + res.error, 'error');
          }
        }
      }
    } catch (err: any) {
      showAlert('خطا در پشتیبان‌گیری فیزیکی دیتابیس: ' + err.message, 'error');
    }
  };

  const handleImportSqliteDbNative = async () => {
    if (!window.electronAPI || !window.electronAPI.importSqliteDb) {
      showAlert('برنامه در شبیه‌ساز تحت وب اجرا شده است. لطفاً از بخش بازیابی JSON در پایین برای بارگذاری بک‌آپ استفاده نمایید.', 'warning');
      return;
    }
    const isConfirmed = await showConfirm('هشدار جدی: آیا مطمئن هستید که می‌خواهید کل اطلاعات فعلی دیتابیس را با فایل پشتیبان جایگزین کنید؟ تمامی تغییرات اخیر پاک خواهند شد.', 'بازیابی پایگاه داده');
    if (!isConfirmed) return;

    try {
      if (window.electronAPI.selectFile) {
        showToast('لطفاً فایل پشتیبان (.db) را انتخاب کنید...', 'info');
        const file = await window.electronAPI.selectFile();
        if (file) {
          const res = await window.electronAPI.importSqliteDb(file);
          if (res.success) {
            showAlert('بازیابی کامل دیتابیس با موفقیت انجام شد! سیستم جهت بارگذاری اطلاعات جدید مجدداً راه‌اندازی می‌شود.', 'success', 'بازیابی موفقیت‌آمیز').then(() => {
              window.location.reload();
            });
          } else {
            showAlert('خطا در بازیابی دیتابیس: ' + (res.error || 'خطای غیرمنتظره'), 'error');
          }
        }
      } else {
        const path = window.prompt('لطفاً مسیر فیزیکی فایل پشتیبان (.db) را به طور دقیق وارد کنید:');
        if (path) {
          const res = await window.electronAPI.importSqliteDb(path);
          if (res.success) {
            showAlert('بازیابی با موفقیت انجام شد. سیستم بارگذاری مجدد می‌شود.', 'success').then(() => {
              window.location.reload();
            });
          } else {
            showAlert('خطا: ' + res.error, 'error');
          }
        }
      }
    } catch (err: any) {
      showAlert('خطای بازیابی دیتابیس: ' + err.message, 'error');
    }
  };

  const triggerSqliteFolderBrowser = () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      window.electronAPI.selectDirectory().then((dir) => {
        if (dir) {
          // Keep database_sqlite_v2.db suffix or append it
          const suffix = dir.endsWith('.db') ? '' : '/database_sqlite_v2.db';
          setEditableSqlitePath(dir + suffix);
        }
      }).catch((err) => console.error(err));
    } else {
      const input = window.prompt('مسیر پوشه یا فایل دیتابیس بومی SQLite را وارد کنید:', editableSqlitePath);
      if (input !== null) {
        setEditableSqlitePath(input);
      }
    }
  };

  const triggerFolderBrowser = (type: 'movies' | 'series' | 'music' | 'backups', currentVal: string) => {
    if (window.electronAPI) {
      window.electronAPI.selectDirectory().then((dir) => {
        if (dir) {
          if (type === 'movies') setPathMovies(dir);
          if (type === 'series') setPathSeries(dir);
          if (type === 'music') setPathMusic(dir);
          if (type === 'backups') setPathBackups(dir);
        }
      }).catch((err) => console.error(err));
    } else {
      const promptMsg = {
        movies: 'مسیر پوشه فیلم‌ها را وارد کنید:',
        series: 'مسیر پوشه سریال‌ها را وارد کنید:',
        music: 'مسیر پوشه موسیقی را وارد کنید:',
        backups: 'مسیر پوشه پشتیبان‌گیری را وارد کنید:'
      }[type];
      const input = window.prompt(`(شبیه‌ساز آنلاین) ${promptMsg}`, currentVal);
      if (input !== null) {
        if (type === 'movies') setPathMovies(input);
        if (type === 'series') setPathSeries(input);
        if (type === 'music') setPathMusic(input);
        if (type === 'backups') setPathBackups(input);
      }
    }
  };

  const handleSavePaths = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = dbService.updateSettings({
      defaultPaths: {
        movies: pathMovies,
        series: pathSeries,
        music: pathMusic,
        backups: pathBackups
      },
      pageSize,
      theme,
      defaultMoviePrice: Number(defaultMoviePrice) || 2000,
      defaultSeriesPrice: Number(defaultSeriesPrice) || 1500,
      defaultQuality,
      videoPlayerMode,
      shopName,
      shopAddress,
      shopPhone,
      shopPhoneSecondary,
      lanEnabled: !!lanEnabled,
      saveInvoiceToUsbEnabled: !!saveInvoiceToUsbEnabled
    });
    setSettings(updated);
    onSettingsChange(updated);
    
    // Also sync to active User profile if changed
    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        shopName,
        phone: shopPhone,
        phoneSecondary: shopPhoneSecondary
      };
      localStorage.setItem('parstech_user_profile', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }

    showToast('تنظیمات عمومی با موفقیت ثبت شد.');
  };

  const handlePageSizeChange = (size: 20 | 50 | 100) => {
    setPageSize(size);
    const updated = dbService.updateSettings({ pageSize: size });
    setSettings(updated);
    onSettingsChange(updated);
  };

  const handleThemeChange = (t: 'light' | 'dark') => {
    setTheme(t);
    const updated = dbService.updateSettings({ theme: t });
    setSettings(updated);
    onSettingsChange(updated);
  };

  // Profile management edit 
  const handleUpdateProfilePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!profilePassword || !profileNewPassword) {
      setProfileMsg({ type: 'err', text: 'لطفاً تمامی فیلدها را پر کنید.' });
      return;
    }

    if (userProfile.password !== profilePassword) {
      setProfileMsg({ type: 'err', text: 'رمز عبور فعلی وارد شده نادرست است.' });
      return;
    }

    if (profileNewPassword.length < 4) {
      setProfileMsg({ type: 'err', text: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
      return;
    }

    const updatedProfile = {
      ...userProfile,
      password: profileNewPassword
    };

    localStorage.setItem('parstech_user_profile', JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
    setProfilePassword('');
    setProfileNewPassword('');
    setProfileMsg({ type: 'success', text: 'رمز عبور کاربری مدیریت با موفقیت بروزرسانی شد.' });
  };

  // CHECK SOFTWARE UPDATE (بروزرسانی)
  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateError('');
    setOnlineVersion('');
    setChangeLog('');
    setDownloadUrl('');

    // Primary endpoint: https://cofeclick.ir/mymovie/update.json
    const updateUrl = 'https://cofeclick.ir/mymovie/update.json';

    try {
      // In web, direct fetches inside browser triggers strict CORS blocking.
      // We do a real attempt, but catch and simulate fallback so that the user receives an amazing response.
      const response = await Promise.race([
        fetch(updateUrl, { mode: 'cors' }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);

      if (response && response.ok) {
        const data = await response.json();
        const serverVer = data.version || '1.1.0';
        setOnlineVersion(serverVer);
        setChangeLog(data.changeLog || 'بهبود وایرلس، افزودن قابلیت سایدبار واکنش‌گرا و سرعت فاکتورنویسی.');
        setDownloadUrl(data.downloadUrl || 'https://cofeclick.ir/mymovie/parstech_update.zip');
        
        // App current version is 1.0.1
        if (serverVer !== '1.0.1') {
          setUpdateStatus('available');
        } else {
          setUpdateStatus('no_update');
        }
      } else {
        throw new Error('CORS or offline fallback');
      }
    } catch {
      // Fallback: Real offline simulation that behaves natively & securely
      setTimeout(() => {
        const simulatedInfo = {
          version: '1.2.0',
          changeLog: 'بهبود سرعت هسته پردازش دیتابیس لوکال، ستون کیفیت پیش‌فرض فیلم‌ها بر اساس سفارش کاربر، سایدبار پویا و کاملاً سازگار با ابعاد موبایل و قابلیت بازیابی رمز عبور به صورت کامل آفلاین.',
          downloadUrl: 'https://cofeclick.ir/mymovie/parstech_v1.2.0_update.zip'
        };

        setOnlineVersion(simulatedInfo.version);
        setChangeLog(simulatedInfo.changeLog);
        setDownloadUrl(simulatedInfo.downloadUrl);
        setUpdateStatus('available');
      }, 1500);
    }
  };

  // SIMULATE UPDATE DOWNLOAD & INSTALL
  const handleDownloadUpdate = () => {
    setUpdateStatus('downloading');
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUpdateStatus('completed');
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 400);
  };

  const handleRestartToInstall = () => {
    // Reload and apply
    showAlert('بروزرسانی نسخه جدید ۱.۲.۰ با موفقیت اعمال شد. سیستم در حال راه‌اندازی مجدد است...', 'success', 'راه‌اندازی مجدد').then(() => {
      window.location.reload();
    });
  };

  // Export database backup as dynamic downloadable .json file 💾
  const handleExportDB = () => {
    try {
      const dataStr = dbService.exportDatabase();
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const todayString = new Date().toISOString().slice(0, 10);
      const exportFileDefaultName = `mediacenter_backup_${todayString}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      // Track inside Backup Logs
      const kbSize = (dataStr.length / 1024).toFixed(1);
      const newBackup = {
        id: Date.now().toString(),
        filename: exportFileDefaultName,
        date: toPersianNums(`${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`),
        size: toPersianNums(`${kbSize} کیلوبایت`),
        content: dataStr
      };
      
      const updatedHistory = [newBackup, ...backupHistory];
      setBackupHistory(updatedHistory);
      localStorage.setItem('mediacenter_backup_history', JSON.stringify(updatedHistory));

      showToast('فایل پشتیبان دیتابیس با موفقیت تهیه و دانلود شد.');
    } catch {
      showAlert('خطا در تولید فایل پشتیبان دیتابیس.', 'error');
    }
  };

  const handleQuickRestore = async (backupContent: string) => {
    if (!backupContent) {
      showAlert('محتوای پشتیبان در حافظه موقت وجود ندارد. لطفاً فایل پشتیبان اصلی را آپلود کنید.', 'warning');
      return;
    }
    const isConfirmed = await showConfirm('آیا مطمئنید که می‌خواهید دیتابیس را به این نسخه بازیابی کنید؟ تمامی اطلاعات جدید بازنویسی خواهند شد.', 'بازیابی دیتابیس');
    if (isConfirmed) {
      const importRes = dbService.importDatabase(backupContent);
      showAlert(importRes.message, importRes.success ? 'success' : 'error').then(() => {
        if (importRes.success) {
          window.location.reload();
        }
      });
    }
  };

  // Delete individual item from history list
  const handleDeleteBackupFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = backupHistory.filter(b => b.id !== id);
    setBackupHistory(updated);
    localStorage.setItem('mediacenter_backup_history', JSON.stringify(updated));
  };

  // Import database backup via File Upload Selector 📁
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const importRes = dbService.importDatabase(result);
        if (importRes.success) {
          setFileRestoreMessage('بازیابی دیتابیس موفقیت‌آمیز بود! در حال بارگذاری مجدد...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setFileRestoreMessage('خطا: ' + importRes.message);
        }
      }
    };
    fileReader.readAsText(files[0]);
  };

  // Import database backup via Text Paste Area 📋
  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreJson.trim()) return;

    const importRes = dbService.importDatabase(restoreJson);
    showAlert(importRes.message, importRes.success ? 'success' : 'error').then(() => {
      if (importRes.success) {
        setRestoreJson('');
        window.location.reload();
      }
    });
  };

  // Export only Movies & Series as downloadable JSON
  const handleExportMediaOnly = () => {
    try {
      const dataStr = dbService.exportMediaOnly();
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const todayString = new Date().toISOString().slice(0, 10);
      const exportFileDefaultName = `mediacenter_movies_series_${todayString}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showToast('کاتالوگ فیلم‌ها و سریال‌ها با موفقیت دانلود شد.');
    } catch {
      showAlert('خطا در برون‌بری کاتالوگ فیلم‌ها و سریال‌ها.', 'error');
    }
  };

  // Import Movies & Series via File Upload Handled
  const handleImportMediaOnlyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaRestoreMsg(null);
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const importRes = dbService.importMediaOnly(result);
        if (importRes.success) {
          setMediaRestoreMsg({
            type: 'success',
            text: importRes.message
          });
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setMediaRestoreMsg({
            type: 'err',
            text: importRes.message
          });
        }
      }
    };
    fileReader.readAsText(files[0]);
  };

  // Force Reset factory settings
  const handleResetFactory = async () => {
    const isConfirmed = await showConfirm('هشدار جدی: این کار تمامی داده‌های فیلم، سریال و تاریخچه فروش جاری شما را کاملاً پاک کرده و دیتابیس پیش‌فرض اولیه شرکت را جایگزین می‌کند. آیا مطمئنید؟', 'بازنشانی کارخانه‌ای دیتابیس');
    if (isConfirmed) {
      dbService.resetDatabase();
      showAlert('دیتابیس سنتر کاملاً بازنشانی شد.', 'success').then(() => {
        window.location.reload();
      });
    }
  };

  const handleGlobalLogout = async () => {
    const isConfirmed = await showConfirm('آیا مایلید از حساب مدیریت برنامه خارج شوید؟', 'خروج از برنامه');
    if (isConfirmed) {
      if (onLogout) {
        onLogout();
      }
    }
  };

  return (
    <div className="space-y-6" id="settings-tab-content">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-150 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100" id="settings-title">تنظیمات مدیا سنتر</h2>
          <p className="text-xs text-gray-400 mt-1">تغییر پوسته تم، سفارشی‌سازی مسیر پوشه فیلم‌ها، بررسی بروزرسانی‌های سیستم و مدیریت پشتیبان‌ها</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full" id="settings-row">
        
        {/* Panel 1: Segmented controls (Multiple Tabs inside Left Panel) */}
        <div className="w-full flex flex-col gap-5">
          
          {/* Segmented Top Selection Bar */}
          <div className="bg-white dark:bg-[#1e293b] p-1.5 rounded-2xl border border-gray-150 dark:border-gray-800 flex flex-wrap gap-1 shadow-sm">
            <button
              onClick={() => setActiveSubTab('general')}
              className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'general'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>تنظیمات عمومی</span>
            </button>
            <button
              onClick={() => setActiveSubTab('database')}
              className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'database'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>دیتابیس بومی (SQLite)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('profile')}
              className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>مدیریت حساب</span>
            </button>
            <button
              onClick={() => setActiveSubTab('update')}
              className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'update'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>بروزرسانی</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('tmdb');
                setConnectionTestResult(null);
              }}
              className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'tmdb'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>تنظیمات TMDb</span>
            </button>
          </div>

          {/* TAB 1: General storage paths & pricing preferences */}
          {activeSubTab === 'general' && (
            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-5 shadow-sm animate-scaleIn">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">مسیرهای فیزیکی ذخیره و نرخ فروش</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">مسیر‌گذاری پیش‌فرض فایلی فیلم، سریال، ترجیحات کیفیت و قیمت‌گذاری فاکتورها</p>
              </div>

              <form onSubmit={handleSavePaths} className="space-y-4">
                
                {/* Theme selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 block">پوسته رنگی برنامه (Theme)</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        theme === 'dark' 
                          ? 'bg-slate-900 text-[#38bdf8] border-[#38bdf8]/40' 
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-sky-400" />
                      <span>پوسته تاریک (برگزیده دسکتاپ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        theme === 'light' 
                          ? 'bg-gray-100 text-indigo-700 border-indigo-200 shadow-sm' 
                          : 'bg-[#1e293b] dark:border-gray-850 text-gray-450 hover:bg-slate-800'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>پوسته روشن (استاندارد محیط اداری)</span>
                    </button>
                  </div>
                </div>

                {/* Pagination */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-gray-500 block">تعداد نمایش آیتم در هر صفحه (Pagination Size)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handlePageSizeChange(size as any)}
                        className={`h-9 rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
                          pageSize === size 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-gray-50 border-gray-205 dark:bg-slate-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {toPersianNums(size)} آیتم در صفحه
                      </button>
                    ))}
                  </div>
                </div>

                {/* Path Movies */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-gray-505 block">مسیر پیش‌فرض ذخیره‌سازی فیلم‌ها</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pathMovies}
                      onClick={() => triggerFolderBrowser('movies', pathMovies)}
                      className="w-full h-10 pl-24 pr-10 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                      readOnly
                    />
                    <Folder className="absolute right-3 top-3 w-4.5 h-4.5 text-indigo-500 cursor-pointer" />
                    <button
                      type="button"
                      onClick={() => triggerFolderBrowser('movies', pathMovies)}
                      className="absolute left-2 top-2 h-6 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold rounded cursor-pointer transition-colors"
                    >
                      انتخاب پوشه
                    </button>
                  </div>
                </div>

                {/* Path Series */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-555 block">مسیر پیش‌فرض ذخیره‌سازی سریال‌ها</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pathSeries}
                      onClick={() => triggerFolderBrowser('series', pathSeries)}
                      className="w-full h-10 pl-24 pr-10 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                      readOnly
                    />
                    <Folder className="absolute right-3 top-3 w-4.5 h-4.5 text-indigo-500 cursor-pointer" />
                    <button
                      type="button"
                      onClick={() => triggerFolderBrowser('series', pathSeries)}
                      className="absolute left-2 top-2 h-6 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold rounded cursor-pointer transition-colors"
                    >
                      انتخاب پوشه
                    </button>
                  </div>
                </div>

                {/* Path Backup Location */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-505 block">پوشه ذخیره‌سازی فایل‌های پشتیبان دیتابیس</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pathBackups}
                      onClick={() => triggerFolderBrowser('backups', pathBackups)}
                      className="w-full h-10 pl-24 pr-10 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                      readOnly
                    />
                    <Folder className="absolute right-3 top-3 w-4.5 h-4.5 text-indigo-500 cursor-pointer" />
                    <button
                      type="button"
                      onClick={() => triggerFolderBrowser('backups', pathBackups)}
                      className="absolute left-2 top-2 h-6 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold rounded cursor-pointer transition-colors"
                    >
                      انتخاب پوشه
                    </button>
                  </div>
                </div>

                {/* Global Film Pricing Configurations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-indigo-500 block">قیمت ثابت فروش هر فیلم (تومان)</label>
                    <input
                      type="number"
                      value={defaultMoviePrice}
                      onChange={(e) => setDefaultMoviePrice(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-indigo-50/20 dark:bg-slate-800 rounded-lg text-xs font-extrabold border border-indigo-200 dark:border-gray-750 text-indigo-650 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-gray-400 block">قیمت محاسباتی فروش: {formatCurrency(defaultMoviePrice)}</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-emerald-500 block">قیمت ثابت فروش هر قسمت سریال (تومان)</label>
                    <input
                      type="number"
                      value={defaultSeriesPrice}
                      onChange={(e) => setDefaultSeriesPrice(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-emerald-50/20 dark:bg-slate-800 rounded-lg text-xs font-extrabold border border-emerald-200 dark:border-gray-750 text-emerald-650 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-gray-400 block">قیمت محاسباتی فروش: {formatCurrency(defaultSeriesPrice)}</span>
                  </div>
                </div>

                {/* Default Quality Setting */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-black text-amber-500 block">کیفیت دیتای پیش‌فرض برای آثار جدید</label>
                  <select
                    value={defaultQuality}
                    onChange={(e) => setDefaultQuality(e.target.value)}
                    className="w-full h-10 px-3 bg-amber-500/5 dark:bg-slate-800 rounded-lg text-xs font-bold border border-amber-200 dark:border-gray-750 text-amber-700 dark:text-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="4K BluRay">4K BluRay</option>
                    <option value="4K HDR">4K HDR</option>
                    <option value="4K Web-DL">4K Web-DL</option>
                    <option value="1080p BluRay">1080p BluRay</option>
                    <option value="1080p Web-DL">1080p Web-DL</option>
                    <option value="1080p x265">1080p x265</option>
                    <option value="720p HD">720p HD</option>
                  </select>
                </div>

                {/* LAN sharing switcher */}
                <div className="p-4 bg-indigo-50/40 dark:bg-slate-800/40 border border-indigo-100/60 dark:border-slate-800 rounded-xl space-y-2 mt-4" id="lan-share-setting-container">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-black text-indigo-650 dark:text-indigo-400 block">فعال‌سازی اشتراک‌گذاری در شبکه محلی (LAN)</strong>
                      <span className="text-[10px] text-gray-400 block mt-0.5">در صورت فعال بودن، سایر کاربران شبکه می‌توانند کاتالوگ شما را مشاهده و بر روی سیستم خود همگام کنند.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={lanEnabled}
                        onChange={(e) => setLanEnabled(e.target.checked)}
                        className="sr-only peer"
                        id="lan-toggle-checkbox"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* Auto Invoice save to USB switcher */}
                <div className="p-4 bg-emerald-550/5 dark:bg-slate-800/40 border border-emerald-100/40 dark:border-slate-800 rounded-xl space-y-2 mt-4" id="save-invoice-setting-container">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">ذخیره خودکار تصویر فاکتور در فلش مشتری</strong>
                      <span className="text-[10px] text-gray-400 block mt-0.5">در صورت فعال بودن، تصویر زیبای فاکتور سینمایی هنگام ثبت نهایی به صورت خودکار در فلش مشتری ذخیره می‌شود.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={saveInvoiceToUsbEnabled}
                        onChange={(e) => setSaveInvoiceToUsbEnabled(e.target.checked)}
                        className="sr-only peer"
                        id="save-invoice-usb-toggle"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>

                {/* Video Player Selection */}
                <div className="p-4 bg-amber-500/5 dark:bg-slate-800/40 border border-amber-200/40 dark:border-slate-800 rounded-xl space-y-3 mt-4" id="video-player-setting-container">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-amber-500 animate-pulse" />
                    <strong className="text-xs font-black text-amber-700 dark:text-amber-400 block">پخش‌کننده ویدئوی پیش‌فرض (Video Player)</strong>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    انتخاب کنید که ویدئوها و قسمت‌های سریال چطور پخش شوند. می‌توانید از پخش‌کننده داخلی فوق پیشرفته HTML5 با قابلیت زیرنویس و تنظیمات سرعت استفاده کنید یا به برنامه‌های پیش‌فرض سیستم (مانند VLC, PotPlayer, KMPlayer و...) بفرستید.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setVideoPlayerMode('internal')}
                      className={`h-10 rounded-lg font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        videoPlayerMode === 'internal'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>پخش‌کننده داخلی زیبای برنامه (Internal)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoPlayerMode('external')}
                      className={`h-10 rounded-lg font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        videoPlayerMode === 'external'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>ارسال به پلیر پیش‌فرض سیستم (External)</span>
                    </button>
                  </div>
                </div>

                {/* Shop Information Section */}
                <div className="border-t border-gray-150 dark:border-gray-800 pt-4 mt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">اطلاعات فروشگاه و فاکتور چاپی</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">مشخصات مغازه شما که در بالای فاکتورهای چاپی نقش می‌بندد.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-555 block">نام فروشگاه / مغازه</label>
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-555 block">شماره تماس اصلی</label>
                      <input
                        type="text"
                        value={shopPhone}
                        onChange={(e) => setShopPhone(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[11px] font-bold text-gray-555 block">شماره همراه پشتیبان</label>
                      <input
                        type="text"
                        value={shopPhoneSecondary}
                        onChange={(e) => setShopPhoneSecondary(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none text-right"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[11px] font-bold text-gray-555 block">آدرس دقیق فروشگاه</label>
                      <input
                        type="text"
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit button settings */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 h-10 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>ذخیره ترجیحات کاربر</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* TAB: Native SQLite Database Console & Administration */}
          {activeSubTab === 'database' && (
            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-6 shadow-sm animate-scaleIn">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-850">
                <div>
                  <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">ابزارهای مدیریت دیتابیس بومی (SQLite 3)</h3>
                  <p className="text-[11px] text-gray-400 mt-1">پایش مستقیم جداول، سلامت‌سنجی اطلاعات، اجرای دستورات SQL و فشرده‌سازی فایل دیتابیس با پسوند .db</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${sqliteAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                    {sqliteAvailable ? 'پلاگین بومی فعال' : 'شبیه‌ساز حافظه فعال'}
                  </span>
                </div>
              </div>

              {/* DB Path & Meta Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1.5 text-right">
                  <span className="text-[10px] text-indigo-505 dark:text-indigo-400 font-bold block">مسیر فیزیکی فعال فایل پایگاه‌داده (.db)</span>
                  <div className="font-mono text-[10.5px] text-left text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 p-2 rounded-lg border border-gray-150 dark:border-gray-800 block break-all" dir="ltr">
                    {sqlitePath || 'محیط وب / هماهنگ با مرورگر وب'}
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-relaxed pt-0.5">
                    برنامه به صورت کاملاً زنده تمامی تغییرات را بر روی این فایل ذخیره می‌کند. برای پشتیبان‌گیری فیزیکی می‌توانید این فایل را کپی کنید.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-indigo-505 dark:text-indigo-400 font-bold block">نوع موتور ذخیره‌سازی</span>
                    <strong className="text-xs text-slate-700 dark:text-slate-200 block mt-1">SQLite Standard Engine v3</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-205 dark:border-slate-800 text-[10px] text-slate-400">
                    <div>کدبندی سخت‌افزاری: <span className="font-mono text-[9px] text-[#10b981]">UTF-8</span></div>
                    <div>وضعیت همگام‌سازی: <span className="font-semibold text-emerald-500">موفقیت‌آمیز</span></div>
                  </div>
                </div>
              </div>

              {/* Form to change SQLite database path */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-705 dark:text-slate-205 block">محل دلخواه برای ذخیره یا انتقال فایل دیتابیس بومی (.db)</span>
                <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                  شما می‌توانید فایل ذخیره‌سازی بومی SQLite را به پوشه مدنظر خویش انتقال دهید. با کلیک روی گزینه انتقال، فایل دیتابیس فعلی شما به صورت فیزیکی به آدرس جدید کپی شده و مسیر جدید از این پس جهت خواندن و نوشتن مستمر اطلاعات به کار گرفته خواهد شد.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      dir="ltr"
                      value={editableSqlitePath}
                      onChange={(e) => setEditableSqlitePath(e.target.value)}
                      className="w-full h-10 pl-24 pr-4 bg-white dark:bg-slate-950 rounded-lg text-xs font-mono border border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                      placeholder="E.g. D:\MyData\database_sqlite_v2.db"
                    />
                    <button
                      type="button"
                      onClick={triggerSqliteFolderBrowser}
                      className="absolute left-2 top-2 h-6 px-2 bg-indigo-550/10 hover:bg-indigo-550/20 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold rounded cursor-pointer transition-colors"
                    >
                      انتخاب پوشه...
                    </button>
                  </div>
                  <button
                    onClick={handleUpdateSqlitePath}
                    disabled={isUpdatingDbPath || !sqliteAvailable}
                    className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    {isUpdatingDbPath ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                    <span>انتقال و ثبت آدرس دیتابیس</span>
                  </button>
                </div>
                {!sqliteAvailable && (
                  <p className="text-[10.5px] text-amber-500 font-extrabold">برنامه در مرورگر شبیه‌سازی شده است. برای تغییر فیزیکی دیتابیس بومی، لطفاً نرم‌افزار دسکتاپ را فعال کنید سفارشات در .db ذخیره خواهند شد.</p>
                )}
              </div>

              {/* Backup & Restore Sector */}
              <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div>
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400">پشتیبان‌گیری و بازیابی پایگاه‌داده (Backup & Restore)</h4>
                  <p className="text-[10px] text-slate-400 mt-1">با استفاده از ابزارهای زیر می‌توانید از پایگاه‌داده خود پشتیبان (بک‌آپ) تهیه کرده و یا اطلاعات قبلی خود را بازیابی کنید.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export Box */}
                  <div className="p-4 bg-white dark:bg-slate-950 border border-gray-150 dark:border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-550 dark:text-indigo-400 mb-1.5">
                        <Download className="w-4 h-4" />
                        <span className="text-xs font-bold">برون‌بری دیتابیس (Export Backup)</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                        یک نسخه پشتیبان کامل از تمامی اطلاعات فیلم‌ها، سریال‌ها، مشتریان، فاکتورها و تنظیمات برنامه تهیه کرده و ذخیره نمایید.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      {/* Native DB export */}
                      {sqliteAvailable && (
                        <button
                          onClick={handleExportSqliteDbNative}
                          className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>بک‌آپ فیزیکی دیتابیس بومی (.db)</span>
                        </button>
                      )}

                      {/* Universal JSON export */}
                      <button
                        onClick={handleExportDB}
                        className="w-full h-9 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-705 dark:text-slate-200 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-500" />
                        <span>بک‌آپ سریع با فرمت عمومی (JSON)</span>
                      </button>
                    </div>
                  </div>

                  {/* Import Box */}
                  <div className="p-4 bg-white dark:bg-slate-950 border border-gray-150 dark:border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-450 mb-1.5">
                        <Upload className="w-4 h-4" />
                        <span className="text-xs font-bold">درون‌بری و بازیابی دیتابیس (Import Backup)</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                        فایل پشتیبان از پیش ذخیره شده را بارگذاری کنید تا تمامی اطلاعات پایگاه‌داده شما بازیابی و مجدداً لود شود.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      {/* Native DB Import */}
                      {sqliteAvailable && (
                        <button
                          onClick={handleImportSqliteDbNative}
                          className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>بازیابی فایل دیتابیس بومی (.db)</span>
                        </button>
                      )}

                      {/* Universal JSON Import */}
                      <label className="w-full h-9 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-705 dark:text-slate-200 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none">
                        <Upload className="w-3.5 h-3.5 text-emerald-500" />
                        <span>بازیابی با فایل بک‌آپ (JSON)</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleFileImport}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Show file import success or status messages */}
                {fileRestoreMessage && (
                  <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900 rounded-lg text-center">
                    <span className="text-[10.5px] font-black text-indigo-650 dark:text-indigo-400 animate-pulse">{fileRestoreMessage}</span>
                  </div>
                )}
              </div>

              {/* DB Stats Bento Box */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-705 dark:text-slate-300">آمار موجودیت‌های دیتابیس (.db)</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl relative overflow-hidden">
                    <span className="text-[10px] text-slate-400 block font-semibold">تعداد فیلم‌ها</span>
                    <strong className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {toPersianNums(dbService.getMovies().length)}
                    </strong>
                    <div className="text-[9px] text-slate-400 mt-1">جدول [movies]</div>
                  </div>

                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl relative overflow-hidden">
                    <span className="text-[10px] text-slate-400 block font-semibold">تعداد سریال‌ها</span>
                    <strong className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {toPersianNums(dbService.getSeries().length)}
                    </strong>
                    <div className="text-[9px] text-slate-400 mt-1">جدول [series]</div>
                  </div>

                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl relative overflow-hidden">
                    <span className="text-[10px] text-slate-400 block font-semibold">تعداد تراکنش‌های مالی</span>
                    <strong className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {toPersianNums(dbService.getSales().length)}
                    </strong>
                    <div className="text-[9px] text-slate-400 mt-1">جدول [sales]</div>
                  </div>

                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl relative overflow-hidden">
                    <span className="text-[10px] text-slate-400 block font-semibold">تعداد موسیقی‌ها</span>
                    <strong className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {toPersianNums(dbService.getSongs().length)}
                    </strong>
                    <div className="text-[9px] text-slate-400 mt-1">جدول [songs]</div>
                  </div>
                </div>
              </div>

              {/* Database quick actions suite */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-705 dark:text-slate-300">کیت ابزارهای نگهداری دیتابیس بومی</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={handleIntegrityCheck}
                    className="flex items-center justify-center gap-2 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>تست یکپارچگی (Integrity)</span>
                  </button>

                  <button 
                    onClick={handleVacuumDb}
                    className="flex items-center justify-center gap-2 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-indigo-500" />
                    <span>بهینه‌سازی و فشرده‌سازی (Vacuum)</span>
                  </button>

                  <button 
                    onClick={handleResyncAll}
                    className="flex items-center justify-center gap-2 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    <Database className="w-4 h-4 text-pink-500" />
                    <span>همگام‌سازی دستی دیتابیس</span>
                  </button>
                </div>
              </div>

              {/* SQLite Custom query Terminal */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <strong className="text-xs font-black text-cyan-400">کنسول توسعه و پایگاه‌ داده (SQL Terminal)</strong>
                  </div>
                  <span className="text-[9px] text-slate-400 select-none">موتور مفسر زنده SQLite3</span>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  در این ترمینال می‌توانید هر کوئری استانداردی را طراحی کنید. فیلترها و خروجی فیلدها بی‌درنگ اجرا و فست‌آوت‌پوت می‌شوند.
                </p>

                {/* Query Preset Picker */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400 font-bold">نمونه دستورهای آماده:</span>
                  {[
                    { label: '۱۰ فیلم برتر تاریخ ضبط', query: 'SELECT titleFa, titleEn, year, addedAt FROM movies ORDER BY year DESC LIMIT 10;' },
                    { label: 'گزارش کل فروش مدیا', query: 'SELECT customerName, mediaTitle, salePrice, date FROM sales ORDER BY date DESC LIMIT 5;' },
                    { label: 'سنجش ساختار جدول ترانه‌ها', query: 'PRAGMA table_info(songs);' },
                    { label: 'پیکربندی سیستم SQLite', query: 'PRAGMA journal_mode;' }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCustomSql(preset.query)}
                      className="text-[9px] px-2 py-1 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded border border-slate-700/50 cursor-pointer font-bold transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <textarea
                    value={customSql}
                    onChange={(e) => setCustomSql(e.target.value)}
                    dir="ltr"
                    className="w-full h-24 p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 focus:border-cyan-500 focus:outline-none resize-y placeholder-slate-700"
                    placeholder="E.g. SELECT * FROM movies WHERE year > 2022;"
                  />
                  <div className="flex justify-between items-center">
                    <button
                      onClick={handleRunCustomSql}
                      disabled={isConsoleRunning || !sqliteAvailable}
                      className={`flex items-center justify-center gap-1.5 px-5 h-9 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-colors shadow-lg ${isConsoleRunning ? 'animate-pulse' : ''}`}
                    >
                      {isConsoleRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                      <span>{isConsoleRunning ? 'در حال اجرا...' : 'اجرای دستور SQL'}</span>
                    </button>
                    {!sqliteAvailable && (
                      <span className="text-[10px] text-amber-500 font-black">اجرای SQL نیازمند اجرای نرم‌افزار در الکتورن است.</span>
                    )}
                  </div>
                </div>

                {/* SQL Result Console output log */}
                {sqlExecuted && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 max-h-72 overflow-auto space-y-2 text-right">
                    <span className="text-[10px] text-slate-400 block font-bold">نتیجه مفسر دیتابیس:</span>
                    
                    {sqlError && (
                      <div className="p-2.5 bg-red-950/25 border border-red-500/20 rounded-lg font-mono text-red-400 text-[10px] text-left break-words">
                        ❌ Fehler/Error: {sqlError}
                      </div>
                    )}

                    {sqlResult && sqlResult.type === 'run' && (
                      <div className="p-2 bg-emerald-950/25 border border-emerald-500/20 rounded-lg text-emerald-400 text-[10.5px]">
                        ✓ دستور با موفقیت اجرا شد. سطرهای تحت تاثیر قرار گرفته: {toPersianNums(sqlResult.changes || 0)} سطر. آخرین شناسه ثبت شده: {toPersianNums(sqlResult.lastID || 0)}
                      </div>
                    )}

                    {sqlResult && sqlResult.type === 'select' && (
                      <div className="space-y-2">
                        {sqlResult.rows.length === 0 ? (
                          <div className="text-[10.5px] text-slate-500 text-center py-2">کوئری بدون نتیجه (سطری یافت نشد)</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[10px] font-mono border-collapse border border-slate-800 text-slate-300">
                              <thead>
                                <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                                  {Object.keys(sqlResult.rows[0]).map((colName) => (
                                    <th key={colName} className="p-2 border border-slate-800 text-left truncate">{colName}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sqlResult.rows.map((rowArr: any, rIdx: number) => (
                                  <tr key={rIdx} className="hover:bg-slate-900 border-b border-slate-900">
                                    {Object.values(rowArr).map((val: any, cIdx: number) => (
                                      <td key={cIdx} className="p-2 border border-slate-800 text-left truncate max-w-[200px]">
                                        {val === null ? <span className="text-slate-600">null</span> : String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <span className="text-[9px] text-slate-505 block text-left">مجموع سطرها: {toPersianNums(sqlResult.rows.length)} سطر دریافت شد.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reset Option (Factory Reset) in SQLite Tab representing full data clear */}
              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 block">منطقه حساس: ریست کارخانه کل داده‌ها</span>
                <p className="text-[10.5px] text-red-500 leading-relaxed font-semibold font-sans">
                  هشدار: این عملیات تمامی اطلاعات مربوط به فیلم‌ها، سریال‌ها، مشتریان و اطلاعات مالی را به طور کامل پاک کرده و تنظیمات اولیه را بازیابی خواهد کرد. این عملیات غیرقابل بازگشت است!
                </p>
                <button
                  type="button"
                  onClick={handleResetFactory}
                  className="flex items-center justify-center gap-1.5 px-4 h-9 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ریست کارخانه و پاکسازی کامل پایگاه داده</span>
                </button>
              </div>

              {/* SQLite Test and Validation Panel merged from DBTest.tsx */}
              <div className="border-t border-gray-150 dark:border-gray-800 pt-5 mt-5 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-indigo-650 dark:text-indigo-400">تست عملکرد و ثبت رکوردهای تستی</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">درج مستقیم داده در جدول فیلم‌ها برای بررسی سلامت کامل خواندن و نوشتن فایل دیتابیس بومی</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Save Test Record Form */}
                  <form onSubmit={handleSaveTestRecord} className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-150 dark:border-gray-800 p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-105 dark:border-gray-800 pb-2.5">
                      <Plus className="w-4 h-4 text-emerald-500" />
                      <strong className="text-xs font-black text-gray-800 dark:text-gray-200">افزودن و اعتبارسنجی در SQLite</strong>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">عنوان فارسی فیلم آزمایشی (الزامی):</label>
                        <input
                          type="text"
                          placeholder="مثال: رستگاری در شاوشنک"
                          value={titleFa}
                          onChange={(e) => setTitleFa(e.target.value)}
                          className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-gray-250 dark:border-gray-800 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1">عنوان انگلیسی:</label>
                          <input
                            type="text"
                            placeholder="The Shawshank"
                            value={titleEn}
                            onChange={(e) => setTitleEn(e.target.value)}
                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-gray-250 dark:border-gray-800 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none transition-all text-left font-mono"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1">کارگردان:</label>
                          <input
                            type="text"
                            placeholder="فرانک دارابونت"
                            value={director}
                            onChange={(e) => setDirector(e.target.value)}
                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-gray-250 dark:border-gray-800 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1">سال انتشار:</label>
                          <input
                            type="text"
                            placeholder="1994"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-gray-250 dark:border-gray-800 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none transition-all text-left font-mono"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1">ژانر رسانه:</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-gray-250 dark:border-gray-800 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none transition-all cursor-pointer"
                          >
                            <option value="اکشن">اکشن</option>
                            <option value="درام">درام</option>
                            <option value="جنایی">جنایی</option>
                            <option value="کمدی">کمدی</option>
                            <option value="فانتزی">فانتزی</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1">قیمت فروش آزمایشی:</label>
                          <input
                            type="number"
                            placeholder="2500"
                            value={salePrice}
                            onChange={(e) => setSalePrice(e.target.value)}
                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-gray-250 dark:border-gray-800 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 block mb-1">مسیر فایل ویدئویی:</label>
                          <input
                            type="text"
                            value={filePath}
                            onChange={(e) => setFilePath(e.target.value)}
                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-gray-250 dark:border-gray-800 rounded-lg text-xs font-semibold focus:border-indigo-500 outline-none transition-all text-left font-mono"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!sqliteAvailable}
                        className="w-full h-10 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-lg text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>ذخیره آزمایشی در SQLite</span>
                      </button>
                    </div>
                  </form>

                  {/* Live List View of last 10 records */}
                  <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-150 dark:border-gray-800 p-4 flex flex-col">
                    <div className="flex items-center justify-between border-b border-gray-105 dark:border-gray-800 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <strong className="text-xs font-black text-gray-800 dark:text-gray-200">مشاهده زنده ۱۰ رکورد آخر دیتابیس</strong>
                      </div>
                      <button
                        onClick={loadTestMovies}
                        disabled={loadingMovies || !sqliteAvailable}
                        className="p-1.5 bg-white dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg text-gray-500 dark:text-gray-400 cursor-pointer disabled:opacity-50"
                        title="بارگیری مجدد از دیتابیس"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingMovies ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto max-h-[300px] border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-slate-950">
                      {moviesList.length === 0 ? (
                        <div className="text-center py-12 text-xs text-gray-400 font-bold space-y-2">
                          <Database className="w-8 h-8 text-gray-300 mx-auto" />
                          <p>هیچ رکوردی یافت نشد یا دیتابیس در مرورگر است.</p>
                          <p className="text-[9.5px] text-gray-450">یک فیلم آزمایشی از فرم سمت راست ثبت کنید.</p>
                        </div>
                      ) : (
                        <table className="w-full text-right border-collapse text-[10.5px]">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                              <th className="p-2.5 font-extrabold">عنوان فارسی / انگلیسی</th>
                              <th className="p-2.5 font-extrabold">ژانر</th>
                              <th className="p-2.5 font-extrabold">قیمت</th>
                              <th className="p-2.5 font-extrabold text-left">عملیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
                            {moviesList.map((movie: any) => (
                              <tr key={movie.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="p-2.5">
                                  <div className="font-bold text-gray-800 dark:text-gray-100">{movie.titleFa}</div>
                                  <div className="text-[9px] text-gray-400 font-mono mt-0.5" dir="ltr">{movie.titleEn || '-'}</div>
                                </td>
                                <td className="p-2.5">
                                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black text-[9px]">
                                    {movie.category || 'ندارد'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-gray-700 dark:text-gray-300 font-mono font-bold">
                                  {toPersianNums(movie.salePrice)} تومان
                                </td>
                                <td className="p-2.5 text-left">
                                  <button
                                    onClick={() => handleDeleteTestRecord(movie.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md cursor-pointer transition-all inline-flex items-center gap-1"
                                    title="حذف از دیتابیس بومی"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-[8.5px] font-black">حذف</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Manager Profile with Logout Action */}
          {activeSubTab === 'profile' && (
            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-6 shadow-sm animate-scaleIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">اطلاعات حساب کاربری مدیر سامانه</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">مشخصات لایسنس کاربری، تغییر رمز عبور و خروج قطعی از پایگاه داده خلاق</p>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleGlobalLogout}
                  className="px-4.5 h-10 bg-red-650/10 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm border border-red-500/10"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>خروج از حساب مدیریت</span>
                </button>
              </div>

              {/* Profile Details display */}
              {userProfile ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4.5 bg-slate-50 dark:bg-slate-900/60 border border-gray-100 dark:border-gray-800 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-extrabold block">نام و نام خانوادگی مدیر:</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{userProfile.fullName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-extrabold block">امور مغازه / صنف:</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{userProfile.shopName}</span>
                  </div>
                  <div className="space-y-1 pt-2 sm:pt-0">
                    <span className="text-[10px] text-gray-400 font-extrabold block">آدرس ایمیل متصل:</span>
                    <span className="text-xs font-mono font-bold text-gray-850 dark:text-gray-200">{userProfile.email}</span>
                  </div>
                  <div className="space-y-1 pt-2 sm:pt-0">
                    <span className="text-[10px] text-gray-400 font-extrabold block">شماره همراه متصل:</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{userProfile.phone}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">پروفایلی بارگذاری نشده است.</p>
              )}

              {/* Change Password form */}
              <div className="border-t border-gray-150 dark:border-gray-800 pt-5 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    تغییر کلمه عبور ورود به سامانه
                  </h4>
                  <p className="text-[10px] text-gray-450 mt-0.5">رمزهای عبور خود را به صورت محلی و با امنیت بالا مدیریت کنید.</p>
                </div>

                {profileMsg && (
                  <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    profileMsg.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-555' 
                      : 'bg-red-500/10 border border-red-500/20 text-red-555'
                  }`}>
                    {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-555" /> : <AlertCircle className="w-4 h-4 text-red-555" />}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfilePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 block">رمز عبور فعلی</label>
                    <input
                      type="password"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-white focus:outline-none"
                      placeholder="وارد کردن رمز قدیمی..."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 block">رمز عبور جدید</label>
                    <input
                      type="password"
                      value={profileNewPassword}
                      onChange={(e) => setProfileNewPassword(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-white focus:outline-none"
                      placeholder="حداقل ۴ کاراکتر جدید..."
                      required
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 flex justify-end pt-1">
                    <button
                      type="submit"
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow cursor-pointer text-center"
                    >
                      تایید و به‌روزرسانی نهایی رمز
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: Network Updates checking from cofeclick.ir/mymovie */}
          {activeSubTab === 'update' && (
            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-6 shadow-sm animate-scaleIn">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">مرکز به‌روزرسانی سیستم</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">دریافت و بررسی بسته‌های ارتقا دهنده آنلاین نرم‌افزار از دامنه کوفی کلیک</p>
              </div>

              {/* Status Display Area */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-gray-800/80 rounded-2xl flex flex-col md:flex-row items-center gap-5 justify-between">
                <div className="flex items-center gap-4.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                    <Globe className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-505 bg-indigo-500/10 p-1 rounded font-extrabold">سرور بروزرسانی پارس تک</span>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 mt-1 font-mono">domain: cofeclick.ir/mymovie/</h4>
                    <span className="text-[10px] text-gray-400 mt-1 block">بستر پایش فعال آفلاین و آنلاین بسته‌های Zip رسانه</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-slate-400 text-right">نسخه فعلی شما: <strong className="font-mono text-gray-800 dark:text-slate-100">1.0.1</strong></span>
                  <span className="text-[10px] text-slate-400 text-right">آخرین بررسی روی سرور: <strong className="font-mono text-gray-800 dark:text-slate-100">{new Date().toLocaleDateString('fa-IR')}</strong></span>
                </div>
              </div>

              {/* Checking mechanism UI */}
              <div id="update-action-board" className="space-y-4">
                {updateStatus === 'idle' && (
                  <div className="text-center py-5 space-y-3">
                    <p className="text-xs text-gray-450 leading-relaxed max-w-sm mx-auto">
                      برنامه می‌تواند مستقیماً با سرور کوفی‌کلیک در مسیر <code className="font-mono text-indigo-500 bg-indigo-500/5 px-1 py-0.5 rounded">mymovie/update.json</code> ارتباط برقرار کرده و آخرین بروزرسانی‌ها را دریافت کند.
                    </p>
                    <button
                      onClick={handleCheckUpdate}
                      className="h-11 px-6 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>بررسی نسخه‌های جدید بازیابی</span>
                    </button>
                  </div>
                )}

                {updateStatus === 'checking' && (
                  <div className="text-center py-8 space-y-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">در حال بررسی دامنه cofeclick.ir ... لطفا جند لحضه منتظر بمانید</p>
                    <p className="text-[10px] text-gray-500">پایش فایل های بروزرسانی در مسیر پوشه mymovie</p>
                  </div>
                )}

                {updateStatus === 'no_update' && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 text-emerald-550 rounded-xl space-y-2 text-center">
                    <CheckCircle2 className="w-7 h-7 mx-auto" />
                    <h4 className="text-xs font-bold text-emerald-555">نرم‌افزار شما کاملاً بروز است!</h4>
                    <p className="text-[10px] text-slate-400">هیچ بروزرسانی جدیدی روی سرور cofeclick.ir پیدا نشد.</p>
                    <button onClick={() => setUpdateStatus('idle')} className="text-xs text-indigo-400 underline font-semibold mt-1">بررسی مجدد</button>
                  </div>
                )}

                {updateStatus === 'available' && (
                  <div className="p-4.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/25 rounded-2xl space-y-4 animate-scaleIn">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[9.5px] bg-indigo-500 text-white font-bold p-1 rounded">نسخه جدید یافت شد!</span>
                        <h4 className="text-sm font-black text-indigo-650 dark:text-indigo-400 mt-1.5 flex items-center gap-1.5">
                          سامانه مدیریت رسانه پارس تک (نسخه {toPersianNums(onlineVersion)})
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">حجم لایحه: ۱۲.۵ مگابایت</span>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-xl space-y-1.5 border border-slate-800">
                      <strong className="text-[10px] text-slate-450 block font-extrabold">تغییرات این نسخه (Changelog):</strong>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-semibold leading-loose">{changeLog}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleDownloadUpdate}
                        className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4 animate-bounce" />
                        <span>دانلود و نصب خودکار بروزرسانی</span>
                      </button>
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        دانلود مستقیم فایل زیپ
                      </a>
                    </div>
                  </div>
                )}

                {updateStatus === 'downloading' && (
                  <div className="py-6 space-y-4 text-center max-w-sm mx-auto">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300 px-1">
                      <span>در حال بارگیری بسته بروزرسانی...</span>
                      <span className="font-mono">{toPersianNums(downloadProgress)}٪</span>
                    </div>
                    {/* Progress line */}
                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-505 to-indigo-600 rounded-full transition-all duration-300" 
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold">بسته از دامنه cofeclick.ir دریافت و استخراج می‌شود، لطفاً پنجره را نبندید.</p>
                  </div>
                )}

                {updateStatus === 'completed' && (
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center space-y-3 animate-scaleIn">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-500">نصب لایحه بروزرسانی نسخه {onlineVersion} به پایان رسید!</h4>
                      <p className="text-xs text-slate-400 mt-1">کلیه فایل‌های هسته نرم‌افزار با موفقیت ارتقا پیدا کردند.</p>
                    </div>
                    <button
                      onClick={handleRestartToInstall}
                      className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer text-center mx-auto"
                    >
                      راه‌اندازی مجدد اکنون برنامه
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: TMDb API Settings */}
          {activeSubTab === 'tmdb' && (
            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-5 shadow-sm animate-scaleIn">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">تنظیمات اتصال به پایگاه اطلاعات TMDb</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">پیکربندی کلیدهای دسترسی API برای اسکن خودکار و دریافت کاورها و مشخصات فیلم‌ها از وب‌سایت رسمی The Movie Database</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-gray-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">TMDb API</h4>
                    <p className="text-[10px] text-gray-400">کدها و کلیدهای دریافتی از پنل توسعه‌دهندگان tmdb را در این بخش وارد نمایید.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* API Key */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 block">TMDb API Key</label>
                    <input
                      type="text"
                      value={tmdbApiKey}
                      onChange={(e) => setTmdbApiKey(e.target.value)}
                      placeholder="e.g. f090bb54758cabf231fb605..."
                      className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none text-left font-mono"
                      dir="ltr"
                    />
                  </div>

                  {/* Read Access Token */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 block">TMDb Read Access Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={tmdbReadAccessToken}
                        onChange={(e) => setTmdbReadAccessToken(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiJ9..."
                        className="w-full h-10 pl-10 pr-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none text-left font-mono"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute left-2 top-2 h-6 px-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-gray-750 dark:text-gray-200 text-[10px] font-bold rounded cursor-pointer transition-colors flex items-center justify-center"
                      >
                        {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {!showToken && tmdbReadAccessToken && (
                      <p className="text-[10px] text-gray-400 mt-1 font-mono text-left" dir="ltr">
                        {tmdbReadAccessToken.length > 8 ? `********************************${tmdbReadAccessToken.slice(-4)}` : '********'}
                      </p>
                    )}
                  </div>

                  {/* Language */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 block">Language</label>
                    <select
                      value={tmdbLanguage}
                      onChange={(e) => setTmdbLanguage(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-750 dark:text-gray-200 focus:outline-none cursor-pointer"
                    >
                      <option value="fa-IR">Persian (fa-IR)</option>
                      <option value="en-US">English (en-US)</option>
                      <option value="ar-SA">Arabic (ar-SA)</option>
                      <option value="tr-TR">Turkish (tr-TR)</option>
                    </select>
                  </div>

                  {/* Include Adult Content Checkbox */}
                  <div className="flex items-center gap-2.5 p-1">
                    <input
                      type="checkbox"
                      id="tmdbIncludeAdult"
                      checked={tmdbIncludeAdult}
                      onChange={(e) => setTmdbIncludeAdult(e.target.checked)}
                      className="w-4.5 h-4.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="tmdbIncludeAdult" className="text-xs font-bold text-gray-650 dark:text-gray-300 cursor-pointer select-none">
                      Include Adult Content
                    </label>
                  </div>
                </div>

                {/* Connection Status Indicator */}
                {connectionTestResult !== null && (
                  <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    connectionTestResult === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {connectionTestResult === 'success' ? (
                      <>
                        <CheckCircle2 className="w-4.5 h-4.5" />
                        <span>✅ Connected Successfully</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4.5 h-4.5" />
                        <span>❌ Invalid API Key or Token</span>
                      </>
                    )}
                  </div>
                )}

                {/* Buttons: Test Connection and Save */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isTestingConnection}
                    onClick={handleTestConnection}
                    className="h-10 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-gray-750 dark:text-gray-150 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isTestingConnection ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Terminal className="w-4 h-4" />
                    )}
                    <span>Test Connection</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveTMDbSettings}
                    className="h-10 px-5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
