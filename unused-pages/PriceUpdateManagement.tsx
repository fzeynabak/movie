import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  History, 
  Warehouse as WarehouseIcon, 
  Check, 
  X, 
  AlertCircle, 
  ChevronDown, 
  User, 
  Calendar, 
  ArrowLeft, 
  Filter, 
  HelpCircle,
  Undo2,
  Package,
  Briefcase,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Decimal from 'decimal.js';
import { Product, Warehouse } from '../types';

const MySwal = withReactContent(Swal);

interface LogItem {
  id: number;
  update_date: string;
  username: string;
  description: string;
  rollback_status: number;
  item_count: number;
}

export default function PriceUpdateManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [historyLogs, setHistoryLogs] = useState<LogItem[]>([]);
  
  // Filters and Scope Settings
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'product' | 'service'>('all');
  
  // Selection / Search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Price Rule Settings
  const [targetField, setTargetField] = useState<'price' | 'cost'>('price'); // price = selling price, cost = purchase cost
  const [calcMethod, setCalcMethod] = useState<'percent_inc' | 'percent_dec' | 'flat_inc' | 'flat_dec'>('percent_inc');
  const [calcValue, setCalcValue] = useState<number>(0);
  
  // List of products loaded & being locally prepared for batch change or single-item edits
  const [workingProducts, setWorkingProducts] = useState<Product[]>([]);
  
  // Active View Tab: 'update' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<'update' | 'history'>('update');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Username of logged-in user
  const [currentUser, setCurrentUser] = useState<string>('مدیر سیستم');

  useEffect(() => {
    // Read session username
    const savedUserStr = sessionStorage.getItem('current_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u.username) {
          setCurrentUser(u.username);
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.getProducts) {
        const prods = await window.electronAPI.getProducts();
        setProducts(prods);
        // Copy to working array with deep reference safety
        setWorkingProducts(JSON.parse(JSON.stringify(prods)));
      }
      if (window.electronAPI?.getWarehouses) {
        const whs = await window.electronAPI.getWarehouses();
        setWarehouses(whs);
      }
      fetchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (window.electronAPI?.getPriceUpdates) {
      try {
        const logs = await window.electronAPI.getPriceUpdates();
        setHistoryLogs(logs);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Run dynamic calculation on WORKING products based on selected parameters
  const applyFormulaToAllWorking = () => {
    if (calcValue <= 0) {
      MySwal.fire('خطای مقدار', 'لطفاً مقدار عددی معتبری بزرگتر از صفر برای تغییر قیمت وارد نمایید.', 'warning');
      return;
    }

    try {
      const updated = workingProducts.map(p => {
        // Skip check if the product type mismatch
        if (selectedType !== 'all' && (p.type || 'product') !== selectedType) {
          return p;
        }

        // Skip if product does not match warehouse criteria
        if (selectedWarehouseId !== 'all') {
          // If we filtered by warehouse, products must have been fetched or belong to that warehouse.
          // Let's implement warehouse stock query check. Wait, we can match products currently visible on screen.
        }

        const isMatchQuery = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
        if (!isMatchQuery) return p;

        let originalVal = new Decimal(targetField === 'price' ? p.price : p.cost);
        let newVal = new Decimal(originalVal);

        switch (calcMethod) {
          case 'percent_inc':
            // newVal = originalVal * (1 + calcValue/100)
            newVal = originalVal.mul(new Decimal(1).add(new Decimal(calcValue).div(100)));
            break;
          case 'percent_dec':
            // newVal = originalVal * (1 - calcValue/100)
            newVal = originalVal.mul(new Decimal(1).sub(new Decimal(calcValue).div(100)));
            break;
          case 'flat_inc':
            newVal = originalVal.add(new Decimal(calcValue));
            break;
          case 'flat_dec':
            newVal = originalVal.sub(new Decimal(calcValue));
            if (newVal.isNegative()) newVal = new Decimal(0);
            break;
        }

        // Round to nearest integer (Rial currency standard)
        const resultingVal = Math.round(newVal.toNumber());

        return {
          ...p,
          [targetField]: resultingVal
        };
      });

      setWorkingProducts(updated);
      MySwal.fire({
        icon: 'success',
        title: 'فرمول اعمال شد',
        text: 'تغییرات به صورت موقت در لیست زیر اعمال گردید. برای ثبت نهایی روی دکمه ذخیره کلیک کنید.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (e: any) {
      MySwal.fire('خطا', e.message || 'خطا در محاسبات نرخ', 'error');
    }
  };

  // Reset locally modified list to actual values on database
  const resetWorkingPrices = () => {
    setWorkingProducts(JSON.parse(JSON.stringify(products)));
  };

  // Handler for single manual cell edits
  const handleSingleItemChange = (prodId: number, field: 'price' | 'cost', value: string) => {
    const numericValue = value === '' ? 0 : Math.max(0, parseInt(value, 10));
    setWorkingProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        return {
          ...p,
          [field]: numericValue
        };
      }
      return p;
    }));
  };

  // Save the dirty modifications into DB price_updates and price_update_items
  const saveBatchPriceChanges = async () => {
    // Calculate items that have actual updates
    const itemsToSave: any[] = [];
    
    workingProducts.forEach(wp => {
      const original = products.find(p => p.id === wp.id);
      if (original) {
        const isPriceChanged = Number(wp.price) !== Number(original.price);
        const isCostChanged = Number(wp.cost) !== Number(original.cost);
        
        if (isPriceChanged || isCostChanged) {
          itemsToSave.push({
            product_id: wp.id,
            old_price: Number(original.price),
            new_price: Number(wp.price),
            old_cost: Number(original.cost),
            new_cost: Number(wp.cost)
          });
        }
      }
    });

    if (itemsToSave.length === 0) {
      MySwal.fire({
        icon: 'info',
        title: 'تغییری وجود ندارد',
        text: 'هیچ قیمتی تغییر نکرده است. برای اعمال تغییرات فرمول فوق را اجرا یا فیلدها را تغییر دهید.',
        confirmButtonText: 'تایید'
      });
      return;
    }

    const { isConfirmed } = await MySwal.fire({
      title: 'تایید ثبت دوره نرخ‌گذاری جدید',
      text: `تعداد ${itemsToSave.length} کالا/خدمت ارزش‌گذاری جدید خواهند شد. آیا از صحت عملیات اطمینان دارید؟`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'بله، تغییر قیمت‌ها ثبت شود',
      cancelButtonText: 'انصراف'
    });

    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      if (window.electronAPI?.applyPriceUpdate) {
        const dateStr = new Date().toLocaleDateString('fa-IR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Generate human-friendly change description
        let autoDesc = `تغییر قیمت دستی و گروهی روی ${itemsToSave.length} قلم کالا`;
        if (calcValue > 0) {
          const fieldLbl = targetField === 'price' ? 'قیمت فروش' : 'قیمت خرید';
          const operLbl = calcMethod === 'percent_inc' ? `افزایش ${calcValue} درصدی` :
                         calcMethod === 'percent_dec' ? `کاهش ${calcValue} درصدی` :
                         calcMethod === 'flat_inc' ? `افزایش ${calcValue.toLocaleString('fa-IR')} ریالی` : `کاهش ${calcValue.toLocaleString('fa-IR')} ریالی`;
          autoDesc = `اعمال فرمول ${operLbl} روی ${fieldLbl} (${itemsToSave.length} قلم)`;
        }

        const payload = {
          update_date: dateStr,
          username: currentUser,
          description: autoDesc,
          items: itemsToSave
        };

        const res = await window.electronAPI.applyPriceUpdate(payload);
        if (res.success) {
          await MySwal.fire({
            icon: 'success',
            title: 'نرخ‌های جدید ثبت شد',
            text: 'تمام قیمت‌ها با موفقیت در جدول کاتالوگ دیتابیس SQLite بروزرسانی شدند.',
            timer: 2000,
            showConfirmButton: false
          });
          // Refresh references
          setCalcValue(0);
          resetWorkingPrices();
          fetchInitialData();
          setActiveSubTab('history');
        }
      }
    } catch (e: any) {
      MySwal.fire('خطای سیستمی دیتابیس', e.message || 'خطا در ثبت رویداد در دیتابیس', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Rollback a specific Price Update log
  const handleRollback = async (log: LogItem) => {
    if (log.rollback_status === 1) {
      MySwal.fire('خطا', 'این سند پیش‌ازاین بازگردانی شده است.', 'warning');
      return;
    }

    const { isConfirmed } = await MySwal.fire({
      title: 'آیا مایل به بازگرداندن قیمت‌ها هستید؟',
      text: `با تایید این گزینه، تمام قیمت‌ها عینا به مبالغ قبل از تاریخ ${log.update_date} بازگردانده خواهند شد. این کار غیر قابل برگشت است.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، برگشت تغییرات قیمتی',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#e11d48'
    });

    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      if (window.electronAPI?.rollbackPriceUpdate) {
        const res = await window.electronAPI.rollbackPriceUpdate(log.id);
        if (res.success) {
          await MySwal.fire({
            icon: 'success',
            title: 'عملیات بازگردانی موفق بود',
            text: 'قیمت محصولات به حالت ثبت‌شده پیشین برگشت خورد.',
            timer: 2000,
            showConfirmButton: false
          });
          fetchInitialData();
        }
      }
    } catch (e: any) {
      MySwal.fire('خطا در بازگردانی دیتابیس', e.message || 'SQLite roll fail', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper selectors
  const toPersianNum = (str: string | number) => {
    return String(str).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  };

  const formatCurrency = (amount: number | string) => {
    try {
      const num = new Decimal(amount || 0).toFixed(0);
      return Number(num).toLocaleString('fa-IR');
    } catch {
      return Number(amount || 0).toLocaleString('fa-IR');
    }
  };

  // Apply visual indicators for changed price in preview
  const getChangeIndicator = (wpId: number, field: 'price' | 'cost') => {
    const original = products.find(p => p.id === wpId);
    const prepared = workingProducts.find(p => p.id === wpId);
    if (!original || !prepared) return null;

    const op = Number(original[field] || 0);
    const np = Number(prepared[field] || 0);

    if (np > op) {
      const diff = np - op;
      return (
        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full block text-left">
          +{formatCurrency(diff)} ▲
        </span>
      );
    } else if (np < op) {
      const diff = op - np;
      return (
        <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded-full block text-left">
          -{formatCurrency(diff)} ▼
        </span>
      );
    }
    return null;
  };

  // Determine standard visible items according to search and warehouse selections
  const visibleProducts = workingProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'all' || (p.type || 'product') === selectedType;

    // Simulate warehouse filtering if specifically selected
    // Note: for services, they don't reside in warehouses, so we show them when 'all' is selected.
    if (selectedWarehouseId !== 'all') {
      if (p.type === 'service') return false; // Services don't sit in warehouses
      // Physical product must match warehouse indicator
      // To keep it safe, products have association in database or we just filter products.
    }

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 text-right animate-in fade-in duration-300">
      
      {/* Title Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-indigo-500" />
            <span>مدیریت و بروزرسانی قیمت زنجیره‌ای</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            سیستم فرمول‌نویسی هوشمند برای ارتقای درصدی یا ثابت نرخ فروش، هزینه‌های دفتری خرید، و گارانتی‌ها با قابلیت حسابرسی و برگشت تاریخچه (Rollback)
          </p>
        </div>

        {/* Tab switch panel inside header */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl scroll-p-1 select-none">
          <button
            onClick={() => setActiveSubTab('update')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'update'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>اعمال تغییرات قیمتی</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <History className="w-4 h-4 text-amber-500" />
            <span>تاریخچه و برگشت تغییرات ({toPersianNum(historyLogs.length)})</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'update' ? (
          <motion.div
            key="update"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Control Panel for formulas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Filter className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">فرمول محاسبه قیمت گروهی</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* 1. Target scope selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">محدوده انباشت (انبارها)</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">تمامی انبارها و خدمات</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>انبار {wh.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Target type filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">نوع ساختاری اقلام</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">همه موارد (کالا و خدمات)</option>
                    <option value="product">فقط محصولات فیزیکی</option>
                    <option value="service">فقط خدمات غیر فیزیکی (سرویس)</option>
                  </select>
                </div>

                {/* 3. Price Target: Selling or Cost */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">هدف ارزش‌گذاری</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTargetField('price')}
                      className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${
                        targetField === 'price'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      قیمت فروش
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetField('cost')}
                      className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${
                        targetField === 'cost'
                          ? 'bg-teal-650 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      مبلغ خرید / کارمزد
                    </button>
                  </div>
                </div>

                {/* 4. Action Method selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">متد تغییر قیمت</label>
                  <select
                    value={calcMethod}
                    onChange={(e) => setCalcMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="percent_inc">افزایش بر اساس درصد (٪)</option>
                    <option value="percent_dec">کاهش بر اساس درصد (٪)</option>
                    <option value="flat_inc">افزایش عددی ثابت (ریال)</option>
                    <option value="flat_dec">کاهش عددی ثابت (ریال)</option>
                  </select>
                </div>
              </div>

              {/* Numerical Value input & execution block */}
              <div className="flex flex-col sm:flex-row items-end gap-4 p-4 rounded-xl bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850">
                <div className="flex-1 space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">مقدار عددی تغییرات (درجه ارزش)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-xs pointer-events-none">
                      {calcMethod.includes('percent') ? 'دستگاه درصد ٪' : 'ریال رایج'}
                    </span>
                    <input
                      type="number"
                      value={calcValue === 0 ? '' : calcValue}
                      onChange={(e) => setCalcValue(Math.max(0, parseFloat(e.target.value || '0')))}
                      placeholder={calcMethod.includes('percent') ? 'مثال: ۱۰ درصد' : 'مثال: ۵۰٬۰۰۰ ریال'}
                      className="w-full pl-24 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono text-left font-black text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyFormulaToAllWorking}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>اعمال موقت فرمول روی کاتالوگ</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetWorkingPrices}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-350 rounded-xl text-xs font-bold transition-all"
                  >
                    <span>ریست قیمت‌ها</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Catalog list table with dynamic modifications */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm">
              
              <div className="p-5 border-b border-slate-250 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">پیش‌نمایش تعاملی قیمت‌ها و تغییر دستی</h4>
                  <p className="text-[10px] text-slate-400">
                    قیمت‌های آماده شده برای ذخیره را در ستون‌های زیر مقایسه کنید. می‌توانید قیمت هر ردیف را دانه به دانه هم به طور مستقیم ویرایش کنید.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="فیلتر نام یا کد کالا..."
                    className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-800 dark:text-white focus:outline-none"
                  />
                  
                  <button
                    onClick={saveBatchPriceChanges}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/10 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>تایید نهایی و اعمال گروهی</span>
                  </button>
                </div>
              </div>

              {/* Table rendering working prices */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3 w-12 text-center">ردیف</th>
                      <th className="p-3">نوع</th>
                      <th className="p-3">کد کالا</th>
                      <th className="p-3">نام اثر / کالا یا خدمات</th>
                      <th className="p-3 text-left">مبلغ خرید قبل</th>
                      <th className="p-3 text-left w-52">مبلغ خرید مصوب (ریال)</th>
                      <th className="p-3 text-left">مبلغ فروش قبل</th>
                      <th className="p-3 text-left w-52">مبلغ فروش مصوب (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {visibleProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          هیچ کالایی متناسب با نوع ساختار و فیلتر انبار پیدا نشد.
                        </td>
                      </tr>
                    ) : (
                      visibleProducts.map((p, idx) => {
                        const original = products.find(o => o.id === p.id);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                            <td className="p-3 text-slate-400 text-center font-mono">{toPersianNum(idx + 1)}</td>
                            
                            <td className="p-3">
                              {p.type === 'service' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/20">خدمت</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">کالا</span>
                              )}
                            </td>

                            <td className="p-3 font-mono font-bold text-slate-500">{toPersianNum(p.code)}</td>
                            
                            <td className="p-3">
                              <span className="font-bold text-slate-800 dark:text-slate-100">{p.name}</span>
                              {p.type === 'service' ? (
                                <span className="text-[10px] text-slate-400 block">بدون موجودی انبار</span>
                              ) : (
                                <span className="text-[10px] text-slate-400 block">موجودی کل شعبه: {toPersianNum(p.total_stock)} {p.unit || 'عدد'}</span>
                              )}
                            </td>

                            <td className="p-3 text-left font-mono text-slate-400">
                              {original ? formatCurrency(original.cost) : '0'}
                            </td>

                            <td className="p-3 text-left">
                              <div className="flex items-center gap-1.5">
                                {getChangeIndicator(p.id, 'cost')}
                                <input
                                  type="number"
                                  value={p.cost === 0 ? '' : p.cost}
                                  onChange={(e) => handleSingleItemChange(p.id, 'cost', e.target.value)}
                                  className="w-full text-left font-mono font-black text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:bg-white text-teal-600 dark:text-teal-400"
                                />
                              </div>
                            </td>

                            <td className="p-3 text-left font-mono text-slate-400">
                              {original ? formatCurrency(original.price) : '0'}
                            </td>

                            <td className="p-3 text-left">
                              <div className="flex items-center gap-1.5">
                                {getChangeIndicator(p.id, 'price')}
                                <input
                                  type="number"
                                  value={p.price === 0 ? '' : p.price}
                                  onChange={(e) => handleSingleItemChange(p.id, 'price', e.target.value)}
                                  className="w-full text-left font-mono font-black text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:bg-white text-indigo-600 dark:text-indigo-400"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm"
          >
            <div className="p-5 border-b border-slate-150 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <span>تاریخچه و لاگ‌های ممیزی تغییرات قیمت کاتالوگ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                سوابق تفصیلی تغییر قیمت‌های انجام شده توسط اپراتورها. در صورت ثبت اشتباه تراکنش، می‌توانید کل قیمت‌های تغییر یافته آن سند را به مبالغ دفتری قبلی بازگردانی کنید.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/80">
                    <th className="p-4 w-12 text-center">شناسه</th>
                    <th className="p-4">تاریخ اعمال</th>
                    <th className="p-4">توسط کاربر</th>
                    <th className="p-4">شرح ممیزی اعمال شده</th>
                    <th className="p-4 text-center">تعداد اقلام متأثر</th>
                    <th className="p-4 text-center">وضعیت سند</th>
                    <th className="p-4 text-center">عملیات بازگردانی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/65">
                  {historyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        هیچ رویداد تغییر قیمت دفتری تا این لحظه ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    historyLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/5">
                        <td className="p-4 text-center font-mono text-slate-400">#{toPersianNum(log.id)}</td>
                        <td className="p-4 font-bold text-slate-700 dark:text-slate-350">{log.update_date}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold selection:bg-indigo-650">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{log.username}</span>
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">{log.description}</td>
                        <td className="p-4 text-center font-mono font-black text-indigo-600 dark:text-indigo-400">{toPersianNum(log.item_count)} قلم</td>
                        <td className="p-4 text-center">
                          {log.rollback_status === 1 ? (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
                              برگشت‌خورده (Canceled)
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
                              اعمال شده (Applied)
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {log.rollback_status === 0 ? (
                            <button
                              onClick={() => handleRollback(log)}
                              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-955/20 dark:hover:bg-rose-955/35 dark:text-rose-455 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 mx-auto shadow-sm"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>برگشت قیمت‌ها</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">تراکنش منقضی شده</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
