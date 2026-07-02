/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { Sale } from '../types';
import { toPersianNums, formatCurrency } from './Dashboard';
import { 
  CreditCard, 
  Search, 
  Trash2, 
  Printer, 
  Calendar, 
  TrendingUp, 
  X, 
  Award, 
  DollarSign, 
  FileText, 
  User, 
  Scale,
  Percent,
  Check,
  FolderOpen
} from 'lucide-react';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setSales(dbService.getSales());
    setShopSettings(dbService.getSettings());
  };

  const handleDeleteSale = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('آیا از حذف این فاکتور فروش و بازگرداندن مقادیر مالی اطمینان دارید؟')) {
      dbService.deleteSale(id);
      refreshData();
      if (selectedSaleDetail && selectedSaleDetail.id === id) {
        setSelectedSaleDetail(null);
      }
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    if (!filePath) {
      alert('مسیری برای این فایل ثبت نشده است.');
      return;
    }
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.openFileInExplorer(filePath);
        if (res && !res.success) {
          alert('خطا در باز کردن پوشه: ' + res.error);
        }
      } catch (err) {
        console.error('Failed to open folder natively:', err);
      }
    } else {
      alert('(شبیه‌ساز مرورگر) پوشه حاوی این فایل در سیستم باز می‌شود.\nمسیر فایل: ' + filePath);
    }
  };

  // Convert Gregorian JS Date string into Persian Calendar date format (approximate/elegant string parser)
  const formatPersianDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      // Let's output a premium styled date string in Persian
      const y = date.getFullYear() === 2026 ? '۱۴۰۵' : '۱۴۰۴';
      let m = 'خرداد';
      const mIdx = date.getMonth(); // 0: Jan, 1: Feb, 2: Mar, 3: Apr, 4: May, 5: Jun
      if (mIdx === 3) m = 'فروردین';
      else if (mIdx === 4) m = 'اردیبهشت';
      else if (mIdx === 5) m = 'خرداد';
      else if (mIdx === 2) m = 'اسفند';
      
      const d = toPersianNums(date.getDate());
      return `${d} ${m} ${y}`;
    } catch {
      return toPersianNums('۱۵ خرداد ۱۴۰۵');
    }
  };

  // Financial calculations
  const totalRevenue = sales.reduce((sum, s) => sum + (s.salePrice - s.discount), 0);
  const totalCost = sales.reduce((sum, s) => sum + s.purchasePrice, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
  const totalProfit = totalRevenue - totalCost;

  // Filter List Logic
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.mediaTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.details.toLowerCase().includes(searchQuery.toLowerCase());

    // Basic date checking
    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && new Date(sale.date) >= new Date(filterStartDate);
    }
    if (filterEndDate) {
      matchesDate = matchesDate && new Date(sale.date) <= new Date(filterEndDate);
    }

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6" id="sales-tab-content">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-150 dark:border-gray-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100" id="sales-title">ثبت فروش و حسابداری</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">حسابرسی امور مالی، مشاهده کل درآمدها، سود فیلم‌ها و سریال‌ها به تفکیک جزئیات فاکتور</p>
        </div>
      </div>

      {/* Grid KPI Cards financial */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="sales-kpi-grid">
        {/* Card 1: Sales counts */}
        <div className="bg-white dark:bg-[#1e293b] p-4.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold">کل فاکتورهای صادره</p>
            <p className="text-base font-extrabold text-gray-850 dark:text-gray-100 mt-0.5">{toPersianNums(sales.length)} برگ سند</p>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-white dark:bg-[#1e293b] p-4.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold">کل مبلغ ناخالص دریافتی</p>
            <p className="text-base font-extrabold text-[#f59e0b] mt-0.5">{formatCurrency(totalRevenue + totalDiscount)}</p>
          </div>
        </div>

        {/* Card 3: Total discounts */}
        <div className="bg-white dark:bg-[#1e293b] p-4.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 rounded-lg">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold">تخفیف کل ثبت‌شده</p>
            <p className="text-base font-extrabold text-red-500 mt-0.5">{formatCurrency(totalDiscount)}</p>
          </div>
        </div>

        {/* Card 4: Net Profit */}
        <div className="bg-white dark:bg-[#1e293b] p-4.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#10b981] rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-450 dark:text-gray-400 font-bold">کل سود خالص کسب شده</p>
            <p className="text-base font-extrabold text-[#10b981] mt-0.5" title={`هزینه اولیه خرید: ${formatCurrency(totalCost)}`}>
              {formatCurrency(totalProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Query filters row */}
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4" id="sales-queries">
        {/* Dynamic query searching */}
        <div className="flex-1 relative flex items-center">
          <Search className="absolute right-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام مشتری، نام فیلم/سریال فروخته شده..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 h-10 bg-gray-50 dark:bg-slate-800/80 rounded-lg text-xs font-semibold border border-gray-150 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            id="sales-search-input"
          />
        </div>

        {/* Dynamic date selectors constraint */}
        <div className="flex items-center gap-2 text-xs text-gray-505" id="date-constraints">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>محدوده از:</span>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="h-10 px-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-150 dark:border-gray-700 text-xs font-mono text-gray-750 dark:text-gray-200"
          />
          <span>الی:</span>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="h-10 px-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-150 dark:border-gray-700 text-xs font-mono text-gray-750 dark:text-gray-200"
          />
          {(filterStartDate || filterEndDate) && (
            <button
              onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 rounded"
              title="پاک کردن فیلتر تاریخ"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sales Transactions grid / table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden" id="sales-table-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs" dir="rtl" id="sales-history-table">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-505 dark:text-gray-300 border-b border-gray-150 dark:border-gray-850 font-bold">
              <tr>
                <th className="p-4">شماره سند / تاریخ</th>
                <th className="p-4">خریدار</th>
                <th className="p-4">نام عنوان مدیا</th>
                <th className="p-4">نوع و ویژگی فروش</th>
                <th className="p-4">مبلغ فاکتور (خالص)</th>
                <th className="p-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800" id="sales-table-rows">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">هیچ صورت‌حساب مالی متناسب با این فیلتر ثبت نشده است.</td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr 
                    key={sale.id}
                    onClick={() => setSelectedSaleDetail(sale)}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                    id={`sale-row-${sale.id}`}
                  >
                    {/* ID / Date */}
                    <td className="p-4">
                      <span className="font-mono text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-850 px-1.5 py-0.5 rounded font-bold">#{sale.id.slice(-4).toUpperCase()}</span>
                      <p className="text-[10px] text-gray-400 mt-1">{formatPersianDate(sale.date)}</p>
                    </td>

                    {/* Customer */}
                    <td className="p-4 font-bold text-gray-850 dark:text-gray-150 flex items-center gap-1.5 mt-2.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{sale.customerName}</span>
                    </td>

                    {/* Title */}
                    <td className="p-4">
                      {sale.items && sale.items.length > 0 ? (
                        <>
                          <p className="text-gray-900 dark:text-gray-100 font-extrabold">
                            {sale.items[0].mediaTitle} {sale.items.length > 1 && `و ${toPersianNums(sale.items.length - 1)} قلم دیگر...`}
                          </p>
                          <span className="text-[10.5px] text-gray-450 dark:text-gray-400 font-mono-none">({toPersianNums(sale.items.length)} رسانه منتخب)</span>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-900 dark:text-gray-100 font-extrabold">{sale.mediaTitle}</p>
                          <span className="text-[10.5px] text-gray-400 font-mono">({sale.mediaType === 'movie' ? 'فیلم' : 'مجموعه سریال'})</span>
                        </>
                      )}
                    </td>

                    {/* Sales Type detail */}
                    <td className="p-4 font-medium text-gray-550 dark:text-gray-300">
                      <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded px-2 py-0.5 text-[10px] font-bold">
                        {sale.items && sale.items.length > 0 ? 'فروش فاکتور تجمیعی چند قلم' : sale.details}
                      </span>
                    </td>

                    {/* Sale Price and discounts */}
                    <td className="p-4 font-mono font-bold text-emerald-600 dark:text-[#10b981]">
                      {formatCurrency(sale.salePrice - sale.discount)}
                      {sale.discount > 0 && (
                        <p className="text-[9.5px] text-red-500 font-semibold mt-0.5">تخفیف: {formatCurrency(sale.discount)}</p>
                      )}
                    </td>

                    {/* Operations */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {/* Invoice preview */}
                        <button
                          onClick={() => setSelectedSaleDetail(sale)}
                          className="p-1 px-2.5 bg-gray-50 hover:bg-gray-150 dark:bg-slate-800 dark:hover:bg-slate-705 text-gray-650 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700 text-[10px] font-bold cursor-pointer"
                          title="نمایش فاکتور"
                        >
                          مشاهده فاکتور
                        </button>
                        {/* Delete sale entry */}
                        <button
                          onClick={(e) => handleDeleteSale(sale.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="لغو و بازگرداندن فروش"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE CUSTOMER RECEIPT INVOICE MODAL 📄 */}
      {selectedSaleDetail && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto cursor-pointer animate-fadeIn" 
          onClick={() => setSelectedSaleDetail(null)}
          id="invoice-modal"
        >
          <div 
            className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-scaleIn border border-gray-200 dark:border-gray-800 text-gray-850 dark:text-gray-150 flex flex-col max-h-[92vh] print:max-h-none print:overflow-visible cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal actions panel top */}
            <div className="px-5 py-3.5 bg-gray-50 dark:bg-slate-850 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between z-10 no-print shrink-0">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Printer className="w-4 h-4 text-indigo-500" />
                <span>صدور فاکتور رسمی و چاپی</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all animate-pulse"
                  id="btn-print-action"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ فاکتور</span>
                </button>
                <button 
                  onClick={() => setSelectedSaleDetail(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>بستن فاکتور</span>
                </button>
              </div>
            </div>

            {/* Scrollable container to prevent overflow issues */}
            <div className="flex-1 overflow-y-auto print:overflow-visible print:max-h-none">
              
              {/* Visual Invoice Paper - Printable printable section */}
              <div className="p-6 space-y-6 bg-white text-slate-900 font-sans print:p-0" id="invoice-printable-area">

                
                {/* Header Invoice branding */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-gray-900">
                  <div className="text-right">
                    <h1 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-1.5 font-extrabold">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      <span>{shopSettings?.shopName || 'خدمات کامپیوتری پارس تک'}</span>
                    </h1>
                    {shopSettings?.shopAddress ? (
                      <p className="text-[10px] text-gray-550 mt-1 font-bold">آدرس: {shopSettings.shopAddress}</p>
                    ) : (
                      <p className="text-[10px] text-gray-500 mt-1 font-bold">بزرگ‌ترین مرجع آفلاین فیلم، سریال و انیمیشن</p>
                    )}
                    {shopSettings?.shopPhone && (
                      <p className="text-[10px] text-gray-550 mt-0.5 font-bold">تلفن: {toPersianNums(shopSettings.shopPhone)}</p>
                    )}
                  </div>
                  <div className="text-left leading-relaxed">
                    <div className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-bold inline-block font-sans">فاکتور رسمی فروش دیجیتال</div>
                    <p className="text-[10px] text-gray-550 mt-1.5 font-bold font-mono">سند شماره: SMC-{selectedSaleDetail.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                {/* Invoice details, cashier & customer */}
                <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-50 p-4 rounded-lg border border-slate-205">
                  <div className="space-y-1">
                    <p className="text-gray-500 text-[10px]">خریدار گرامی:</p>
                    <strong className="text-gray-900 text-xs font-extrabold">{selectedSaleDetail.customerName}</strong>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-gray-500 text-[10px]">تاریخ صدور فاکتور:</p>
                    <strong className="text-gray-900 font-bold">{formatPersianDate(selectedSaleDetail.date)}</strong>
                  </div>
                  <div className="space-y-1 col-span-2 border-t border-slate-200 pt-2 mt-1">
                    <p className="text-gray-500 text-[10px]">متصدی / صندوق‌دار:</p>
                    <strong className="text-slate-800">مدیریت دپارتمان فروش</strong>
                  </div>
                </div>

                 {/* Items Table details */}
                <div className="space-y-2">
                  <p className="text-[10.5px] font-bold text-gray-900 border-r-2 border-indigo-600 pr-1.5 matches-title">شرح اقلام صورت‌حساب:</p>
                  <table className="w-full text-right text-[11px] border border-slate-200 font-sans" dir="rtl">
                    <thead className="bg-[#f1f5f9] text-gray-700 border-b border-slate-200 font-extrabold">
                      <tr>
                        <th className="p-2 border-l border-slate-200">کد مدیا</th>
                        <th className="p-2 border-l border-slate-200">شرح عنوان رسانه</th>
                        <th className="p-2 border-l border-slate-200">نوع فروش مدیا</th>
                        <th className="p-2 text-left border-l border-slate-200">قیمت (تومان)</th>
                        <th className="p-2 text-center no-print bg-gray-100">عملیات دیسک</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedSaleDetail.items && selectedSaleDetail.items.length > 0 ? (
                        selectedSaleDetail.items.map((item, index) => (
                          <tr key={item.id || index} className="text-gray-900">
                            <td className="p-2 border-l border-slate-200 font-mono">#{item.mediaId.slice(-4).toUpperCase()}</td>
                            <td className="p-2 border-l border-slate-200 font-bold text-indigo-950">{item.mediaTitle}</td>
                            <td className="p-2 border-l border-slate-200 text-gray-500">{item.details}</td>
                            <td className="p-2 text-left font-mono border-l border-slate-200 font-bold">{formatCurrency(item.salePrice)}</td>
                            <td className="p-2 text-center no-print bg-gray-50/50">
                              {item.filePath ? (
                                <button
                                  onClick={() => handleOpenFolder(item.filePath)}
                                  className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                  title="بارگیری و کپی سریع پوشه فیلم یا سریال"
                                >
                                  <FolderOpen className="w-2.5 h-2.5" />
                                  <span>باز کردن پوشه</span>
                                </button>
                              ) : (
                                <span className="text-gray-400 text-[8.5px] font-bold">بدون فایل</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="text-gray-950">
                          <td className="p-2 border-l border-slate-200 font-mono">#{selectedSaleDetail.mediaId.slice(-4).toUpperCase()}</td>
                          <td className="p-2 border-l border-slate-200 font-bold text-indigo-950">{selectedSaleDetail.mediaTitle}</td>
                          <td className="p-2 border-l border-slate-200 text-gray-500">{selectedSaleDetail.details}</td>
                          <td className="p-2 text-left font-mono border-l border-slate-200 font-bold">{formatCurrency(selectedSaleDetail.salePrice)}</td>
                          <td className="p-2 text-center no-print">
                            <span className="text-gray-400 text-[8.5px] font-bold">بدون فایل</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculations tally */}
                <div className="grid grid-cols-2 pt-2 border-t-2 border-slate-300 text-xs gap-y-1.5" dir="rtl">
                  <div className="text-gray-500 font-bold">بهای ناخالص فاکتور:</div>
                  <div className="text-left font-mono text-gray-900">{formatCurrency(selectedSaleDetail.salePrice)}</div>

                  {selectedSaleDetail.discount > 0 && (
                    <>
                      <div className="text-red-500 font-bold">تخفیف نقدی مشتری:</div>
                      <div className="text-left font-mono text-red-500">-{formatCurrency(selectedSaleDetail.discount)}</div>
                    </>
                  )}

                  <div className="text-gray-900 font-black text-sm border-t border-slate-200 pt-2 col-span-2 flex justify-between">
                    <span>مبلغ قابل پرداخت نهایی:</span>
                    <span className="font-mono text-lg text-emerald-600 font-extrabold">{formatCurrency(selectedSaleDetail.salePrice - selectedSaleDetail.discount)}</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-dashed border-slate-300 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>تسویه شده / پرداخت نقدی</span>
                  </span>
                  <span className="italic font-bold">مهر و امضای: {shopSettings?.shopName || 'صندوق‌دار'}</span>
                </div>

              </div>

            </div>

            {/* Modal Action Panel Bottom (Prominent close option) */}
            <div className="px-5 py-3.5 bg-gray-50 dark:bg-slate-850 border-t border-gray-150 dark:border-gray-800 flex justify-end shrink-0 no-print">
              <button 
                onClick={() => setSelectedSaleDetail(null)}
                className="px-5 py-1.5 bg-gray-200 hover:bg-gray-250 dark:bg-slate-800 dark:hover:bg-slate-705 text-gray-650 dark:text-gray-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                بستن فاکتور (برگشت)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
