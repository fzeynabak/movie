import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  Users, 
  Percent, 
  CircleDollarSign, 
  Plus, 
  Trash2, 
  Edit, 
  UserCheck, 
  X, 
  Mail, 
  Phone, 
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Seller, Person } from '../types';

const MySwal = withReactContent(Swal);

export default function Sellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forms states
  const [addForm, setAddForm] = useState({
    person_id: '',
    name: '',
    commission_percent: 0,
    return_commission_percent: 0,
    description: ''
  });

  const [editForm, setEditForm] = useState<Partial<Seller>>({});

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.getSellers) {
        const list = await window.electronAPI.getSellers();
        setSellers(list || []);
      }
      if (window.electronAPI?.getPersons) {
        const pList = await window.electronAPI.getPersons();
        // Keep people who have 'seller' in their roles format or are eligible
        setPersons(pList || []);
      }
    } catch (e: any) {
      console.error('Error fetching sellers:', e);
      MySwal.fire({
        icon: 'error',
        title: 'خطا در واکشی داده‌ها',
        text: 'دسترسی به اطلاعات فروشندگان با خطا همراه بود.',
        confirmButtonText: 'تایید'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addForm.name && !addForm.person_id) {
      MySwal.fire('خطا', 'لطفاً نام یا یکی از اشخاص لیست را انتخاب کنید.', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      const res = await window.electronAPI?.addSellerDirect({
        person_id: addForm.person_id ? Number(addForm.person_id) : null,
        name: addForm.name,
        commission_percent: Number(addForm.commission_percent || 0),
        return_commission_percent: Number(addForm.return_commission_percent || 0),
        description: addForm.description
      });

      if (res?.success) {
        MySwal.fire({
          icon: 'success',
          title: 'ثبت موفق فروشنده',
          text: 'فروشنده با موفقیت افزوده گردید.',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        setIsAddOpen(false);
        setAddForm({
          person_id: '',
          name: '',
          commission_percent: 0,
          return_commission_percent: 0,
          description: ''
        });
        fetchSellers();
      }
    } catch (e: any) {
      MySwal.fire('خطا در ذخیره‌سازی', e.message || 'مشکلی به وجود آمد.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const res = await window.electronAPI?.updateSeller(editForm);
      if (res?.success) {
        MySwal.fire({
          icon: 'success',
          title: 'بروزرسانی موفق',
          text: 'اطلاعات با موفقیت ذخیره شد.',
          timer: 1500,
          toast: true,
          position: 'top-end',
          showConfirmButton: false
        });
        setIsEditOpen(false);
        fetchSellers();
      }
    } catch (e: any) {
      MySwal.fire('خطا در ذخیره‌سازی', e.message || 'اعمال ویرایش ناموفق بود.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const confirm = await MySwal.fire({
      title: 'حذف فروشنده؟',
      text: `آیا مایلید فروشنده "${name}" را حذف کنید؟ این تغییر غیر قابل بازگشت است.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف شود',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        setIsLoading(true);
        const res = await window.electronAPI?.deleteSeller(id);
        if (res?.success) {
          MySwal.fire('حذف شد', 'تنظیمات پورسانت و کارمزد فروشنده با موفقیت حذف گردید.', 'success');
          fetchSellers();
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در حذف فروشنده', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Filter persons who are already registered in the sellers table and have category === 'فروشنده'
  const availablePersons = persons.filter(p => p.category === 'فروشنده' && !sellers.some(s => s.person_id === p.id));

  return (
    <div className="h-full flex flex-col space-y-6 pb-20 overflow-y-auto custom-scrollbar pr-1" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center py-4 bg-slate-50/80 dark:bg-slate-950/80 sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">پنل مدیریت فروشندگان</h2>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
            تعیین پورسانت فروش و درصد جریمه برگشت از فروش فروشندگان و پیگیری وضعیت حسابداری به صورت پویا
          </p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          افزودن فروشنده جدید
        </button>
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">تعداد کل فروشندگان متصل</span>
            <span className="font-mono text-lg font-extrabold text-slate-800 dark:text-white">
              {sellers.length.toLocaleString('fa-IR')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">میانگین پورسانت‌های نقدی</span>
            <span className="font-mono text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {(sellers.reduce((sum, item) => sum + (item.commission_percent || 0), 0) / (sellers.length || 1)).toFixed(1).toLocaleString()}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <CircleDollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">میانگین جریمه مرجوعی</span>
            <span className="font-mono text-lg font-extrabold text-orange-600 dark:text-orange-400">
              {(sellers.reduce((sum, item) => sum + (item.return_commission_percent || 0), 0) / (sellers.length || 1)).toFixed(1).toLocaleString()}%
            </span>
          </div>
        </div>
      </div>

      {/* Sellers List Grid */}
      {sellers.length === 0 ? (
        <div className="bg-white/45 dark:bg-slate-900/10 p-16 border border-dashed border-slate-200 dark:border-slate-800 text-center rounded-3xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-slate-900/40 flex items-center justify-center border border-indigo-100 mx-auto mb-4">
            <UserCheck className="w-7 h-7 text-indigo-500" />
          </div>
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300">هیچ فروشنده‌ای ثبت نشده است</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            جهت اختصاص درصدهای پورسانت و برآورد اتوماتیک حساب تراز فروشنده جدید ثبت نمایید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map(sl => (
            <div 
              key={sl.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-indigo-650 shrink-0 shadow-inner">
                      {sl.avatar ? (
                        <img src={sl.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-indigo-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{sl.name}</h4>
                      {sl.accounting_code && (
                        <span className="text-[9px] text-slate-400 block mt-0.5">کد حسابداری: {sl.accounting_code}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-left bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 rounded-lg">
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 font-mono">
                      {sl.commission_percent || 0}%
                    </span>
                    <span className="text-[8px] text-indigo-500 block">پورسانت</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/40 my-3"></div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-505 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-orange-500" />
                      کسر جریمه برگشتی:
                    </span>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      {sl.return_commission_percent || 0}%
                    </span>
                  </div>

                  {sl.phone1 && (
                    <div className="flex justify-between items-center text-slate-505 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        تلفن تماس:
                      </span>
                      <span className="font-mono text-[11px]">{sl.phone1}</span>
                    </div>
                  )}

                  {sl.description && (
                    <div className="flex items-start gap-1 text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-950/20 p-2 rounded-xl mt-2">
                      <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{sl.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold font-mono">ID: sl-{sl.id}</span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => {
                      setEditForm(sl);
                      setIsEditOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    تنظیمات پورسانت
                  </button>
                  <button 
                    onClick={() => handleDelete(sl.id, sl.name)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-105 dark:bg-rose-950/20 text-rose-600 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD SELLER MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-250">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 relative shadow-2xl border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute left-6 top-6 p-1.5 rounded-full hover:bg-slate-150 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-800 dark:text-slate-105 border-b pb-4 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              افزودن فروشنده جدید
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div className="bg-slate-50 dark:bg-slate-950/35 p-2 rounded-xl flex gap-1">
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
                      MySwal.fire('نکته', 'هیچ شخصی در لیست اشخاص عمومی برای پیوند یافت نشد.', 'info');
                    }
                  }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    addForm.person_id ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"
                  )}
                >
                  انتخاب از لیست عمومی
                </button>
              </div>

              {addForm.person_id ? (
                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">شخص پیوند شونده</label>
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
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">نام کامل فروشنده جدید</label>
                  <input 
                    type="text" 
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="مثال: مریم کاظمی"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">درصد پورسانت فروش</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      step="0.01"
                      required
                      value={addForm.commission_percent}
                      onChange={(e) => setAddForm(prev => ({ ...prev, commission_percent: Number(e.target.value) }))}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                    />
                    <Percent className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">کاهش پورسانت مرجوعی</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      step="0.01"
                      required
                      value={addForm.return_commission_percent}
                      onChange={(e) => setAddForm(prev => ({ ...prev, return_commission_percent: Number(e.target.value) }))}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                    />
                    <Percent className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1.5">توضیحات اختیاری</label>
                <textarea 
                  value={addForm.description}
                  onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="این قسمت برای درج نکات اختصاصی یا توافق‌نامه‌های کارمزی می‌باشد..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-805 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  ثبت فروشنده
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- EDIT SELLER MODAL --- */}
      {isEditOpen && editForm.id && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-250">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 relative shadow-2xl border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setIsEditOpen(false)}
              className="absolute left-6 top-6 p-1.5 rounded-full hover:bg-slate-150 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-805 dark:text-slate-105 border-b pb-4 mb-5 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-500" />
              ویرایش درصد پورسانت {editForm.name}
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-505 mb-1.5">عنوان / نام فروشنده</label>
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
                  <label className="block text-xs font-bold text-slate-550 mb-1.5">پورسانت فروش</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      step="0.01"
                      required
                      value={editForm.commission_percent || 0}
                      onChange={(e) => setEditForm(prev => ({ ...prev, commission_percent: Number(e.target.value) }))}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                    />
                    <Percent className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-550 mb-1.5">جریمه مرجوعی کالا</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      step="0.01"
                      required
                      value={editForm.return_commission_percent || 0}
                      onChange={(e) => setEditForm(prev => ({ ...prev, return_commission_percent: Number(e.target.value) }))}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
                    />
                    <Percent className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-505 mb-1.5">توضیحات پورسانت</label>
                <textarea 
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-bold cursor-pointer"
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
