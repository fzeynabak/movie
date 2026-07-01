import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  HelpCircle, 
  User, 
  Users, 
  Package, 
  ShoppingCart, 
  Boxes, 
  Coins, 
  Settings, 
  Image as ImageIcon, 
  Info, 
  CheckCircle2, 
  ArrowLeftRight, 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sparkles, 
  Play, 
  Check, 
  AlertCircle,
  TrendingUp,
  RotateCcw,
  BadgePercent,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  BookOpenCheck,
  Building,
  Briefcase,
  HelpCircle as QuestionIcon
} from 'lucide-react';

interface Topic {
  id: string;
  category: 'accounting' | 'persons' | 'products' | 'sales' | 'inventory' | 'treasury' | 'general';
  title: string;
  icon: React.ComponentType<any>;
  description: string;
  defaultMedia: string;
  mediaType: 'image' | 'video';
  content: React.ReactNode;
}

export default function Training() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTopicId, setActiveTopicId] = useState<string>('debtor-creditor-basics');
  const [mediaPaths, setMediaPaths] = useState<Record<string, { path: string; type: 'image' | 'video' }>>({});
  const [editingPathTopicId, setEditingPathTopicId] = useState<string | null>(null);
  const [newPathInput, setNewPathInput] = useState<string>('');
  const [newTypeInput, setNewTypeInput] = useState<'image' | 'video'>('image');

  // Load media paths from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('training_media_paths');
    if (saved) {
      try {
        setMediaPaths(JSON.parse(saved));
      } catch (err) {
        console.error('Error loading media paths', err);
      }
    } else {
      // Set initial defaults
      const initialDefaults: Record<string, { path: string; type: 'image' | 'video' }> = {
        'debtor-creditor-basics': { path: '/src/assets/training/debtor_creditor_basics.png', type: 'image' },
        'person-new-guide': { path: '/src/assets/training/person_new.png', type: 'image' },
        'person-list-guide': { path: '/src/assets/training/person_list.png', type: 'image' },
        'sellers-guide': { path: '/src/assets/training/sellers.png', type: 'image' },
        'shareholders-guide': { path: '/src/assets/training/shareholders.png', type: 'image' },
        'employees-guide': { path: '/src/assets/training/employees.png', type: 'image' },
        'product-new-guide': { path: '/src/assets/training/product_new.png', type: 'image' },
        'sales-invoice-guide': { path: '/src/assets/training/sales_invoice.png', type: 'image' },
      };
      setMediaPaths(initialDefaults);
      localStorage.setItem('training_media_paths', JSON.stringify(initialDefaults));
    }
  }, []);

  const saveMediaPath = (topicId: string, path: string, type: 'image' | 'video') => {
    const updated = {
      ...mediaPaths,
      [topicId]: { path, type }
    };
    setMediaPaths(updated);
    localStorage.setItem('training_media_paths', JSON.stringify(updated));
    setEditingPathTopicId(null);
  };

  const getTopicMedia = (topicId: string) => {
    return mediaPaths[topicId] || { path: '', type: 'image' as const };
  };

  const topics: Topic[] = [
    // 1. Accounting Basics
    {
      id: 'debtor-creditor-basics',
      category: 'accounting',
      title: '۱. مفاهیم پایه حسابداری: بدهکار و بستانکار به زبان ساده مادری',
      icon: ArrowLeftRight,
      description: 'آموزش مفاهیم پایه، تفکیک طلب و بدهی، تراز حساب‌ها و رنگ‌بندی‌های راهنما در نرم‌افزار.',
      defaultMedia: '/src/assets/training/debtor_creditor_basics.png',
      mediaType: 'image',
      content: (
        <div className="space-y-6 text-slate-800 dark:text-slate-150 text-xs leading-relaxed">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-150 dark:border-indigo-950/40 p-5 rounded-2xl space-y-3">
            <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              مقدمه فوق‌العاده کاربردی برای شروع کار با سیستم مالی
            </h4>
            <p className="text-xs text-slate-650 dark:text-slate-300">
              اگر هیچ تخصصی در رشته حسابداری ندارید، اصلاً نگران نباشید! این برنامه به گونه‌ای طراحی شده که بدون دانستن فرمول‌های پیچیده، بتوانید تمام تراکنش‌های خرید، فروش، طلب‌ها و بدهی‌های فروشگاه خود را مدیریت کنید. در حسابداری سنتی، دو واژه «بدهکار» و «بستانکار» اساس تمامی اسناد هستند. برای اینکه سیستم به شما بهترین خروجی را بدهد، ابتدا باید متوجه شویم هرکدام از این دو واژه در بازار واقعی و در این نرم‌افزار دقیقاً چه معنایی دارند.
            </p>
          </div>

          {/* Core Concept Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Debtor Explanations */}
            <div className="bg-rose-50/60 dark:bg-rose-950/10 border border-rose-150 dark:border-rose-900/30 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-sm">ب</span>
                <h5 className="text-sm font-black text-rose-700 dark:text-rose-400">بدهکار (Debtor) یعنی چه؟</h5>
              </div>
              <p className="text-slate-650 dark:text-slate-300">
                در زبان عامیانه بازار، <strong>بدهکار یعنی کسی که باید به ما پول پرداخت کند</strong>. به عبارت دیگر، بدهکار همان <strong>مشتری یا طرف حسابی است که از او طلبکار هستیم</strong> و بابت خرید نسیه، کالا یا خدمات، به صندوق مغازه ما بدهی دارد.
              </p>
              
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 dark:border-rose-950/50 space-y-2">
                <p className="font-bold text-rose-600">💡 مثال ملموس بازار:</p>
                <p className="text-slate-500 text-[11px]">
                  آقای کریمی به فروشگاه شما می‌آید و چند قلم جنس به ارزش ۱۰,۰۰۰,۰۰۰ ریال خریداری می‌کند. او کارتخوان را نمی‌کشد و به صورت نسیه جنس‌ها را برمی‌دارد. در این لحظه آقای کریمی در دفتر حسابداری شما <strong>بدهکار</strong> ثبت می‌شود. یعنی او ۱۰ میلیون ریال به شما بدهی دارد و شما از او طلبکارید.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 dark:border-rose-950/50 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300">📊 نمایش بدهکاری در نرم‌افزار:</p>
                <p className="text-slate-500 text-[11px]">
                  سیستم برای راحتی چشم شما، تمام اشخاصی که به شما بدهکار هستند را با <strong>علامت مثبت (+)</strong> و با رنگ <strong className="text-rose-600">قرمز</strong> در لیست اشخاص و پرونده معین نمایش می‌دهد تا در نگاه اول بفهمید چه کسانی به شما بدهکارند و باید با آن‌ها تماس بگیرید.
                </p>
              </div>
            </div>

            {/* Creditor Explanations */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900/30 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-sm">ط</span>
                <h5 className="text-sm font-black text-emerald-700 dark:text-emerald-400">بستانکار (Creditor) یعنی چه؟</h5>
              </div>
              <p className="text-slate-650 dark:text-slate-300">
                در زبان عامیانه بازار، <strong>بستانکار یعنی کسی که ما به او بدهکار هستیم</strong>. یعنی طرف حساب (معمولاً تامین‌کننده کالا، پخش‌کننده، شریک یا کارمند) از ما طلب دارد و ما باید در آینده به او پول پرداخت کنیم.
              </p>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/50 space-y-2">
                <p className="font-bold text-emerald-600">💡 مثال ملموس بازار:</p>
                <p className="text-slate-500 text-[11px]">
                  شما برای تامین انبار مغازه خود، از شرکت پخش «میهن» مقدار ۱۰۰ عدد شیر پاکتی به ارزش کلی ۵۰,۰۰۰,۰۰۰ ریال به صورت نسیه و با چک خریداری می‌کنید. در این لحظه، شرکت پخش میهن در سیستم شما <strong>بستانکار</strong> می‌شود. یعنی شرکت پخش میهن طلبکار است و مغازه شما باید ۵۰ میلیون ریال به آن‌ها بپردازد.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/50 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300">📊 نمایش بستانکاری در نرم‌افزار:</p>
                <p className="text-slate-500 text-[11px]">
                  در سیستم، مبالغ بستانکاری (بدهی ما به دیگران) با <strong>علامت منفی (-)</strong> و با رنگ <strong className="text-emerald-600">سبز</strong> نشان داده می‌شود. این یعنی این مقدار پول متعلق به شما نیست و طلب طرف مقابل است که باید تصفیه شود.
                </p>
              </div>
            </div>

          </div>

          {/* Action-Effect Matrix Table */}
          <div className="border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
            <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" />
              جدول راهنمای تأثیر عملیات روزانه بر حساب اشخاص
            </h5>
            <p className="text-[11px] text-slate-500">
              هر دکمه و سندی که در برنامه ثبت می‌کنید، فوراً مانده حساب شخص را تغییر می‌دهد. با جدول زیر دقیقاً متوجه می‌شوید کدام عملیات چه تأثیری می‌گذارد:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-205 font-bold border-b border-slate-200 dark:border-slate-750">
                    <th className="p-3">نوع عملیات ثبت شده</th>
                    <th className="p-3">تأثیر بر حساب مشتری (خریدار)</th>
                    <th className="p-3">تأثیر بر حساب تامین‌کننده (پخش‌کننده کالا)</th>
                    <th className="p-3">تأثیر بر دخل/صندوق فروشگاه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">ثبت فاکتور فروش (نسیه)</td>
                    <td className="p-3 text-rose-600 font-bold">بدهکاری مشتری افزایش می‌یابد (+)</td>
                    <td className="p-3 text-slate-450">بی‌تأثیر</td>
                    <td className="p-3 text-slate-450">بی‌تأثیر (پولی وارد نشده)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">ثبت فاکتور فروش (تسویه نقدی/کارتخوان)</td>
                    <td className="p-3 text-slate-450">حساب مشتری صفر می‌ماند</td>
                    <td className="p-3 text-slate-450">بی‌تأثیر</td>
                    <td className="p-3 text-emerald-600 font-bold">به صندوق یا بانک افزوده می‌شود (+)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-amber-600 dark:text-amber-400">ثبت فاکتور خرید از تامین‌کننده</td>
                    <td className="p-3 text-slate-450">بی‌تأثیر</td>
                    <td className="p-3 text-emerald-600 font-bold">طلب تامین‌کننده افزایش می‌یابد (-)</td>
                    <td className="p-3 text-slate-450">بی‌تأثیر (خرید نسیه)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">دریافت وجه (مشتری بدهی‌اش را می‌دهد)</td>
                    <td className="p-3 text-emerald-600">بدهکاری مشتری کاهش می‌یابد (-)</td>
                    <td className="p-3 text-slate-450">بی‌تأثیر</td>
                    <td className="p-3 text-emerald-600 font-bold">به صندوق یا بانک افزوده می‌شود (+)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">پرداخت وجه (طلب شرکت پخش را می‌دهیم)</td>
                    <td className="p-3 text-slate-450">بی‌تأثیر</td>
                    <td className="p-3 text-rose-600">طلب تامین‌کننده کاهش می‌یابد (+)</td>
                    <td className="p-3 text-rose-600 font-bold">از صندوق یا بانک کسر می‌شود (-)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    },
    // 2. Add Person Page
    {
      id: 'person-new-guide',
      category: 'persons',
      title: '۲. صفحه افزودن شخص جدید: کالبدشکافی کامل فیلدها و سناریوها',
      icon: User,
      description: 'راهنمای گام به گام تمام فیلدهای فرم ثبت، تعریف نقش‌های چهارگانه و مانده حساب اولیه در بدو ورود.',
      defaultMedia: '/src/assets/training/person_new.png',
      mediaType: 'image',
      content: (
        <div className="space-y-6 text-slate-800 dark:text-slate-150 text-xs leading-relaxed">
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
            صفحه <strong>افزودن شخص جدید</strong> دروازه ورود اطلاعات مالی به نرم‌افزار شماست. هر فرد یا شرکتی که با شما ارتباط مالی دارد (چه مشتری باشد، چه فروشنده مواد اولیه، چه کارمند حقوق‌بگیر و چه شریک تجاری) باید از این صفحه ثبت شود. در ادامه تک‌تک فیلدها، دکمه‌ها و چک‌باکس‌های این فرم را به همراه مثال‌های ۱۰ خطی توضیح می‌دهیم:
          </p>

          <div className="space-y-5">
            {/* Field: Full Name */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase block">۱. فیلد «نام و نام خانوادگی» (الزامی):</span>
              <p className="text-slate-650 dark:text-slate-300">
                این فیلد شناسه هویتی اصلی شخص در فاکتورها و دفاتر مالی است. برای اشخاص حقیقی نام کامل و برای شرکت‌ها یا فروشگاه‌ها نام کامل تجاری یا رسمی ثبت‌شده را یادداشت کنید. نوشتن دقیق فامیلی به شما کمک می‌کند موقع جستجوی سریع در فاکتور، با تایپ ۲ حرف فورا شخص را پیدا کنید.
              </p>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                <p><strong>📌 مثال حقیقی:</strong> علیرضا رضایی (به عنوان مشتری دائمی مغازه)</p>
                <p><strong>📌 مثال حقوقی:</strong> شرکت صنایع غذایی بهروز دوشاب (به عنوان تامین‌کننده سوپرمارکت شما)</p>
              </div>
            </div>

            {/* Field: Nickname / Alias */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase block">۲. فیلد «عنوان تجاری / نام مستعار / شهرت» (اختیاری):</span>
              <p className="text-slate-650 dark:text-slate-300">
                در بازار بسیار پیش می‌آید که شما مشتری را با نام مغازه‌اش یا لقبی که دارد می‌شناسید و نام شناسنامه‌ای او یادتان نیست. این فیلد دقیقاً برای این کار ساخته شده است. سیستم موقع صدور فاکتور، نام مستعار را نیز جستجو می‌کند تا سرعت کار شما افزایش یابد.
              </p>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800 text-[11px] text-slate-500">
                <strong>💡 مثال واقعی:</strong> فرض کنید نام مشتری «غلامحسین حسینی» است اما همه در بازار او را به اسم «سوپر میوه یاس» یا «حاج غلام» می‌شناسند. شما در کادر نام مستعار می‌نویسید: <span className="text-indigo-600 font-bold">سوپر میوه یاس</span>. فردا روز در فاکتور با نوشتن کلمه یاس، نام او فوراً ظاهر می‌شود.
              </div>
            </div>

            {/* Field: Role / Types Checkboxes */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase block">۳. بخش چک‌باکس‌های «نقش شخص» (بسیار تعیین‌کننده):</span>
              <p className="text-slate-650 dark:text-slate-300">
                در این نرم‌افزار، شما نیازی ندارید برای یک شخص که هم از شما خرید می‌کند و هم به شما جنس می‌فروشد، دو اکانت بسازید! یک شخص می‌تواند در سیستم چندین نقش همزمان داشته باشد. تیک زدن هر گزینه دسترسی‌های زیر را فعال می‌کند:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px]">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                  <strong className="text-slate-850 dark:text-white block mb-1">✅ نقش مشتری:</strong>
                  شخص در کادر فاکتور فروش ظاهر شده و امکان فروش نسیه یا نقدی به او فعال می‌شود.
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                  <strong className="text-slate-850 dark:text-white block mb-1">✅ نقش تامین‌کننده:</strong>
                  شخص در فاکتور خرید کالا به عنوان شرکت پخش یا فروشنده مواد اولیه لیست می‌شود.
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                  <strong className="text-slate-850 dark:text-white block mb-1">✅ نقش کارمند:</strong>
                  امکان تخصیص حقوق ماهانه، ثبت مساعده، و صدور فیش‌های واریزی پرسنلی برای او باز می‌شود.
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                  <strong className="text-slate-850 dark:text-white block mb-1">✅ نقش سهامدار:</strong>
                  او به عنوان آورنده سرمایه اولیه مغازه شناسایی شده و در تراز سرمایه‌گذاری لیست می‌شود.
                </div>
              </div>
            </div>

            {/* Field: Initial Balance */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase block">۴. بخش «مانده حساب اولیه» و «نوع حساب اولیه»:</span>
              <p className="text-slate-650 dark:text-slate-300">
                وقتی برای اولین بار می‌خواهید اطلاعات دفتر دفتری قدیمی خود را وارد این نرم‌افزار کنید، قطعاً اشخاص از قبل با شما تسویه حساب نیستند. این بخش برای ثبت مانده قبلی آن‌هاست تا مجبور نباشید تمام فاکتورهای سال گذشته را تک‌تک وارد کنید.
              </p>
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-150 dark:border-slate-800 text-[11px] space-y-2">
                <p className="font-bold text-rose-600">🔴 سناریوی اول: انتخاب «بدهکار (+)»</p>
                <p className="text-slate-500">
                  اگر در آغاز کار با برنامه، آقای کریمی مبلغ ۵,۰۰۰,۰۰۰ ریال به شما از فاکتورهای سال قبل بدهی دارد، مبلغ را ۵ میلیون بنویسید و تیک <strong>بدهکار</strong> را بزنید. سیستم حساب او را در بدو ورود با ۵ میلیون بدهکاری شروع می‌کند.
                </p>
                
                <p className="font-bold text-emerald-600 pt-2 border-t border-slate-100 dark:border-slate-800">🟢 سناریوی دوم: انتخاب «بستانکار (-)»</p>
                <p className="text-slate-500">
                  اگر شما به شرکت پخش میهن مبلغ ۱۲,۰۰۰,۰۰۰ ریال بابت خریدهای قبل بدهکار هستید، مبلغ را ۱۲ میلیون بنویسید و تیک <strong>بستانکار</strong> را بزنید. سیستم حساب شما به شرکت پخش میهن را در بدو ورود با ۱۲ میلیون طلبکاری او (بدهی شما) ثبت می‌کند.
                </p>
              </div>
            </div>

            {/* Field: Phone numbers, National ID, Card number */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase block">۵. سایر فیلدها (تلفن، کد ملی، شماره کارت بانکی):</span>
              <p className="text-slate-650 dark:text-slate-300">
                داشتن شماره کارت بانکی مشتری یا تامین‌کننده در پرونده او بسیار عالی است، زیرا موقع پرداخت‌های علی‌الحساب یا عودت وجه، نیازی به گشتن در چت‌ها برای شماره کارت ندارید و مستقیم از کارت او کپی می‌کنید. کدملی نیز برای صدور فاکتورهای رسمی دارایی و گزارش‌های فصلی خریداران پر اهمیت است.
              </p>
            </div>
          </div>
        </div>
      )
    },
    // 3. Person List & Ledger Detailed Manual
    {
      id: 'person-list-guide',
      category: 'persons',
      title: '۳. صفحه لیست اشخاص: کارکرد دکمه‌ها، پرونده مالی و چاپ معین',
      icon: Users,
      description: 'آموزش کامل تب‌های پرونده مالی شخص، تصفیه مبالغ بدهی با دکمه دریافت/پرداخت سریع و پیش‌نمایش معین.',
      defaultMedia: '/src/assets/training/person_list.png',
      mediaType: 'image',
      content: (
        <div className="space-y-6 text-slate-800 dark:text-slate-150 text-xs leading-relaxed">
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
            صفحه <strong>لیست اشخاص</strong> فراتر از یک جدول ساده است. این صفحه یک داشبورد تمام عیار مدیریت حساب برای تک‌تک آدم‌هایی است که با کسب‌وکار شما تراکنش دارند. در زیر تمامی دکمه‌ها و پاپ‌آپ‌های این بخش را دقیقاً بررسی می‌کنیم:
          </p>

          <div className="space-y-5">
            {/* Quick Action Buttons */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 uppercase block">🛠️ دکمه‌های عملیات سریع روی هر کارت شخص:</span>
              <p className="text-slate-650 dark:text-slate-300">
                در زیر نام هر شخص در لیست، ۴ دکمه عملیاتی تعبیه شده است تا بتوانید کارهای روزانه را در کمتر از ۵ ثانیه بدون وارد شدن به منوهای تو در تو انجام دهید:
              </p>
              
              <div className="space-y-3 mr-2">
                <div className="flex gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span className="text-xs font-bold text-indigo-600 w-24 shrink-0">🛒 فروش جدید:</span>
                  <p className="text-slate-500 text-[11px]">شما را مستقیم به صفحه صدور فاکتور فروش می‌برد و به طور خودکار این شخص را به عنوان خریدار فاکتور انتخاب می‌کند تا بلافاصله کالاها را اسکن کنید و وقت تلف نشود.</p>
                </div>
                <div className="flex gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span className="text-xs font-bold text-amber-600 w-24 shrink-0">📦 خرید جدید:</span>
                  <p className="text-slate-500 text-[11px]">شما را به صفحه فاکتور خرید کالا هدایت می‌کند و این شخص را به عنوان تامین‌کننده فاکتور قرار می‌دهد تا کالاها را در انبار شارژ کنید.</p>
                </div>
                <div className="flex gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span className="text-xs font-bold text-emerald-600 w-24 shrink-0">💰 دریافت وجه:</span>
                  <p className="text-slate-500 text-[11px]">پاپ‌آپ دریافت نقدی باز می‌شود. اگر مشتری برای پرداخت قسط یا بدهی‌اش پولی آورد، مبلغ را اینجا بنویسید؛ سیستم پول را به بانک/صندوق ریخته و بدهی او را کسر می‌کند.</p>
                </div>
                <div className="flex gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span className="text-xs font-bold text-rose-600 w-24 shrink-0">💸 پرداخت وجه:</span>
                  <p className="text-slate-500 text-[11px]">پاپ‌آپ پرداخت وجه باز می‌شود. اگر می‌خواهید به تامین‌کننده علی‌الحساب پولی بدهید، مبلغ را اینجا بنویسید؛ وجه از بانک کسر و از طلب تامین‌کننده کم می‌شود.</p>
                </div>
              </div>
            </div>

            {/* Person Ledger File Slide-over */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 uppercase block">📁 کشوی پرونده مالی شخص (دفتر معین تفصیلی):</span>
              <p className="text-slate-650 dark:text-slate-300">
                با کلیک بر روی دکمه <strong>«پرونده شخص»</strong>، یک کشوی بزرگ از سمت راست صفحه به صورت متحرک باز می‌شود. این کشو شناسنامه مالی کامل این فرد در تجارت شماست.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-500 mr-2">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                  <strong className="text-slate-800 dark:text-white block mb-1">📊 گردش حساب مالی:</strong>
                  تمام رویدادها اعم از خریدها، فاکتورها و فیش‌های دریافتی به ترتیب تاریخ لیست شده و در جلو هر ردیف، مانده در لحظه حساب به همراه وضعیت (بدهکار/بستانکار) مانند پرینت حساب بانکی رسمی قرار دارد.
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                  <strong className="text-slate-800 dark:text-white block mb-1">📄 فاکتورها:</strong>
                  آرشیو کامل فاکتورهای فروش صادر شده برای او. می‌توانید هر زمان فاکتور مورد نظر را انتخاب و دوباره در هر سایزی چاپ کنید.
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                  <strong className="text-slate-800 dark:text-white block mb-1">📝 یادداشت‌ها و کارها:</strong>
                  امکان یادداشت‌گذاری پیگیری‌های تلفنی یا قرار ملاقات‌ها. مثلاً: «تماس گرفته شد، قرار شد چک را تا دوشنبه پاس کنند.»
                </div>
              </div>
            </div>

            {/* Print Ledger */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 uppercase block">🖨️ دکمه چاپ صورتحساب (چاپ معین حساب):</span>
              <p className="text-slate-650 dark:text-slate-300">
                در بالای پرونده شخص، یک دکمه بزرگ با آیکون چاپگر قرار دارد. با فشردن این دکمه، نرم‌افزار به صورت خودکار یک فاکتور مالی رسمی از کل بدهکاری‌ها، بستانکاری‌ها و تراکنش‌های معین حساب به همراه سربرگ رسمی فروشگاه شما، مانده قبلی و مانده جدید تولید می‌کند و مستقیماً آماده‌ی پرینت یا ذخیره به صورت فایل PDF جهت ارسال در شبکه‌های اجتماعی برای مشتری می‌کند.
              </p>
            </div>
          </div>
        </div>
      )
    },
    // 4. Sellers/Suppliers Page
    {
      id: 'sellers-guide',
      category: 'persons',
      title: '۴. صفحه تامین‌کنندگان و فروشندگان کالا (Sellers)',
      icon: Building,
      description: 'تامین و فاکتور خرید کالا، نحوه ارزیابی طلب شرکت‌های پخش و تسویه بدهی‌های عمده.',
      defaultMedia: '/src/assets/training/sellers.png',
      mediaType: 'image',
      content: (
        <div className="space-y-6 text-slate-800 dark:text-slate-150 text-xs leading-relaxed">
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
            بخش <strong>فروشندگان کالا (تامین‌کنندگان)</strong> جایی است که شما شرکت‌های توزیع‌کننده، کارخانجات و یا هر طرف حسابی که مواد اولیه یا کالا را از او می‌خرید مدیریت می‌کنید. بیایید فرآیندهای مالی این صفحه را به زبان ساده شرح دهیم:
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <h5 className="text-xs font-black text-slate-800 dark:text-white">تفاوت مشتری معمولی و تامین‌کننده در سیستم چیست؟</h5>
              <p className="text-slate-650 dark:text-slate-300">
                هر چند هر دو انسان یا شرکت هستند، اما در فلوچارت مالی، تامین‌کننده نقش <strong>طلبکار دایمی</strong> شما را بازی می‌کند. یعنی ما از او کالا می‌خریم و به او پول بدهکار می‌شویم (مانده حساب بستانکار - سبز). تفکیک این اشخاص در منوی فروشندگان به شما این امکان را می‌دهد که به راحتی بفهمید به کدام شرکت‌های پخش چقدر بدهی دارید و چک‌های سررسید را برای چه کسانی پاس کنید.
              </p>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-800 text-[11px] text-slate-500">
                <strong>💡 مثال:</strong> شرکت پخش به آرا کالا را تعریف می‌کنید و تیک نقش تامین‌کننده را می‌زنید. از این پس این شرکت فقط در فاکتورهای خرید انبار نشان داده می‌شود تا لیست خرید شما خلوت باشد و مشتریان معمولی در کادر خرید مزاحم کار شما نشوند.
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <h5 className="text-xs font-black text-slate-800 dark:text-white">نحوه ثبت فاکتور خرید نسیه و تأثیر آن بر حساب فروشنده:</h5>
              <p className="text-slate-650 dark:text-slate-300">
                وقتی فاکتور خرید از پخش ثبت می‌کنید، ارزش فاکتور به عنوان <strong>طلب تامین‌کننده</strong> ثبت می‌شود. برای تصفیه آن، دکمه «پرداخت وجه سریع» را در کارت فروشنده بزنید تا وجه از بانک یا صندوق کسر و حساب او تصفیه شود.
              </p>
            </div>
          </div>
        </div>
      )
    },
    // 5. Shareholders Page
    {
      id: 'shareholders-guide',
      category: 'persons',
      title: '۵. صفحه سهامداران و شرکای تجاری (Shareholders)',
      icon: Briefcase,
      description: 'نحوه ثبت آورده شرکا، تقسیم سود و سرمایه در گردش مغازه به زبان کاملاً ساده.',
      defaultMedia: '/src/assets/training/shareholders.png',
      mediaType: 'image',
      content: (
        <div className="space-y-6 text-slate-800 dark:text-slate-150 text-xs leading-relaxed">
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
            بسیاری از فروشگاه‌ها دارای دو یا چند شریک هستند که با هم پول روی هم گذاشته‌اند و مغازه را راه انداخته‌اند. بخش <strong>سهامداران و شرکا</strong> وظیفه تفکیک و شفاف‌سازی مبالغ این افراد را دارد:
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <h5 className="text-xs font-black text-slate-800 dark:text-white">تعریف شریک تجاری و ثبت آورده نقدی اول دوره:</h5>
              <p className="text-slate-650 dark:text-slate-300">
                اگر شریک شما در تاسیس مغازه مبلغ ۱۰۰,۰۰۰,۰۰۰ ریال سرمایه نقدی آورده است، او را با نقش <strong>سهامدار</strong> تعریف کنید و مبلغ را به عنوان بستانکاری او (-) ثبت کنید. این یعنی مغازه بابت سرمایه اولیه به این سهامدار بدهکار است و در حقیقت این سرمایه فیزیکی در گردش مغازه شما قرار دارد.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <h5 className="text-xs font-black text-slate-800 dark:text-white">برداشت شریک از دخل مغازه و نحوه سند زدن آن:</h5>
              <p className="text-slate-650 dark:text-slate-300">
                اگر شریک شما به صورت هفتگی مبالغی را برای هزینه‌های شخصی از دخل برمی‌دارد، روی دکمه «پرداخت وجه سریع» در کارت او بزنید. با این کار، مبالغ برداشتی او به حساب معین او به عنوان بدهکار ثبت شده و در نهایت از طلب کلی یا سرمایه او کسر می‌گردد تا حساب‌ها کاملاً شفاف و بی‌بحث باقی بمانند.
              </p>
            </div>
          </div>
        </div>
      )
    },
    // 6. Employees Page
    {
      id: 'employees-guide',
      category: 'persons',
      title: '۶. صفحه کارمندان و پرسنل (Employees)',
      icon: Briefcase,
      description: 'ردیابی حقوق ماهانه، ثبت مساعده‌ها و پاداش‌های پرسنل فروشگاه.',
      defaultMedia: '/src/assets/training/employees.png',
      mediaType: 'image',
      content: (
        <div className="space-y-6 text-slate-800 dark:text-slate-150 text-xs leading-relaxed">
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
            مدیریت مالی کارکنان شامل ردیابی مساعده‌ها، حقوق ماهانه و پرداخت‌هاست. بخش <strong>کارمندان و پرسنل</strong> این تراکنش‌ها را ساده و منظم می‌کند:
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <h5 className="text-xs font-black text-slate-800 dark:text-white">مساعده کارمندان چیست و چگونه ثبت می‌شود؟</h5>
              <p className="text-slate-650 dark:text-slate-300">
                گاهی پیش از پایان ماه، پرسنل شما مبالغی را به عنوان پیش‌پرداخت حقوق (مساعده) درخواست می‌کنند. در این حالت، از دکمه «پرداخت سریع» در کارت پرسنلی کارمند استفاده کنید. این مبلغ کارمند را در سیستم <strong>بدهکار (+)</strong> می‌کند. در پایان ماه هنگام محاسبه حقوق، این مبالغ به صورت خودکار نشان داده می‌شوند تا از حقوق کل کسر شوند.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <h5 className="text-xs font-black text-slate-800 dark:text-white">تصفیه نهایی حقوق پایان ماه:</h5>
              <p className="text-slate-650 dark:text-slate-300">
                در زمان پرداخت حقوق نهایی، با ثبت سند پرداخت حقوق و کسر مساعده‌های گرفته شده، مابقی وجه به بانک یا صندوق کارمند واریز می‌گردد و مانده حساب پرسنلی او مجدداً برای ماه جدید صفر می‌شود.
              </p>
            </div>
          </div>
        </div>
      )
    },
    // 7. Products
    {
      id: 'product-new-guide',
      category: 'products',
      title: '۷. افزودن کالا و خدمات و مدیریت بهای خرید و فروش',
      icon: Package,
      description: 'آموزش افزودن کالا و خدمات جدید، اهمیت بهای خرید برای سود فاکتور و نقطه سفارش کالا.',
      defaultMedia: '/src/assets/training/product_new.png',
      mediaType: 'image',
      content: (
        <div className="space-y-6 text-slate-800 dark:text-slate-150 text-xs leading-relaxed">
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
            تعریف اصولی کالاها و خدمات تضمین‌کننده‌ی دقت و سرعت در هنگام فروش است. در این بخش فیلدهای افزودن کالا را گام‌به‌گام بررسی می‌کنیم:
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-650 block">نام کالا یا خدمت:</span>
              <p className="text-slate-650 dark:text-slate-300">
                عنوان محصول را کامل بنویسید. به عنوان مثال، اگر کالا دارای سایز یا ویژگی خاصی است، در نام بنویسید تا موقع انتخاب اشتباه نشود.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-650 block">قیمت خرید (ریال) و قیمت فروش (ریال):</span>
              <p className="text-slate-650 dark:text-slate-300">
                قیمت خرید برای <strong>محاسبه سود خالص فروش</strong> کاربرد دارد. اگر قیمت خرید را ثبت نکنید یا صفر بگذارید، کل مبلغ فروش کالا به عنوان سود فاکتور در بخش حسابداری در نظر گرفته می‌شود که دقیق نخواهد بود.
              </p>
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100/30 text-[11px] text-indigo-700 dark:text-indigo-300">
                💡 <strong>مثال فرمول سود:</strong> قیمت فروش کالا (۱۰,۰۰۰) منهای قیمت خرید (۷,۰۰۰) مساوی با سود خالص شما (۳,۰۰۰ ریال).
              </div>
            </div>
          </div>
        </div>
      )
    },
    // 8. Sales Invoice Guide
    {
      id: 'sales-invoice-guide',
      category: 'sales',
      title: '۸. راهنمای گام به گام صدور فاکتور فروش و ویرایش فاکتورها',
      icon: ShoppingCart,
      description: 'آموزش پر کردن سبد خرید، مدیریت تخفیفات، مالیات، ثبت دریافت نقدی و دکمه جدید ویرایش فاکتور.',
      defaultMedia: '/src/assets/training/sales_invoice.png',
      mediaType: 'image',
      content: (
        <div className="space-y-6 text-slate-800 dark:text-slate-150 text-xs leading-relaxed">
          <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
            صدور فاکتور فروش فرآیندی پویا و روزمره است. در اینجا جزییات و تمامی دکمه‌های این صفحه را با هم مرور می‌کنیم:
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
              <h5 className="text-xs font-black text-slate-800 dark:text-white">کادر جستجو و انتخاب محصول:</h5>
              <p className="text-slate-650 dark:text-slate-300">
                با زدن نام کالا یا اسکن بارکد، محصول فوراً وارد جدول فاکتور می‌شود. در جدول اقلام می‌توانید مقادیر را تغییر دهید.
              </p>
            </div>

            <div className="p-4 bg-emerald-500/10 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 p-4 rounded-xl border border-emerald-100/30 space-y-2">
              <h5 className="text-xs font-black flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                امکان جدید: دکمه ویرایش فاکتورهای صادر شده
              </h5>
              <p className="text-xs leading-relaxed">
                پیش از این امکان ویرایش فاکتورهای فروخته شده وجود نداشت. در آپدیت جدید:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] mr-3">
                <li>وارد بخش <strong>فروش و فاکتورها &gt; تاریخچه فاکتورها</strong> شوید.</li>
                <li>در کنار هر فاکتور دکمه زرد رنگ <strong>"ویرایش فاکتور"</strong> اضافه شده است.</li>
                <li>با کلیک روی آن، اطلاعات فاکتور بارگذاری شده و شما به صفحه فاکتور جدید هدایت می‌شوید تا هر تغییری در کالاها، مبالغ یا نام خریدار بدهید و فاکتور ویرایش شده را جایگزین فاکتور قبلی کنید.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredTopics = activeCategory === 'all' 
    ? topics 
    : topics.filter(t => t.category === activeCategory);

  const currentTopic = topics.find(t => t.id === activeTopicId) || topics[0];
  const currentMedia = getTopicMedia(currentTopic.id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-indigo-600" />
            <span>آموزش جامع و راهنمای کاربری نرم‌افزار</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            یک خودآموز کاربردی و آسان برای یادگیری حسابداری ساده، اصطلاحات برنامه و راهنمای قدم به قدم هر صفحه.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-300 py-2 px-3 rounded-xl border border-indigo-100/30 font-medium">
          <Info className="w-4 h-4" />
          <span>پشتیبانی کامل از بارگذاری اسکرین‌شات و فیلم‌های آموزشی شخصی شما</span>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'all' 
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
          }`}
        >
          همه مباحث
        </button>
        <button
          onClick={() => setActiveCategory('accounting')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'accounting' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
          }`}
        >
          مفاهیم پایه حسابداری
        </button>
        <button
          onClick={() => setActiveCategory('persons')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'persons' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
          }`}
        >
          مدیریت اشخاص (مشتری، تامین‌کننده، شریک، کارمند)
        </button>
        <button
          onClick={() => setActiveCategory('products')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'products' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
          }`}
        >
          کالا و انبارداری
        </button>
        <button
          onClick={() => setActiveCategory('sales')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'sales' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
          }`}
        >
          فروش و فاکتورها
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Topics Menu */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-4 sticky top-6 space-y-4">
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mb-2 mr-1 uppercase">فهرست آموزش‌ها</span>
              <div className="space-y-1">
                {filteredTopics.map((t) => {
                  const isSelected = activeTopicId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTopicId(t.id);
                        setEditingPathTopicId(null);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-right text-xs font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <t.icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-450 dark:text-slate-550 space-y-2 leading-relaxed">
              <p className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                شخصی‌سازی رسانه‌های آموزش:
              </p>
              <p>
                شما می‌توانید برای تک‌تک مباحث اسکرین‌شات بگیرید و آدرس فایل آن را در زیرمجموعه ویرایش رسانه قرار دهید تا برای اپراتورهای شما نمایش داده شود.
              </p>
            </div>
          </div>
        </div>

        {/* Training Content Viewer Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 space-y-6 shadow-sm">
            
            {/* Topic Header */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-2">
                <HelpCircle className="w-3 h-3" />
                <span>دسته‌بندی: {currentTopic.category === 'accounting' ? 'مفاهیم پایه حسابداری' : currentTopic.category === 'persons' ? 'مدیریت اشخاص' : currentTopic.category === 'products' ? 'کالا و خدمات' : currentTopic.category === 'sales' ? 'فروش و فاکتور' : currentTopic.category === 'inventory' ? 'انبارداری' : 'سایر امکانات'}</span>
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">{currentTopic.title}</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">{currentTopic.description}</p>
            </div>

            {/* Visual Screen Demonstration Card */}
            <div className="bg-slate-50 dark:bg-slate-950/15 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  <span>دموی تصویری / ویدیویی این بخش</span>
                </span>
                
                {/* Media Edit Action */}
                <button
                  onClick={() => {
                    setEditingPathTopicId(editingPathTopicId === currentTopic.id ? null : currentTopic.id);
                    setNewPathInput(currentMedia.path);
                    setNewTypeInput(currentMedia.type);
                  }}
                  className="px-2.5 py-1 text-[10px] bg-white hover:bg-indigo-50 dark:bg-slate-850 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg border border-slate-200 dark:border-slate-750 transition-colors cursor-pointer font-bold"
                >
                  {editingPathTopicId === currentTopic.id ? 'بستن تنظیمات رسانه' : 'تنظیم اختصاصی عکس/فیلم'}
                </button>
              </div>

              {/* Media Settings Config form panel */}
              <AnimatePresence>
                {editingPathTopicId === currentTopic.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 border-b border-slate-150 dark:border-slate-850 bg-indigo-50/20 dark:bg-indigo-950/5 space-y-3 text-xs overflow-hidden"
                  >
                    <p className="text-slate-500 leading-relaxed font-medium">
                      شما می‌توانید اسکرین‌شات یا ویدیوی آموزشی کوتاهی از این بخش تهیه کنید و در پوشه‌ی پروژه ذخیره کرده و آدرس آن را در کادر زیر وارد نمایید تا به کادر آموزش اضافه شود.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">مسیر فایل (آدرس نسبی یا اینترنتی):</label>
                        <input
                          type="text"
                          value={newPathInput}
                          onChange={(e) => setNewPathInput(e.target.value)}
                          placeholder="مثال: /src/assets/add_person.png"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">نوع رسانه:</label>
                        <select
                          value={newTypeInput}
                          onChange={(e) => setNewTypeInput(e.target.value as 'image' | 'video')}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 font-semibold"
                        >
                          <option value="image">عکس (Screenshot)</option>
                          <option value="video">ویدیو (MP4/WebM)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => saveMediaPath(currentTopic.id, newPathInput, newTypeInput)}
                        className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>ذخیره مسیر رسانه</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Media Display Sandbox */}
              <div className="p-4 flex flex-col items-center justify-center min-h-[220px] bg-slate-100/50 dark:bg-slate-900/40 relative">
                {currentMedia.path ? (
                  currentMedia.type === 'video' ? (
                    <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative group">
                      <video 
                        src={currentMedia.path} 
                        controls 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="max-w-full max-h-[300px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex items-center justify-center p-2">
                      <img 
                        src={currentMedia.path} 
                        alt={currentTopic.title} 
                        className="max-h-[280px] object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="text-[11px] text-slate-400 font-medium">هیچ عکس یا ویدیویی برای این مبحث تنظیم نشده است.</p>
                    <p className="text-[10px] text-slate-400">با زدن دکمه «تنظیم اختصاصی عکس/فیلم» در بالا، می‌توانید اسکرین‌شات این صفحه را جایگذاری کنید.</p>
                  </div>
                )}
                <div className="mt-3 text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>آدرس بارگذاری شده: <code className="font-mono text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 px-1 py-0.5 rounded">{currentMedia.path || 'ثبت نشده (نمایش پیش‌فرض)'}</code></span>
                </div>
              </div>
            </div>

            {/* Core Training Content Render Area */}
            <div className="prose prose-slate dark:prose-invert max-w-none border-t border-slate-100 dark:border-slate-800 pt-6">
              {currentTopic.content}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
