/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  Database, 
  FolderOpen, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Terminal, 
  FileText, 
  Info,
  Server,
  Play
} from 'lucide-react';
import { toPersianNums } from './Dashboard';
import { showToast } from '../utils/toast';

interface SQLiteMovieTest {
  id: string;
  titleFa: string;
  titleEn: string;
  director: string;
  year: string;
  category: string;
  salePrice: number;
  filePath: string;
}

export default function DBTest() {
  const [dbPath, setDbPath] = useState<string>('');
  const [sqliteAvailable, setSqliteAvailable] = useState<boolean>(false);
  const [moviesList, setMoviesList] = useState<SQLiteMovieTest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Form Fields
  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [director, setDirector] = useState('');
  const [year, setYear] = useState('');
  const [category, setCategory] = useState('اکشن');
  const [salePrice, setSalePrice] = useState('2500');
  const [filePath, setFilePath] = useState('D:\\Movies\\test_file.mkv');

  // SQL console
  const [customSql, setCustomSql] = useState('SELECT * FROM movies ORDER BY addedAt DESC LIMIT 10;');
  const [consoleResult, setConsoleResult] = useState<any>(null);

  useEffect(() => {
    checkSqliteStatus();
    loadTestMovies();
  }, []);

  const checkSqliteStatus = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (window.electronAPI.isSqliteAvailable) {
        const isAvail = await window.electronAPI.isSqliteAvailable();
        setSqliteAvailable(isAvail);
      }
      if (window.electronAPI.getDbFilePath) {
        const path = await window.electronAPI.getDbFilePath();
        setDbPath(path);
      }
    }
  };

  const loadTestMovies = async () => {
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.runSql) {
      return;
    }
    setLoading(true);
    try {
      const res = await window.electronAPI.runSql('SELECT * FROM movies ORDER BY addedAt DESC LIMIT 10;');
      if (res.success && res.rows) {
        setMoviesList(res.rows as SQLiteMovieTest[]);
      }
    } catch (err) {
      console.error('Error loading movies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeDbPath = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      Swal.fire({
        title: 'خطا',
        text: 'محیط وب قادر به تغییر مسیر دیتابیس لوکال نیست.',
        icon: 'error',
        confirmButtonText: 'متوجه شدم',
        confirmButtonColor: '#4f46e5',
        customClass: {
          popup: 'rounded-2xl font-sans'
        }
      });
      return;
    }

    // Prompt user using SweetAlert2
    const { value: newPathInput } = await Swal.fire({
      title: 'تغییر مسیر ذخیره دیتابیس',
      text: 'لطفاً مسیر فیزیکی پوشه یا فایل دیتابیس SQLite (.db) خود را وارد کنید:',
      input: 'text',
      inputValue: dbPath,
      showCancelButton: true,
      confirmButtonText: 'بروزرسانی مسیر',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      inputPlaceholder: 'E.g. D:\\MyDatabase\\database_sqlite_v2.db',
      customClass: {
        popup: 'rounded-2xl font-sans',
        input: 'text-left font-mono text-xs p-3'
      },
      inputValidator: (value) => {
        if (!value) {
          return 'مسیر دیتابیس نمی‌تواند خالی باشد!';
        }
        return null;
      }
    });

    if (newPathInput) {
      try {
        Swal.fire({
          title: 'در حال اعمال تغییرات...',
          text: 'سیستم در حال انتقال ارتباط به مسیر جدید است.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const success = await window.electronAPI.setSqliteDbPath(newPathInput);
        if (success) {
          await checkSqliteStatus();
          await loadTestMovies();
          Swal.fire({
            title: 'عملیات موفقیت‌آمیز',
            text: `مسیر دیتابیس با موفقیت به ${newPathInput} تغییر یافت و با better-sqlite3 مجدداً لود شد.`,
            icon: 'success',
            confirmButtonText: 'عالی',
            confirmButtonColor: '#10b981',
            customClass: { popup: 'rounded-2xl font-sans' }
          });
        } else {
          Swal.fire({
            title: 'خطا در جابجایی',
            text: 'سیستم نتوانست دیتابیس را در مسیر درخواستی ایجاد یا بازخوانی کند.',
            icon: 'error',
            confirmButtonText: 'تلاش مجدد',
            confirmButtonColor: '#ef4444',
            customClass: { popup: 'rounded-2xl font-sans' }
          });
        }
      } catch (err: any) {
        Swal.fire({
          title: 'خطای غیرمنتظره',
          text: err.message || 'مشکلی رخ داده است.',
          icon: 'error',
          confirmButtonText: 'بستن',
          confirmButtonColor: '#ef4444',
          customClass: { popup: 'rounded-2xl font-sans' }
        });
      }
    }
  };

  const handleSelectDirectoryAndSet = async () => {
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.selectDirectory) {
      return;
    }
    try {
      const selectedDir = await window.electronAPI.selectDirectory();
      if (selectedDir) {
        Swal.fire({
          title: 'در حال اعمال تغییرات...',
          text: 'سیستم در حال انتقال ارتباط به پوشه جدید است.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const success = await window.electronAPI.setSqliteDbPath(selectedDir);
        if (success) {
          await checkSqliteStatus();
          await loadTestMovies();
          Swal.fire({
            title: 'مسیر دیتابیس لود شد',
            text: `پوشه انتخابی با موفقیت ثبت شد و فایل دیتابیس در آن تنظیم گردید.`,
            icon: 'success',
            confirmButtonText: 'فهمیدم',
            confirmButtonColor: '#10b981',
            customClass: { popup: 'rounded-2xl font-sans' }
          });
        }
      }
    } catch (err: any) {
      Swal.fire({
        title: 'خطا در انتخاب پوشه',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'تایید',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-2xl font-sans' }
      });
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
            <div className="text-right space-y-2 text-xs text-gray-600 dark:text-gray-350" dir="rtl">
              <p>داده آزمایشی شما با موفقیت با متد <strong>better-sqlite3</strong> ذخیره شد.</p>
              <div className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg font-mono text-[11px] text-left overflow-x-auto mt-2 space-y-1">
                <div><strong>شناسه رکورد (ID):</strong> <span className="text-indigo-600 dark:text-indigo-400 font-bold">${testId}</span></div>
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

  const handleExecuteConsoleSql = async () => {
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.runSql) {
      return;
    }
    try {
      const res = await window.electronAPI.runSql(customSql);
      if (res.success) {
        setConsoleResult(res.rows || { success: true, changes: res.changes, lastID: res.lastID });
        showToast('کوئری با موفقیت اجرا شد.', 'success');
      } else {
        setConsoleResult({ success: false, error: res.error });
        showToast('اجرای کوئری با خطا مواجه شد.', 'error');
      }
    } catch (err: any) {
      setConsoleResult({ success: false, error: err.message });
      showToast('خطای نامنتظره در اجرا', 'error');
    }
  };

  return (
    <div className="space-y-6" id="dbtest-page-content">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-indigo-850 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-650 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/35">
              <Database className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">پنل تست و عیب‌یابی پایداری دیتابیس SQLite</h2>
              <p className="text-xs text-indigo-300 font-semibold mt-1">
                تست موتور ذخیره‌سازی بومی بهتروسریع‌تر <strong className="text-amber-400">better-sqlite3</strong> با رابط کاربری SweetAlert2
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${sqliteAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-xs font-black bg-indigo-900/60 border border-indigo-800/80 px-3 py-1.5 rounded-full">
              {sqliteAvailable ? 'موتور بومی better-sqlite3: فعال و آنلاین' : 'پلاگین بومی: غیرفعال / مرورگر وب'}
            </span>
          </div>
        </div>
      </div>

      {/* Database Location card */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-150 dark:border-gray-800/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            <strong className="text-sm font-black text-gray-850 dark:text-gray-150">مسیر فیزیکی دیتابیس لوکال</strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectDirectoryAndSet}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-black cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>انتخاب پوشه دیتابیس</span>
            </button>
            <button
              onClick={handleChangeDbPath}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تغییر یا بازنویسی مسیر</span>
            </button>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-150 dark:border-gray-850 flex items-center justify-between font-mono text-[11px] overflow-x-auto text-left" dir="ltr">
          <span className="text-gray-700 dark:text-gray-300 font-bold break-all select-all pr-4">{dbPath || 'Browser IndexedDB Temporary Storage'}</span>
          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-extrabold px-2 py-0.5 rounded shrink-0">PATH</span>
        </div>
        <p className="text-[10.5px] text-gray-400 leading-relaxed font-semibold">
          💡 پایگاه‌داده برنامه بر روی مسیر فوق در حافظه ثابت هارد ذخیره می‌شود. پس از بستن و بازکردن برنامه، کلیه اطلاعات حفظ می‌شوند و از دست نخواهند رفت.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Save Test Record Form */}
        <form onSubmit={handleSaveTestRecord} className="lg:col-span-5 bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-150 dark:border-gray-800/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Plus className="w-5 h-5 text-emerald-500" />
            <strong className="text-sm font-black text-gray-850 dark:text-gray-150">افزودن و اعتبارسنجی در SQLite</strong>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">عنوان فارسی فیلم آزمایشی (الزامی):</label>
              <input
                type="text"
                placeholder="مثال: رستگاری در شاوشنک"
                value={titleFa}
                onChange={(e) => setTitleFa(e.target.value)}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">عنوان انگلیسی:</label>
                <input
                  type="text"
                  placeholder="The Shawshank Redemption"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">کارگردان:</label>
                <input
                  type="text"
                  placeholder="فرانک دارابونت"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">سال انتشار:</label>
                <input
                  type="text"
                  placeholder="1994"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">دسته بندی رسانه:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all cursor-pointer"
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
                <label className="text-[11px] font-bold text-gray-400 block mb-1">قیمت فروش آزمایشی (تومان):</label>
                <input
                  type="number"
                  placeholder="2500"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">مسیر فایل ویدئویی فرضی:</label>
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:border-indigo-500 focus:bg-white outline-none transition-all text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ذخیره مستقیم در دیتابیس (.runSql)</span>
            </button>
          </div>
        </form>

        {/* Live List and Table View */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-150 dark:border-gray-800/80 p-5 shadow-sm flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <strong className="text-sm font-black text-gray-850 dark:text-gray-150">مشاهده زنده ۱۰ رکورد آخر ذخیره شده</strong>
            </div>
            <button
              onClick={loadTestMovies}
              disabled={loading}
              className="p-1.5 bg-gray-55 dark:bg-slate-800 hover:bg-gray-105 rounded-lg text-gray-500 dark:text-gray-400 cursor-pointer disabled:opacity-50"
              title="بارگیری مجدد از دیتابیس SQLite"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-auto max-h-[380px] border border-gray-150 dark:border-gray-850 rounded-xl">
            {moviesList.length === 0 ? (
              <div className="text-center py-16 text-xs text-gray-400 font-bold space-y-2">
                <Database className="w-10 h-10 text-gray-350 mx-auto" />
                <p>هیچ رکوردی در جدول فیلم‌ها یافت نشد یا دیتابیس خالی است.</p>
                <p className="text-[10px] text-gray-450">از فرم سمت راست یک فیلد تستی بسازید تا فوراً ذخیره و نمایش داده شود.</p>
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-950 text-gray-450 border-b border-gray-150 dark:border-gray-850">
                    <th className="p-3 font-extrabold">عنوان فارسی / انگلیسی</th>
                    <th className="p-3 font-extrabold">ژانر</th>
                    <th className="p-3 font-extrabold">کارگردان</th>
                    <th className="p-3 font-extrabold">قیمت</th>
                    <th className="p-3 font-extrabold text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                  {moviesList.map((movie) => (
                    <tr key={movie.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-gray-850 dark:text-gray-100">{movie.titleFa}</div>
                        <div className="text-[9.5px] text-gray-400 font-mono mt-0.5" dir="ltr">{movie.titleEn || '-'}</div>
                      </td>
                      <td className="p-3">
                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded font-black text-[10px]">
                          {movie.category || 'ندارد'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 dark:text-gray-400 font-medium">{movie.director || '-'}</td>
                      <td className="p-3 text-gray-700 dark:text-gray-300 font-mono font-bold">
                        {toPersianNums(movie.salePrice)} تومان
                      </td>
                      <td className="p-3 text-left">
                        <button
                          onClick={() => handleDeleteTestRecord(movie.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-all inline-flex items-center gap-1"
                          title="حذف از دیتابیس بومی"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[9px] font-black">حذف</span>
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

      {/* SQL Playground Live Terminal */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-150 dark:border-gray-800/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-500 animate-pulse" />
            <strong className="text-sm font-black text-gray-850 dark:text-gray-150">کنسول اجرای فرامین خام SQL (better-sqlite3)</strong>
          </div>
          <button
            onClick={handleExecuteConsoleSql}
            className="px-4.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            <span>اجرای کوئری SQL</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 block mb-1.5 font-bold">دستور SQL را در این کادر بنویسید:</span>
            <textarea
              dir="ltr"
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              placeholder="E.g. SELECT * FROM settings;"
              className="flex-1 min-h-36 p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border border-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 block mb-1.5 font-bold">خروجی و نتایج مفسر دیتابیس:</span>
            <div className="flex-1 min-h-36 p-3 bg-slate-950 text-sky-400 font-mono text-[10.5px] rounded-xl border border-gray-800 overflow-auto max-h-48" dir="ltr">
              {consoleResult ? (
                <pre>{JSON.stringify(consoleResult, null, 2)}</pre>
              ) : (
                <span className="text-gray-600 italic">هیچ درخواستی ارسال نشده است. دکمه اجرای کوئری را کلیک کنید.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
