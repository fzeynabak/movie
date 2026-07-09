import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Printer, 
  X, 
  Calendar, 
  CreditCard, 
  Coins, 
  Smartphone, 
  Info,
  Layers,
  Archive,
  ShoppingCart,
  CheckCircle2,
  Filter,
  FileText,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  PlusCircle,
  Edit
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Decimal from 'decimal.js';
import { Invoice } from '../types';
import { CustomDesignedInvoice } from '../components/CustomDesignedInvoice';
import { InvoiceDesignerService, DEFAULT_DESIGN } from '../utils/invoiceDesignerSettings';
import JalaliDatePicker, { toPersianDigits, getTodayJalali } from '../components/JalaliDatePicker';

const MySwal = withReactContent(Swal);

export default function SalesHistory() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'new_return' | 'return_history'>('history');

  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('sales_history_search') || '';
  });
  const [methodFilter, setMethodFilter] = useState('همه');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLayout, setPrintLayout] = useState<'a4' | 'a5' | 'thermal'>('a4');
  
  const [invoiceDesign, setInvoiceDesign] = useState<any>(null);
  const [printShopName, setPrintShopName] = useState('حسابداری مالی ملینا');
  const [printShopSlogan, setPrintShopSlogan] = useState('امور مالی و حسابداری یکپارچه ملینا');
  const [printShopAddress, setPrintShopAddress] = useState('تهران، بازار بزرگ، سرای ملی، طبقه اول، پلاک ۴');
  const [printShopPhone, setPrintShopPhone] = useState('۰۲۱-۵۵۶۶۷۷۸۸');
  const [printShopLogo, setPrintShopLogo] = useState('');

  // --- Return Form States ---
  const [returnInvoiceId, setReturnInvoiceId] = useState<number | null>(null);
  const [returnItems, setReturnItems] = useState<{
    product_id: number;
    product_name: string;
    product_code: string;
    original_qty: number;
    quantity: number;
    unit_price: number;
    selected: boolean;
  }[]>([]);
  const [returnDiscount, setReturnDiscount] = useState<number>(0);
  const [returnAmountPaid, setReturnAmountPaid] = useState<number>(0);
  const [returnDescription, setReturnDescription] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>(getTodayJalali());

  useEffect(() => {
    loadInvoices();
    loadConfig();
    localStorage.removeItem('sales_history_search');
  }, []);

  const loadConfig = async () => {
    try {
      let loadedDesign = null;
      if (window.electronAPI?.getConfig) {
        const config = await window.electronAPI.getConfig();
        if (config) {
          if (config.invoiceDesignerPreset) {
            loadedDesign = config.invoiceDesignerPreset;
            setInvoiceDesign(config.invoiceDesignerPreset);
          }
          if (config.storeName) setPrintShopName(config.storeName);
          if (config.storeSlogan) setPrintShopSlogan(config.storeSlogan);
          if (config.storeAddress) setPrintShopAddress(config.storeAddress);
          if (config.storePhone) setPrintShopPhone(config.storePhone);
          if (config.storeLogo) setPrintShopLogo(config.storeLogo);
        }
      }
      if (!loadedDesign) {
        setInvoiceDesign(InvoiceDesignerService.get());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInvoices = async () => {
    try {
      if (window.electronAPI?.getInvoices) {
        const list = await window.electronAPI.getInvoices();
        setInvoices(list);
      }
    } catch (e) {
      console.error('Error loading invoices history:', e);
    }
  };

  const handleEditInvoice = (inv: Invoice) => {
    localStorage.setItem('editing_invoice_id', String(inv.id));
    localStorage.setItem('editing_invoice_data', JSON.stringify(inv));
    navigate('/sales/new-invoice');
  };

  const handleCancelInvoice = async (invoiceId: number, invoiceNum: string) => {
    MySwal.fire({
      title: `آیا مایل به لغو فاکتور شماره ${invoiceNum} هستید؟`,
      text: 'با لغو فاکتور، کالاها به موجودی انبار بازگردانده شده و سند مالی برگشت می‌خورد. این فرآیند تحت حفاظت تراکنش‌های پایگاه‌داده است.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'بله، لغو و برگشت داده شود',
      cancelButtonText: 'انصراف'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          if (window.electronAPI?.deleteInvoice) {
            const savedUserStr = sessionStorage.getItem('current_user');
            const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
            const currentUsername = savedUser?.username || 'مدیر سیستم';
            const res = await window.electronAPI.deleteInvoice({ id: invoiceId, username: currentUsername });
            if (res.success) {
              MySwal.fire('لغو شد', 'فاکتور با موفقیت باطل گردید و موجودی انبارها به‌روزرسانی شد.', 'success');
              loadInvoices(); // reload history
            } else {
              throw new Error(res.error || 'خطا در لغو فاکتور');
            }
          }
        } catch (err: any) {
          MySwal.fire('خطا', err.message || 'لغو فاکتور با خطا مواجه شد.', 'error');
        }
      }
    });
  };

  const formatCurrency = (val: number | string | Decimal) => {
    const parsed = typeof val === 'object' ? val.toNumber() : parseFloat(val.toString() || '0');
    return parsed.toLocaleString('fa-IR');
  };

  // Only display standard Sales
  const filteredSalesInvoices = invoices.filter(inv => {
    const isSale = !inv.type || inv.type === 'فروش';
    if (!isSale) return false;

    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (inv.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === 'همه' || inv.payment_method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  // Only display Sales Returns
  const filteredReturnInvoices = invoices.filter(inv => {
    const isReturn = inv.type === 'برگشت از فروش';
    if (!isReturn) return false;

    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (inv.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Load selected invoice items into form
  const handleSelectInvoiceForReturn = (id: number) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    setReturnInvoiceId(id);
    const items = (inv.items || []).map((item: any) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code || '---',
      original_qty: item.quantity,
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected: true
    }));
    setReturnItems(items);
    setReturnDescription(`برگشت از فروش بابت فاکتور فروش شماره ${inv.invoice_number}`);
  };

  const handleReturnItemToggle = (index: number) => {
    const updated = [...returnItems];
    updated[index].selected = !updated[index].selected;
    setReturnItems(updated);
  };

  const handleReturnItemQtyChange = (index: number, val: string) => {
    const updated = [...returnItems];
    const numeric = parseFloat(val) || 0;
    updated[index].quantity = numeric;
    setReturnItems(updated);
  };

  const handleReturnItemPriceChange = (index: number, val: string) => {
    const updated = [...returnItems];
    const numeric = parseFloat(val) || 0;
    updated[index].unit_price = numeric;
    setReturnItems(updated);
  };

  const calculateReturnTotal = () => {
    return returnItems.reduce((sum, item) => {
      if (item.selected) {
        return sum.plus(new Decimal(item.quantity).mul(item.unit_price));
      }
      return sum;
    }, new Decimal(0));
  };

  const handleRegisterReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnInvoiceId) {
      MySwal.fire('خطا', 'لطفاً ابتدا یک فاکتور فروش را انتخاب کنید.', 'warning');
      return;
    }
    const selectedItems = returnItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      MySwal.fire('خطا', 'لطفاً حداقل یک کالا را انتخاب کنید.', 'warning');
      return;
    }

    // Validation
    for (const item of selectedItems) {
      if (item.quantity <= 0) {
        MySwal.fire('خطا', `تعداد برگشتی برای ${item.product_name} باید بزرگتر از صفر باشد.`, 'warning');
        return;
      }
      if (item.quantity > item.original_qty) {
        MySwal.fire('خطا', `تعداد برگشتی کالا (${item.quantity}) برای ${item.product_name} نمی‌تواند بیشتر از فاکتور اصلی (${item.original_qty}) باشد.`, 'warning');
        return;
      }
    }

    const originalInvoice = invoices.find(i => i.id === returnInvoiceId);

    const savedUserStr = sessionStorage.getItem('current_user');
    const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    const currentUsername = savedUser?.username || 'مدیر سیستم';

    const returnData = {
      type: 'sales_return',
      customer_id: originalInvoice?.customer_id || null,
      invoice_id: returnInvoiceId,
      original_invoice_num: originalInvoice?.invoice_number || '',
      date: returnDate,
      items: selectedItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      })),
      discount: returnDiscount,
      amountPaid: returnAmountPaid,
      description: returnDescription,
      username: currentUsername
    };

    try {
      if (window.electronAPI?.saveReturn) {
        const res = await window.electronAPI.saveReturn(returnData);
        if (res.success) {
          await MySwal.fire({
            icon: 'success',
            title: 'برگشت از فروش با موفقیت ثبت شد',
            text: `سند برگشت شماره ${res.invoice_number} ثبت گردید، کاردکس انبار و موجودی کالاها افزایش یافت و حساب مشتری اصلاح شد.`,
            confirmButtonText: 'بسیار عالی'
          });
          // Reset form
          setReturnInvoiceId(null);
          setReturnItems([]);
          setReturnDiscount(0);
          setReturnAmountPaid(0);
          setReturnDescription('');
          loadInvoices();
          setActiveTab('return_history');
        } else {
          throw new Error(res.error || 'خطا در ثبت برگشت');
        }
      }
    } catch (err: any) {
      MySwal.fire('خطا', err.message || 'مشکلی در ثبت برگشت از فروش رخ داد.', 'error');
    }
  };

  const triggerPrintCmd = () => {
    window.print();
  };

  const totalReturnSum = calculateReturnTotal();
  const returnFinalSum = Decimal.max(0, totalReturnSum.minus(returnDiscount));

  return (
    <div id="sales_history_page" className="p-4 lg:p-6 bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 space-y-6">
      
      {/* Visual Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-500" />
            <span>تاریخچه فاکتورها و برگشت از فروش</span>
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            مشاهده فاکتورهای صادرشده تجاری، ابطال اسناد، ثبت اسناد مرجوعی کالاها از مشتریان و اصلاح انبار و حساب‌ها
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          فاکتورهای صادر شده
        </button>
        <button
          onClick={() => setActiveTab('new_return')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'new_return'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ثبت برگشت از فروش جدید
        </button>
        <button
          onClick={() => setActiveTab('return_history')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'return_history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          لیست برگشتی‌های فروش
        </button>
      </div>

      {/* SUB-VIEW 1: INVOICE HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Instant Search Bar & Filter options */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی سریع شماره فاکتور یا نام خریدار..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:outline-none text-xs text-slate-800 dark:text-white transition-all font-semibold"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Filter className="w-4 h-4" />
                <span>فیلتر تسویه:</span>
              </span>
              {['همه', 'کارتخوان', 'نقدی', 'کارت به کارت', 'چکی', 'اقساطی'].map(method => (
                <button
                  key={method}
                  onClick={() => setMethodFilter(method)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    methodFilter === method
                      ? 'bg-indigo-600 border border-indigo-700 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-150 py-2.5">
                    <th className="p-3">ردیف</th>
                    <th className="p-3">شمارة سند فاکتور</th>
                    <th className="p-3">نام و مشخصات خریدار</th>
                    <th className="p-3 text-center">نوع تسویه</th>
                    <th className="p-3 text-left">مجموع ناخالص (ریال)</th>
                    <th className="p-3 text-left">تخفیف (ریال)</th>
                    <th className="p-3 text-left text-indigo-600 dark:text-indigo-400">مبلغ خالص دریافتی (ریال)</th>
                    <th className="p-3 text-center">اقدامات چاپی و ابطال</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalesInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400">هیچ فاکتوری با شرایط انتخابی ثبت نشده است.</td>
                    </tr>
                  ) : (
                    filteredSalesInvoices.map((inv, idx) => {
                      return (
                        <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800/40">
                          <td className="p-3 font-semibold">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{inv.invoice_number}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-white">{inv.customer_name}</td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                              {inv.payment_method || 'کارتخوان'}
                            </span>
                          </td>
                          <td className="p-3 text-left font-mono font-semibold">{formatCurrency(inv.total_amount || 0)}</td>
                          <td className="p-3 text-left font-mono text-red-500">-{formatCurrency(inv.discount || 0)}</td>
                          <td className="p-3 text-left font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(inv.final_amount || 0)}</td>
                          <td className="p-3 text-center flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="مشاهده جزئیات فاکتور"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setShowPrintModal(true);
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              title="چاپ دوباره"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditInvoice(inv)}
                              className="p-1.5 bg-slate-50 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title="ویرایش فاکتور"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancelInvoice(inv.id, inv.invoice_number)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400 transition-colors"
                              title="ابطال فاکتور و لغو سند"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: NEW SALES RETURN */}
      {activeTab === 'new_return' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/40 dark:border-slate-800/40 shadow-sm space-y-6">
          <div className="border-b pb-3 border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-500" />
              <span>فرم ثبت سند مرجوعی کالا (برگشت از فروش)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">با انتخاب فاکتور فروش قبلی، کالاهای مرجوعی را تیک زده و ثبت نمایید تا خودکار به موجودی انبار اضافه گردند.</p>
          </div>

          <form onSubmit={handleRegisterReturnSubmit} className="space-y-6 text-xs">
            {/* Step 1: Select Invoice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 block mb-1">۱. انتخاب فاکتور فروش مبدا:</label>
                <select
                  value={returnInvoiceId || ''}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    if (id) handleSelectInvoiceForReturn(id);
                    else {
                      setReturnInvoiceId(null);
                      setReturnItems([]);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-semibold"
                >
                  <option value="">-- فاکتور فروش را انتخاب کنید --</option>
                  {invoices
                    .filter(i => !i.type || i.type === 'فروش')
                    .map(i => (
                      <option key={i.id} value={i.id}>
                        فاکتور #{i.invoice_number} — {i.customer_name} — {formatCurrency(i.final_amount)} ریال
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 block mb-1">تاریخ ثبت برگشتی:</label>
                <JalaliDatePicker
                  value={returnDate}
                  onChange={(val) => setReturnDate(val)}
                />
              </div>
            </div>

            {/* Step 2: Show Items to Select */}
            {returnInvoiceId && returnItems.length > 0 && (
              <div className="space-y-3">
                <label className="font-bold text-slate-600 block">۲. انتخاب و مقداردهی کالاهای مرجوعی:</label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500">
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="p-2.5 text-center w-12">انتخاب</th>
                        <th className="p-2.5">کد محصول</th>
                        <th className="p-2.5">شرح کالا / خدمات</th>
                        <th className="p-2.5 text-center w-24">تعداد در فاکتور</th>
                        <th className="p-2.5 text-center w-36">تعداد مرجوعی</th>
                        <th className="p-2.5 text-left w-44">قیمت برگشتی واحد (ریال)</th>
                        <th className="p-2.5 text-left w-44">جمع ردیف (ریال)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item, index) => {
                        const rowTotal = new Decimal(item.quantity || 0).mul(item.unit_price || 0);
                        return (
                          <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40">
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleReturnItemToggle(index)}
                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-400">#{item.product_code}</td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-white">{item.product_name}</td>
                            <td className="p-2.5 text-center font-bold text-slate-500">{item.original_qty}</td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                step="any"
                                value={item.quantity}
                                disabled={!item.selected}
                                onChange={(e) => handleReturnItemQtyChange(index, e.target.value)}
                                min="0.01"
                                max={item.original_qty}
                                className="w-24 text-center p-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                              />
                            </td>
                            <td className="p-2.5 text-left">
                              <input
                                type="number"
                                value={item.unit_price}
                                disabled={!item.selected}
                                onChange={(e) => handleReturnItemPriceChange(index, e.target.value)}
                                className="w-36 text-left p-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                              />
                            </td>
                            <td className="p-2.5 text-left font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.selected ? formatCurrency(rowTotal) : '0'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 3: Returns pricing summaries, discount, paid back cash */}
            {returnInvoiceId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">بابت پرداخت به مشتری (در صورت تسویه نقدی/کارتخوان):</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="مبلغ بازپرداخت شده نقدی یا بانکی به مشتری..."
                        value={returnAmountPaid || ''}
                        onChange={(e) => setReturnAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs font-mono font-bold text-left pl-14"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ریال</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">کسر تخفیف برگشتی (در صورت لزوم):</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="تخفیف برگشتی..."
                        value={returnDiscount || ''}
                        onChange={(e) => setReturnDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs font-mono font-bold text-left pl-14"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ریال</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500">توضیحات و یادداشت سند:</label>
                    <textarea
                      value={returnDescription}
                      rows={3}
                      onChange={(e) => setReturnDescription(e.target.value)}
                      placeholder="توضیحاتی پیرامون علت مرجوعی..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs"
                    ></textarea>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold border-b pb-2 text-slate-600">خلاصه حساب مرجوعی</h3>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 font-medium">مجموع اقلام مرجوعی:</span>
                      <strong className="font-mono">{formatCurrency(totalReturnSum)} ریال</strong>
                    </div>
                    {returnDiscount > 0 && (
                      <div className="flex justify-between items-center py-1 text-red-500">
                        <span className="font-medium">تخفیف مرجوعی:</span>
                        <strong className="font-mono">-{formatCurrency(returnDiscount)} ریال</strong>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-t-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black text-sm">
                      <span>مبلغ خالص بستانکاری مشتری:</span>
                      <strong className="font-mono text-indigo-600 dark:text-indigo-400">{formatCurrency(returnFinalSum)} ریال</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 text-slate-500">
                      <span>مبلغ نقدی پرداخت شده:</span>
                      <strong className="font-mono">{formatCurrency(returnAmountPaid)} ریال</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 text-xs font-bold text-emerald-600 border-t pt-2">
                      <span>اصلاح نهایی مانده بدهی مشتری:</span>
                      <strong className="font-mono">{formatCurrency(Decimal.max(0, returnFinalSum.minus(returnAmountPaid)))} ریال کاهش بدهی</strong>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
                  >
                    ثبت نهایی سند برگشت از فروش و بروزرسانی انبار
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* SUB-VIEW 3: SALES RETURNS HISTORY */}
      {activeTab === 'return_history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm overflow-hidden">
          <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/25">
            <h2 className="text-xs font-black text-slate-700 dark:text-slate-300">لیست اسناد برگشت از فروش ثبت شده</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-150 py-2.5">
                  <th className="p-3">ردیف</th>
                  <th className="p-3">شماره سند برگشتی</th>
                  <th className="p-3">نام و مشخصات خریدار</th>
                  <th className="p-3">تاریخ مرجوعی</th>
                  <th className="p-3 text-left">مجموع کل برگشتی (ریال)</th>
                  <th className="p-3 text-left">مبلغ نقدی استرداد (ریال)</th>
                  <th className="p-3">توضیحات سند</th>
                  <th className="p-3 text-center">اقدامات چاپی و حذف</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturnInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400">هیچ فاکتور برگشت از فروشی ثبت نشده است.</td>
                  </tr>
                ) : (
                  filteredReturnInvoices.map((inv, idx) => {
                    return (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800/40">
                        <td className="p-3 font-semibold">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{inv.invoice_number}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-white">{inv.customer_name}</td>
                        <td className="p-3 font-mono">{inv.date || '---'}</td>
                        <td className="p-3 text-left font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(inv.final_amount || 0)}</td>
                        <td className="p-3 text-left font-mono text-emerald-500 font-semibold">{formatCurrency(inv.received_amount || 0)}</td>
                        <td className="p-3 text-slate-500 text-[11px] max-w-[200px] truncate" title={inv.description}>{inv.description || '---'}</td>
                        <td className="p-3 text-center flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="مشاهده اقلام مرجوعی"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowPrintModal(true);
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            title="چاپ سند برگشتی"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelInvoice(inv.id, inv.invoice_number)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-450 transition-colors"
                            title="حذف سند برگشتی و بازگشت انبار"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Print Designing & Custom Invoice Layout Modal --- */}
      {showPrintModal && selectedInvoice && (() => {
        let parsedDetails: any = {};
        try {
          if (selectedInvoice.payment_details) {
            parsedDetails = JSON.parse(selectedInvoice.payment_details);
          }
        } catch (e) {
          console.error(e);
        }

        const subVal = selectedInvoice.total_amount || 0;
        const taxVal = selectedInvoice.tax || 0;
        const finalVal = selectedInvoice.final_amount || 0;

        const itemsMapped = selectedInvoice.items?.map((it: any) => ({
          price: it.unit_price,
          quantity: it.quantity,
          discount: it.discount || 0,
          taxRate: it.tax_rate || 0,
          product: {
            id: it.product_id,
            name: it.product_name || 'کالای نامشخص',
            code: it.product_code || '',
            unit: it.product_unit || 'عدد'
          }
        })) || [];

        const selectedCust: Person = {
          id: selectedInvoice.customer_id || 0,
          first_name: selectedInvoice.customer_name || 'خریدار متفرقه عمومی',
          last_name: '',
          phone1: selectedInvoice.customer_phone || '',
          national_id: '',
          address: '',
          accounting_code: '',
          title: '',
          nickname: '',
          type: 'حقیقی',
          category: ''
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
                <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-500" />
                  <span>تنظیمات قالب‌بندی چاپ و طراحی فاکتور تجاری</span>
                </h2>
                <button 
                  onClick={() => {
                    setShowPrintModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Print Controls Sidebar */}
              <div className="flex-1 flex overflow-hidden">
                <div className="w-64 border-l border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/20 space-y-4 text-xs">
                  <div className="space-y-2">
                    <label className="font-bold text-slate-500">انتخاب اندازه کاغذ:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['a4', 'a5', 'thermal'].map((layout) => (
                        <button
                          key={layout}
                          onClick={() => setPrintLayout(layout as any)}
                          className={`py-2 px-1 text-center font-bold border rounded-lg transition-all ${
                            printLayout === layout
                              ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                              : 'bg-white hover:bg-slate-100 dark:bg-slate-950 border-slate-200'
                          }`}
                        >
                          {layout === 'a4' ? 'A4 عمودی' : layout === 'a5' ? 'A5 افقی' : 'حرارتی'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/40 text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
                    <p className="font-extrabold flex items-center gap-1"><Info className="w-3.5 h-3.5" /> راهنمای کاربر:</p>
                    <p className="text-[10px]">چاپ فاکتور با استفاده از CSSهای مدیاپرینت کاملاً بومی و منعکس‌کننده دقیق‌ترین ساختارهای فیزیکی فاکتور ملینا است.</p>
                  </div>

                  <button
                    onClick={triggerPrintCmd}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>ارسال مستقیم به پرینتر (Print) / ذخیره PDF</span>
                  </button>
                </div>

                {/* Printable Area Wrapper (With scale down for preview) */}
                <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-y-auto p-4 flex justify-center items-start">
                  <div className="bg-white text-black p-1 shadow-lg max-w-full origin-top">
                    <div id="invoice_printable_area">
                      <CustomDesignedInvoice
                        invoiceDesign={invoiceDesign || DEFAULT_DESIGN}
                        printLayout={printLayout as 'a4' | 'a5' | 'thermal'}
                        printShopName={printShopName}
                        printShopSlogan={printShopSlogan}
                        printShopAddress={printShopAddress}
                        printShopPhone={printShopPhone}
                        printShopLogo={printShopLogo}
                        invoiceNumber={selectedInvoice.invoice_number}
                        paymentMethod={selectedInvoice.payment_method}
                        selectedCustomer={selectedCust}
                        items={itemsMapped}
                        discount={selectedInvoice.discount || 0}
                        taxRate={parsedDetails.tax_rate_percent ?? 0}
                        calculateSubtotal={() => new Decimal(subVal)}
                        calculateTax={() => new Decimal(taxVal)}
                        calculateFinalTotal={() => new Decimal(finalVal)}
                        installments={parsedDetails.installmentsList || []}
                        description={selectedInvoice.description || ''}
                        printColCodeLabel="کد کالا"
                        printColNameLabel="عنوان کالا / شرح خدمات"
                        printColQtyLabel="تعداد"
                        printColPriceLabel="فی (ریال)"
                        printColTotalLabel="جمع کل"
                        printColCurrencyLabel="ریال"
                        receivedAmount={parsedDetails.received_amount ?? (selectedInvoice.payment_method === 'نقدی' ? finalVal : 0)}
                        previousBalance={parsedDetails.previous_balance ?? 0}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- Standard Interactive Details Modal --- */}
      {selectedInvoice && !showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
              <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>مشاهده جزئیات کامل {selectedInvoice.type || 'فاکتور فروش'} شماره #{selectedInvoice.invoice_number}</span>
              </h2>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Document Metadata block */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">شماره سند:</span>
                  <strong className="font-mono text-slate-700 dark:text-slate-200">{selectedInvoice.invoice_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">تاریخ ثبت:</span>
                  <strong>{selectedInvoice.date || '---'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">نوع تسویه / سند:</span>
                  <strong className="text-indigo-600 dark:text-indigo-400">{selectedInvoice.type || selectedInvoice.payment_method || 'فروش'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">خریدار / مشتری:</span>
                  <strong>{selectedInvoice.customer_name}</strong>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3 w-12 text-center">ردیف</th>
                      <th className="p-3">کد کالا</th>
                      <th className="p-3">نام و مشخصات کالا</th>
                      <th className="p-3 text-center w-24">تعداد</th>
                      <th className="p-3 text-left w-36">قیمت واحد (ریال)</th>
                      <th className="p-3 text-left w-36">جمع کل (ریال)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40">
                        <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono text-slate-500">#{it.product_code}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-white">{it.product_name}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{it.quantity}</td>
                        <td className="p-3 text-left font-mono">{formatCurrency(it.unit_price)}</td>
                        <td className="p-3 text-left font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(new Decimal(it.unit_price).mul(it.quantity))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Description and Total Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/30 rounded-xl">
                  <span className="font-bold text-slate-500 block mb-1">یادداشت و توضیحات سند:</span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{selectedInvoice.description || 'توضیحات خاصی ثبت نشده است.'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">جمع ناخالص فاکتور:</span>
                    <span className="font-mono">{formatCurrency(selectedInvoice.total_amount)} ریال</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between py-1 text-red-500">
                      <span>تخفیف کسر شده:</span>
                      <span className="font-mono">-{formatCurrency(selectedInvoice.discount)} ریال</span>
                    </div>
                  )}
                  {selectedInvoice.received_amount > 0 && (
                    <div className="flex justify-between py-1 text-emerald-600">
                      <span>مبلغ نقدی/استردادی پرداختی:</span>
                      <span className="font-mono">{formatCurrency(selectedInvoice.received_amount)} ریال</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t font-black text-sm text-slate-900 dark:text-white">
                    <span>مبلغ نهایی سند:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatCurrency(selectedInvoice.final_amount)} ریال</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-700 dark:text-white"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
