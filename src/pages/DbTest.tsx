import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Database, Plus, RefreshCw } from 'lucide-react';

const MySwal = withReactContent(Swal);

// Typeهای مربوط به Electron IPC از طریق src/types.ts به صورت سراسری تعریف شده‌اند.

export default function DbTest() {
  const [items, setItems] = useState<{id: number, name: string, created_at: string}[]>([]);
  const [newName, setNewName] = useState('');
  const [isElectron, setIsElectron] = useState(true);

  const fetchItems = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getItems();
        setItems(data);
      } else {
        setIsElectron(false);
      }
    } catch (err: any) {
      MySwal.fire({
        icon: 'error',
        title: 'خطا',
        text: err.message || 'خطا در دریافت اطلاعات از دیتابیس',
      });
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    if (!window.electronAPI) {
      MySwal.fire({
        icon: 'warning',
        title: 'محیط وب',
        text: 'برنامه در محیط مرورگر اجرا شده است. لطفا برنامه را در دسکتاپ اجرا کنید.'
      });
      return;
    }

    try {
      await window.electronAPI.addItem(newName);
      setNewName('');
      fetchItems();
      
      MySwal.fire({
        icon: 'success',
        title: 'اضافه شد',
        text: 'آیتم با موفقیت به دیتابیس اضافه شد.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (err: any) {
      MySwal.fire({
        icon: 'error',
        title: 'خطا در ذخیره‌سازی',
        text: err.message || 'خطا در ذخیره اطلاعات در دیتابیس'
      });
    }
  };

  return (
    <div className="flex flex-col items-center animate-in fade-in duration-500">
      <div className="w-full max-w-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 relative">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">تست اتصال SQLite</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ذخیره و بازیابی اطلاعات به صورت لوکال</p>
            </div>
          </div>
          <button 
            onClick={fetchItems} 
            className="p-2 text-slate-400 hover:text-indigo-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {!isElectron && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800 flex gap-3 text-sm animate-in fade-in zoom-in">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p>این محیط پیش‌نمایش وب است. کدهای SQLite تنها در صورت اجرای نسخه بیلد شده و در محیط دسکتاپ کار می‌کنند.</p>
          </div>
        )}

        <form onSubmit={handleSave} className="flex gap-3 mb-8">
          <input 
            type="text" 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="نام آیتم جدید..." 
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all text-sm text-slate-800 dark:text-slate-200"
          />
          <button 
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
            disabled={!isElectron || !newName.trim()}
          >
            <Plus className="w-5 h-5" />
            ثبت رکورد
          </button>
        </form>

        <div>
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-between">
            <span>لیست رکوردهای جدول test_items</span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{items.length}</span>
          </h2>
          
          {items.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
               <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Database className="w-6 h-6 text-slate-300 dark:text-slate-600" />
               </div>
               <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">پایگاه داده خالی است. رکوردی اضافه کنید.</p>
            </div>
          ) : (
             <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-colors group">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono" dir="ltr">
                    {new Date(item.created_at).toLocaleString('fa-IR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
