import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Coins, 
  AlertTriangle,
  ArrowDownCircle,
  UserPlus,
  FolderPlus,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  AlertCircle,
  TrendingUp,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import JalaliDatePicker, { 
  gregorianToJalali, 
  getTodayJalali, 
  toPersianDigits 
} from '../components/JalaliDatePicker';

// Solid date parser helper for dynamic Gregorian-to-Jalali conversions
function parseToJalali(dateStr: string): { y: number; m: number; d: number } {
  if (!dateStr) {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  // Check if already Jalali format "14xx/xx/xx"
  const shamsiRegex = /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/;
  const match = dateStr.match(shamsiRegex);
  if (match) {
    const y = parseInt(match[1]);
    const m = parseInt(match[2]);
    const d = parseInt(match[3]);
    if (y >= 1300 && y <= 1500) {
      return { y, m, d };
    }
  }

  // Try parsing as standard Gregorian date
  try {
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      return gregorianToJalali(
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        dateObj.getDate()
      );
    }
  } catch (e) {
    console.error('Error parsing date:', dateStr, e);
  }

  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

const getJalaliComparable = (jDate: { y: number; m: number; d: number }) => {
  return jDate.y * 10000 + jDate.m * 100 + jDate.d;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Period-based stats state
  const [activePeriod, setActivePeriod] = React.useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customFromDate, setCustomFromDate] = React.useState('');
  const [customToDate, setCustomToDate] = React.useState('');

  // Carousel ref and scroll controllers
  const carouselRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Populate date defaults
    const today = getTodayJalali();
    const startOfMonthStr = `${today.y}/${String(today.m).padStart(2, '0')}/۰۱`;
    const todayStr = `${today.y}/${String(today.m).padStart(2, '0')}/${String(today.d).padStart(2, '0')}`;
    setCustomFromDate(startOfMonthStr);
    setCustomToDate(todayStr);

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getDashboardData) {
        const res = await window.electronAPI.getDashboardData();
        if (res && res.success) {
          setData(res);
        } else {
          console.error('Failed to load dashboard data:', res?.error);
        }
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = parseFloat(String(val)) || 0;
    return num.toLocaleString('fa-IR');
  };

  // 1. Calculations for multi-period sales and profit from REAL invoices
  const periodStats = React.useMemo(() => {
    if (!data?.allInvoicesForCalculations) {
      return { sales: 0, profit: 0, count: 0, avg: 0 };
    }

    const invoices = data.allInvoicesForCalculations.filter(
      (inv: any) => inv.type === 'فروش' || inv.type === null
    );
    const todayJalali = getTodayJalali();
    const todayVal = getJalaliComparable(todayJalali);

    // Saturday-based current week calculation
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0: Sunday, ..., 6: Saturday
    const daysToSubtract = currentDayOfWeek === 6 ? 0 : (currentDayOfWeek + 1);
    const saturdayDate = new Date(now);
    saturdayDate.setDate(now.getDate() - daysToSubtract);
    saturdayDate.setHours(0, 0, 0, 0);

    const processedInvoices = invoices.map((inv: any) => {
      const jDate = parseToJalali(inv.date);
      const jalaliVal = getJalaliComparable(jDate);
      const gregTime = new Date(inv.date).getTime();
      return { 
        jalaliVal, 
        gregTime, 
        jDate, 
        final_amount: inv.final_amount || 0, 
        profit: inv.profit || 0 
      };
    });

    let filtered = [];

    if (activePeriod === 'today') {
      filtered = processedInvoices.filter(p => p.jalaliVal === todayVal);
    } else if (activePeriod === 'week') {
      filtered = processedInvoices.filter(p => p.gregTime >= saturdayDate.getTime());
    } else if (activePeriod === 'month') {
      filtered = processedInvoices.filter(p => p.jDate.y === todayJalali.y && p.jDate.m === todayJalali.m);
    } else if (activePeriod === 'custom') {
      let fromVal = 0;
      let toVal = 99999999;
      
      const cleanFrom = customFromDate ? customFromDate.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()) : '';
      const cleanTo = customToDate ? customToDate.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()) : '';

      if (cleanFrom) {
        const parts = cleanFrom.split('/');
        fromVal = parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2] || '1');
      }
      if (cleanTo) {
        const parts = cleanTo.split('/');
        toVal = parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2] || '31');
      }

      filtered = processedInvoices.filter(p => p.jalaliVal >= fromVal && p.jalaliVal <= toVal);
    }

    const totalSales = filtered.reduce((sum, inv) => sum + inv.final_amount, 0);
    const totalProfit = filtered.reduce((sum, inv) => sum + inv.profit, 0);
    const count = filtered.length;
    const avg = count > 0 ? Math.round(totalSales / count) : 0;

    return {
      sales: totalSales,
      profit: totalProfit,
      count,
      avg
    };
  }, [data, activePeriod, customFromDate, customToDate]);

  // 2. Real sales and expenses chart data (grouped by Jalali Month for last 6 months)
  const realSalesData = React.useMemo(() => {
    if (!data?.allInvoicesForCalculations) return [];
    
    const MONTH_NAMES = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];

    const currentJalali = getTodayJalali();
    const monthsList: any[] = [];
    
    // Generate dynamic list of last 6 Jalali months
    for (let i = 5; i >= 0; i--) {
      let m = currentJalali.m - i;
      let y = currentJalali.y;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      monthsList.push({
        year: y,
        month: m,
        name: `${MONTH_NAMES[m - 1]} ${toPersianDigits(y % 100)}`,
        sales: 0,
        expenses: 0
      });
    }

    // Distribute actual transaction sums
    data.allInvoicesForCalculations.forEach((inv: any) => {
      const jDate = parseToJalali(inv.date);
      const match = monthsList.find(m => m.year === jDate.y && m.month === jDate.m);
      if (match) {
        if (inv.type === 'خرید') {
          match.expenses += inv.final_amount || 0;
        } else {
          match.sales += inv.final_amount || 0;
        }
      }
    });

    return monthsList;
  }, [data]);

  // 3. Dynamic Category Pie Chart data
  const realPieData = React.useMemo(() => {
    if (!data?.categorySales || data.categorySales.length === 0) {
      return [
        { name: 'فروش مستقیم کالا', value: 1 }
      ];
    }
    return data.categorySales.map((item: any) => ({
      name: item.name,
      value: item.value
    }));
  }, [data]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // 4. Products out-of-stock and low-stock filtration
  const stockAlerts = React.useMemo(() => {
    if (!data?.allProducts) return { outOfStock: [], lowStock: [] };
    
    const outOfStock = data.allProducts.filter((p: any) => (p.total_stock || 0) <= 0);
    const lowStock = data.allProducts.filter((p: any) => 
      (p.total_stock || 0) > 0 && (p.total_stock || 0) <= Math.max(1, p.min_stock || 5)
    );

    return { outOfStock, lowStock };
  }, [data]);

  const stats = [
    { 
      label: 'مشتریان فعال', 
      value: (data?.customersCount || 0).toLocaleString('fa-IR'), 
      icon: Users, 
      color: 'text-blue-600 dark:text-blue-400', 
      bg: 'bg-blue-100 dark:bg-blue-900/40' 
    },
    { 
      label: 'کل محصولات', 
      value: (data?.productsCount || 0).toLocaleString('fa-IR'), 
      icon: Package, 
      color: 'text-indigo-600 dark:text-indigo-400', 
      bg: 'bg-indigo-100 dark:bg-indigo-900/40' 
    },
    { 
      label: 'فاکتورهای امروز', 
      value: (data?.todayInvoicesCount || 0).toLocaleString('fa-IR'), 
      icon: ShoppingCart, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      bg: 'bg-emerald-100 dark:bg-emerald-900/40' 
    },
    { 
      label: 'فروش امروز (ریال)', 
      value: formatCurrency(data?.todaySales || 0), 
      icon: DollarSign, 
      color: 'text-amber-600 dark:text-amber-400', 
      bg: 'bg-amber-100 dark:bg-amber-900/40' 
    },
    { 
      label: 'سود امروز (ریال)', 
      value: formatCurrency(data?.todayProfit || 0), 
      icon: Coins, 
      color: 'text-teal-600 dark:text-teal-400', 
      bg: 'bg-teal-100 dark:bg-teal-900/40' 
    },
    { 
      label: 'کالاهای کم موجودی', 
      value: (data?.lowStockCount || 0).toLocaleString('fa-IR'), 
      icon: AlertTriangle, 
      color: 'text-rose-600 dark:text-rose-400', 
      bg: 'bg-rose-100 dark:bg-rose-900/40' 
    },
    { 
      label: 'کل طلبکاران (طلب ما)', 
      value: formatCurrency(data?.totalDebtorsSum || 0), 
      icon: ArrowDownLeft, 
      color: 'text-cyan-600 dark:text-cyan-400', 
      bg: 'bg-cyan-100 dark:bg-cyan-900/40' 
    },
    { 
      label: 'کل بدهکاران (بدهی ما)', 
      value: formatCurrency(data?.totalCreditorsSum || 0), 
      icon: ArrowUpRight, 
      color: 'text-orange-600 dark:text-orange-400', 
      bg: 'bg-orange-100 dark:bg-orange-900/40' 
    },
  ];

  const quickActions = [
    { label: 'ثبت فروش جدید', path: '/sales/new-invoice', icon: ShoppingCart, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40' },
    { label: 'ثبت خرید جدید', path: '/inventory/control', icon: ArrowDownCircle, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40' },
    { label: 'افزودن مشتری', path: '/persons/new', icon: UserPlus, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40' },
    { label: 'افزودن محصول', path: '/products/new', icon: FolderPlus, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40' },
    { label: 'مدیریت بدهی/طلبی', path: '/persons/debtors-creditors', icon: TrendingDown, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40' },
    { label: 'لیست اشخاص', path: '/persons/list', icon: Users, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 dark:hover:bg-teal-900/40' },
    { label: 'تاریخچه فروش', path: '/sales/history', icon: Clock, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40' },
  ];

  const recentTransactions = React.useMemo(() => {
    if (!data) return [];
    const txs: any[] = [];

    (data.recentInvoices || []).forEach((inv: any) => {
      txs.push({
        id: `inv-${inv.id}`,
        rawDate: inv.date,
        date: inv.date ? parseToJalali(inv.date) : null,
        type: inv.type === 'خرید' ? 'خرید کالا' : 'فروش کالا',
        typeColor: inv.type === 'خرید' 
          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/20'
          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20',
        person: inv.customer_name || 'مشتری عمومی',
        amount: inv.final_amount,
        status: inv.status || 'تسویه نشده',
        statusColor: inv.status === 'پرداخت شده'
          ? 'bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
          : 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
      });
    });

    (data.recentLedger || []).forEach((led: any) => {
      let label = 'تراکنش مالی';
      let typeColor = 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/20';
      if (led.type === 'received') {
        label = 'دریافت وجه';
        typeColor = 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/20';
      } else if (led.type === 'paid') {
        label = 'پرداخت وجه';
        typeColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/20';
      } else if (led.type === 'adjustment') {
        label = 'تعدیل حساب';
        typeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      }

      txs.push({
        id: `led-${led.id}`,
        rawDate: led.date || led.created_at,
        date: (led.date || led.created_at) ? parseToJalali(led.date || led.created_at) : null,
        type: label,
        typeColor: typeColor,
        person: led.person_name || 'شخص عمومی',
        amount: Math.abs(led.amount),
        status: 'ثبت شده',
        statusColor: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
      });
    });

    return txs
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
      .slice(0, 6);
  }, [data]);

  const handleCarouselScroll = (direction: 'right' | 'left') => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const scrollAmount = 300; 
      container.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 text-sm dir-rtl text-right">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex justify-between gap-4 font-bold" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span className="font-mono">{entry.value.toLocaleString('fa-IR')} ریال</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3" dir="rtl">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">در حال بارگذاری داده‌های واقعی داشبورد حسابداری...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right select-none" dir="rtl" id="dashboard-main-container">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">میز کار و داشبورد مدیریتی ملینا</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            نمای کلی تراز مالی واقعی، محصولات پرفروش، تحلیل دوره‌ای سود و وضعیت موجودی انبار
          </p>
        </div>
        <div className="text-xs font-bold bg-indigo-50 dark:bg-slate-800/50 backdrop-blur px-3 py-2 rounded-full border border-indigo-100/50 dark:border-slate-750 text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          آخرین بروزرسانی: متصل به دیتابیس محلی (واقعی)
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col justify-between gap-3 transition-all hover:scale-[1.02] hover:shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 leading-relaxed">{stat.label}</span>
              <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 dark:text-white mt-1 dir-ltr text-right truncate selection:bg-indigo-200">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 rounded bg-indigo-600"></div>
          <h3 className="text-md font-black text-slate-800 dark:text-white">عملیات سریع و میانبرهای میان‌بر</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {quickActions.map((act, idx) => (
            <button
              key={idx}
              onClick={() => navigate(act.path)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 cursor-pointer text-center gap-3 transition-all hover:-translate-y-1 hover:shadow-md ${act.color}`}
            >
              <act.icon className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-black">{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SALES PERIOD ANALYSIS & REAL TIME DATES CHANGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Dynamic Statistics Panel */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 dark:from-slate-900/40 dark:to-slate-900/70 p-6 rounded-2xl border border-indigo-100/40 dark:border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h3 className="text-md font-black text-slate-800 dark:text-white">تحلیل هوشمند و تفکیکی فروش دوره‌ای</h3>
              </div>

              {/* Tabs list */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border dark:border-slate-800 text-[11px] font-black">
                <button
                  onClick={() => setActivePeriod('today')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activePeriod === 'today' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                  فروش امروز
                </button>
                <button
                  onClick={() => setActivePeriod('week')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activePeriod === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                  این هفته (شنبه تا کنون)
                </button>
                <button
                  onClick={() => setActivePeriod('month')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activePeriod === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                  این ماه شمسی
                </button>
                <button
                  onClick={() => setActivePeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activePeriod === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                  بازه دلخواه
                </button>
              </div>
            </div>

            {/* Custom Shamsi Datepickers */}
            {activePeriod === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/40 dark:bg-slate-950/20 border rounded-xl border-indigo-100/30 mb-6 animate-in fade-in duration-200">
                <JalaliDatePicker
                  value={customFromDate}
                  onChange={(val) => setCustomFromDate(val)}
                  label="از تاریخ (شروع بازه شمسی):"
                />
                <JalaliDatePicker
                  value={customToDate}
                  onChange={(val) => setCustomToDate(val)}
                  label="تا تاریخ (پایان بازه شمسی):"
                />
              </div>
            )}

            {/* Period Outcome Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">مجموع مبلغ فروش</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-450 block font-mono">
                  {formatCurrency(periodStats.sales)} <span className="text-[9px] font-bold">ریال</span>
                </span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">سود ناخالص تقریبی</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 block font-mono">
                  {formatCurrency(periodStats.profit)} <span className="text-[9px] font-bold">ریال</span>
                </span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">تعداد فاکتورهای صادره</span>
                <span className="text-sm font-black text-slate-800 dark:text-white block font-mono">
                  {toPersianDigits(periodStats.count)} <span className="text-[10px] font-normal text-slate-500">فاکتور</span>
                </span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">میانگین ارزش هر فاکتور</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-450 block font-mono">
                  {formatCurrency(periodStats.avg)} <span className="text-[9px] font-bold">ریال</span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-indigo-500 dark:text-slate-400 font-bold mt-4 block text-left">
            * کلیه محاسبات بالا به صورت تفاضلی و براساس اسناد مکتوب دیتابیس در زمان واقعی تراز گردیده است.
          </p>
        </div>

        {/* Warehouse Status (Finished or Low Stock list) */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h3 className="text-md font-black text-slate-800 dark:text-white">وضعیت بحرانی موجودی انبار</h3>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px]">
            {/* 1. Finished Products (Mojoodee Sefr) */}
            <div>
              <span className="text-[11px] font-black text-rose-600 dark:text-rose-450 block mb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                <span>کالاهای اتمام یافته (کسری انبار: {toPersianDigits(stockAlerts.outOfStock.length)})</span>
              </span>
              {stockAlerts.outOfStock.length === 0 ? (
                <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-dashed">هیچ محصولی با موجودی صفر وجود ندارد.</p>
              ) : (
                <div className="space-y-1.5">
                  {stockAlerts.outOfStock.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center text-[11px] bg-rose-50/40 dark:bg-rose-950/10 px-2.5 py-1.5 rounded-lg border border-rose-100/40">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300">{p.name}</span>
                      <span className="font-mono bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded text-[10px] text-rose-600 dark:text-rose-400 font-black">اتمام یافته ❌</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Low stock warning */}
            <div>
              <span className="text-[11px] font-black text-amber-600 dark:text-amber-450 block mb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>کالاهای در حال اتمام (زیر حد آستانه: {toPersianDigits(stockAlerts.lowStock.length)})</span>
              </span>
              {stockAlerts.lowStock.length === 0 ? (
                <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-dashed">هیچ محصولی زیر حد حداقل نیست.</p>
              ) : (
                <div className="space-y-1.5">
                  {stockAlerts.lowStock.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center text-[11px] bg-amber-50/30 dark:bg-amber-950/5 px-2.5 py-1.5 rounded-lg border border-amber-100/30">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300">{p.name}</span>
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                        {toPersianDigits(p.total_stock)} {p.unit || 'عدد'} <span className="text-[9px] font-normal text-slate-400">(حداقل: {toPersianDigits(p.min_stock || 5)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BEST SELLING PRODUCTS CAROUSEL */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-md font-black text-slate-800 dark:text-white">کالاهای پرفروش و ویژه بازار</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">محصولاتی که بیشترین میزان فروش عددی را در اسناد مالی به خود اختصاص داده‌اند</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleCarouselScroll('left')} 
              className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
              title="قبلی"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleCarouselScroll('right')} 
              className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
              title="بعدی"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel flex viewport */}
        {!data?.bestSellers || data.bestSellers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/40 border border-dashed rounded-2xl">
            <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold">هیچ کالایی به عنوان کالای پرفروش یافت نشد (هنوز فاکتور فروش ثبت نشده است).</p>
          </div>
        ) : (
          <div 
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto scrollbar-none pb-4 select-none scroll-smooth dir-rtl snap-x"
            style={{ scrollbarWidth: 'none' }}
          >
            {data.bestSellers.map((prod: any, index: number) => {
              const isSuperSeller = prod.total_sold >= 15 || index < 3;
              return (
                <div 
                  key={prod.id} 
                  className="w-64 shrink-0 bg-white dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-850 p-4 relative group hover:shadow-lg transition-all hover:scale-[1.01] snap-start"
                >
                  {/* Badge */}
                  <span className={`absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-0.5 shadow-sm ${
                    isSuperSeller 
                      ? 'bg-rose-500 text-white animate-pulse' 
                      : 'bg-amber-100 dark:bg-amber-950/50 text-amber-750 dark:text-amber-400'
                  }`}>
                    {isSuperSeller ? <Flame className="w-2.5 h-2.5 fill-current" /> : <Award className="w-2.5 h-2.5" />}
                    <span>{isSuperSeller ? 'یا خدا پرفروش! 🔥' : 'پرفروش ⭐️'}</span>
                  </span>

                  {/* Product Image or fallback artwork */}
                  <div className="w-full h-32 rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden mb-3 relative flex items-center justify-center">
                    {prod.image_base64 ? (
                      <img 
                        src={prod.image_base64} 
                        alt={prod.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 flex flex-col items-center justify-center gap-1.5">
                        <Package className="w-10 h-10 text-indigo-400/40 group-hover:rotate-6 transition-transform" />
                        <span className="text-[9px] text-indigo-400/60 font-black tracking-wide uppercase font-mono">
                          {prod.category_name || 'بسته‌بندی کالا'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-white truncate" title={prod.name}>
                      {prod.name}
                    </h4>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>کد کالا: <strong className="font-mono text-slate-500">{prod.code || '---'}</strong></span>
                      <span className="bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded font-black">{prod.category_name || 'بدون دسته'}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex justify-between items-end">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">قیمت واحد فروش</span>
                        <span className="font-mono font-black text-xs text-slate-800 dark:text-white">
                          {formatCurrency(prod.price)} <span className="text-[8px] font-normal text-slate-400">ریال</span>
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] text-slate-400 block font-bold">میزان فروش کل</span>
                        <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                          {toPersianDigits(prod.total_sold)} {prod.unit || 'عدد'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts & Graphs Row (Using Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Sales and Expenses Line Chart */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-md font-black text-slate-800 dark:text-white">نمودار فروش و هزینه (۶ ماه گذشته)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">تطبیق و روند رشد فروش حقیقی در برابر هزینه‌ها (خریدهای انبار)</p>
            </div>
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> فروش</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> خرید (هزینه)</span>
            </div>
          </div>
          <div className="flex-1 min-h-[300px] w-full dir-ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={realSalesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.15} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={11} orientation="right" tickFormatter={(v) => toPersianDigits(v.toLocaleString())} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" name="فروش" dataKey="sales" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                <Line type="monotone" name="خرید (هزینه)" dataKey="expenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart of category share */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col">
          <div>
            <h3 className="text-md font-black text-slate-800 dark:text-white">سهم فروش دسته‌بندی‌ها</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">درصد مشارکت هر دسته کالایی در درآمدهای کل</p>
          </div>
          <div className="flex-1 min-h-[300px] w-full flex items-center justify-center dir-ltr relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={realPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {realPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${formatCurrency(value)} ریال`, 'مجموع فروش']} />
                <Legend wrapperStyle={{ fontSize: '11px', direction: 'rtl' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>

      {/* Recent Transactions & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 rounded bg-indigo-600"></div>
              <h3 className="text-md font-black text-slate-800 dark:text-white">آخرین تراکنش‌ها (فروش، خرید و سند مالی)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-500">
                    <th className="pb-2.5 font-black">تاریخ</th>
                    <th className="pb-2.5 font-black">نوع تراکنش</th>
                    <th className="pb-2.5 font-black">طرف حساب / شخص</th>
                    <th className="pb-2.5 font-black text-left">مبلغ (ریال)</th>
                    <th className="pb-2.5 font-black text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">هیچ تراکنش یا فاکتوری در سیستم ثبت نشده است.</td>
                    </tr>
                  ) : (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100/50 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                        <td className="py-3 font-semibold text-slate-500 dark:text-slate-450">
                          {tx.date ? toPersianDigits(`${tx.date.y}/${String(tx.date.m).padStart(2, '0')}/${String(tx.date.d).padStart(2, '0')}`) : '---'}
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-0.5 rounded text-[9.5px] font-black ${tx.typeColor}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 font-bold text-slate-700 dark:text-slate-300">{tx.person}</td>
                        <td className="py-3 font-mono font-black text-left text-slate-800 dark:text-white">{formatCurrency(tx.amount)}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${tx.statusColor}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {recentTransactions.length > 0 && (
            <button 
              onClick={() => navigate('/sales/history')}
              className="mt-4 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 self-start cursor-pointer"
            >
              <span>مشاهده کل فاکتورها و تاریخچه</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* General Unpaid invoices list */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/40 dark:border-slate-800/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h3 className="text-md font-black text-slate-800 dark:text-white">فاکتورهای پرداخت نشده و معوقه</h3>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[320px]">
              {data?.unpaidInvoices?.length === 0 ? (
                <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/20 rounded-xl text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">تمام فاکتورها به طور کامل تسویه شده‌اند</p>
                </div>
              ) : (
                data?.unpaidInvoices?.slice(0, 5).map((inv: any) => {
                  const invDate = inv.date ? parseToJalali(inv.date) : null;
                  return (
                    <div key={inv.id} className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-white block">فاکتور #{inv.invoice_number}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">مشتری: <strong>{inv.customer_name}</strong></span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          تاریخ: {invDate ? toPersianDigits(`${invDate.y}/${String(invDate.m).padStart(2, '0')}/${String(invDate.d).padStart(2, '0')}`) : '---'}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400 block">{formatCurrency(inv.final_amount)} ریال</span>
                        <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950 rounded text-[8.5px] font-bold text-rose-500 dark:text-rose-450 mt-1 inline-block">تسویه نشده</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {data?.unpaidInvoices?.length > 0 && (
            <button 
              onClick={() => navigate('/persons/debtors-creditors')}
              className="mt-4 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 self-start cursor-pointer"
            >
              <span>تسویه بدهی‌ها و حساب‌رسی</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
