import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  CheckCircle, 
  X, 
  Percent
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Shareholder, Person } from '../types';
import Decimal from 'decimal.js';

const MySwal = withReactContent(Swal);

export default function Shareholders() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [statistics, setStatistics] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netIncome: 0
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Forms states
  const [addForm, setAddForm] = useState({
    person_id: '',
    name: '',
    share_percent: 0,
    join_date: new Date().toLocaleDateString('fa-IR'),
  });

  const [editForm, setEditForm] = useState<Partial<Shareholder>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.getShareholdersStatistics) {
        const stats = await window.electronAPI.getShareholdersStatistics();
        setStatistics(stats);
      }
      if (window.electronAPI?.getShareholders) {
        const shList = await window.electronAPI.getShareholders();
        setShareholders(shList || []);
      }
      if (window.electronAPI?.getPersons) {
        const pList = await window.electronAPI.getPersons();
        setPersons(pList || []);
      }
    } catch (e: any) {
      console.error('Error fetching data:', e);
      MySwal.fire({
        icon: 'error',
        title: 'خطا در بارگذاری داده‌ها',
        text: 'دسترسی به پایگاه داده با خطا مواجه شد.',
        confirmButtonText: 'تایید'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalSharesPercent = (list: Shareholder[] = shareholders): Decimal => {
    return list.reduce((sum, item) => sum.plus(new Decimal(item.share_percent || 0)), new Decimal(0));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetSharePercent = new Decimal(addForm.share_percent || 0);
    const existingTotal = getTotalSharesPercent();
    
    if (existingTotal.plus(targetSharePercent).gt(100)) {
      MySwal.fire({
        icon: 'warning',
        title: 'فراتر از سقف سهام',
        text: `جمع کل سهام شرکا با این مقدار (${existingTotal.plus(targetSharePercent).toString()}٪) بیشتر از ۱۰۰٪ خواهد شد. لطفاً ابتدا از سهم بقیه بکاهید.`,
        confirmButtonText: 'متوجه شدم'
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await window.electronAPI?.addShareholderDirect({
        person_id: addForm.person_id ? Number(addForm.person_id) : null,
        name: addForm.name,
        share_percent: targetSharePercent.toNumber(),
        join_date: addForm.join_date,
        capital_contribution: 0,
        shares_count: 0,
        share_type: 'عادی',
        voting_rights: 1,
        allocated_profit: 0
      });

      if (res?.success) {
        MySwal.fire({
          icon: 'success',
          title: 'افزودن موفق سهامدار',
          text: 'سهامدار با موفقیت ثبت شد.',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        setIsAddOpen(false);
        setAddForm({
          person_id: '',
          name: '',
          share_percent: 0,
          join_date: new Date().toLocaleDateString('fa-IR'),
        });
        fetchData();
      }
    } catch (e: any) {
      MySwal.fire('خطا در ذخیره‌سازی سهامدار', e.message || 'مشکلی به وجود آمد.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otherShareholders = shareholders.filter(s => s.id !== editForm.id);
    const existingOtherTotal = getTotalSharesPercent(otherShareholders);
    const targetPercent = new Decimal(editForm.share_percent || 0);

    if (existingOtherTotal.plus(targetPercent).gt(100)) {
      MySwal.fire({
        icon: 'warning',
        title: 'خطای ارزش کل سهام',
        text: `سقف کل سهام شرکا نمی‌تواند بیشتر از ۱۰۰٪ باشد. مجموع سهم بقیه شرکا ${existingOtherTotal.toString()}٪ است؛ بنابراین حداکثر سهم مجاز این شریک ${new Decimal(100).minus(existingOtherTotal).toString()}٪ می‌باشد.`,
        confirmButtonText: 'اصلاح سهم'
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await window.electronAPI?.updateShareholder({
        ...editForm,
        capital_contribution: 0,
        shares_count: 0,
        share_type: 'عادی',
        voting_rights: 1
      });
      if (res?.success) {
        MySwal.fire({
          icon: 'success',
          title: 'بروزرسانی موفق',
          text: 'تغییرات سهامدار ذخیره شد.',
          timer: 1500,
          toast: true,
          position: 'top-end',
          showConfirmButton: false
        });
        setIsEditOpen(false);
        fetchData();
      }
    } catch (e: any) {
      MySwal.fire('خطای پایگاه داده', e.message || 'اعمال ویرایش ناموفق بود.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, currentShare: number, name: string) => {
    const confirm = await MySwal.fire({
      title: 'حذف سهامدار؟',
      text: `آیا مایلید سهامدار "${name}" را حذف کنید؟ سهم آزاد شده (${currentShare}٪) آزاد خواهد شد.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف شود',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        setIsLoading(true);
        const res = await window.electronAPI?.deleteShareholder(id);
        if (res?.success) {
          MySwal.fire('حذف شد', 'سهامدار با موفقیت حذف گردید.', 'success');
          fetchData();
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در عملیات حذف', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getAllocatedValue = (sharePercent: number): string => {
    const profit = new Decimal(statistics.netIncome || 0);
    const share = new Decimal(sharePercent || 0).div(100);
    return profit.times(share).toFixed(0);
  };

  // Filter persons who are already registered in the shareholders table and are marked as shareholder
  const availablePersons = persons.filter(p => p.is_shareholder === 1 && !shareholders.some(s => s.person_id === p.id));

  return (
    <div className="h-full flex flex-col space-y-6 pb-20 overflow-y-auto custom-scrollbar pr-1 animate-in fade-in duration-500" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center py-4 bg-slate-50/80 dark:bg-slate-950/80 sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-black text-slate-805 dark:text-slate-100">مدیریت سهامداران</h2>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
            تنظیم میزان مالکیت شرکا و محاسبه خودکار سهم از سود خالص فروشگاه
          </p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          افزودن سهامدار جدید
        </button>
      </div>

      {/* Real-time Financial Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">فروش کل فروشگاه</span>
            <span className="font-mono text-lg font-extrabold text-slate-800 dark:text-white">
              {Number(statistics.totalSales).toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-450 mr-1">ریال</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">سود ناخالص</span>
            <span className="font-mono text-lg font-extrabold text-teal-600 dark:text-teal-400">
              {Number(statistics.totalProfit).toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-450 mr-1">ریال</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">هزینه‌ها</span>
            <span className="font-mono text-lg font-extrabold text-rose-500">
              {Number(statistics.totalExpenses).toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-450 mr-1">ریال</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">سود خالص فروشگاه</span>
            <span className="font-mono text-lg font-extrabold text-sky-600 dark:text-sky-400">
              {Number(statistics.netIncome).toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-450 mr-1">ریال</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Share Allocation Visual Info Bar */}
      <div className="bg-slate-100/50 dark:bg-slate-900/30 p-5 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-dashed border-indigo-500 text-indigo-500 flex items-center justify-center text-xs font-black">
            {getTotalSharesPercent().toString()}%
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-105">تخصیص سهم کل</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              آزاد: {new Decimal(100).minus(getTotalSharesPercent()).toString()}٪ | تخصیص‌یافته: {getTotalSharesPercent().toString()}٪
            </p>
          </div>
        </div>

        <div className="w-full md:w-64 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex flex-row">
          <div 
            style={{ width: `${getTotalSharesPercent().toNumber()}%` }} 
            className="bg-indigo-650 h-full rounded-full transition-all"
          />
        </div>
      </div>

      {/* Shareholders List */}
      {shareholders.length === 0 ? (
        <div className="bg-white/45 dark:bg-slate-900/10 p-16 border border-dashed border-slate-200 dark:border-slate-800 text-center rounded-3xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900/40 flex items-center justify-center border border-slate-150 dark:border-slate-800/80 mx-auto mb-4">
            <Users className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300">هیچ سهامداری در سیستم تعریف نشده است</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shareholders.map(partner => (
            <div 
              key={partner.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-slate-150 dark:border-slate-850 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-850 shrink-0 shadow-inner">
                      {partner.avatar ? (
                        <img src={partner.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-indigo-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{partner.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        ورود: {partner.join_date || 'نامشخص'}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-[16px] font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {partner.share_percent}%
                    </span>
                    <span className="text-[9px] text-slate-400 block font-bold">سهم</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/40 my-3"></div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-2 px-3 bg-indigo-50/40 dark:bg-slate-950/20 rounded-xl text-indigo-750 dark:text-indigo-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-505" />
                      محاسبه سهم سود انباشته:
                    </span>
                    <span className="font-mono font-extrabold text-sm">
                      {Number(getAllocatedValue(partner.share_percent)).toLocaleString('fa-IR')} <span className="text-[10px]">ریال</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold font-mono">ID: s-{partner.id}</span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => {
                      setEditForm(partner);
                      setIsEditOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    ویرایش سهم
                  </button>
                  <button 
                    onClick={() => handleDelete(partner.id, partner.share_percent, partner.name)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 cursor-pointer transition-all"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD PARTNER MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-250">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 relative shadow-2xl border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute left-6 top-6 p-1.5 rounded-full hover:bg-slate-150 dark:hover:bg-slate-850 transition-all text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-805 dark:text-slate-100 border-b pb-4 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              افزودن سهامدار جدید
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div className="bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl flex gap-1">
                <button 
                  type="button" 
                  onClick={() => setAddForm(prev => ({ ...prev, person_id: '', name: '' }))}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    !addForm.person_id ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"
                  )}
                >
                  ثبت مستقل
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (availablePersons.length > 0) {
                      setAddForm(prev => ({ ...prev, person_id: String(availablePersons[0].id) }));
                    } else {
                      MySwal.fire('نکته', 'شخص فاقد سهم دیگری در لیست اشخاص پیدا نشد.', 'info');
                    }
                  }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    addForm.person_id ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"
                  )}
                >
                  انتخاب از لیست اشخاص
                </button>
              </div>

              {addForm.person_id ? (
                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">شخص مورد نظر</label>
                  <select 
                    value={addForm.person_id}
                    onChange={(e) => setAddForm(prev => ({ ...prev, person_id: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availablePersons.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.type === 'حقوقی' ? p.title : `${p.first_name} ${p.last_name}`} (کد: {p.accounting_code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">نام سهامدار جدید</label>
                  <input 
                    type="text" 
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="مثال: حسن حسینی"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">درصد سهام (۰ - ۱۰۰)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      step="0.1"
                      required
                      value={addForm.share_percent}
                      onChange={(e) => setAddForm(prev => ({ ...prev, share_percent: Number(e.target.value) }))}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                    />
                    <Percent className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">تاریخ ثبت سهم</label>
                  <input 
                    type="text" 
                    value={addForm.join_date}
                    onChange={(e) => setAddForm(prev => ({ ...prev, join_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  ثبت سهامدار
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- EDIT PARTNER MODAL --- */}
      {isEditOpen && editForm.id && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-250">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 relative shadow-2xl border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setIsEditOpen(false)}
              className="absolute left-6 top-6 p-1.5 rounded-full hover:bg-slate-150 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-805 dark:text-slate-105 border-b pb-4 mb-5 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-500" />
              ویرایش سهم {editForm.name}
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-505 mb-1.5">نام سهامدار / شریک تجاری</label>
                <input 
                  type="text" 
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">درصد سهام (۰ - ۱۰۰)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      step="0.1"
                      required
                      value={editForm.share_percent || 0}
                      onChange={(e) => setEditForm(prev => ({ ...prev, share_percent: Number(e.target.value) }))}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                    />
                    <Percent className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">تاریخ ثبت سهم</label>
                  <input 
                    type="text" 
                    value={editForm.join_date || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, join_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  به‌روزرسانی
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
