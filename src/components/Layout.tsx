import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Moon, Sun, X, Minus, Square, Database, Info, FolderOpen, LogOut, User } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Global types for electronAPI are defined in types.ts

interface LayoutProps {
  currentUser?: any;
  onLogout?: () => void;
}

export default function Layout({ currentUser, onLogout }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleWindowControl = (cmd: string) => {
    if (window.electronAPI) {
      window.electronAPI.windowControl(cmd);
    }
  };

  const showDbStats = async () => {
    if (!window.electronAPI) {
       MySwal.fire({
         icon: 'warning',
         title: 'محیط مرورگر',
         text: 'امکانات دیتابیس فقط در محیط دسکتاپ (Electron) در دسترس است.',
         confirmButtonText: 'باشه',
         confirmButtonColor: '#4f46e5'
       });
       return;
    }

    try {
      const stats = await window.electronAPI.getDbStats();
      
      MySwal.fire({
        title: 'اطلاعات دیتابیس',
        html: `
          <div class="text-right space-y-4 font-sans rtl mt-4">
            <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div class="text-xs text-slate-500 mb-1">مسیر فایل دیتابیس:</div>
              <div class="text-sm font-mono text-left bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 break-all overflow-hidden">${stats.path}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg flex justify-between items-center">
                <span class="text-sm text-indigo-800 dark:text-indigo-300">محصولات</span>
                <span class="font-bold text-indigo-600 dark:text-indigo-400">${stats.products}</span>
              </div>
              <div class="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-lg flex justify-between items-center">
                <span class="text-sm text-emerald-800 dark:text-emerald-300">مشتریان</span>
                <span class="font-bold text-emerald-600 dark:text-emerald-400">${stats.customers}</span>
              </div>
              <div class="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg flex justify-between items-center">
                <span class="text-sm text-amber-800 dark:text-amber-300">اشخاص</span>
                <span class="font-bold text-amber-600 dark:text-amber-400">${stats.persons || 0}</span>
              </div>
              <div class="bg-rose-50 dark:bg-rose-900/30 p-3 rounded-lg flex justify-between items-center">
                <span class="text-sm text-rose-800 dark:text-rose-300">رکوردهای انبار</span>
                <span class="font-bold text-rose-600 dark:text-rose-400">${stats.inventory}</span>
              </div>
            </div>

            <div class="text-xs text-center text-slate-400 mt-4">
              آخرین بروزرسانی: <span dir="ltr">${new Date(stats.lastUpdated).toLocaleString('fa-IR')}</span>
            </div>
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          popup: 'rounded-2xl dark:bg-slate-900 dark:text-white',
          title: 'text-lg font-bold'
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300" dir="rtl">
      {/* Sidebar - Logical flow handles right positioning due to dir="rtl" */}
      <Sidebar collapsed={collapsed} currentUser={currentUser} />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative border-l border-slate-200 dark:border-slate-800/50">
        
        {/* Mac-like Header (Glassmorphism) */}
        <header className="h-14 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-4 z-10 sticky top-0" style={{ WebkitAppRegion: 'drag' } as any}>
          {/* Right side: Hamburger, Title */}
          <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-tight flex items-center gap-2">
              حسابداری فروشگاهی
            </h1>
            {currentUser && (
              <span className="text-[10px] bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold px-2.5 py-1 rounded-lg">
                کاربر: {currentUser.username} ({currentUser.role})
              </span>
            )}
          </div>

          {/* Left side: Controls */}
          <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
              title={darkMode ? 'حالت روز' : 'حالت شب'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {onLogout && (
              <button 
                onClick={() => {
                  MySwal.fire({
                    title: 'خروج از حساب کاربری؟',
                    text: 'مایلید از صندوق فروشگاهی خارج شده و فرآیند ورود مجدد را طی کنید؟',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'بله، خارج شو',
                    cancelButtonText: 'انصراف'
                  }).then((res) => {
                    if (res.isConfirmed) {
                       onLogout();
                    }
                  });
                }}
                className="p-1.5 rounded-full hover:bg-rose-50 text-rose-500 transition-colors"
                title="خروج از حساب"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            
            {/* Window Controls */}
            <div className="flex items-center gap-2 dir-ltr ml-1 border-r pr-3 border-slate-200 dark:border-slate-800">
               <button onClick={() => handleWindowControl('minimize')} className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-500 border border-yellow-500/50 flex items-center justify-center group">
                 <Minus className="w-2.5 h-2.5 text-yellow-900 opacity-0 group-hover:opacity-100" />
               </button>
               <button onClick={() => handleWindowControl('maximize')} className="w-3.5 h-3.5 rounded-full bg-green-400 hover:bg-green-500 border border-green-500/50 flex items-center justify-center group">
                 <Square className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
               </button>
               <button onClick={() => handleWindowControl('close')} className="w-3.5 h-3.5 rounded-full bg-red-400 hover:bg-red-500 border border-red-500/50 flex items-center justify-center group">
                 <X className="w-2.5 h-2.5 text-red-900 opacity-0 group-hover:opacity-100" />
               </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="mx-auto max-w-7xl h-full animate-in slide-in-from-bottom-4 duration-500 fade-in">
             <Outlet />
          </div>
        </div>

        {/* Floating Action Button */}
        <button 
          onClick={showDbStats}
          className="absolute bottom-6 left-6 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-110 z-50 focus:outline-none"
          title="اطلاعات دیتابیس"
        >
          <Database className="w-5 h-5" />
        </button>
      </main>
    </div>
  );
}
