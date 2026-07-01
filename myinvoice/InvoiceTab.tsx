import React, { useState, useEffect } from 'react';
import { OfflineDatabase } from '../db/offlineDb';
import { Person, Product, Service, Invoice, InvoiceItem, Installment, CheckEntry, Payment } from '../types';
import { SettingsService, AppSettings, formatPrice } from '../utils/settings';
import { InvoiceDesignerService, InvoiceTemplateDesign } from '../utils/invoiceDesignerSettings';
import InvoiceShapes from './InvoiceShapes';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Printer, 
  Users, 
  ShoppingBag, 
  Receipt, 
  AlertCircle, 
  FileText, 
  Search, 
  MapPin, 
  Phone, 
  CreditCard, 
  Tag, 
  Mail, 
  AlignRight, 
  Info, 
  Briefcase 
} from 'lucide-react';

interface SelectedItem {
  id: string; // client temporary inline id
  type: 'Product' | 'Service';
  item_id: string; // References database Product or Service ID
  title: string;
  quantity: number;
  price: number;
  unit: string;
}

export default function InvoiceTab() {
  const activeUser = (() => {
    try {
      const raw = localStorage.getItem('shop_accounting_active_user');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { id: 'user_admin', username: 'admin', fullName: 'مدیر سیستم', role: 'Admin' };
  })();

  const canSell = activeUser.role === 'Admin' || activeUser.role === 'Salesperson';

  const [persons, setPersons] = useState<Person[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // انتخاب حساب مشتری
  const [selectedPersonId, setSelectedPersonId] = useState('general_customer');
  const [invoiceType, setInvoiceType] = useState<'Sale' | 'Purchase'>('Sale');

  // جستجو و تاگل مشتریان
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // جستجو و فیلتر کاتالوگ کالاوخدمات
  const [itemSearch, setItemSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'All' | 'Products' | 'Services'>('All');

  // تنظیمات پوسته و ظاهر برنامه
  const [appSettings, setAppSettings] = useState<AppSettings>(SettingsService.get());
  const [templateDesign, setTemplateDesign] = useState<InvoiceTemplateDesign>(InvoiceDesignerService.get());

  // ردیف‌های فعال فاکتور جاری
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // مقادیر ورودی جدید برای سطر فاکتور
  const [currentItemType, setCurrentItemType] = useState<'Product' | 'Service'>('Product');
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentServiceId, setCurrentServiceId] = useState('');
  const [currentQty, setCurrentQty] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // تخفیف و مالیات
  const [discount, setDiscount] = useState<number>(0);
  const [applyTax, setApplyTax] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'POS' | 'Mixed'>('POS');

  // تعاریف پیشرفته فروش چکی و اقساطی طبق درخواست مشتری
  const [paymentTerm, setPaymentTerm] = useState<'Cash' | 'Installment' | 'Check'>('Cash');
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [installmentInterval, setInstallmentInterval] = useState<number>(30); // فاصله روزها (مثلا ۳۰ روزه)
  const [firstDueDate, setFirstDueDate] = useState<string>(''); // تاریخ اولین قسط (شمسی ملایم)
  const [installmentsList, setInstallmentsList] = useState<Installment[]>([]);
  const [checksList, setChecksList] = useState<CheckEntry[]>([]);

  // اطلاعات فیلد چک در حال ورود
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [checkDueDate, setCheckDueDate] = useState<string>('');
  const [checkAmount, setCheckAmount] = useState<number>(0);
  const [drawerName, setDrawerName] = useState<string>('');
  const [sayadId, setSayadId] = useState<string>('');
  const [checkImage, setCheckImage] = useState<string>('');

  // پیش‌نمایش چاپی فاکتور آ۴ رسمی
  const [activeInvoiceForPrint, setActiveInvoiceForPrint] = useState<{ invoice: Invoice; items: SelectedItem[]; person: Person } | null>(null);
  const [paperSize, setPaperSize] = useState<'A4' | 'A5'>('A4');
  const [isBW, setIsBW] = useState<boolean>(false);

  // هماهنگ‌سازی اتوماتیک با تنظیم سراسری سیاه/سفید هرگاه مودال چاپ بازگردد
  useEffect(() => {
    if (activeInvoiceForPrint) {
      setIsBW(appSettings.blackAndWhiteInvoice || false);
    }
  }, [activeInvoiceForPrint, appSettings]);

  useEffect(() => {
    refreshData();
    
    // اشتراک در رویداد تغییر تنظیمات سراسری
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
  }, [appSettings]);

  const refreshData = () => {
    setPersons(OfflineDatabase.getPersons());
    setProducts(OfflineDatabase.getProducts());
    setServices(OfflineDatabase.getServices());
    setInvoices(OfflineDatabase.getInvoices());
  };

  // هرگاه کالا یا خدمت جدید انتخاب می‌شود، قیمت آن را اتوماتیک پر کنیم
  useEffect(() => {
    if (currentItemType === 'Product') {
      const p = products.find(prod => prod.id === currentProductId);
      if (p) {
        setCurrentPrice(invoiceType === 'Sale' ? p.sale_price : p.purchase_price);
      } else {
        setCurrentPrice(0);
      }
    } else {
      const s = services.find(srv => srv.id === currentServiceId);
      if (s) {
        setCurrentPrice(s.price);
      } else {
        setCurrentPrice(0);
      }
    }
  }, [currentProductId, currentServiceId, currentItemType, invoiceType, products, services]);

  // اضافه کردن یک ردیف جدید به فاکتور
  const handleAddItemRow = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (invoiceType === 'Sale' && !canSell) {
      alert('محدودیت دسترسی: فقط فروشندگان و مدیران فاکتور فروش مجاز به افزدن کالا می‌باشند.');
      return;
    }
    
    let dbId = '';
    let itemTitle = '';
    let itemUnit = 'عدد';

    if (currentItemType === 'Product') {
      if (!currentProductId) return;
      const originalProduct = products.find(p => p.id === currentProductId);
      if (!originalProduct) return;
      
      // چک کردن تکراری بودن آیتم در جدول بالایی
      if (selectedItems.some(row => row.item_id === currentProductId && row.type === 'Product')) {
        alert('این کالا قبلا به فاکتور اضافه شده است. لطفا تعداد آن را در جدول ویرایش کنید.');
        return;
      }

      // چک کردن موجودی فقط در حالت پیش‌فروش کالا
      if (invoiceType === 'Sale' && originalProduct.stock_quantity < currentQty) {
        alert(`هشدار: موجودی انبار کالا کافی نیست (${originalProduct.stock_quantity} ${originalProduct.unit} مانده است)`);
      }

      dbId = originalProduct.id;
      itemTitle = originalProduct.title;
      itemUnit = originalProduct.unit;
    } else {
      if (!currentServiceId) return;
      const originalService = services.find(s => s.id === currentServiceId);
      if (!originalService) return;

      if (selectedItems.some(row => row.item_id === currentServiceId && row.type === 'Service')) {
        alert('این خدمت قبلا اضافه شده است.');
        return;
      }

      dbId = originalService.id;
      itemTitle = originalService.title;
      itemUnit = 'سرویس';
    }

    const newRow: SelectedItem = {
      id: `row_${Date.now()}`,
      type: currentItemType,
      item_id: dbId,
      title: itemTitle,
      quantity: currentQty,
      price: currentPrice,
      unit: itemUnit
    };

    setSelectedItems([...selectedItems, newRow]);
    
    // ریست فیلدهای پایین ردیف
    setCurrentProductId('');
    setCurrentServiceId('');
    setCurrentQty(1);
    setCurrentPrice(0);
  };

  // حذف ردیف از چیدمان فاکتور
  const handleRemoveRow = (rowId: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== rowId));
  };

  // ویرایش سریع تعداد سطر
  const handleQtyChangeInTable = (rowId: string, value: number) => {
    setSelectedItems(selectedItems.map(row => {
      if (row.id === rowId) {
        return { ...row, quantity: value };
      }
      return row;
    }));
  };

  // اضافه کردن مستقیم کالا یا خدمات کلیک شده از روی کاتالوگ کارت‌ها
  const handleAddCardItem = (item: any, type: 'Product' | 'Service') => {
    const dbId = item.id;
    const itemTitle = item.title;
    const itemUnit = type === 'Product' ? item.unit : 'سرویس';
    const itemPrice = type === 'Product' ? (invoiceType === 'Sale' ? item.sale_price : item.purchase_price) : item.price;

    // بررسی انبار در حالت پیش‌فروش کالا
    if (type === 'Product' && invoiceType === 'Sale' && item.stock_quantity <= 0) {
      alert(`هشدار: موجودی انبار کالا کافی نیست (موجودی فعلی: ۰ عدد)`);
    }

    const existingRowIdx = selectedItems.findIndex(row => row.item_id === dbId && row.type === type);
    if (existingRowIdx >= 0) {
      // بررسی انبار قبل افزایش تعداد
      if (type === 'Product' && invoiceType === 'Sale' && item.stock_quantity < selectedItems[existingRowIdx].quantity + 1) {
        alert(`هشدار: کالا در انبار به اتمام رسیده است.`);
      }
      const updated = [...selectedItems];
      updated[existingRowIdx] = {
        ...updated[existingRowIdx],
        quantity: updated[existingRowIdx].quantity + 1
      };
      setSelectedItems(updated);
    } else {
      const newRow: SelectedItem = {
        id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        item_id: dbId,
        title: itemTitle,
        quantity: 1,
        price: itemPrice,
        unit: itemUnit
      };
      setSelectedItems([...selectedItems, newRow]);
    }
  };
  const subtotal = selectedItems.reduce((sum, row) => sum + (row.price * row.quantity), 0);
  const discountAmount = Number(discount);
  const taxAmount = applyTax ? Math.round((subtotal - discountAmount) * 0.1) : 0; // ۱۰ درصد ارزش افزوده رسمی دفتری ایران
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  // تولید خودکار جدول اقساط بر اساس استانداردهای نرم‌افزارهای حسابداری ایرانی
  const handleGenerateInstallments = () => {
    let due = firstDueDate || '';
    if (!due) {
      // شبیه‌سازی تاریخ امروز شمسی جلالی
      const todayFa = new Date().toLocaleDateString('fa-IR-u-nu-latn'); // e.g. "1405/4/1"
      due = todayFa;
    }
    
    // پارس کردن تاریخ شمسی
    const parts = due.split('/');
    let y = parts[0] ? parseInt(parts[0]) : 1405;
    let m = parts[1] ? parseInt(parts[1]) : 4;
    let d = parts[2] ? parseInt(parts[2]) : 1;

    const count = installmentsCount || 1;
    const remaining = grandTotal - (advancePayment || 0);
    if (remaining <= 0) {
      alert('خطا: پیش‌پرداخت نباید بزرگتر یا برابر مبلغ کل فاکتور باشد.');
      return;
    }
    const amountPerInst = Math.round(remaining / count);

    const generated: Installment[] = [];
    for (let i = 0; i < count; i++) {
      let currentM = m + i;
      let currentY = y;
      while (currentM > 12) {
        currentM -= 12;
        currentY += 1;
      }
      const mStr = String(currentM).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${currentY}/${mStr}/${dStr}`;

      generated.push({
        id: `inst_temp_${Date.now()}_${i}`,
        invoice_id: '',
        due_date: dateStr,
        amount: amountPerInst,
        status: 'Unpaid',
        notes: `قسط شماره ${i + 1} از اصل تعهد`
      });
    }
    setInstallmentsList(generated);
  };

  // افزودن چک به جدول فاکتور
  const handleAddCheck = () => {
    if (!checkNumber) { alert('لطفا شماره چک صیادی را وارد نمایید.'); return; }
    if (!bankName) { alert('لطفا نام بانک یا موسسه مالی را معین کنید.'); return; }
    if (!checkDueDate) { alert('لطفا تاریخ سررسید مندرج روی برگ چک را وارد کنید.'); return; }
    if (checkAmount <= 0) { alert('مبلغ چک الزامی است.'); return; }

    const newCheck: CheckEntry = {
      id: `check_temp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      invoice_id: '',
      check_number: checkNumber,
      bank_name: bankName,
      branch_name: branchName,
      due_date: checkDueDate,
      amount: checkAmount,
      drawer_name: drawerName || 'مشتری صنف',
      sayad_id: sayadId,
      status: 'Pending',
      image: checkImage || undefined,
      notes: ''
    };

    setChecksList([...checksList, newCheck]);

    // بازنشانی فیلدها جهت دریافت برگ چک بعدی
    setCheckNumber('');
    setBankName('');
    setBranchName('');
    setCheckDueDate('');
    setCheckAmount(0);
    setDrawerName('');
    setSayadId('');
    setCheckImage('');
  };

  // آپلود برگ چک و تبدیل به فرمت Base64 ایمن جهت ذخیره مستقیم در SQLite
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم تصویر چک نباید بیشتر از ۲ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCheckImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ثبت فاکتور نهایی به انضمام ماژول اقساط و اسناد چک‌های دریافتی صیادی
  const handleRegisterInvoice = () => {
    if (invoiceType === 'Sale' && !canSell) {
      alert('خطای امنیتی فایروال: تنها حساب‌های کاربری فعال با نقش فروشندگی یا مدیریت سیستم مجاز به ثبت نهایی فاکتور فروش هستند.');
      return;
    }
    
    if (selectedItems.length === 0) {
      alert('لطفا حداقل یک ردیف کالا یا خدمت به جدول فاکتور اضافه کنید.');
      return;
    }

    if (paymentTerm === 'Installment' && installmentsList.length === 0) {
      alert('لطفا ابتدا اقدام به تولید جدول اقساط (بر اساس تعداد و پیش‌پرداخت) نمایید.');
      return;
    }

    if (paymentTerm === 'Check' && checksList.length === 0) {
      alert('لطفا مشخصات حداقل یک برگ چک دریافت صیادی را ثبت نمایید.');
      return;
    }

    const itemsPayload = selectedItems.map(row => ({
      item_id: row.item_id,
      item_type: row.type,
      quantity: row.quantity,
      price: row.price
    }));

    const person = persons.find(p => p.id === selectedPersonId) || persons[0];

    // پردازش وضعیت و نحوه تسویه بر اساس ترم پرداخت انتخابی کاربر
    let currentPayStatus: 'Paid' | 'Unpaid' | 'Partial' = paymentStatus;
    let currentPayMethod: 'Cash' | 'POS' | 'Mixed' = paymentMethod;

    if (paymentTerm === 'Installment') {
      currentPayStatus = 'Partial';
      currentPayMethod = 'Mixed';
    } else if (paymentTerm === 'Check') {
      currentPayStatus = 'Partial';
      currentPayMethod = 'Mixed';
    }

    // تولید پرداخت نقدی در صورت پیش‌پرداخت اقساط
    const paymentsPayload: Payment[] = [];
    if (paymentTerm === 'Installment' && advancePayment > 0) {
      paymentsPayload.push({
        id: `pay_${Date.now()}`,
        invoice_id: '',
        amount: advancePayment,
        payment_method: 'Cash',
        created_at: new Date().toISOString(),
        notes: 'پیش‌پرداخت نقدی/کارتخوان در ثبت فاکتور اقساطی آریا همراه'
      });
    }

    // ثبت فاکتور
    const savedInv = OfflineDatabase.createInvoice({
      person_id: selectedPersonId,
      type: invoiceType,
      total_amount: subtotal,
      discount: discountAmount,
      final_amount: grandTotal,
      payment_status: currentPayStatus,
      payment_method: currentPayMethod
    }, itemsPayload, paymentsPayload, installmentsList, checksList);

    // ارسال به صورت چاپی رسمی آ۴ مجاز
    setActiveInvoiceForPrint({
      invoice: savedInv,
      items: selectedItems,
      person
    });

    // پاکسازی کامل فرم پس از ثبت سند انبار و حسابداری برای فاکتور بعدی
    setSelectedItems([]);
    setDiscount(0);
    setApplyTax(false);
    setSelectedPersonId('general_customer');
    setPaymentStatus('Paid');
    setPaymentTerm('Cash');
    setAdvancePayment(0);
    setInstallmentsCount(3);
    setInstallmentsList([]);
    setChecksList([]);
    refreshData();
  };

  const formatToman = (val: number) => {
    return formatPrice(val);
  };

  const isSaleBlocked = invoiceType === 'Sale' && !canSell;

  return (
    <div className="p-6 h-[calc(100vh-64px)] overflow-y-auto" id="standard-invoice-wrapper">
      
      {isSaleBlocked && (
        <div className="mb-6 bg-red-50 border border-red-200/60 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xs animate-fade-in text-slate-800" id="sale-blocked-alert">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-xs text-red-900">عدم دسترسی ثبت فاکتور پیشرفته فروش (ویژه فروشندگان)</h4>
              <p className="text-[11px] text-red-600 leading-relaxed font-semibold">
                حساب کاربری فعال شما مجاز به ثبت کالای فروشگاهی یا ارائه سند نهایی فروش نیست. فاکتورهای از نوع خرید از تامین‌کننده همچنان برای شما مجاز است.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-red-100 text-red-700 px-2.5 py-1 rounded-lg font-sans font-bold">فایروال مغازه</span>
        </div>
      )}
      
      {/* فاکتور ساز پیشرفته */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="invoice-builder-layout">
        
        {/* ستون راست: تنظیمات پیش‌نیاز فاکتور فروشگاه */}
        <div className="space-y-6 xl:col-span-1" id="invoice-control-columns">
          
          {/* هدر اطلاعات مشتری و هویت سند */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5" id="customer-identity-card">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2 mb-4">
              <Users className="w-4.5 h-4.5 text-emerald-500" />
              هویت معین فاکتور (شخص و نوع سند)
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10.5px] text-slate-500 mb-1">نوع سند حسابداری:</label>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    id="doc-sale-type"
                    type="button"
                    onClick={() => { setInvoiceType('Sale'); }}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      invoiceType === 'Sale'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    فروش (خروج انبار کالا)
                  </button>
                  <button
                    id="doc-purchase-type"
                    type="button"
                    onClick={() => { setInvoiceType('Purchase'); }}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      invoiceType === 'Purchase'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    خرید از تامین‌کننده (ورود انبار)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] text-slate-500 mb-1">جستجو و انتخاب طرف حساب تجاری:</label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      className="w-full text-xs pr-8 pl-10 py-2 bg-slate-50 border border-slate-200 rounded-lg h-9 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      placeholder="جستجو با نام، شماره همراه، کدملی، آدرس..."
                      value={customerSearch}
                      onChange={e => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                    />
                    <Search className="absolute right-2.5 w-4 h-4 text-slate-400" />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearch('');
                          setSelectedPersonId('general_customer');
                        }}
                        className="absolute left-2.5 text-slate-400 hover:text-slate-600 text-[10px]"
                      >
                        پاک کردن
                      </button>
                    )}
                  </div>

                  {/* منوی لیست نتایج فیلتر شده */}
                  {isCustomerDropdownOpen && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto text-xs divide-y divide-slate-100">
                      {persons
                        .filter(p => invoiceType === 'Purchase' ? p.type === 'Supplier' : p.type === 'Customer' || p.id === 'general_customer')
                        .filter(p => {
                          const q = customerSearch.toLowerCase();
                          if (!q) return true;
                          return (
                            p.name.toLowerCase().includes(q) ||
                            p.phone.includes(q) ||
                            (p.national_code && p.national_code.includes(q)) ||
                            (p.economic_code && p.economic_code.includes(q)) ||
                            (p.address && p.address.toLowerCase().includes(q)) ||
                            (p.notes && p.notes.toLowerCase().includes(q))
                          );
                        })
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPersonId(p.id);
                              setCustomerSearch(p.id === 'general_customer' ? '' : p.name);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className={`p-2.5 hover:bg-slate-50 cursor-pointer transition flex justify-between items-center ${
                              selectedPersonId === p.id ? 'bg-emerald-50/50 font-bold text-emerald-700' : ''
                            }`}
                          >
                            <div>
                              <span className="block font-medium">{p.name || 'مشتری عمومی بدون حساب'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.phone !== '0' ? p.phone : 'بدون تلفن'}</span>
                            </div>
                            <span className="text-[10px] font-mono whitespace-nowrap">
                              تراز: {p.balance === 0 ? '۰' : p.balance > 0 ? `${p.balance.toLocaleString('fa-IR')} بدهکار` : `${Math.abs(p.balance).toLocaleString('fa-IR')} بستانکار`}
                            </span>
                          </div>
                        ))}
                      {persons.filter(p => invoiceType === 'Purchase' ? p.type === 'Supplier' : p.type === 'Customer' || p.id === 'general_customer').length === 0 && (
                        <div className="p-3 text-center text-slate-400 text-[11px]">هیچ فرد یا طرف حسابی در دیتابیس یافت نشد</div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* دکمه بستن در صورتی که دراپ داون باز باشد */}
                {isCustomerDropdownOpen && (
                  <div 
                    className="fixed inset-x-0 bottom-0 top-[20%] z-20" 
                    onClick={() => setIsCustomerDropdownOpen(false)}
                  ></div>
                )}

                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  فاکتور نوع خرید فقط مالکین تامین‌کننده (Supplier) و فروش شامل مشتریان را پوشش می‌دهد.
                </span>
                
                {/* نمایش تمام اطلاعات ثبت شده طرف حساب بصورت زنده */}
                {(() => {
                  const selectedPerson = persons.find(p => p.id === selectedPersonId);
                  if (!selectedPerson || selectedPerson.id === 'general_customer') return null;
                  return (
                    <div className="bg-slate-50/80 border border-slate-200/50 p-3.5 rounded-xl text-[10.5px] space-y-2.5 mt-3 text-slate-700 animate-fade-in" id="customer-profile-preview-card">
                      <div className="font-bold text-slate-800 text-xs border-b border-dashed border-slate-200 pb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          مشخصات ثبتی طرف حساب تجاری
                        </div>
                        <span className="text-[9px] bg-slate-200/60 text-slate-600 px-1.8 py-0.5 rounded-md font-mono">{selectedPerson.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <div>
                          <strong className="text-slate-400">طرف حساب: </strong>
                          <span className="font-bold text-slate-900">{selectedPerson.name}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">کد ملی/شناسه: </strong>
                          <span className="font-mono text-slate-800">{selectedPerson.national_code || 'ثبت نشده'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">کد اقتصادی: </strong>
                          <span className="font-mono text-slate-800">{selectedPerson.economic_code || 'ثبت نشده'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">تلفن همراه: </strong>
                          <span className="font-mono text-slate-800">{selectedPerson.phone !== '0' ? selectedPerson.phone : 'ثبت نشده'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">تلفن ثابت: </strong>
                          <span className="font-mono text-slate-800">{selectedPerson.landline || 'ثبت نشده'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">کد پستی: </strong>
                          <span className="font-mono text-slate-800">{selectedPerson.postal_code || 'ثبت نشده'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">سهم مالکین: </strong>
                          <span className="font-mono text-emerald-600 font-bold">{selectedPerson.share_percentage !== undefined ? `${selectedPerson.share_percentage}٪` : 'ثبت نشده'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">نوع همکاری: </strong>
                          <span className="text-slate-800">
                            {selectedPerson.type === 'Customer' ? 'مشتری صنف' : selectedPerson.type === 'Supplier' ? 'تامین کننده' : 'همکار'}
                          </span>
                        </div>
                      </div>
                      {selectedPerson.email && (
                        <div className="border-t border-slate-200/30 pt-1.5 flex items-center gap-1">
                          <strong className="text-slate-400">پست الکترونیک: </strong>
                          <span className="font-mono text-slate-600">{selectedPerson.email}</span>
                        </div>
                      )}
                      {selectedPerson.address && (
                        <div className="border-t border-slate-200/30 pt-1.5 flex items-center gap-1">
                          <strong className="text-slate-400">نشانی پستی: </strong>
                          <span className="text-slate-800">{selectedPerson.address}</span>
                        </div>
                      )}
                      {selectedPerson.notes && (
                        <div className="border-t border-slate-200/30 pt-1.5 flex items-start gap-1">
                          <strong className="text-slate-400">یادداشت اداری: </strong>
                          <span className="text-slate-500 italic">{selectedPerson.notes}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* پنل شرایط تسویه و وضعیت دریافتی نهایی */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5" id="billing-settlements-card">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2 mb-4">
              <Receipt className="w-4.5 h-4.5 text-emerald-500" />
              شرایط پرداخت و وضعیت معین فاکتور
            </h3>

            {/* سویچر نوع معامله به سبک پیشرفته دفتری ایران */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-center gap-1 mb-4 select-none">
              <button
                type="button"
                onClick={() => setPaymentTerm('Cash')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition ${paymentTerm === 'Cash' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                نقدی / فوری
              </button>
              <button
                type="button"
                onClick={() => setPaymentTerm('Installment')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition ${paymentTerm === 'Installment' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                فروش اقساطی
              </button>
              <button
                type="button"
                onClick={() => setPaymentTerm('Check')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition ${paymentTerm === 'Check' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                دریافت چک صیادی
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {paymentTerm === 'Cash' && (
                <div className="space-y-3.5 animate-fade-in">
                  <div>
                    <label className="block text-[10.5px] text-slate-500 mb-1">وضعیت پرداخت فاکتور:</label>
                    <select
                      id="invoice-payment-status"
                      value={paymentStatus}
                      onChange={e => setPaymentStatus(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg h-9 focus:outline-none"
                    >
                      <option value="Paid">پرداخت کامل فاکتور (نقدی/کارتخوان فوری)</option>
                      <option value="Unpaid">پرداخت انجام نشده (نسیه طویله‌المدت)</option>
                      <option value="Partial">علی‌الحساب (درصدی نسیه و نقد)</option>
                    </select>
                    <span className="text-[9.5px] text-amber-500 mt-1 block">
                      * با انتخاب گزینه نسیه یا علی‌الحساب مانده کل فاکتور بلافاصله به معین بدهکاری شخص پیوست خواهد شد.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-500 mb-1">مکانیزم دریافت سرمایه:</label>
                    <select
                      id="invoice-payment-method"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg h-9 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="POS">کارتخوان سیستمی فروشگاه (POS)</option>
                      <option value="Cash">صندوق نقدی مغازه (Cash)</option>
                      <option value="Mixed">ترکیبی (واریز بانکی / چک تضمین)</option>
                    </select>
                  </div>
                </div>
              )}

              {paymentTerm === 'Installment' && (
                <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/60 animate-fade-in">
                  <span className="font-extrabold text-[11px] text-emerald-800 block">پیکربندی هوشمند سند اقساط</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">پیش‌پرداخت اولیه:</label>
                      <input
                        type="number"
                        value={advancePayment}
                        onChange={e => setAdvancePayment(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">تعداد اقساط:</label>
                      <input
                        type="number"
                        value={installmentsCount}
                        onChange={e => setInstallmentsCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">فاصله اقساط:</label>
                      <select
                        value={installmentInterval}
                        onChange={e => setInstallmentInterval(parseInt(e.target.value))}
                        className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-[11px]"
                      >
                        <option value="30">ماهانه (۳۰ روزه)</option>
                        <option value="60">دو ماهه (۶۰ روزه)</option>
                        <option value="90">سه ماهه (۹۰ روزه)</option>
                        <option value="7">هفتگی (۷ روزه)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">سررسید قسط اول:</label>
                      <input
                        type="text"
                        placeholder="مثال: ۱۴۰۵/۰۵/۰۱"
                        value={firstDueDate}
                        onChange={e => setFirstDueDate(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateInstallments}
                    className="w-full py-1.8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10.5px] transition shadow-xs"
                  >
                    محاسبه و تولید خودکار بازپرداخت‌ها
                  </button>

                  {installmentsList.length > 0 && (
                    <div className="pt-2 border-t border-emerald-100 space-y-1.5 max-h-40 overflow-y-auto">
                      <span className="block text-[9.5px] font-bold text-slate-600 mb-1">سررسید اقساط تولید شده:</span>
                      {installmentsList.map((inst, idx) => (
                        <div key={idx} className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center justify-between text-[10px] shadow-2xs">
                          <span className="font-bold text-slate-600">قسط {idx + 1}</span>
                          <span className="font-mono text-slate-800">{inst.due_date}</span>
                          <span className="font-bold text-emerald-700 font-mono">{formatToman(inst.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {paymentTerm === 'Check' && (
                <div className="space-y-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-100/60 animate-fade-in">
                  <span className="font-extrabold text-[11px] text-amber-800 block">شناسنامه برگ چک صیادی دریافتی</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9.5px] text-slate-500 mb-0.5">شماره چک صیادی:</label>
                      <input
                        type="text"
                        placeholder="سریال چک"
                        value={checkNumber}
                        onChange={e => setCheckNumber(e.target.value)}
                        className="w-full text-[11px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-slate-500 mb-0.5">شناسه صیادی (۱۶ رقمی):</label>
                      <input
                        type="text"
                        placeholder="شناسه ۱۶ رقمی"
                        value={sayadId}
                        onChange={e => setSayadId(e.target.value)}
                        className="w-full text-[11px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9.5px] text-slate-500 mb-0.5">بانک صادر کننده:</label>
                      <input
                        type="text"
                        placeholder="ملی، صادرات..."
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        className="w-full text-[11px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-slate-500 mb-0.5">کد/نام شعبه:</label>
                      <input
                        type="text"
                        placeholder="شعبه مرکزی"
                        value={branchName}
                        onChange={e => setBranchName(e.target.value)}
                        className="w-full text-[11px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9.5px] text-slate-500 mb-0.5">تاریخ سررسید چک:</label>
                      <input
                        type="text"
                        placeholder="۱۴۰۵/۰۹/۳۰"
                        value={checkDueDate}
                        onChange={e => setCheckDueDate(e.target.value)}
                        className="w-full text-[11px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-slate-500 mb-0.5">صاحب چک (متعهد):</label>
                      <input
                        type="text"
                        placeholder="نام صادر کننده"
                        value={drawerName}
                        onChange={e => setDrawerName(e.target.value)}
                        className="w-full text-[11px] px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="block text-[9.5px] text-slate-500">مبلغ برگه چک:</label>
                      <button
                        type="button"
                        onClick={() => setCheckAmount(grandTotal)}
                        className="text-[8px] bg-amber-100 hover:bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold"
                      >
                        کل مبلغ فاکتور
                      </button>
                    </div>
                    <input
                      type="number"
                      value={checkAmount}
                      onChange={e => setCheckAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-amber-800 font-mono font-bold"
                    />
                  </div>

                  {/* آپلود تصویر چک با FileReader */}
                  <div>
                    <label className="block text-[9.5px] text-slate-500 mb-1">بارگذاری اسکن/تصویر برگ چک:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-[10px] text-slate-500 file:mr-0 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer w-full"
                    />
                    {checkImage && (
                      <div className="mt-2.5 relative inline-block">
                        <img src={checkImage} alt="اسکن برگ چک صیاد" className="w-24 h-11 object-cover rounded-lg border border-amber-200 shadow-xs" />
                        <button
                          type="button"
                          onClick={() => setCheckImage('')}
                          className="absolute -top-1.5 -left-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold shadow-sm"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCheck}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-[10.5px] transition shadow-xs"
                  >
                    ثبت و افزودن چک به لیست فاکتور
                  </button>

                  {checksList.length > 0 && (
                    <div className="pt-2 border-t border-amber-100 space-y-1.5 max-h-40 overflow-y-auto">
                      <span className="block text-[9.5px] font-bold text-slate-600">لیست چک‌های دریافتی:</span>
                      {checksList.map((chk, idx) => (
                        <div key={idx} className="bg-white p-2 rounded-lg border border-amber-200 flex items-center justify-between text-[10px] gap-2">
                          <div className="truncate flex-1">
                            <span className="font-bold text-amber-800 block">بانک {chk.bank_name}</span>
                            <span className="block font-mono text-slate-400 text-[8px] truncate">سریال: {chk.check_number}</span>
                          </div>
                          <span className="font-mono text-slate-700 text-[9px]">{chk.due_date}</span>
                          <span className="font-bold text-slate-900 font-mono whitespace-nowrap">{formatToman(chk.amount)}</span>
                          <button
                            type="button"
                            onClick={() => setChecksList(checksList.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold px-1.5"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[11px] text-slate-700 block">احتساب مالیات بر ارزش افزوده (۱۰٪):</span>
                  <span className="text-[9.5px] text-slate-400">اعمال بر کالاها به نرخ مصوب ارزش افزوده</span>
                </div>
                <input
                  id="invoice-apply-tax"
                  type="checkbox"
                  checked={applyTax}
                  onChange={e => setApplyTax(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

        </div>

        {/* ستون چپ: ردیف کالا و خدمات و جدول اصلی سند فاکتور صادر شده */}
        <div className="xl:col-span-2 space-y-6" id="invoice-details-billing-table">
          
          {/* بخش کاتالوگ کارت‌محور کالا و خدمات با جستجوی سریع */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4" id="line-items-catalog">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-xs text-slate-800">کاتالوگ هوشمند کالا و خدمات</h4>
                <p className="text-[10px] text-slate-400 mt-1">جهت درج کالا یا خدمات در پیش‌فاکتور، روی کارت مربوطه زیر کلیک نمایید.</p>
              </div>
              
              {/* فیلترهای بالا */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-bold self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCatalogFilter('All')}
                  className={`px-3 py-1.5 rounded-lg transition ${catalogFilter === 'All' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  همه اقلام ({products.length + services.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('Products')}
                  className={`px-3 py-1.5 rounded-lg transition ${catalogFilter === 'Products' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  کالاها ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('Services')}
                  className={`px-3 py-1.5 rounded-lg transition ${catalogFilter === 'Services' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  خدمات ({services.length})
                </button>
              </div>
            </div>

            {/* کادر جستجوی کالا و خدمات */}
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو کالا و خدمات بر اساس نام، بارکد، شرح یا قیمت..."
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                className="w-full text-xs pr-8.5 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl h-9.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            </div>

            {/* گرید کارت‌های محصولات و خدمات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-0.5" id="catalog-cards-grid">
              {/* بخش کالاها */}
              {(catalogFilter === 'All' || catalogFilter === 'Products') &&
                products
                  .filter(p => !itemSearch || p.title.toLowerCase().includes(itemSearch.toLowerCase()) || p.barcode.includes(itemSearch))
                  .map(p => {
                    const rowQty = selectedItems.find(item => item.item_id === p.id && item.type === 'Product')?.quantity || 0;
                    // انتخاب رنگ پس‌زمینه نازک کالا از تنظیمات پوسته یا پیش‌فرض
                    const cardColor = appSettings.productCardBg || '#f4fbf7';
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleAddCardItem(p, 'Product')}
                        className="relative p-3.5 rounded-xl border border-dashed border-slate-200/60 hover:border-emerald-500/50 hover:shadow-sm cursor-pointer transition select-none flex flex-col justify-between group"
                        style={{ backgroundColor: cardColor }}
                      >
                        {rowQty > 0 && (
                          <span className="absolute top-2 left-2 bg-emerald-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            {rowQty} {p.unit || 'عدد'}
                          </span>
                        )}
                        <div className="space-y-1.5">
                          <span className="text-[9px] bg-emerald-600/10 text-emerald-700 px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            کالا ({p.unit || 'عدد'})
                          </span>
                          <h5 className="font-bold text-slate-800 text-[11px] group-hover:text-emerald-700 transition leading-tight line-clamp-2">
                            {p.title}
                          </h5>
                        </div>
                        <div className="mt-4 pt-2 border-t border-slate-200/40 flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">
                            موجودی: <strong className={`font-mono ${p.stock_quantity <= 0 ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{p.stock_quantity}</strong>
                          </span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {formatToman(invoiceType === 'Sale' ? p.sale_price : p.purchase_price)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

              {/* بخش خدمات */}
              {(catalogFilter === 'All' || catalogFilter === 'Services') &&
                services
                  .filter(s => !itemSearch || s.title.toLowerCase().includes(itemSearch.toLowerCase()))
                  .map(s => {
                    const rowQty = selectedItems.find(item => item.item_id === s.id && item.type === 'Service')?.quantity || 0;
                    // انتخاب رنگ پس‌زمینه نازک خدمت از تنظیمات پوسته یا پیش‌فرض
                    const cardColor = appSettings.serviceCardBg || '#fcf5ff';
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleAddCardItem(s, 'Service')}
                        className="relative p-3.5 rounded-xl border border-dashed border-slate-200/60 hover:border-purple-500/50 hover:shadow-sm cursor-pointer transition select-none flex flex-col justify-between group"
                        style={{ backgroundColor: cardColor }}
                      >
                        {rowQty > 0 && (
                          <span className="absolute top-2 left-2 bg-purple-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            {rowQty} ردیف
                          </span>
                        )}
                        <div className="space-y-1.5">
                          <span className="text-[9px] bg-purple-600/10 text-purple-700 px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            بخش خدمات (دستمزد)
                          </span>
                          <h5 className="font-bold text-slate-800 text-[11px] group-hover:text-purple-700 transition leading-tight line-clamp-2">
                            {s.title}
                          </h5>
                        </div>
                        <div className="mt-4 pt-2 border-t border-slate-200/40 flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-bold">دستمزد خدمت</span>
                          <span className="font-mono text-purple-700 font-bold">{formatToman(s.price)}</span>
                        </div>
                      </div>
                    );
                  })}
            </div>

            {/* دراپ‌داون فرم تفضیلی ثبت دستی اقلام متفرقه */}
            <details className="group border border-slate-100 rounded-xl bg-slate-50 overflow-hidden" id="manual-line-adder">
              <summary className="flex justify-between items-center p-3.5 cursor-pointer font-bold text-[11px] text-slate-600 bg-slate-100/60 hover:bg-slate-100 transition list-none select-none">
                <span className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-500" />
                  در لست فوق کالا/خدمت نیست؟ باز کردن فرم تفضیلی ثبت موقت دستی با قیمت و مشخصات سفارشی
                </span>
                <span className="transition duration-300 group-open:-rotate-180">▼</span>
              </summary>
              <div className="p-4 border-t border-slate-200/50 space-y-4 text-xs bg-white">
                <div className="flex flex-wrap items-end gap-3" id="fast-inputs-wrapper">
                  <div className="w-28 text-xs">
                    <label className="block text-[10px] text-slate-400 mb-1">نوع سطر فاکتور:</label>
                    <select
                      id="item-type-toggle"
                      value={currentItemType}
                      onChange={e => {
                        setCurrentItemType(e.target.value as any);
                        setCurrentProductId('');
                        setCurrentServiceId('');
                      }}
                      className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg h-9"
                    >
                      <option value="Product">کالا (انبار)</option>
                      <option value="Service">خدمات (دستمزد)</option>
                    </select>
                  </div>

                  {currentItemType === 'Product' ? (
                    <div className="flex-1 min-w-[150px] text-xs">
                      <label className="block text-[10px] text-slate-400 mb-1">انتخاب کالا عمومی:</label>
                      <select
                        id="invoice-product-picker"
                        value={currentProductId}
                        onChange={e => setCurrentProductId(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg h-9"
                      >
                        <option value="">-- کالا را گزینش کنید --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} (موجودی: {p.stock_quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-[150px] text-xs">
                      <label className="block text-[10px] text-slate-400 mb-1">انتخاب سرویس:</label>
                      <select
                        id="invoice-service-picker"
                        value={currentServiceId}
                        onChange={e => setCurrentServiceId(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg h-9"
                      >
                        <option value="">-- سرویس را گزینش کنید --</option>
                        {services.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({formatToman(s.price)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="w-20 text-xs text-left">
                    <label className="block text-[10px] text-slate-400 mb-1 text-right">مقدار / تعداد:</label>
                    <input
                      id="invoice-item-qty"
                      type="number"
                      min="1"
                      value={currentQty}
                      onChange={e => setCurrentQty(Number(e.target.value))}
                      className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-left"
                    />
                  </div>

                  <div className="w-28 text-xs text-left">
                    <label className="block text-[10px] text-slate-400 mb-1 text-right">قیمت واحد (تومان):</label>
                    <input
                      id="invoice-item-custom-price"
                      type="number"
                      value={currentPrice || ''}
                      onChange={e => setCurrentPrice(Number(e.target.value))}
                      className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-left"
                      placeholder="قیمت توافقی واحد"
                    />
                  </div>

                  <button
                    id="add-item-row-btn"
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 h-9 rounded-lg text-xs flex items-center gap-1 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    درج در جدول
                  </button>
                </div>
              </div>
            </details>
          </div>

          {/* جدول اقلام درج شده بدنه فاکتور فیزیکی */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5" id="billing-items-table-card">
            <h4 className="font-bold text-xs text-slate-800 mb-3.5">پیش فاکتور آماده تایید نهایی</h4>
            
            {selectedItems.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-100 flex flex-col justify-center items-center text-slate-400">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-1.5" />
                <span className="text-[11px] font-medium">سطری جهت ایجاد فاکتور وجود ندارد. از کنترلر بالایی کالا یا خدمات درج کنید.</span>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs" id="items-table-wrapper">
                <table className="w-full border-collapse" id="invoice-items-table-details">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-right bg-slate-50/50">
                      <th className="py-2.5 px-3">سطر</th>
                      <th className="py-2.5 px-3">عنوان کالا یا خدمات</th>
                      <th className="py-2.5 px-3">نوع</th>
                      <th className="py-2.5 px-3 text-left">تعداد / مقدار</th>
                      <th className="py-2.5 px-3 text-left">قیمت واحد (T)</th>
                      <th className="py-2.5 px-3 text-left">مبلغ نهایی (T)</th>
                      <th className="py-2.5 px-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, index) => {
                      const matchingProd = item.type === 'Product' ? products.find(p => p.id === item.item_id) : null;
                      return (
                        <tr key={item.id} id={`row-item-${item.id}`} className="border-b border-slate-50 text-slate-800">
                          <td className="py-3 px-3 font-mono">{index + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold block">{item.title}</span>
                            {matchingProd && (
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-normal mt-0.5" dir="rtl">
                                {matchingProd.barcode && (
                                  <span className="font-mono bg-slate-50 border border-slate-100 px-1 rounded">بارکد: {matchingProd.barcode}</span>
                                )}
                                {matchingProd.unit && (
                                  <span className="bg-slate-50 border border-slate-100 px-1 rounded">واحد: {matchingProd.unit}</span>
                                )}
                                <span className="bg-slate-50 border border-slate-100 px-1 rounded">شناسه: {matchingProd.id}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[10px]">
                            {item.type === 'Product' ? 'کالا فیزیکی' : 'خدمات غیرفیزیکی'}
                          </td>
                          <td className="py-3 px-3 text-left font-mono">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleQtyChangeInTable(item.id, Number(e.target.value))}
                              className="w-12 text-center bg-slate-100/60 rounded px-1 text-xs py-0.5"
                            />
                          </td>
                          <td className="py-3 px-3 text-left font-mono text-slate-600">{item.price.toLocaleString('fa-IR')}</td>
                          <td className="py-3 px-3 text-left font-bold font-mono text-slate-800">{(item.price * item.quantity).toLocaleString('fa-IR')}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              id={`del-row-${item.id}`}
                              onClick={() => handleRemoveRow(item.id)}
                              className="text-slate-300 hover:text-red-500 rounded p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* بخش تسویه حساب فاکتور نهایی */}
            {selectedItems.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 text-xs flex flex-col md:flex-row justify-between items-start gap-4">
                
                {/* بخش تخفیفات */}
                <div className="w-full md:w-56 space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">کسر تخفیف فاکتور (تومان):</label>
                    <input
                      id="invoice-manual-discount"
                      type="number"
                      value={discount || ''}
                      onChange={e => setDiscount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-left"
                      placeholder="تخفیف کلی"
                    />
                  </div>
                </div>

                {/* محاسبات حسابداری */}
                <div className="w-full md:w-80 space-y-2 border-r border-slate-100 pr-5" id="total-sums">
                  <div className="flex justify-between text-slate-500">
                    <span>جمع اقلام پیش فاکتور:</span>
                    <span className="font-mono">{subtotal.toLocaleString('fa-IR')} تومان</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>تخفیف دستی کسر شده:</span>
                    <span className="font-mono font-bold">-{discountAmount.toLocaleString('fa-IR')} تومان</span>
                  </div>
                  {applyTax && (
                    <div className="flex justify-between text-indigo-600">
                      <span>مالیات ارزش افزوده (۱۰٪):</span>
                      <span className="font-mono">+{taxAmount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-100 font-extrabold text-slate-900 text-sm">
                    <span>مبلغ کل قابل تسویه:</span>
                    <span className="text-emerald-600 text-base font-mono">{grandTotal.toLocaleString('fa-IR')} تومان</span>
                  </div>

                  <button
                    id="submit-advanced-invoice-btn"
                    disabled={isSaleBlocked}
                    onClick={handleRegisterInvoice}
                    className="w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-97 cursor-pointer text-xs font-sans"
                  >
                    <CheckCircle className="w-4 h-4" />
                     {isSaleBlocked ? 'غیرمجاز برای این سطح دسترسی' : 'ثبت نهایی و صدور سند چاپی رسمی'}
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>

      {/* بخش پیش‌نمایش چاپی فاکتور رسمی (A4 & A5 Responsive and BW Optimized Print Layout Simulation) */}
      {activeInvoiceForPrint && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 overflow-y-auto p-4 flex justify-center items-start animate-fade-in no-print" id="print-overlay">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl p-6 shadow-2xl space-y-6 mt-6 md:mb-10 text-right" id="print-container">
            
            {/* دکمه‌های کنترلی بالای فاکتور */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 text-xs gap-3">
              <span className="text-[11px] font-black text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                 چاپ و پیش‌نمایش سند صورتحساب
              </span>
              <div className="flex flex-wrap items-center gap-2">
                
                {/* ابعاد کاغذ */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${paperSize === 'A4' ? 'bg-emerald-600 text-white font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    استاندارد A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('A5')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${paperSize === 'A5' ? 'bg-emerald-600 text-white font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    قطع مینی A5
                  </button>
                </div>

                {/* تاگل سیاه و سفید */}
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-950 border border-slate-800 px-3 py-1.8 rounded-xl text-slate-300 hover:text-white select-none text-[10.5px]">
                  <input
                    type="checkbox"
                    checked={isBW}
                    onChange={e => setIsBW(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span>چاپ سیاه و سفید (تک‌رنگ)</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const printerText = appSettings.defaultPrinter ? `چاپگر ${appSettings.defaultPrinter}` : 'چاپگر پیش‌فرض سیستم';
                    const paperText = paperSize === 'A4' ? 'کاغذ A4' : paperSize === 'A5' ? 'کاغذ A5' : 'فیش ۸۰ میلی‌متری';
                    alert(`سند مالی فاکتور #${activeInvoiceForPrint.invoice_number} با موفقیت صادر گردید.\nمستند چاپی با قطع ${paperText} به صف صف‌آرایی دستگاه ${printerText} ارسال شد.`);
                    window.print();
                  }}
                  className="py-1.8 px-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 font-extrabold flex items-center gap-1.5 transition cursor-pointer text-[10.5px]"
                >
                  <Printer className="w-4 h-4" />
                  چاپ فیزیکی فاکتور (Ctrl+P)
                </button>
                
                <button
                  onClick={() => setActiveInvoiceForPrint(null)}
                  className="py-1.8 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-[10.5px]"
                >
                  انصراف
                </button>

              </div>
            </div>

            {/* برگ پیش‌نمایش چاپی فاکتور تجاری */}
            <div className="overflow-x-auto p-1 py-4 bg-slate-950/40 rounded-2xl flex justify-center">
              <div 
                className={`bg-white text-black shadow-2xl transition-all duration-300 relative select-text text-right print-sheet border ${
                  paperSize === 'A5' 
                    ? 'w-[148mm] min-h-[210mm] p-4 text-[10px] space-y-3' 
                    : 'w-[210mm] min-h-[297mm] p-6 md:p-10 space-y-6'
                }`}
                style={{ 
                  fontFamily: 'Vazirmatn, system-ui, sans-serif',
                  borderWidth: isBW ? '1px' : `${templateDesign.lineWidth}px`,
                  borderColor: isBW ? '#000000' : templateDesign.borderColor,
                  borderStyle: isBW ? 'solid' : templateDesign.borderStyle,
                  lineHeight: '1.5'
                }}
                id="printable-paper-view"
              >
                {/* طرح فانتزی و اشکال برگردان اریب بردی پس‌زمینه فاکتور */}
                <InvoiceShapes primaryColor={templateDesign.primaryColor} styleName={templateDesign.shapeStyle} isBlackAndWhite={isBW} />

                <div className="relative z-10 space-y-3">
                  {/* هدر فاکتور */}
                  <div className="border-b border-black pb-2.5 mb-2 h-auto" id="print-sec-header">
                    <div className="flex justify-between items-center">
                      
                      {/* سمت راست هدر: لوگوی فروشگاه */}
                      <div>
                        {appSettings.storeLogo ? (
                          <div className="flex items-center gap-2">
                            <img src={appSettings.storeLogo} alt="Store Logo" className="w-12 h-12 object-contain ml-1 p-0.5 border border-slate-200 rounded-lg bg-white" />
                            <div>
                              <h4 className="font-extrabold text-[12px] text-black leading-tight">{appSettings.storeName}</h4>
                              <span className="text-[8px] text-slate-600 block leading-tight font-sans">فروشگاه مجهز به سیستم آفلاین</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-8 rounded-lg bg-black text-white font-extrabold text-xs flex items-center justify-center">
                              آریا
                            </div>
                            <div>
                              <h4 className="font-black text-[11px] text-black leading-none">{appSettings.storeName}</h4>
                              <span className="text-[7.5px] text-slate-500 font-mono">ERP LOCAL CLIENT</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* وسط هدر: عنوان فاکتور */}
                      <div className="text-center">
                        <h1 className="font-black text-[13px] md:text-sm tracking-tight px-3 py-1 rounded" style={{ color: isBW ? '#000000' : templateDesign.primaryColor }}>
                          {templateDesign.customInvoiceTitle || 'صورتحساب معامله و خریدهای تجاری'}
                        </h1>
                        <span className="inline-block mt-0.5 border border-slate-300 text-slate-700 text-[8.5px] font-black px-2 py-0.5 rounded-full">
                          {activeInvoiceForPrint.invoice.payment_status === 'Paid' ? 'تسویه نقدی کامل' : activeInvoiceForPrint.invoice.payment_status === 'Unpaid' ? 'حساب نسیه تجاری' : 'پرداخت علی‌الحساب'}
                        </span>
                      </div>

                      {/* سمت چپ هدر: اطلاعات سند */}
                      <div className="text-left text-[9.5px] text-slate-700 font-mono space-y-0.5 leading-tight select-none">
                        <div>شماره فاکتور: <strong className="text-black font-extrabold font-sans text-xs">{activeInvoiceForPrint.invoice.invoice_number}</strong></div>
                        <div>تاریخ معامله: <span>{new Date(activeInvoiceForPrint.invoice.created_at).toLocaleDateString('fa-IR')}</span></div>
                      </div>

                    </div>
                  </div>

                  {/* سکشن متعاملین (خریدار و فروشنده فوق فشرده جدید بر اساس درخواست مستقیم کاربر) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="print-sec-entities">
                    {/* صادر کننده */}
                    <div className="border border-black rounded-xl p-2.5 bg-slate-50/60 leading-relaxed text-[10.5px]">
                      <h4 className="font-black text-[10.5px] border-b border-black pb-0.5 mb-1 text-black">
                        مشخصات صادرکننده (فروشگاه)
                      </h4>
                      <div><strong>نام فروشگاه:</strong> {appSettings.storeName || 'حسابداری فروشگاهی آریا'}</div>
                      {appSettings.storeEconomicCode && <div><strong>کد اقتصادی:</strong> <span className="font-mono">{appSettings.storeEconomicCode}</span></div>}
                    </div>

                    {/* خریدار */}
                    <div className="border border-black rounded-xl p-2.5 bg-slate-50/60 leading-relaxed text-[10.5px]">
                      <h4 className="font-black text-[10.5px] border-b border-black pb-0.5 mb-1 text-black">
                        مشخصات خریدار / کارفرما
                      </h4>
                      <div><strong>نام طرف حساب:</strong> {activeInvoiceForPrint.person.name}</div>
                      {activeInvoiceForPrint.person.national_code && <div><strong>کد ملی / شناسه:</strong> <span className="font-mono">{activeInvoiceForPrint.person.national_code}</span></div>}
                    </div>
                  </div>

                  {/* جدول اقلام فاکتور با ردیف عمودی و بدون بارکد و عرض فشرده */}
                  <div className="border border-black rounded-xl overflow-hidden" id="print-sec-table">
                    <table className="w-full text-right border-collapse text-[10px]">
                      <thead>
                        <tr className="border-b border-black text-black select-none h-8 font-black" style={{ backgroundColor: isBW ? '#f1f5f9' : templateDesign.secondaryColor }}>
                          <th className="p-1 px-1.5 border-l border-black text-center w-5" style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}>ردیف</th>
                          <th className="p-2 border-l border-black text-right">نام محصول یا خدمات</th>
                          <th className="p-1.5 border-l border-black text-center w-12">واحد</th>
                          <th className="p-1.5 border-l border-black text-left w-12">تعداد</th>
                          <th className="p-2 border-l border-black text-left w-20">فی واحد (T)</th>
                          <th className="p-2 text-left w-24">مبلغ نهایی (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {activeInvoiceForPrint.items.map((item, index) => {
                          const matchingProd = item.item_type === 'Product' ? products.find(p => p.id === item.item_id) : null;
                          const hasManyItems = activeInvoiceForPrint.items.length > 5;
                          const rowPaddingClass = hasManyItems ? 'p-1 px-1.5 text-[9px]' : 'p-2 text-[10.5px]';
                          return (
                            <tr key={item.id || index} className="h-7.5 hover:bg-slate-50/50">
                              {/* متن ردیف عمودی جهت اشغال حداقل عرض ممکن به پیشنهاد مستقیم کاربر */}
                              <td className="p-1 border-l border-black text-center font-mono text-[9px] font-bold" style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', maxWidth: '20px' }}>
                                {index + 1}
                              </td>
                              <td className={`${rowPaddingClass} border-l border-black font-extrabold text-black`}>
                                <div className="flex flex-col">
                                  <span>{item.title}</span>
                                  {matchingProd && (
                                    <div className="flex items-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5" dir="rtl">
                                      {matchingProd.barcode && (
                                        <span className="font-mono bg-slate-100 border border-slate-200 px-1 rounded text-[8px]">بارکد: {matchingProd.barcode}</span>
                                      )}
                                      {matchingProd.unit && (
                                        <span className="bg-slate-100 border border-slate-200 px-1 rounded text-[8px]">دسته‌بندی: {matchingProd.unit}</span>
                                      )}
                                      <span className="bg-slate-100 border border-slate-200 px-1 rounded text-[8px]">شناسه: {matchingProd.id}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className={`${rowPaddingClass} border-l border-black text-center text-slate-700`}>{item.unit || 'عدد'}</td>
                              <td className={`${rowPaddingClass} border-l border-black text-left font-mono`}>{item.quantity}</td>
                              <td className={`${rowPaddingClass} border-l border-black text-left font-mono`}>{item.price.toLocaleString('fa-IR')}</td>
                              <td className={`${rowPaddingClass} text-left font-black font-mono`}>{(item.price * item.quantity).toLocaleString('fa-IR')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* حسابداری مالی */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3" id="print-sec-financial">
                    <div className="md:col-span-7 border border-black p-2.5 rounded-xl bg-slate-50/20 text-right leading-normal text-[9.5px]">
                      <span className="font-bold text-black block text-[10.5px]">شرایط و پی‌نویس معامله:</span>
                      {templateDesign.widgets.showTermsAndFooterText && templateDesign.customTermsNote ? (
                        <p className="text-slate-600 leading-relaxed text-justify italic">
                          {templateDesign.customTermsNote}
                        </p>
                      ) : (
                        <p className="text-slate-500 italic">مبنای محاسبه تراز مالی کادر جاری، با امضای متعاملین تایید نهایی می‌شود.</p>
                      )}
                    </div>

                    <div className="md:col-span-5 border border-black py-2 px-3 rounded-xl bg-slate-50/65 leading-relaxed text-[10.5px]">
                      <div className="flex justify-between items-center text-slate-800">
                        <span>جمع کل خرید:</span>
                        <span className="font-mono font-bold">{(activeInvoiceForPrint.invoice.total_amount).toLocaleString('fa-IR')} تومان</span>
                      </div>
                      <div className="flex justify-between items-center text-red-700">
                        <span>کسر تخفیف دستی:</span>
                        <span className="font-mono font-bold">-{activeInvoiceForPrint.invoice.discount.toLocaleString('fa-IR')} تومان</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-black font-black text-black" style={{ color: isBW ? '#000000' : templateDesign.primaryColor }}>
                        <span>مبلغ نهایی معامله:</span>
                        <span className="font-mono font-black text-[11px]">{activeInvoiceForPrint.invoice.final_amount.toLocaleString('fa-IR')} تومان</span>
                      </div>
                    </div>
                  </div>

                  {/* فریم امضاء و پای فاکتور */}
                  {templateDesign.widgets.showSignatureBoxes && (
                    <div className="grid grid-cols-2 gap-4 text-center text-[10px] pt-1" id="print-sec-signatures">
                      <div className="border border-black rounded-xl p-3 bg-slate-55/20 h-20 flex flex-col justify-between">
                        <strong className="text-slate-700 font-bold">{templateDesign.customSellerStampLabel || 'مهر و امضای فروشنده'}</strong>
                        <span className="text-[8.5px] text-slate-500 font-mono italic">سند صادره آریا</span>
                      </div>
                      <div className="border border-black rounded-xl p-3 bg-slate-55/20 h-20 flex flex-col justify-between">
                        <strong className="text-slate-700 font-bold">{templateDesign.customBuyerSignatureLabel || 'امضا و گواهی خریدار'}</strong>
                        <span className="text-[8.5px] text-slate-500 italic">تحویل صحیح کالا/خدمات</span>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
