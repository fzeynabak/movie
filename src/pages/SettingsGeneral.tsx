import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Database, FolderOpen, Save, Settings } from 'lucide-react';
import JalaliDatePicker from '../components/JalaliDatePicker';

const MySwal = withReactContent(Swal);

export default function SettingsGeneral() {
  const [dbPath, setDbPath] = useState('در حال دریافت...');
  const [accCodeStart, setAccCodeStart] = useState('1000');
  const [accCodeSuffix, setAccCodeSuffix] = useState('-ACC');
  const [currency, setCurrency] = useState<'rial' | 'toman'>('rial');
  const [fiscalYear, setFiscalYear] = useState('۱۴۰۵');
  const [fiscalYearStart, setFiscalYearStart] = useState('1405/01/01');
  const [fiscalYearEnd, setFiscalYearEnd] = useState('1405/12/29');

  useEffect(() => {
    fetchDbStats();
    fetchConfig();
  }, []);

  const fetchDbStats = async () => {
    if (window.electronAPI) {
      const stats = await window.electronAPI.getDbStats();
      if (stats) setDbPath(stats.path);
    }
  };

  const fetchConfig = async () => {
    if (window.electronAPI?.getConfig) {
      const config = await window.electronAPI.getConfig();
      if (config.accCodeStart) setAccCodeStart(config.accCodeStart);
      if (config.accCodeSuffix) setAccCodeSuffix(config.accCodeSuffix);
      if (config.currency) setCurrency(config.currency);
      if (config.fiscalYear) setFiscalYear(config.fiscalYear);
      if (config.fiscalYearStart) setFiscalYearStart(config.fiscalYearStart);
      if (config.fiscalYearEnd) setFiscalYearEnd(config.fiscalYearEnd);
    }
  }

  const handleChangePath = async () => {
    if (!window.electronAPI) {
      MySwal.fire('خطا', 'این قابلیت فقط در محیط دسکتاپ فعال است.', 'error');
      return;
    }
    
    const result = await window.electronAPI.changeDbPath();
    if (result.success) {
      setDbPath(result.path || '');
      MySwal.fire({
        icon: 'success',
        title: 'موفق',
        text: 'مسیر دیتابیس با موفقیت تغییر کرد و متصل شد.',
        confirmButtonText: 'باشه',
      });
    } else if (result.error) {
      MySwal.fire({
        icon: 'error',
        title: 'خطا',
        text: 'خطا در تغییر مسیر دیتابیس: ' + result.error,
        confirmButtonText: 'باشه',
      });
    }
  };

  const handleSaveConfig = async () => {
    if (!window.electronAPI?.saveConfig) return;
    try {
      await window.electronAPI.saveConfig({
        accCodeStart,
        accCodeSuffix,
        currency,
        fiscalYear,
        fiscalYearStart,
        fiscalYearEnd
      });
      MySwal.fire({
        icon: 'success',
        title: 'ذخیره شد',
        text: 'تنظیمات با موفقیت ذخیره شد.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
    } catch(e) {
      MySwal.fire('خطا', 'خطا در ذخیره تنظیمات', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">تنظیمات برنامه</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">پیکربندی کلی نرم‌افزار</p>
      </div>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/50 dark:border-slate-800/50">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" />
          تنظیمات دیتابیس پایگاه داده
        </h3>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">مسیر فعلی دیتابیس:</label>
          <div className="flex gap-3">
             <div className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-left dir-ltr overflow-hidden text-ellipsis whitespace-nowrap text-slate-600 dark:text-slate-300">
               {dbPath}
             </div>
             <button 
               onClick={handleChangePath}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none shadow-md shadow-indigo-500/20"
             >
               <FolderOpen className="w-4 h-4" />
               انتخاب پوشه جدید
             </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            با تغییر مسیر دیتابیس، مسیر در فایل config.json ذخیره شده و سری بعد از این مسیر لود می‌شود.
          </p>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/50 dark:border-slate-800/50">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-500" />
          تنظیمات کد حسابداری اشخاص
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 place-items-start">
          <div className="w-full">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">شروع عدد کد حسابداری:</label>
            <input 
              type="text" 
              value={accCodeStart}
              onChange={e => setAccCodeStart(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="w-full">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">پسوند کد حسابداری:</label>
            <input 
              type="text" 
              value={accCodeSuffix}
              onChange={e => setAccCodeSuffix(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-200 dir-ltr text-right"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
             onClick={handleSaveConfig}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
           >
             <Save className="w-4 h-4" />
             ذخیره تنظیمات
           </button>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/50 dark:border-slate-800/50">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          تنظیمات واحد پول و سال مالی
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 place-items-start">
          <div className="w-full">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">واحد پول برنامه:</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-bold"
            >
              <option value="rial">ریال (Rial)</option>
              <option value="toman">تومان (Toman)</option>
            </select>
          </div>
          <div className="w-full flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">سال مالی فعلی (عنوان):</label>
            <input 
              type="text" 
              value={fiscalYear}
              onChange={e => setFiscalYear(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 text-center font-bold"
              placeholder="مثال: ۱۴۰۵"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 place-items-start mt-6 w-full">
          <div className="w-full">
            <JalaliDatePicker 
              value={fiscalYearStart} 
              onChange={setFiscalYearStart} 
              label="تاریخ شروع سال مالی" 
            />
          </div>
          <div className="w-full">
            <JalaliDatePicker 
              value={fiscalYearEnd} 
              onChange={setFiscalYearEnd} 
              label="تاریخ پایان سال مالی" 
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
             onClick={handleSaveConfig}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
           >
             <Save className="w-4 h-4" />
             ذخیره واحد پول و سال مالی
           </button>
        </div>
      </div>
      
    </div>
  );
}
