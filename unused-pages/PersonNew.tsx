import React, { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Save, User, MapPin, Phone, CreditCard, FileText, Briefcase, Building2, UserCircle2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

const MySwal = withReactContent(Swal);

export default function PersonNew() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Forms State
  const [formData, setFormData] = useState({
    auto_accounting_code: true,
    accounting_code: '',
    first_name: '',
    last_name: '',
    title: '', // for حقوقی
    nickname: '',
    type: 'حقیقی', // حقیقی or حقوقی
    category: 'مشتری',
    roles: [] as string[],
    birth_date: '',
    membership_date: '',
    marriage_date: '',

    // Address
    country: 'ایران',
    province: '',
    city: '',
    region: '',
    address: '',
    postal_code: '',

    // Contact
    phone1: '',
    phone2: '',
    phone3: '',
    whatsapp: '',
    fax: '',
    email: '',
    website: '',

    // Business Info
    business_name: '',
    brand: '',
    business_activity: '',
    business_address: '',

    // Bank
    bank_account: '',
    bank_card: '',
    bank_name: '',
    iban: '',

    // Other
    economic_code: '',
    registration_number: '',
    personal_code: '',
    credit_limit: 0,
    national_id: '',
    description: '',
    tax_registered: false,
    avatar: '',
    initial_balance: 0,
    initial_balance_type: 'debit' // debit = بدهکار, credit = بستانکار
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => {
      const updatedRoles = prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      
      let category = prev.category || 'سایر';
      if (role === 'مشتری' && updatedRoles.includes('مشتری')) {
        category = 'مشتری';
      } else if (role === 'تامین‌کننده' && updatedRoles.includes('تامین‌کننده')) {
        category = 'تامین‌کننده';
      } else if (role === 'فروشنده' && updatedRoles.includes('فروشنده')) {
        category = 'فروشنده';
      }
      
      return {
        ...prev,
        roles: updatedRoles,
        category
      };
    });
  };

  const handleSave = async () => {
    if (!window.electronAPI?.addPerson) {
      MySwal.fire('خطا', 'این قابلیت فقط در محیط دسکتاپ فعال است.', 'warning');
      return;
    }

    if (!formData.type) {
      MySwal.fire('نقص اطلاعات', 'انتخاب نوع شخص (حقیقی یا حقوقی) الزامی است.', 'warning');
      return;
    }

    if (formData.type === 'حقیقی') {
      if (!formData.first_name || !formData.first_name.trim()) {
        MySwal.fire('نقص اطلاعات', 'وارد کردن نام برای شخص حقیقی الزامی است.', 'warning');
        return;
      }
      if (!formData.last_name || !formData.last_name.trim()) {
        MySwal.fire('نقص اطلاعات', 'وارد کردن نام خانوادگی برای شخص حقیقی الزامی است.', 'warning');
        return;
      }
      if (formData.national_id && !/^\d{10}$/.test(formData.national_id)) {
        MySwal.fire('قالب نادرست', 'کد ملی باید دقیقا ۱۰ رقم عددی باشد.', 'warning');
        return;
      }
    } else if (formData.type === 'حقوقی') {
      if (!formData.title || !formData.title.trim()) {
        MySwal.fire('نقص اطلاعات', 'وارد کردن نام شرکت یا سازمان (عنوان) الزامی است.', 'warning');
        return;
      }
      if (formData.national_id && !/^\d{11}$/.test(formData.national_id)) {
        MySwal.fire('قالب نادرست', 'شناسه ملی شرکت باید دقیقا ۱۱ رقم عددی باشد.', 'warning');
        return;
      }
    } else {
      MySwal.fire('نقص اطلاعات', 'نوع شخص انتخاب شده معتبر نیست.', 'warning');
      return;
    }

    if (formData.phone1 && !/^09\d{9}$/.test(formData.phone1)) {
      MySwal.fire('قالب نادرست', 'شماره تلفن همراه معتبر نیست. شماره همراه باید با 09 شروع شده و ۱۱ رقم باشد. مثال: 09123456789', 'warning');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      MySwal.fire('قالب نادرست', 'قالب آدرس ایمیل وارد شده معتبر نیست. مثال: info@example.com', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await window.electronAPI.addPerson(formData);
      if (res.success) {
        // Add initial balance transaction if specified
        if (formData.initial_balance && Number(formData.initial_balance) > 0) {
          const balAmount = Number(formData.initial_balance);
          const finalBal = formData.initial_balance_type === 'credit' ? -balAmount : balAmount;
          if (window.electronAPI.addPersonFinancialTransaction) {
            await window.electronAPI.addPersonFinancialTransaction({
              person_id: res.id,
              date: formData.membership_date || new Date().toLocaleDateString('fa-IR'),
              type: 'adjustment',
              amount: finalBal,
              description: 'مانده اولیه ثبت شده هنگام ایجاد پرونده شخص'
            });
          }
        }

        MySwal.fire({
          icon: 'success',
          title: 'شخص با موفقیت ثبت شد!',
          text: `شخص جدید با کد حسابداری ${res.accounting_code} ثبت شد.`,
          confirmButtonColor: '#4f46e5'
        });
        // reset form if needed
        setFormData(prev => ({ ...prev, first_name: '', last_name: '', title: '', avatar: '', initial_balance: 0 }));
      }
    } catch(e: any) {
      MySwal.fire('خطا', e.message || 'مشکل در ذخیره اطلاعات در دیتابیس', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-20 overflow-y-auto custom-scrollbar pr-2">
      <div className="flex justify-between items-center sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-10 py-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <UserCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">افزودن شخص جدید</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">ثبت اطلاعات مشتریان، تامین‌کنندگان و همکاران</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-75 hover:-translate-y-0.5 active:translate-y-0"
        >
          {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          ذخیره اطلاعات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar / Left Column (Logically Right via RTL) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* تصویر پرسنلی */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-white/50 dark:border-slate-800/50 flex flex-col items-center">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2 w-full self-start">
              <UserCircle2 className="w-4 h-4 text-indigo-500" />
              تصویر شخص
            </h3>
            
            <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
              {formData.avatar ? (
                <>
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                    تغییر تصویر
                  </div>
                </>
              ) : (
                <div className="text-center p-2 flex flex-col items-center justify-center">
                  <UserCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-0.5" />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">انتخاب تصویر</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      MySwal.fire('خطای حجم فایل', 'حجم تصویر نباید بیشتر از ۲ مگابایت باشد.', 'warning');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setFormData(prev => ({
                          ...prev,
                          avatar: event.target!.result as string
                        }));
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
              />
            </div>
            {formData.avatar && (
              <button 
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                className="text-[10px] text-rose-500 hover:text-rose-600 mt-2 font-semibold transition-colors cursor-pointer"
              >
                حذف تصویر
              </button>
            )}
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white/50 dark:border-slate-800/50 relative overflow-hidden">
             <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
             
             <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
               <Briefcase className="w-4 h-4" />
               شناسه سیستم
             </h3>

             <div className="space-y-4 relative z-10">
                <label className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    کد حسابداری خودکار
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                      کد حسابداری: شناسه منحصربه‌فرد مالی این شخص برای سیستم حسابداری
                    </span>
                  </span>
                  <div className="relative">
                    <input type="checkbox" name="auto_accounting_code" checked={formData.auto_accounting_code} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </div>
                </label>

                {!formData.auto_accounting_code && (
                  <div className="animate-in slide-in-from-top-2">
                    <input type="text" name="accounting_code" value={formData.accounting_code} onChange={handleChange} placeholder="کد اختصاصی..." className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:text-slate-200 font-mono" dir="ltr" />
                  </div>
                )}
             </div>

             <div className="mt-8">
               <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                 <User className="w-4 h-4" />
               </h3>
               <p className="text-[10px] text-slate-450 dark:text-slate-500 mb-3 leading-relaxed font-normal">
                 نوع شخص: حقیقی (شخص عادی با کد ملی) یا حقوقی (شرکت یا سازمان با شناسه ملی)
               </p>
               <h3 className="hidden">
                 <span className="hidden">نوع شخص</span>
                 نوع شخص
               </h3>
               <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                 <button 
                   onClick={() => setFormData(prev => ({...prev, type: 'حقیقی'}))}
                   className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold transition-all", formData.type === 'حقیقی' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400")}
                 >
                   شخص حقیقی
                 </button>
                 <button 
                   onClick={() => setFormData(prev => ({...prev, type: 'حقوقی'}))}
                   className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold transition-all", formData.type === 'حقوقی' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400")}
                 >
                   شرکت (حقوقی)
                 </button>
               </div>
             </div>

             <div className="mt-8">
               <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">نقش‌ها تخصیص یافته</h3>
               <div className="flex flex-wrap gap-2">
                 {['سهامدار', 'کارمند', 'تامین‌کننده', 'مشتری', 'فروشنده'].map(role => (
                   <button 
                     key={role}
                     onClick={() => handleRoleToggle(role)}
                     className={cn(
                       "px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none",
                       formData.roles.includes(role) 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50"
                     )}
                   >
                     {role}
                   </button>
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* Main Content / Right Column (Logically Left via RTL) */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-white/50 dark:border-slate-800/50 mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-3">
              {formData.type === 'حقیقی' ? <User className="w-5 h-5 text-indigo-500" /> : <Building2 className="w-5 h-5 text-indigo-500" />}
              اطلاعات پایه
            </h3>

            {formData.type === 'حقیقی' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">نام</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none  dark:text-slate-200 transition-all font-medium" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>نام:</strong> نام کوچک شخص حقیقی که در فاکتورها، گزارش‌ها و مکاتبات استفاده می‌شود (اجباری).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">نام خانوادگی</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none  dark:text-slate-200 transition-all font-medium" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>نام خانوادگی:</strong> نام خانوادگی شخص حقیقی برای شناسایی دقیق و رسمی در دفتر کل (اجباری).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">کد ملی</label>
                  <input type="text" name="national_id" value={formData.national_id} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-all font-mono" placeholder="----------" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>کد ملی:</strong> شماره ۱۰ رقمی کد ملی جهت احراز هویت مالی، ثبت قراردادها و صورت‌حساب‌های رسمی ممیزی.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">نام مستعار</label>
                  <input type="text" name="nickname" value={formData.nickname} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none  dark:text-slate-200 transition-all" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>نام مستعار:</strong> عنوان یا نام معروفیتی شخص در بازار کار جهت جستجوی راحت‌تر در میان مشتریان.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">تاریخ تولد</label>
                  <input type="text" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-all" placeholder="مثال: ۱۳۷۰/۰۵/۱۲" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>تاریخ تولد:</strong> به منظور ارسال پیام‌های تبریک، ارائه کدهای تخفیف دوره‌ای و باشگاه وفاداری مشتریان.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">شناسه پرسنلی / عضویت</label>
                  <input type="text" name="personal_code" value={formData.personal_code} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-all font-mono" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>شناسه پرسنلی:</strong> کد اختصاصی تخصیص‌یافته به شخص در چارت سازمانی یا شناسه اشتراک وی در سیستم شما.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">نام شرکت / سازمان</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none  dark:text-slate-200 transition-all font-medium" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>نام شرکت / سازمان:</strong> نام رسمی، تجاری یا ثبتی شرکت یا موسسه حقوقی برای درج در فاکتورها (اجباری).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">شناسه ملی</label>
                  <input type="text" name="national_id" value={formData.national_id} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-all font-mono" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>شناسه ملی:</strong> شناسه ۱۱ رقمی حقوقی صادرشده توسط سازمان ثبت اسناد و املاک کشور جهت رد کردن گزارشات فصلی.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">کد اقتصادی</label>
                  <input type="text" name="economic_code" value={formData.economic_code} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-all font-mono" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>کد اقتصادی:</strong> شماره ۱۲ رقمی ثبت‌نام در سازمان امور مالیاتی کل کشور جهت ارائه معاملات و ارزش افزوده.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">شماره ثبت</label>
                  <input type="text" name="registration_number" value={formData.registration_number} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-all font-mono" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>شماره ثبت:</strong> شماره منحصربه‌فرد ثبت شرکت در مرجع ثبت شرکت‌ها که هویت قانونی آن را احراز می‌کند.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">تاریخ تاسیس / آغاز همکاری</label>
                  <input type="text" name="membership_date" value={formData.membership_date} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-all" placeholder="مثال: ۱۳۸۰/۰۱/۰1" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>تاریخ تاسیس:</strong> تاریخ ثبت رسمی شرکت یا شروع مراودات تجاری شما با این شخصیت حقوقی.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-white/50 dark:border-slate-800/50 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                <Phone className="w-5 h-5 text-indigo-500" />
                اطلاعات تماس
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">تلفن همراه</label>
                  <input type="text" name="phone1" value={formData.phone1} onChange={handleChange} className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-colors" placeholder="09xxxxxxxxx" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>تلفن همراه:</strong> شماره موبایل فعال جهت تماس اضطراری، اطلاع‌رسانی پیامکی فاکتورها و وضعیت مالی (فرمت: 09123456789).
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">تلفن ثابت</label>
                  <input type="text" name="phone2" value={formData.phone2} onChange={handleChange} className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-colors" placeholder="021xxxxxxxx" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>تلفن ثابت:</strong> شماره تلفن ثابت دفتر کار یا منزل به همراه کد استان جهت مکاتبات ثابت و احراز موقعیت.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ایمیل</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-colors" placeholder="example@mail.com" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>ایمیل:</strong> آدرس ایمیل معتبر جهت ارسال پیش‌فاکتورها، صورت‌حساب‌ها و بروشورهای دیجیتال به صورت خودکار.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">آدرس وب‌سایت</label>
                  <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-colors" placeholder="https://" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>آدرس وب‌سایت:</strong> لینک وب‌سایت شخصی یا شرکتی جهت آشنایی بیشتر با حوزه فعالیت و خدمات شخص.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-white/50 dark:border-slate-800/50 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-indigo-500" />
                موقعیت جغرافیایی و آدرس
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">استان</label>
                    <input type="text" name="province" value={formData.province} onChange={handleChange} placeholder="مثال: تهران" className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dark:text-slate-200 transition-colors" />
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                      <strong>استان:</strong> استان سکونت یا فعالیت تجاری به صورت مجزا.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">شهر</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="مثال: تهران" className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dark:text-slate-200 transition-colors" />
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                      <strong>شهر:</strong> شهر سکونت یا فعالیت تجاری به صورت مجزا.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">منطقه شهرداری / بخش</label>
                    <input type="text" name="region" value={formData.region} onChange={handleChange} placeholder="مثال: منطقه ۲" className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dark:text-slate-200 transition-colors" />
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                      <strong>منطقه:</strong> محدوده یا محله جغرافیایی آدرس.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">کد پستی</label>
                    <input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange} className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-colors font-mono" placeholder="1234567890" />
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                      <strong>کد پستی:</strong> کد پستی ۱۰ رقمی تایید شده ملک جهت امور مالیاتی و ارسال فیزیکی کالا.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">واتس‌اپ / پیام‌رسان</label>
                    <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full px-4 py-2 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent focus:border-indigo-500 outline-none dir-ltr text-right dark:text-slate-200 transition-colors font-mono" placeholder="09xxxxxxxxx" />
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                      <strong>واتس‌اپ:</strong> شماره تماس متصل به پیام‌رسان جهت ارسال پیام فاکتور دیجیتال.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">آدرس کامل دقیق</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none dark:text-slate-200 transition-colors resize-none" placeholder="نشانی دقیق پستی شامل خیابان، کوچه، پلاک، طبقه، واحد..."></textarea>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>آدرس کامل:</strong> نشانی فیزیکی دقیق دفتر یا منزل شخص جهت قید در فاکتور چاپی و حمل مطمئن کالا.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* اطلاعات تجاری */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-white/50 dark:border-slate-800/50 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              اطلاعات تجاری و کسب و کار
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">نام کسب و کار</label>
                <input type="text" name="business_name" value={formData.business_name} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">برند</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">نوع فعالیت / حوزه کاری</label>
                <input type="text" name="business_activity" value={formData.business_activity} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200 transition-all" placeholder="مثال: فروش قطعات یدکی، پوشاک و..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">آدرس محل کار</label>
                <input type="text" name="business_address" value={formData.business_address} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200 transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">توضیحات تکمیلی</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none dark:text-slate-200 transition-colors resize-none" placeholder="هرگونه توضیحات یا یادداشت مهم درباره این شخص..."></textarea>
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-white/50 dark:border-slate-800/50">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              اطلاعات مالی و بانکی
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">نام بانک</label>
                <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-200 transition-all" />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>نام بانک:</strong> نام بانک دارنده حساب شخص جهت سهولت در رهگیری حواله‌ها و تطبیق سندهای دریافتنی.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">شماره شبا (IBAN)</label>
                <div className="flex relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 rounded">IR</span>
                   <input type="text" name="iban" value={formData.iban} onChange={handleChange} className="w-full pl-16 pr-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-left font-mono tracking-widest dark:text-slate-200 transition-all" placeholder="0000 0000 0000 0000 0000 0000" />
                </div>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>شماره شبا:</strong> شماره شناسه حساب بانکی ایران (۲۴ رقم بدون نیاز به نوشتن IR) جهت واریز‌های الکترونیک ساتنا و پایا بدون ریسک برگشت پول.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">شماره کارت</label>
                <input type="text" name="bank_card" value={formData.bank_card} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right font-mono dark:text-slate-200 transition-all" />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>شماره کارت:</strong> شماره کارت عابربانک ۱۶ رقمی متصل به حساب جهت تسویه‌حساب‌های فوری کارت‌به‌کارت.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">شماره حساب</label>
                <input type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right font-mono dark:text-slate-200 transition-all" />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>شماره حساب:</strong> شماره حساب بانکی مستقیم جهت واریز وجه با مراجعه حضوری به شعب یا اینترنت‌بانک.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">سقف اعتبار (ریال)</label>
                <input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right font-mono dark:text-slate-200 transition-all" />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 leading-relaxed">
                  <strong>سقف اعتبار:</strong> حداکثر مبلغ مجاز فروش نسیه یا حساب دفتری باز این شخص؛ فراتر از این مقدار سیستم هشدار خواهد داد.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">مانده اولیه (ریال)</label>
                <input type="number" name="initial_balance" value={formData.initial_balance} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none dir-ltr text-right font-mono dark:text-slate-200 transition-all" />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 leading-relaxed">
                  <strong>مانده اولیه:</strong> مقدار خالص دارایی یا بدهکاری شخص در زمان شروع استقرار سیستم حسابداری جدید.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">نوع مانده اولیه</label>
                <select name="initial_balance_type" value={formData.initial_balance_type} onChange={handleChange} className="w-full px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 focus:ring-2 focus:ring-indigo-500 outline-none text-xs dark:text-slate-200 transition-all font-bold">
                  <option value="debit">بدهکار (از قبل به ما بدهکار است)</option>
                  <option value="credit">بستانکار (از قبل طلبکار است)</option>
                </select>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 leading-relaxed">
                  <strong>نوع مانده اولیه:</strong> تعیین ماهیت حساب؛ بدهکار یعنی شخص باید به شما پول پرداخت کند، بستانکار یعنی شما به وی بدهکارید.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" name="tax_registered" checked={formData.tax_registered} onChange={handleChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </div>
                <div>
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">مشمول ثبت‌نام نظام مالیاتی</span>
                   <span className="text-xs text-slate-500">آیا این شخص / شرکت ارزش افزوده محاسبه می‌شود؟</span>
                </div>
              </label>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
