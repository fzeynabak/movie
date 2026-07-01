import React, { useState, useEffect } from 'react';
import { OfflineDatabase } from '../db/offlineDb';
import { Invoice, Person, InvoiceItem, Installment, CheckEntry } from '../types';
import { FileText, Search, Printer, RotateCcw, AlertTriangle, Filter, Eye, ChevronLeft } from 'lucide-react';
import { SettingsService, AppSettings, formatPrice } from '../utils/settings';
import { InvoiceDesignerService, InvoiceTemplateDesign } from '../utils/invoiceDesignerSettings';
import InvoiceShapes from './InvoiceShapes';

export default function InvoiceHistoryTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Sale' | 'Quick Sale' | 'Purchase'>('All');
  
  // برای مودال پیش‌نمایش مجدد فاکتور قدیمی
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<InvoiceItem[]>([]);
  const [selectedInvoicePerson, setSelectedInvoicePerson] = useState<Person | null>(null);
  const [selectedInvoiceInstallments, setSelectedInvoiceInstallments] = useState<Installment[]>([]);
  const [selectedInvoiceChecks, setSelectedInvoiceChecks] = useState<CheckEntry[]>([]);

  const [appSettings, setAppSettings] = useState<AppSettings>(SettingsService.get());
  const [templateDesign, setTemplateDesign] = useState<InvoiceTemplateDesign>(InvoiceDesignerService.get());

  useEffect(() => {
    refreshData();

    const handleSettingsUpdate = () => {
      setAppSettings(SettingsService.get());
    };
    const handleDesignerUpdate = () => {
      setTemplateDesign(InvoiceDesignerService.get());
    };
    window.addEventListener('cofeclick_settings_updated', handleSettingsUpdate);
    window.addEventListener('cofeclick_designer_updated', handleDesignerUpdate);
    return () => {
      window.removeEventListener('cofeclick_settings_updated', handleSettingsUpdate);
      window.removeEventListener('cofeclick_designer_updated', handleDesignerUpdate);
    };
  }, []);

  const refreshData = () => {
    setInvoices(OfflineDatabase.getInvoices());
    const pList = OfflineDatabase.getPersons();
    setPersons(pList);
  };

  const getPersonName = (personId: string) => {
    if (personId === 'general_customer') return 'مشتری عمومی (فروش سریع)';
    const found = persons.find(p => p.id === personId);
    return found ? found.name : 'نامشخص / ویرایش شده';
  };

  // ابطال فاکتور (تعدیل معکوس انبار و برائت مالی شخص)
  const handleRollback = (inv: Invoice) => {
    if (confirm(`هشدار مهم مالی!\nآیا تمایل به ابطال و حذف فاکتور شماره ${inv.invoice_number} دارید؟\nبا تایید این عملیات، تراز بدهکاری خریدار پاک شده و اقلام فروخته شده به موجودی کالاهای فیزیکی انبار عودت داده خواهند شد.`)) {
      // شبیه‌ساز ابطال تراکنش
      const productsList = OfflineDatabase.getProducts();
      const currentItems = OfflineDatabase.getInvoiceItemsByInvoiceId(inv.id);
      const personsList = OfflineDatabase.getPersons();

      // ۱. معکوس کردن انبار
      currentItems.forEach(item => {
        if (item.item_type === 'Product') {
          const prod = productsList.find(p => p.id === item.item_id);
          if (prod) {
            // اگر فروش بوده، ابطال یعنی کالا برمیگرده به مغازه (موجودی زیاد میشه)
            // اگر خرید بوده، ابطال یعنی کالا مرجوعی خارج میشه (موجودی کم میشه)
            if (inv.type === 'Sale' || inv.type === 'Quick Sale') {
              prod.stock_quantity += item.quantity;
            } else if (inv.type === 'Purchase') {
              prod.stock_quantity = Math.max(0, prod.stock_quantity - item.quantity);
            }
            OfflineDatabase.saveProduct(prod);
          }
        }
      });

      // ۲. معکوس کردن معین مالی حساب شخص
      if (inv.person_id !== 'general_customer') {
        const pers = personsList.find(p => p.id === inv.person_id);
        if (pers) {
          let diff = 0;
          if (inv.type === 'Sale') {
            diff = inv.final_amount;
            if (inv.payment_status === 'Paid') diff = 0;
            else if (inv.payment_status === 'Partial') diff = inv.final_amount * 0.4;
          } else if (inv.type === 'Purchase') {
            diff = -inv.final_amount;
            if (inv.payment_status === 'Paid') diff = 0;
          }
          pers.balance -= diff; // کسر بدهکاری ایجاد شده
          OfflineDatabase.savePerson(pers);
        }
      }

      // ۳. کسر فاکتور از لیست محلی
      OfflineDatabase.deleteInvoice(inv.id);

      refreshData();
      alert(`سند فاکتور شماره ${inv.invoice_number} با موفقیت ابطال شد و موجودی انبار اصلاح گردید.`);
    }
  };

  // گشودن فاکتور جهت بازبینی
  const handleViewInvoice = (inv: Invoice) => {
    const items = OfflineDatabase.getInvoiceItemsByInvoiceId(inv.id);
    const pers = persons.find(p => p.id === inv.person_id) || { id: 'general_customer', name: 'مشتری عمومی', phone: '0', type: 'Customer', balance: 0 };
    
    setSelectedInvoice(inv);
    setSelectedInvoiceItems(items);
    setSelectedInvoicePerson(pers as Person);

    // واکشی موازی چک‌ها و اقساط این فاکتور از SQLite بومی
    OfflineDatabase.getInstallmentsForInvoice(inv.id).then(list => {
      setSelectedInvoiceInstallments(list || []);
    }).catch(err => console.error(err));

    OfflineDatabase.getChecksForInvoice(inv.id).then(list => {
      setSelectedInvoiceChecks(list || []);
    }).catch(err => console.error(err));
  };

  const formatToman = (val: number) => {
    return formatPrice(val);
  };

  const getPaymentStatusText = (status: string) => {
    if (status === 'Paid') return { text: 'پرداخت نقدی کامل', style: 'bg-emerald-50 text-emerald-600' };
    if (status === 'Unpaid') return { text: 'کاملاً نسیه', style: 'bg-red-50 text-red-600 font-bold' };
    return { text: 'علی‌الحساب (چک/نقدی)', style: 'bg-amber-50 text-amber-600' };
  };

  // فیلتر و سرچ نهایی
  const filteredInvoices = invoices.filter(inv => {
    const customerName = getPersonName(inv.person_id);
    const matchesQuery = inv.invoice_number.includes(searchQuery) || customerName.includes(searchQuery);
    
    if (!matchesQuery) return false;
    if (filterType === 'Sale' && inv.type !== 'Sale') return false;
    if (filterType === 'Quick Sale' && inv.type !== 'Quick Sale') return false;
    if (filterType === 'Purchase' && inv.type !== 'Purchase') return false;

    return true;
  });

  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-y-auto" id="invoice-history-context">
      
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm max-w-6xl mx-auto" id="history-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <FileText className="w-5 h-5 text-emerald-500" />
               آرشیو و کنترل اسناد مالی (دفتر کل فاکتورها)
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">امکان ابطال تراکنش‌های گذشته و بررسی وضعیت تسویه حساب مشتریان</p>
          </div>

          {/* ابزار ردیابی و سرچ */}
          <div className="flex flex-wrap items-center gap-2" id="search-filters-bar">
            <div className="relative w-52 text-xs">
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                id="search-invoice-history-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجوی شماره فاکتور یا نام شخص..."
                className="w-full font-sans pr-8 pl-3.5 py-1.8 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px]" id="invoice-type-filters">
              {(['All', 'Sale', 'Quick Sale', 'Purchase'] as const).map(f => (
                <button
                  key={f}
                  id={`filter-${f}`}
                  onClick={() => setFilterType(f)}
                  className={`py-1 px-2.5 rounded-md font-medium font-sans ${
                    filterType === f 
                      ? 'bg-white text-slate-800 shadow-xs' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {f === 'All' && 'همه'}
                  {f === 'Sale' && 'فروش معمولی'}
                  {f === 'Quick Sale' && 'صندوق سریع'}
                  {f === 'Purchase' && 'خرید كالا'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* جدول تاریخچه فاکتورها */}
        <div className="overflow-x-auto text-xs" id="history-table-holder">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-24 text-slate-400 font-medium">
               هیچ فاکتوری در این ردیف آرشیو پیدا نشد.
            </div>
          ) : (
            <table className="w-full border-collapse" id="history-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold text-right">
                  <th className="py-3 px-4">شماره سند</th>
                  <th className="py-3 px-4">تاریخ ثبت</th>
                  <th className="py-3 px-4">طرف حساب تجاری</th>
                  <th className="py-3 px-4">نوع معامله</th>
                  <th className="py-3 px-4 text-left">مبلغ کل فاکتور</th>
                  <th className="py-3 px-4 text-left">مبلغ تخفیف</th>
                  <th className="py-3 px-4 text-left">مبلغ نقدی قابل تسویه</th>
                  <th className="py-3 px-4 text-center">وضعیت مالی</th>
                  <th className="py-3 px-4 text-center">خدمات سند</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const paymentText = getPaymentStatusText(inv.payment_status);
                  return (
                    <tr key={inv.id} id={`history-row-${inv.id}`} className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-800 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">#{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[10.5px]">
                        {new Date(inv.created_at).toLocaleDateString('fa-IR')} {new Date(inv.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold">{getPersonName(inv.person_id)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.type === 'Purchase' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {inv.type === 'Sale' ? 'فروش معمولی' : inv.type === 'Quick Sale' ? 'صندوق سریع' : 'خرید کالا'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-mono">{formatToman(inv.total_amount)}</td>
                      <td className="py-3 px-4 text-left text-red-500 font-mono font-bold">-{formatToman(inv.discount)}</td>
                      <td className="py-3 px-4 text-left text-emerald-600 font-extrabold font-mono">{formatToman(inv.final_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${paymentText.style}`}>
                          {paymentText.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          id={`view-archive-btn-${inv.id}`}
                          onClick={() => handleViewInvoice(inv)}
                          className="p-1 px-2 border border-slate-100 hover:border-emerald-200 bg-white shadow-xs rounded text-slate-500 hover:text-emerald-600 transition flex items-center gap-0.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          نمایش
                        </button>
                        <button
                          id={`rollback-btn-${inv.id}`}
                          onClick={() => handleRollback(inv)}
                          className="p-1 px-2 border border-slate-100 hover:border-red-200 bg-white shadow-xs rounded text-slate-400 hover:text-red-500 transition flex items-center gap-0.5 cursor-pointer"
                          title="ابطال سند و بازگردانی انبار"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          ابطال فاکتور
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* مودال چاپی فاکتور آرشیو شده قدیمی */}
      {selectedInvoice && selectedInvoicePerson && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 overflow-y-auto p-4 flex justify-center items-start animate-fade-in" id="history-modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-8 border border-slate-200 shadow-2xl space-y-6 mt-10" id="history-modal">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 text-xs text-slate-500">
              <span className="font-bold flex items-center gap-1 text-slate-700">
                بازبینی مجدد فاکتور شماره {selectedInvoice.invoice_number}
              </span>
              <div className="flex gap-1.5">
                <button
                  id="reprint-a4"
                  onClick={() => {
                    const printerText = appSettings.defaultPrinter ? `چاپگر ${appSettings.defaultPrinter}` : 'چاپگر پیش‌فرض سیستم';
                    const paperText = appSettings.paperSize === 'A4' ? 'کاغذ A4' : appSettings.paperSize === 'A5' ? 'کاغذ A5' : 'فیش ۸۰ میلی‌متری';
                    alert(`سند مالی فاکتور #${selectedInvoice.invoice_number} با موفقیت تحلیل گردید.\nمستند چاپی با قطع ${paperText} به صف صف‌آرایی دستگاه ${printerText} ارسال شد.`);
                    window.print();
                  }}
                  className="py-1.5 px-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  چاپ مجدد
                </button>
                <button
                  id="close-reprint"
                  onClick={() => { setSelectedInvoice(null); }}
                  className="py-1.5 px-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  بستن پیش‌نمایش
                </button>
              </div>
            </div>

            {/* برگ آ۴ فاکتور */}
            <div 
              className="bg-white text-slate-950 shadow-2xl transition-all duration-300 relative select-text w-full group A4-paper"
              style={{ 
                fontFamily: templateDesign.fontFamily === 'Vazirmatn' ? 'Vazirmatn, sans-serif' : 'sans-serif',
                fontSize: templateDesign.fontSizeScale === 'sm' ? '11px' : templateDesign.fontSizeScale === 'lg' ? '14px' : templateDesign.fontSizeScale === 'xl' ? '16px' : '12px',
                borderWidth: `${templateDesign.lineWidth}px`,
                borderColor: templateDesign.borderColor,
                borderStyle: templateDesign.borderStyle,
                padding: `${templateDesign.layoutPadding}px`,
                lineHeight: '1.7'
              }}
              id="printable-paper-view"
            >
              {/* طرح فانتزی و اشکال برگردان اریب بردی پس‌زمینه فاکتور */}
              <InvoiceShapes primaryColor={templateDesign.primaryColor} styleName={templateDesign.shapeStyle} />

              <div className="relative z-10 space-y-4">
                {/* کمپایلر تر ترتیبی سکشن‌های فاکتور با طرح‌بندی دقیق المنتور */}
                {templateDesign.sectionsOrder.map((secId) => {
                
                // هدر
                if (secId === 'header') {
                  return (
                    <div key="header" className="border-b border-slate-300 pb-3 h-auto mb-4" id="print-sec-header">
                      <div className="flex justify-between items-start md:items-center">
                        {templateDesign.widgets.showLogo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-extrabold text-sm shadow">
                              آریا
                            </div>
                            <div>
                              <h4 className="font-black text-xs text-slate-800">حسابداری آریا</h4>
                              <span className="text-[9px] text-slate-400 font-mono block leading-none">Aria Store ERP v1 (آرشیو)</span>
                            </div>
                          </div>
                        ) : (
                          <h4 className="font-extrabold text-xs text-slate-800">سامانه حسابداری بومی</h4>
                        )}

                        <div className="text-center">
                          <h1 className="font-extrabold text-xs md:text-sm tracking-tight px-3 py-1 rounded" style={{ color: templateDesign.primaryColor }}>
                            {templateDesign.customInvoiceTitle || 'صورتحساب خرید/فروش اقلام'}
                          </h1>
                          {templateDesign.widgets.showPaymentStatusBadge && (
                            <span className="inline-block mt-1 bg-indigo-100 text-indigo-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm border border-indigo-200">
                              {selectedInvoice.type === 'Purchase' ? 'فاکتور خرید کالا' : 'فاکتور فروش کالا و خدمات'}
                            </span>
                          )}
                        </div>

                        <div className="text-left text-[9.5px] text-slate-500 font-mono space-y-0.5 leading-tight">
                          <div>شماره فاکتور: <strong className="text-slate-900 font-bold font-sans">{selectedInvoice.invoice_number}</strong></div>
                          <div>تاریخ صدور اولیه: <span className="font-medium">{new Date(selectedInvoice.created_at).toLocaleDateString('fa-IR')}</span></div>
                          
                          {templateDesign.widgets.showInvoiceBarcode && (
                            <div className="pt-2 flex flex-col items-end">
                              <div className="w-20 h-4 bg-slate-950 flex items-center justify-between px-1 rounded-sm gap-0.5">
                                {[1,3,2,1,4,2,3,1,2,3,4,1,2,3,4,2,3,1].map((w, i) => (
                                  <div key={i} className="bg-white h-3.5" style={{ width: `${w * 0.9}px` }} />
                                ))}
                              </div>
                              <span className="text-[7.5px] text-slate-400 select-none block text-center w-20">{selectedInvoice.invoice_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // متعاملین
                if (secId === 'entities_info') {
                  return (
                    <div key="entities_info" className="space-y-3 mb-4 text-[11px]" id="print-sec-entities">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {templateDesign.widgets.showSellerDetails && (
                          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5 text-right">
                            <h4 className="font-black text-[11px] border-b border-slate-200 pb-1 flex items-center gap-1 text-slate-800">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: templateDesign.primaryColor }}></span>
                              مشخصات صادرکننده سند چاپی (فروشگاه)
                            </h4>
                            <div className="space-y-0.8 leading-relaxed">
                              <div><strong>نام فروشگاه:</strong> {appSettings.storeName || 'کسب و کار آریا'}</div>
                              {appSettings.storeEconomicCode && <div><strong>کد اقتصادی:</strong> <span className="font-mono">{appSettings.storeEconomicCode}</span></div>}
                              {appSettings.storePhone && <div><strong>تلفن رسمی تماس:</strong> <span className="font-mono">{appSettings.storePhone}</span></div>}
                              {appSettings.storeAddress && <div><strong>نشانی مرکز:</strong> {appSettings.storeAddress}</div>}
                            </div>
                          </div>
                        )}

                        {templateDesign.widgets.showBuyerDetails && (
                          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5 text-right">
                            <h4 className="font-black text-[11px] border-b border-slate-200 pb-1 flex items-center gap-1 text-slate-800">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: templateDesign.primaryColor }}></span>
                              مشخصات طرف حساب تجاری (خریدار)
                            </h4>
                            <div className="space-y-0.8 leading-relaxed">
                              <div><strong>نام شخص:</strong> {selectedInvoicePerson.name}</div>
                              {selectedInvoicePerson.phone !== '0' && <div><strong>تلفن همراه:</strong> <span className="font-mono">{selectedInvoicePerson.phone}</span></div>}
                              {selectedInvoicePerson.national_code && <div><strong>کد ملی حقیقی:</strong> <span className="font-mono">{selectedInvoicePerson.national_code}</span></div>}
                              {selectedInvoicePerson.address && <div><strong>نشانی خریدار:</strong> {selectedInvoicePerson.address}</div>}
                              <div><strong>کد عضویت معین:</strong> <span className="font-mono">{selectedInvoicePerson.id}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // جدول اقلام
                if (secId === 'items_table') {
                  return (
                    <div key="items_table" className="border border-slate-350 rounded-xl overflow-hidden mb-4" id="print-sec-table">
                      <table className="w-full text-right border-collapse text-[10.5px]">
                        <thead>
                          <tr className="border-b border-slate-350" style={{ backgroundColor: templateDesign.secondaryColor }}>
                            {templateDesign.widgets.showItemIndexNumber && (
                              <th className="p-2 border-l border-slate-200 text-center w-8">ردیف</th>
                            )}
                            {templateDesign.widgets.showBarcodeColumn && (
                              <th className="p-2 border-l border-slate-200 text-center w-16">بارکد</th>
                            )}
                            <th className="p-2 border-l border-slate-200">شرح عنوان اقلام</th>
                            {templateDesign.widgets.showUnitColumn && (
                              <th className="p-2 border-l border-slate-200 text-center w-24">نوع سطر</th>
                            )}
                            <th className="p-2 border-l border-slate-200 text-left w-12">تعداد</th>
                            <th className="p-2 border-l border-slate-200 text-left w-20">واحد (ت)</th>
                            {templateDesign.widgets.showItemDiscountField && (
                              <th className="p-2 border-l border-slate-200 text-left w-16">تخفیف (ت)</th>
                            )}
                            <th className="p-2 text-left w-24">مبلغ نهایی (تومان)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedInvoiceItems.map((item, index) => (
                            <tr key={item.id || index} className="h-8">
                              {templateDesign.widgets.showItemIndexNumber && <td className="p-2 border-l border-slate-200 text-center font-mono">{index + 1}</td>}
                              {templateDesign.widgets.showBarcodeColumn && <td className="p-2 border-l border-slate-200 text-center font-mono text-[9px] text-slate-400">---</td>}
                              <td className="p-2 border-l border-slate-200 font-bold text-slate-800">{item.item_id === 'srv_1' || item.item_id === 'srv_2' || item.item_id === 'srv_3' ? `سرویس: ${item.item_id}` : `کالا و ملزومات فروشگاهی`}</td>
                              {templateDesign.widgets.showUnitColumn && <td className="p-2 border-l border-slate-200 text-center">{item.item_type === 'Product' ? 'کالای انبارداری' : 'هزینه دستمزد'}</td>}
                              <td className="p-2 border-l border-slate-200 text-left font-mono">{item.quantity}</td>
                              <td className="p-2 border-l border-slate-200 text-left font-mono">{item.price.toLocaleString('fa-IR')}</td>
                              {templateDesign.widgets.showItemDiscountField && <td className="p-2 border-l border-slate-200 text-left font-mono">0</td>}
                              <td className="p-2 text-left font-bold font-mono">{(item.price * item.quantity).toLocaleString('fa-IR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                // حسابداری مالی
                if (secId === 'financial_receipt') {
                  return (
                    <div key="financial_receipt" className="space-y-3 mb-4 text-[10.5px]" id="print-sec-financial">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-7 border border-slate-200 p-3 rounded-xl bg-slate-50/50 space-y-1 text-right">
                          <span className="font-bold text-slate-700 block text-[11px]">توضیحات ابطال یا بازبینی:</span>
                          {templateDesign.widgets.showTermsAndFooterText ? (
                            <p className="text-slate-500 text-[10px] leading-relaxed text-justify italic">
                              {templateDesign.customTermsNote || 'این فاکتور از آرشیو دائمی بازخوانی شده است. تراز حسابداری و تغییرات موجودی انبار بابت این سند معین شده و تغییر‌ناپذیرند مگر در صورت فشردن دکمه ابطال دستی فاکتور.'}
                            </p>
                          ) : (
                            <p className="text-slate-400 text-[9.5px] italic">توضیحات آرشیو چاپ نشده است.</p>
                          )}
                        </div>

                        <div className="md:col-span-5 border border-slate-205 py-2 px-3.5 rounded-xl bg-slate-100/50 space-y-1.5 divide-y divide-slate-250">
                          <div className="flex justify-between items-center pb-1 text-slate-600 text-right">
                            <span>جمع ناخالص:</span>
                            <span className="font-mono font-bold">{formatToman(selectedInvoice.total_amount)}</span>
                          </div>
                          {templateDesign.widgets.showItemDiscountField && (
                            <div className="flex justify-between items-center py-1 text-red-655 h-6 leading-none">
                              <span>کسر تخفیف فاکتور:</span>
                              <span className="font-mono font-bold">-{formatToman(selectedInvoice.discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-1.5 font-black text-xs h-8 leading-none" style={{ color: templateDesign.primaryColor }}>
                            <span>مبلغ پرداخت شده نهایی:</span>
                            <span className="font-mono text-xs font-black">{formatToman(selectedInvoice.final_amount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // امضاها
                if (secId === 'signatures') {
                  return (
                    <div key="signatures" className="h-auto pb-4 pt-1" id="print-sec-signatures">
                      {templateDesign.widgets.showSignatureBoxes ? (
                        <div className="grid grid-cols-2 gap-4 text-center text-[10.5px]">
                          <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/20 shadow-xs h-24 flex flex-col justify-between">
                            <strong className="text-slate-500 font-bold">{templateDesign.customSellerStampLabel}</strong>
                            <span className="text-[9px] text-slate-400 font-mono italic">مهر و امضای شرکت</span>
                          </div>
                          <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/20 shadow-xs h-24 flex flex-col justify-between">
                            <strong className="text-slate-500 font-bold">{templateDesign.customBuyerSignatureLabel}</strong>
                            <span className="text-[9px] text-slate-400 italic">گواهی صحت و دریافت کالا</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 border border-dashed border-slate-200 text-slate-400 rounded-xl text-center text-[10px]">
                          کادر امضا غیرفعال است.
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* اطلاعات تکمیلی تسویه اعتباری: اقساط و چک‌های پیوست این فاکتور */}
            {(selectedInvoiceInstallments.length > 0 || selectedInvoiceChecks.length > 0) && (
              <div className="border-t border-slate-100 pt-5 mt-4 space-y-4 text-right select-none no-print">
                <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  برنامه تسویه اعتباری و اسناد مالی پیوست فاکتور
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* لیست اقساط فاکتور */}
                  {selectedInvoiceInstallments.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-bold text-[11px] text-slate-700 border-b border-slate-250 pb-2 mb-3">
                        سندباکس اقساط تعهد شده ({selectedInvoiceInstallments.length} قسط)
                      </h4>
                      <div className="space-y-2">
                        {selectedInvoiceInstallments.map((inst, idx) => (
                          <div key={inst.id || idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                            <div className="space-y-0.5">
                              <div><strong>قسط شماره {idx + 1}</strong></div>
                              <div className="text-[10px] text-slate-400">تاریخ سررسید قسط: <span className="font-mono">{inst.due_date}</span></div>
                            </div>
                            <div className="text-left space-y-1">
                              <span className="font-bold text-slate-900 block font-mono">{formatToman(inst.amount)}</span>
                              <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                                inst.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {inst.status === 'Paid' ? 'وصول شده' : 'معوق/درانتظار'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* لیست چک‌های صیادی پیوست */}
                  {selectedInvoiceChecks.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-bold text-[11px] text-slate-700 border-b border-slate-250 pb-2 mb-3">
                        اسناد و چک‌های صیادی تسلیمی ({selectedInvoiceChecks.length} فقره چک)
                      </h4>
                      <div className="space-y-2">
                        {selectedInvoiceChecks.map((chk, idx) => (
                          <div key={chk.id || idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs font-sans">
                            <div className="space-y-1 text-right">
                              <div className="flex items-center gap-1.5">
                                <strong>بانک {chk.bank_name}</strong>
                                <span className="text-[9.5px] font-mono text-slate-400">کد: {chk.check_number}</span>
                              </div>
                              <div className="text-[10px] text-slate-500">شماره صیاد: <span className="font-mono">{chk.sayad_id || 'ساده/قدیمی'}</span></div>
                              <div className="text-[10px] text-slate-550">سررسید سند: <span className="font-bold text-amber-700 font-mono">{chk.due_date}</span></div>
                            </div>
                            <div className="text-left space-y-1">
                              <span className="font-bold text-slate-900 block font-mono">{formatToman(chk.amount)}</span>
                              <div className="flex items-center gap-1 justify-end">
                                {chk.image && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const w = window.open();
                                      if (w && chk.image) {
                                        w.document.write(`<img src="${chk.image}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
                                      }
                                    }}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-zinc-200 text-slate-600 rounded text-[9px] font-bold"
                                  >
                                    تصویر چک
                                  </button>
                                )}
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  chk.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {chk.status === 'Paid' ? 'وصول شد' : chk.status === 'Bounced' ? 'برگشتی' : 'در جریان وصول'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
      )}

    </div>
  );
}
