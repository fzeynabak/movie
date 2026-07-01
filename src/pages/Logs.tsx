import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2,
  AlertTriangle,
  User,
  Activity
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { cn } from '../lib/utils';

const MySwal = withReactContent(Swal);

interface AuditLog {
  id: number;
  username: string;
  action: string;
  target: string;
  details: string;
  date: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.getAuditLogs) {
        const list = await window.electronAPI.getAuditLogs();
        setLogs(list || []);
        setFilteredLogs(list || []);
      }
    } catch (e: any) {
      console.error('Error fetching audit logs:', e);
      MySwal.fire('خطا', 'عدم امکان واکشی لاگ‌های سیستمی.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = [...logs];

    // Filter by action
    if (actionFilter !== 'all') {
      result = result.filter(log => log.action.includes(actionFilter) || actionFilter.includes(log.action));
    }

    // Filter by search query (user, target, details)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(log => 
        log.username.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }

    setFilteredLogs(result);
  }, [searchQuery, actionFilter, logs]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // Format to Shamsi / Persian locale
      return date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('حذف')) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
    }
    if (action.includes('ویرایش') || action.includes('اصلاح')) {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
    }
    if (action.includes('ایجاد') || action.includes('ثبت') || action.includes('راه‌اندازی')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-20 overflow-y-auto custom-scrollbar pr-1 animate-in fade-in duration-500" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center py-4 bg-slate-50/80 dark:bg-slate-950/80 sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">تاریخچه تغییرات سیستم (Audit Log)</h2>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
            لاگ بر خط و ممیزی کلیه تراکنش‌ها، تغییر اشخاص، محصولات، فاکتورها و سطوح دسترسی کاربران به تفکیک زمان و مجری
          </p>
        </div>
        
        <button 
          onClick={fetchLogs}
          disabled={isLoading}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          <span className="text-xs font-bold">بروزرسانی لیست</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4">
        
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="جستجو در نام کاربر، نام عملیات، هدف یا جزئیات تغییرات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-indigo-500 rounded-2xl text-xs outline-none transition-all dark:text-white"
          />
        </div>

        {/* Action Category Filter */}
        <div className="w-full md:w-64 relative">
          <Filter className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-indigo-500 rounded-2xl text-xs outline-none transition-all appearance-none cursor-pointer dark:text-white font-bold"
          >
            <option value="all">تمامی عملیات‌ها</option>
            <option value="ایجاد">ایجاد و ثبت جدید</option>
            <option value="ویرایش">ویرایش و اصلاح</option>
            <option value="حذف">حذف اطلاعات</option>
            <option value="راه‌اندازی">راه‌اندازی سیستم</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
            تغییرات ثبت شده دیتابیس
          </h3>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border py-1 px-2.5 rounded-lg font-bold font-mono">
            {filteredLogs.length.toLocaleString('fa-IR')} مورد یافت شد
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-inner text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 text-[11px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 w-16">شناسه</th>
                <th className="p-4 w-44">تاریخ و زمان</th>
                <th className="p-4 w-32">کاربر عامل</th>
                <th className="p-4 w-36">نوع اقدام</th>
                <th className="p-4 w-48">هدف عملیات</th>
                <th className="p-4">شرح دقیق تغییرات / جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 italic font-semibold">
                    هیچ موردی هماهنگ با فیلتر یا جستجوی شما یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 text-slate-700 dark:text-slate-350">
                    <td className="p-4 font-mono font-bold text-slate-400">#{log.id}</td>
                    <td className="p-4 font-mono font-medium text-slate-550">{formatDate(log.date)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.username}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold inline-block",
                        getActionBadgeClass(log.action)
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                      {log.target}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 max-w-xs md:max-w-md break-words font-medium leading-relaxed">
                      {log.details || 'فاقد جزئیات تکمیلی'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
