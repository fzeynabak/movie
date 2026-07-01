import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Search, 
  UserPlus, 
  UserCheck, 
  Calendar, 
  CreditCard, 
  Coins, 
  Smartphone, 
  Briefcase, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Printer, 
  Eye, 
  X,
  PlusCircle,
  FileSpreadsheet,
  Building,
  Hash,
  Info,
  Image
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Decimal from 'decimal.js';
import { Product, Person } from '../types';
import JalaliDatePicker, { getTodayJalali, toPersianDigits, formatPersianCurrency } from '../components/JalaliDatePicker';
import { InvoiceDesignerService, InvoiceTemplateDesign, DEFAULT_DESIGN } from '../utils/invoiceDesignerSettings';
import InvoiceShapes from '../components/InvoiceShapes';
import { CustomDesignedInvoice } from '../components/CustomDesignedInvoice';

const MySwal = withReactContent(Swal);

export const getPersonDisplayName = (c: Person | null | undefined): string => {
  if (!c) return '';
  const isLegal = c.type === 'حقوقی';
  const nameParts: string[] = [];
  
  if (isLegal) {
    if (c.title) nameParts.push(c.title);
    const personalName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
    if (personalName) nameParts.push(`(نماینده: ${personalName})`);
  } else {
    const personalName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
    if (personalName) nameParts.push(personalName);
    if (c.title) nameParts.push(`(${c.title})`);
  }
  
  if (c.nickname) {
    nameParts.push(`[${c.nickname}]`);
  }
  
  const finalName = nameParts.join(' ').trim();
  return finalName || c.accounting_code || 'بدون نام';
};

interface InvoiceItemState {
  product: Product;
  quantity: number;
  price: number;
  discount: number;
  taxRate: number;
}

export default function SalesInvoice() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Person[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  
  // Shopping Cart items
  const [items, setItems] = useState<InvoiceItemState[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0); // Default 0% value added tax (VAT), user can fill manually
  const [description, setDescription] = useState('');

  // Received amount state for cashier
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  // Catalog toggle and search states
  const [catalogView, setCatalogView] = useState<'card' | 'list'>('card');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);

  // Searchable customer dropdown states
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);



  // Dynamic installment schedule state
  const [installments, setInstallments] = useState<{ amount: number; dueDate: string }[]>([]);

  // Payment versatility states
  const [paymentMethod, setPaymentMethod] = useState<string>('کارتخوان');
  const [paymentDetails, setPaymentDetails] = useState({
    cardToCardNumber: '',
    bankAccountRef: '',
    // Cheque payment details
    checkNumber: '',
    checkBank: '',
    checkDueDate: '',
    checkPayee: '',
    // Installment details
    downPayment: 0,
    installmentsCount: 12,
    installmentAmount: 0,
    installmentInterval: 'ماهانه',
    installmentStartDate: ''
  });

  // Printing configurations & Interactive Factor Designer states
  const [printLayout, setPrintLayout] = useState<'a4' | 'a5' | 'thermal'>('a4');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<{
    invoiceNumber: string;
    paymentMethod: string;
    selectedCustomer: Person | null;
    items: InvoiceItemState[];
    discount: number;
    description: string;
    installments: any[];
    subtotal: number;
    tax: number;
    finalTotal: number;
    receivedAmount: number;
    previousBalance: number;
  } | null>(null);

  // Custom Customization states for Invoicing
  const [printShopName, setPrintShopName] = useState('حسابداری مالی ملینا');
  const [printShopSlogan, setPrintShopSlogan] = useState('امور مالی و حسابداری یکپارچه ملینا');
  const [printShopAddress, setPrintShopAddress] = useState('تهران، بازار بزرگ، سرای ملی، طبقه اول، پلاک ۴');
  const [printShopPhone, setPrintShopPhone] = useState('۰۲۱-۵۵۶۶۷۷۸۸');
  const [printShopLogo, setPrintShopLogo] = useState('');
  const [invoiceDesign, setInvoiceDesign] = useState<InvoiceTemplateDesign>(DEFAULT_DESIGN);
  const [printThemeAccent, setPrintThemeAccent] = useState<'navy' | 'emerald' | 'amber' | 'slate' | 'rose'>('navy');
  const [printHeaderStyle, setPrintHeaderStyle] = useState<'wave' | 'ribbon' | 'modern' | 'simple'>('wave');
  const [printLogoStyle, setPrintLogoStyle] = useState<'circle' | 'square' | 'line' | 'none'>('circle');
  const [printLogoText, setPrintLogoText] = useState('ملینا');
  const [printShowStamp, setPrintShowStamp] = useState(true);
  const [printShowNotesField, setPrintShowNotesField] = useState(true);

  // Template select option state
  const [invoiceTemplate, setInvoiceTemplate] = useState<'standard' | 'box1'>('standard');

  // Standard Terms & Conditions custom values
  const [invoiceTermsLine1, setInvoiceTermsLine1] = useState('۱. کالای فروخته شده در صورت باز نشدن پلمپ تا ۴۸ ساعت قابل استرداد یا تعویض می‌باشد.');
  const [invoiceTermsLine2, setInvoiceTermsLine2] = useState('۲. فاکتور فوق طبق مقررات تراز تجاری و مالی صنف پوشاک ملینا تنظیم گردیده است.');
  const [invoiceTermsPrepaymentLabel, setInvoiceTermsPrepaymentLabel] = useState('مبلغ پیش‌پرداخت نقدی:');
  const [invoiceTermsInstallmentsLabel, setInvoiceTermsInstallmentsLabel] = useState('تعداد اقساط توافق شده:');

  // Box1 Design-specific custom values
  const [invoiceBox1HeaderBrand, setInvoiceBox1HeaderBrand] = useState('استودیو ملینا');
  const [invoiceBox1HeaderSlogan, setInvoiceBox1HeaderSlogan] = useState('کیفیت متمایز، نظم مالی پایدار');
  const [invoiceBox1Title, setInvoiceBox1Title] = useState('صورتحساب فروش کالا و خدمات');
  const [invoiceBox1ToLabel, setInvoiceBox1ToLabel] = useState('صادر شده برای:');
  const [invoiceBox1NoLabel, setInvoiceBox1NoLabel] = useState('شماره سند:');
  const [invoiceBox1DueDateLabel, setInvoiceBox1DueDateLabel] = useState('مهلت تسویه:');
  const [invoiceBox1NotesTitle, setInvoiceBox1NotesTitle] = useState('توضیحات و ملاک‌های توافق:');
  const [invoiceBox1NotesText, setInvoiceBox1NotesText] = useState('کالاهای تحویل شده دارای گارانتی سلامت فیزیکی بوده و در صورت باز نشدن پلمپ، تا ۴۸ ساعت قابل تعویض می‌باشند. خواهشمند است پیش از سررسید نسبت به تسویه اقدام فرمایید.');
  const [invoiceBox1PaymentMethod, setInvoiceBox1PaymentMethod] = useState('کارت به کارت / حساب بانکی');
  const [invoiceBox1BankText, setInvoiceBox1BankText] = useState('نام بانک: بانک سامان\nنام صاحب حساب: پوشاک ملینا هلدینگ\nشماره کارت: ۶۲۱۹-۸۶۱۰-۴۳۲۱-۵۶۷۸\nشماره شبا: IR960560001234567890123456');
  const [invoiceBox1FooterHelp, setInvoiceBox1FooterHelp] = useState('جهت پیگیری تراکنش‌ها می‌توانید با پشتیبانی ما به آدرس hello@melina.com در تماس باشید. از حسن انتخاب شما صمیمانه سپاسگزاریم.');
  const [invoiceBox1SignText, setInvoiceBox1SignText] = useState('مدیریت امور مالی ملینا');
  const [invoiceBox1SignTitle, setInvoiceBox1SignTitle] = useState('مسئول دایره صادرکننده');

  // Column Custom Customizations
  const [printShowProductCode, setPrintShowProductCode] = useState(true);
  const [printShowProductImage, setPrintShowProductImage] = useState(true);
  const [printColCodeLabel, setPrintColCodeLabel] = useState('کد کالا');
  const [printColNameLabel, setPrintColNameLabel] = useState('شرح کالا / خدمات');
  const [printColQtyLabel, setPrintColQtyLabel] = useState('تعداد');
  const [printColPriceLabel, setPrintColPriceLabel] = useState('مبلغ واحد');
  const [printColTotalLabel, setPrintColTotalLabel] = useState('مبلغ کل');
  const [printColCurrencyLabel, setPrintColCurrencyLabel] = useState('ریال');

  // Handler to place the cursor always at the very end of any text field on click/focus
  const moveCursorToEnd = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const val = el.value;
    setTimeout(() => {
      try {
        el.setSelectionRange(val.length, val.length);
      } catch (err) {}
    }, 10);
  };

  // New customer quick-addition states
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    phone1: '',
    type: 'حقیقی' as 'حقیقی' | 'حقوقی',
    national_id: '',
    address: ''
  });

  useEffect(() => {
    loadData();
    generateNextInvoiceNumber();
  }, []);

  // Load editing invoice from localStorage if present
  useEffect(() => {
    const editIdStr = localStorage.getItem('editing_invoice_id');
    const editDataStr = localStorage.getItem('editing_invoice_data');
    if (editIdStr && editDataStr && products.length > 0) {
      try {
        const id = parseInt(editIdStr);
        const data = JSON.parse(editDataStr);
        setEditingInvoiceId(id);
        
        setInvoiceNumber(data.invoice_number || '');
        setDiscount(data.discount || 0);
        setTaxRate(data.tax_rate || 0);
        setDescription(data.description || '');
        setPaymentMethod(data.payment_method || 'کارتخوان');
        setSelectedCustomerId(data.customer_id || null);
        setReceivedAmount(data.received_amount || 0);
        
        if (data.items && data.items.length > 0) {
          const mappedItems = data.items.map((item: any) => {
            const matchedProduct = products.find(p => p.id === item.product_id);
            return {
              product: matchedProduct || {
                id: item.product_id,
                name: item.product_name || 'کالای نامشخص',
                code: item.product_code || '',
                price: item.unit_price,
                cost: item.cost || 0,
                unit: item.product_unit || 'عدد',
                type: 'product'
              },
              quantity: item.quantity,
              price: item.unit_price,
              discount: item.discount || 0,
              taxRate: item.tax_rate || 0
            };
          });
          setItems(mappedItems);
        }

        localStorage.removeItem('editing_invoice_id');
        localStorage.removeItem('editing_invoice_data');

        MySwal.fire({
          icon: 'info',
          title: 'حالت ویرایش فاکتور',
          text: `شما در حال ویرایش فاکتور شماره ${data.invoice_number} هستید.`,
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } catch (err) {
        console.error('Error parsing editing invoice:', err);
      }
    }
  }, [products]);

  // Sync customerSearch input text with selectedCustomerId
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const selected = customers.find(c => c.id === selectedCustomerId);
      if (selected) {
        setCustomerSearch(getPersonDisplayName(selected));
      }
    } else {
      // Avoid clearing if user is searching
      if (!isCustomerDropdownOpen) {
        setCustomerSearch('');
      }
    }
  }, [selectedCustomerId, customers]);

  // Reset catalog page to 1 on search change
  useEffect(() => {
    setCatalogPage(1);
  }, [catalogSearch]);

  // Auto-generate installments when parameters change
  useEffect(() => {
    if (paymentMethod === 'اقساطی') {
      const finalAmt = calculateFinalTotal().toNumber();
      const downPmt = paymentDetails.downPayment || 0;
      const remaining = Math.max(0, finalAmt - downPmt);
      const count = paymentDetails.installmentsCount || 1;
      const defaultAmt = Math.floor(remaining / count);

      // Parse current today Shamsi
      const todayParts = getTodayJalali();
      const list = [];
      
      for (let i = 1; i <= count; i++) {
        // Simple Add months logic
        let y = todayParts.y;
        let m = todayParts.m + i;
        let d = todayParts.d;

        while (m > 12) {
          y += 1;
          m -= 12;
        }

        // Adjust day if exceeds month length
        const maxD = m <= 6 ? 31 : (m <= 11 ? 30 : 29);
        if (d > maxD) d = maxD;

        const dateStr = `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
        // Last installment absorbs the rounding remainder
        const amt = i === count ? (remaining - (defaultAmt * (count - 1))) : defaultAmt;
        
        list.push({
          amount: amt,
          dueDate: dateStr
        });
      }
      setInstallments(list);
    }
  }, [paymentMethod, paymentDetails.installmentsCount, paymentDetails.downPayment, items, discount, taxRate]);

  const loadData = async () => {
    try {
      if (window.electronAPI?.getProducts) {
        const prodList = await window.electronAPI.getProducts();
        // Only show active products for new selections
        const activeProdList = prodList.filter((p: any) => p.status !== 'غیرفعال');
        setProducts(activeProdList);
      }
      if (window.electronAPI?.getDebtorsCreditorsSummary) {
        const persons = await window.electronAPI.getDebtorsCreditorsSummary();
        // Allow all persons (both مشتری, تامین کننده, سایر) to be selected as customers
        const clients = [...persons];
        
        const preSelected = localStorage.getItem('preselected_customer_id');
        if (preSelected) {
          const id = parseInt(preSelected);
          const found = persons.find(p => p.id === id);
          if (found) {
            if (!clients.some(c => c.id === id)) {
              clients.push(found);
            }
            setSelectedCustomerId(id);
          }
          localStorage.removeItem('preselected_customer_id');
        }
        
        setCustomers(clients);
      } else if (window.electronAPI?.getPersons) {
        const persons = await window.electronAPI.getPersons();
        // Allow all persons (both مشتری, تامین کننده, سایر) to be selected as customers
        const clients = [...persons];
        
        const preSelected = localStorage.getItem('preselected_customer_id');
        if (preSelected) {
          const id = parseInt(preSelected);
          const found = persons.find(p => p.id === id);
          if (found) {
            if (!clients.some(c => c.id === id)) {
              clients.push(found);
            }
            setSelectedCustomerId(id);
          }
          localStorage.removeItem('preselected_customer_id');
        }
        
        setCustomers(clients);
      }

      // Fetch global stored designer settings
      if (window.electronAPI?.getConfig) {
        const config = await window.electronAPI.getConfig();
        if (config) {
          if (config.invoiceDesignerPreset) {
            setInvoiceDesign(config.invoiceDesignerPreset);
          } else {
            const localDesign = InvoiceDesignerService.get();
            setInvoiceDesign(localDesign);
          }
          if (config.invoiceThemeColor) setPrintThemeAccent(config.invoiceThemeColor);
          if (config.invoicePaperSize) setPrintLayout(config.invoicePaperSize);
          if (config.invoiceHeaderStyle) setPrintHeaderStyle(config.invoiceHeaderStyle);
          if (config.invoiceLogoStyle) setPrintLogoStyle(config.invoiceLogoStyle);
          if (config.invoiceLogoText) setPrintLogoText(config.invoiceLogoText);
          if (config.invoiceStampEnabled !== undefined) setPrintShowStamp(config.invoiceStampEnabled);
          if (config.invoiceNotesEnabled !== undefined) setPrintShowNotesField(config.invoiceNotesEnabled);
          
          if (config.invoiceShowProductCode !== undefined) setPrintShowProductCode(config.invoiceShowProductCode);
          if (config.invoiceShowProductImage !== undefined) setPrintShowProductImage(config.invoiceShowProductImage);
          if (config.invoiceColCodeLabel) setPrintColCodeLabel(config.invoiceColCodeLabel);
          if (config.invoiceColNameLabel) setPrintColNameLabel(config.invoiceColNameLabel);
          if (config.invoiceColQtyLabel) setPrintColQtyLabel(config.invoiceColQtyLabel);
          if (config.invoiceColPriceLabel) setPrintColPriceLabel(config.invoiceColPriceLabel);
          if (config.invoiceColTotalLabel) setPrintColTotalLabel(config.invoiceColTotalLabel);
          if (config.invoiceColCurrencyLabel) setPrintColCurrencyLabel(config.invoiceColCurrencyLabel);

          // Custom Design-template selection and texts values
          if (config.invoiceTemplate) setInvoiceTemplate(config.invoiceTemplate);
          if (config.invoiceTermsLine1) setInvoiceTermsLine1(config.invoiceTermsLine1);
          if (config.invoiceTermsLine2) setInvoiceTermsLine2(config.invoiceTermsLine2);
          if (config.invoiceTermsPrepaymentLabel) setInvoiceTermsPrepaymentLabel(config.invoiceTermsPrepaymentLabel);
          if (config.invoiceTermsInstallmentsLabel) setInvoiceTermsInstallmentsLabel(config.invoiceTermsInstallmentsLabel);

          if (config.invoiceBox1HeaderBrand) setInvoiceBox1HeaderBrand(config.invoiceBox1HeaderBrand);
          if (config.invoiceBox1HeaderSlogan) setInvoiceBox1HeaderSlogan(config.invoiceBox1HeaderSlogan);
          if (config.invoiceBox1Title) setInvoiceBox1Title(config.invoiceBox1Title);
          if (config.invoiceBox1ToLabel) setInvoiceBox1ToLabel(config.invoiceBox1ToLabel);
          if (config.invoiceBox1NoLabel) setInvoiceBox1NoLabel(config.invoiceBox1NoLabel);
          if (config.invoiceBox1DueDateLabel) setInvoiceBox1DueDateLabel(config.invoiceBox1DueDateLabel);
          if (config.invoiceBox1NotesTitle) setInvoiceBox1NotesTitle(config.invoiceBox1NotesTitle);
          if (config.invoiceBox1NotesText) setInvoiceBox1NotesText(config.invoiceBox1NotesText);
          if (config.invoiceBox1PaymentMethod) setInvoiceBox1PaymentMethod(config.invoiceBox1PaymentMethod);
          if (config.invoiceBox1BankText) setInvoiceBox1BankText(config.invoiceBox1BankText);
          if (config.invoiceBox1FooterHelp) setInvoiceBox1FooterHelp(config.invoiceBox1FooterHelp);
          if (config.invoiceBox1SignText) setInvoiceBox1SignText(config.invoiceBox1SignText);
          if (config.invoiceBox1SignTitle) setInvoiceBox1SignTitle(config.invoiceBox1SignTitle);
        }
      }

      // Load official store branding info from the dedicated database configuration
      if (window.electronAPI?.checkOnboardingStatus) {
        const res = await window.electronAPI.checkOnboardingStatus();
        if (res?.storeInfo) {
          setPrintShopName(res.storeInfo.name || 'حسابداری ملینا');
          setPrintShopPhone(res.storeInfo.phone || '۰۲۱-۵۵۶۶۷۷۸۸');
          setPrintShopAddress(res.storeInfo.address || 'تهران، بازار بزرگ، سرای ملی، طبقه اول');
          setPrintShopSlogan(res.storeInfo.description || 'امور مالی و حسابداری یکپارچه ملینا');
          setPrintShopLogo(res.storeInfo.logo || '');
        }
      }
    } catch (e) {
      console.error('Error loading static info for invoice:', e);
    }
  };

  const generateNextInvoiceNumber = async () => {
    try {
      if (window.electronAPI?.getInvoices) {
        const list = await window.electronAPI.getInvoices();
        const nextId = list.length + 1;
        const shamsiDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        setInvoiceNumber(`INV-${shamsiDate}-${String(nextId).padStart(4, '0')}`);
      } else {
        setInvoiceNumber(`INV-MOCK-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } catch (e) {
      setInvoiceNumber(`INV-TEMPORARY-${Date.now().toString().slice(-4)}`);
    }
  };

  // Quick Customer Registration
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.first_name.trim() || !newCustomerForm.last_name.trim()) {
      MySwal.fire('خطا', 'نام و نام‌خانوادگی مشتری اجباری است.', 'error');
      return;
    }

    try {
      if (window.electronAPI?.addPerson) {
        const payload = {
          ...newCustomerForm,
          category: 'مشتری',
          credit_limit: 100000000 // default credit
        };
        const result = await window.electronAPI.addPerson(payload);
        if (result.success) {
          MySwal.fire('موفقیت‌آمیز', 'مشتری جدید با موفقیت ثبت شد.', 'success');
          
          // Refresh list and select the newly created customer
          await loadData();
          setSelectedCustomerId(result.id);
          setShowAddCustomerModal(false);
          // Reset form
          setNewCustomerForm({
            first_name: '',
            last_name: '',
            nickname: '',
            phone1: '',
            type: 'حقیقی',
            national_id: '',
            address: ''
          });
        }
      }
    } catch (err: any) {
      MySwal.fire('خطا در ثبت', err.message || 'ثبت مشتری با خطا مواجه شد.', 'error');
    }
  };

  // Cart / Items functions
  const handleAddItem = (product: Product) => {
    if (product.type === 'product' && product.total_stock <= 0) {
      MySwal.fire({
        title: 'عدم موجودی کالا',
        text: `کالای "${product.name}" در انبار موجود نیست و به هیچ عنوان امکان فروش آن وجود ندارد.`,
        icon: 'error',
        confirmButtonText: 'متوجه شدم'
      });
      return;
    }
    const existing = items.find(it => it.product.id === product.id);
    if (existing) {
      if (product.type === 'product' && existing.quantity >= product.total_stock) {
        MySwal.fire({
          title: 'کمبود موجودی انبار',
          text: `تعداد انتخابی نمی‌تواند بیشتر از موجودی انبار (${product.total_stock}) باشد.`,
          icon: 'error',
          confirmButtonText: 'متوجه شدم'
        });
        return;
      }
      setItems(items.map(it => it.product.id === product.id ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setItems([...items, { product, quantity: 1, price: product.price, discount: 0, taxRate: taxRate }]);
    }
  };

  const handleUpdateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setItems(items.filter(it => it.product.id !== productId));
      return;
    }
    const item = items.find(it => it.product.id === productId);
    if (item && item.product.type === 'product') {
      if (item.product.total_stock <= 0) {
        setItems(items.filter(it => it.product.id !== productId));
        MySwal.fire({
          title: 'اتمام موجودی کالا',
          text: `موجودی این کالا به پایان رسیده و از لیست حذف می‌گردد.`,
          icon: 'error',
          confirmButtonText: 'تایید'
        });
        return;
      }
      if (qty > item.product.total_stock) {
        MySwal.fire({
          title: 'عدم موجودی کافی',
          text: `بیشتر از موجودی انبار (${item.product.total_stock}) امکان انتخاب وجود ندارد.`,
          icon: 'error',
          confirmButtonText: 'تایید'
        });
        qty = item.product.total_stock;
      }
    }
    setItems(items.map(it => {
      if (it.product.id === productId) {
        return { ...it, quantity: qty };
      }
      return it;
    }));
  };

  const handleUpdatePrice = (productId: number, val: number) => {
    setItems(items.map(it => it.product.id === productId ? { ...it, price: val } : it));
  };

  const handleUpdateItemDiscount = (productId: number, val: number) => {
    setItems(items.map(it => it.product.id === productId ? { ...it, discount: val } : it));
  };



  const handleUpdateItemTaxRate = (productId: number, val: number) => {
    setItems(items.map(it => it.product.id === productId ? { ...it, taxRate: val } : it));
  };

  const handleRemoveItem = (productId: number) => {
    setItems(items.filter(it => it.product.id !== productId));
  };

  // Sync global taxRate to item line-item tax rates
  useEffect(() => {
    setItems(prev => prev.map(it => ({ ...it, taxRate })));
  }, [taxRate]);

  // Secure decimal.js calculations
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const lineTotal = new Decimal(item.price).mul(item.quantity);
      return sum.plus(lineTotal);
    }, new Decimal(0));
  };

  const calculateItemsDiscount = () => {
    return items.reduce((sum, item) => {
      return sum.plus(new Decimal(item.discount || 0));
    }, new Decimal(0));
  };

  const calculateItemsTax = () => {
    return items.reduce((sum, item) => {
      const lineSub = new Decimal(item.price).mul(item.quantity);
      const lineDisc = new Decimal(item.discount || 0);
      const taxable = lineSub.minus(lineDisc);
      if (taxable.lte(0)) return sum;
      const lineTax = taxable.mul(new Decimal(item.taxRate || 0).div(100));
      return sum.plus(lineTax);
    }, new Decimal(0));
  };

  const calculateTax = () => {
    return calculateItemsTax();
  };

  const calculateFinalTotal = () => {
    const sub = calculateSubtotal();
    const itemDisc = calculateItemsDiscount();
    const globDisc = new Decimal(discount || 0);
    const totalDisc = itemDisc.plus(globDisc);
    const tax = calculateItemsTax();
    const total = sub.minus(totalDisc).plus(tax);
    return total.lt(0) ? new Decimal(0) : total;
  };

  // Dynamic automatic calculation of receivedAmount
  useEffect(() => {
    const finalAmt = calculateFinalTotal().toNumber();
    if (paymentMethod === 'نسیه') {
      setReceivedAmount(0);
    } else if (paymentMethod === 'اقساطی') {
      setReceivedAmount(paymentDetails.downPayment || 0);
    } else {
      setReceivedAmount(finalAmt);
    }
  }, [items, discount, taxRate, paymentMethod, paymentDetails.downPayment]);

  // Submit invoice to SQLite
  const handleSubmitInvoice = async () => {
    if (!selectedCustomerId) {
      MySwal.fire('نقص اطلاعات', 'لطفاً ابتدا خریدار (مشتری) فاکتور را مشخص کنید.', 'error');
      return;
    }
    if (items.length === 0) {
      MySwal.fire('سبد خرید خالی است', 'جهت ثبت فاکتور، حداقل یک کالا یا خدمت باید در لیست وجود داشته باشد.', 'error');
      return;
    }

    const sub = calculateSubtotal().toNumber();
    const itemDisc = calculateItemsDiscount().toNumber();
    const globDisc = discount;
    const totalDisc = itemDisc + globDisc;
    const tax = calculateTax().toNumber();
    const final = calculateFinalTotal().toNumber();

    if (final <= 0 || isNaN(final)) {
      MySwal.fire('مبلغ نامعتبر', 'مبلغ نهایی فاکتور معتبر نیست. جمع کل فاکتور باید بزرگتر از صفر باشد.', 'error');
      return;
    }

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;
    const previousBalance = selectedCustomer ? (selectedCustomer.financial_balance || 0) : 0;

    const getNewBalanceVal = () => {
      const prev = new Decimal(previousBalance);
      const payable = calculateFinalTotal();
      const received = new Decimal(receivedAmount || 0);
      return prev.plus(payable).minus(received).toNumber();
    };

    const status = (paymentMethod === 'نسیه' || paymentMethod === 'اقساطی') ? 'پرداخت نشده' : 'پرداخت شده';

    MySwal.fire({
      title: 'آیا فاکتور نهایی صادر شود؟',
      text: 'این اقدام موجودی انبارهای فیزیکی کالاها را کسر کرده و سند مالی صادر می‌نماید.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'بله، ثبت نهایی شود',
      cancelButtonText: 'بررسی مجدد فاکتور',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          if (editingInvoiceId && window.electronAPI?.deleteInvoice) {
            const savedUserStr = sessionStorage.getItem('current_user');
            const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
            const currentUsername = savedUser?.username || 'مدیر سیستم';
            await window.electronAPI.deleteInvoice({ id: editingInvoiceId, username: currentUsername });
          }
          // Compile invoice transaction variables
          const savedUserStr = sessionStorage.getItem('current_user');
          const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
          const currentUsername = savedUser?.username || 'مدیر سیستم';

          const payload = {
            invoice_number: invoiceNumber,
            customer_id: selectedCustomerId,
            total_amount: sub,
            discount: totalDisc,
            tax: tax,
            final_amount: final,
            status: status,
            payment_method: paymentMethod,
            received_amount: receivedAmount,
            username: currentUsername,
            payment_details: JSON.stringify({
              ...paymentDetails,
              tax_rate_percent: taxRate,
              created_timestamp: new Date().toISOString(),
              installmentsList: paymentMethod === 'اقساطی' ? installments : undefined,
              received_amount: receivedAmount,
              previous_balance: previousBalance,
              new_balance: getNewBalanceVal()
            }),
            description: description || `ثبت فاکتور رسمی فروش - روش تسویه و پرداخت: ${paymentMethod}`,
            items: items.map(it => ({
              product_id: it.product.id,
              quantity: it.quantity,
              unit_price: it.price,
              discount: it.discount || 0,
              tax_rate: it.taxRate || 0,
              total: new Decimal(it.price).mul(it.quantity)
                .minus(new Decimal(it.discount || 0))
                .plus(
                  new Decimal(it.price).mul(it.quantity).minus(new Decimal(it.discount || 0)).mul(new Decimal(it.taxRate || 0).div(100))
                ).toNumber()
            }))
          };

          if (window.electronAPI?.saveInvoice) {
            const res = await window.electronAPI.saveInvoice(payload);
            if (res.success) {
              // Store snapshot for printing FIRST BEFORE resetting state
              setLastSavedInvoice({
                invoiceNumber: invoiceNumber,
                paymentMethod: paymentMethod,
                selectedCustomer: selectedCustomer,
                items: [...items],
                discount: totalDisc,
                description: description || `ثبت فاکتور رسمی فروش - روش تسویه و پرداخت: ${paymentMethod}`,
                installments: [...installments],
                subtotal: sub,
                tax: tax,
                finalTotal: final,
                receivedAmount: receivedAmount,
                previousBalance: previousBalance
              });

              MySwal.fire({
                title: 'فاکتور با موفقیت غایی شد',
                text: `سند فاکتور شماره ${res.invoice_number} با موفقیت در سیستم حسابداری ملینا تعبیه گردید. ${res.profit ? `\n(سود برآوردی فاکتور: ${toPersianDigits(res.profit.toLocaleString())} ریال)` : ''}`,
                icon: 'success',
                confirmButtonText: 'مشاهده سند چاپی فاکتور'
              }).then(() => {
                // Open printing configurations flow
                setShowPrintModal(true);
              });

              // Reset Invoice Form
              setItems([]);
              setDiscount(0);
              setDescription('');
              setSelectedCustomerId(null);
              setEditingInvoiceId(null);
              generateNextInvoiceNumber();
              loadData(); // reload updated stock levels and balances
            } else {
              throw new Error(res.error || 'خطا در ثبت');
            }
          }
        } catch (err: any) {
          MySwal.fire('خطای فرآیند', err.message || 'ثبت فاکتور با خطا همراه بود.', 'error');
        }
      }
    });
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const printItems = lastSavedInvoice ? lastSavedInvoice.items : items;
  const printCustomer = lastSavedInvoice ? lastSavedInvoice.selectedCustomer : (customers.find(c => c.id === selectedCustomerId) || null);
  const printInvoiceNumber = lastSavedInvoice ? lastSavedInvoice.invoiceNumber : invoiceNumber;
  const printPaymentMethod = lastSavedInvoice ? lastSavedInvoice.paymentMethod : paymentMethod;
  const printDiscount = lastSavedInvoice ? lastSavedInvoice.discount : discount;
  const printDescription = lastSavedInvoice ? lastSavedInvoice.description : description;
  const printInstallments = lastSavedInvoice ? lastSavedInvoice.installments : installments;
  const printReceivedAmount = lastSavedInvoice ? lastSavedInvoice.receivedAmount : receivedAmount;
  const printPreviousBalance = lastSavedInvoice ? lastSavedInvoice.previousBalance : (selectedCustomer ? (selectedCustomer.financial_balance || 0) : 0);

  const printCalculateSubtotal = () => lastSavedInvoice ? new Decimal(lastSavedInvoice.subtotal) : calculateSubtotal();
  const printCalculateTax = () => lastSavedInvoice ? new Decimal(lastSavedInvoice.tax) : calculateTax();
  const printCalculateFinalTotal = () => lastSavedInvoice ? new Decimal(lastSavedInvoice.finalTotal) : calculateFinalTotal();

  // Trigger browser-level safe iframe printing
  const triggerPrintCmd = () => {
    window.print();
  };

  const formatCurrency = (val: number | string | Decimal) => {
    return formatPersianCurrency(val);
  };

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    const first_name = (c.first_name || '').toLowerCase();
    const last_name = (c.last_name || '').toLowerCase();
    const fullName = `${first_name} ${last_name}`.toLowerCase();
    const title = (c.title || '').toLowerCase();
    const nickname = (c.nickname || '').toLowerCase();
    const phone1 = (c.phone1 || '').toLowerCase();
    const phone2 = (c.phone2 || '').toLowerCase();
    const phone3 = (c.phone3 || '').toLowerCase();
    const nationalId = (c.national_id || '').toLowerCase();
    const regNum = (c.registration_number || '').toLowerCase();
    const econCode = (c.economic_code || '').toLowerCase();
    const accCode = (c.accounting_code || '').toLowerCase();
    
    return fullName.includes(q) || 
           title.includes(q) || 
           nickname.includes(q) || 
           phone1.includes(q) || 
           phone2.includes(q) || 
           phone3.includes(q) || 
           nationalId.includes(q) || 
           regNum.includes(q) || 
           econCode.includes(q) || 
           accCode.includes(q);
  });

  const filteredProducts = products.filter(p => {
    const term = catalogSearch.toLowerCase().trim();
    if (!term) return true;
    return (p.name || '').toLowerCase().includes(term) || (p.code || '').toLowerCase().includes(term);
  });

  const itemsPerPage = 10;
  const totalCatalogPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (catalogPage - 1) * itemsPerPage,
    catalogPage * itemsPerPage
  );

  return (
    <div id="new_sales_invoice_page" className="p-4 lg:p-6 bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 space-y-6">
      
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <span>صدور و مدیریت فاکتور فروش رسمی</span>
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            صدور فاکتور رسمی مشتریان تجاری با قابلیت محاسبات مالیات رسمی و شیوه‌های متنوع پرداخت اقساطی، چکی و نقدی
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left bg-slate-50 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
            <span className="text-[9px] text-slate-400 block font-sans">شماره فاکتور:</span>
            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">{invoiceNumber}</span>
          </div>
          <div className="text-left bg-slate-50 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
            <span className="text-[9px] text-slate-400 block font-sans">تاریخ ثبت سند:</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">امروز (شمسی)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Right Column: Customer & Item Selection */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer Selection block with quick add */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/40 dark:border-slate-800/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>۱. انتخاب یا ثبت بستر مشتری فاکتور</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1.5 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>ثبت سریع مشتری جدید</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">انتخاب خریدار از لیست مشتریان:</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="جستجوی نام، تلفن، کدملی، لقب..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition-all pr-10"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  
                  {selectedCustomerId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(null);
                        setCustomerSearch('');
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-350 transition-colors"
                    >
                      حذف خریدار
                    </button>
                  )}
                </div>

                {isCustomerDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsCustomerDropdownOpen(false)} 
                    />
                    <div className="absolute z-20 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          مشتری یافت نشد.
                        </div>
                      ) : (
                        filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerSearch(getPersonDisplayName(c));
                              setIsCustomerDropdownOpen(false);
                            }}
                            className={`w-full text-right px-3 py-2 text-[11px] transition-colors flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-950 ${
                              selectedCustomerId === c.id ? 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <div className="truncate flex-1">
                              <span className="block font-extrabold text-slate-800 dark:text-slate-100">
                                {getPersonDisplayName(c)}
                              </span>
                              <span className="block text-[9px] text-slate-400 font-normal mt-0.5">
                                تلفن: {toPersianDigits(c.phone1) || 'ثبت نشده'} | کد‌ملی/ثبت: {toPersianDigits(c.national_id || c.registration_number) || 'ثبت نشده'}
                              </span>
                            </div>
                            <div className="text-left shrink-0 pl-1">
                              <span className={`block text-[10px] font-bold ${
                                (c.financial_balance || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 
                                (c.financial_balance || 0) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                              }`}>
                                {(c.financial_balance || 0) > 0 ? `مانده: ${toPersianDigits((c.financial_balance || 0).toLocaleString())} ریال بدهکار` :
                                 (c.financial_balance || 0) < 0 ? `مانده: ${toPersianDigits(Math.abs(c.financial_balance || 0).toLocaleString())} ریال بستانکار` : 'تسویه'}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {selectedCustomer ? (
                <div className="p-3 bg-emerald-50/20 border border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/40 rounded-xl space-y-1.5 text-[11px] leading-relaxed flex flex-col justify-center">
                  <div className="font-bold text-emerald-800 dark:text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100/50 dark:border-emerald-900/30 pb-1.5">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>کد ملی / شناسه خریدار: {toPersianDigits(selectedCustomer.national_id) || 'ثبت نشده'}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                      (selectedCustomer.financial_balance || 0) > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                      (selectedCustomer.financial_balance || 0) < 0 ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {(selectedCustomer.financial_balance || 0) > 0 ? `وضعیت حساب: ${toPersianDigits((selectedCustomer.financial_balance || 0).toLocaleString())} ریال (بدهکار)` :
                       (selectedCustomer.financial_balance || 0) < 0 ? `وضعیت حساب: ${toPersianDigits(Math.abs(selectedCustomer.financial_balance || 0).toLocaleString())} ریال (بستانکار)` :
                       'وضعیت حساب: تسویه شده'}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">شماره تلفن تماس: {toPersianDigits(selectedCustomer.phone1) || 'ثبت نشده'} — آدرس پستی: {selectedCustomer.address || 'ثبت نشده'}</p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850/60 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
                  لطفاً خریدار را از کادر روبه‌رو انتخاب کنید یا یک خریدار جدید ثبت نمایید.
                </div>
              )}
            </div>
          </div>

          {/* Catalog selector inside Invoice */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>۲. انتخاب و افزودن اقلام کالا و خدمات به فاکتور</span>
              </h2>

              {/* View toggle and search tools */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="اسکن بارکد / ثبت سریع..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.currentTarget;
                      const code = input.value.trim();
                      if (code) {
                        const found = products.find(p => p.code?.toLowerCase() === code.toLowerCase() || p.name?.toLowerCase().includes(code.toLowerCase()));
                        if (found) {
                          handleAddItem(found);
                          input.value = '';
                        } else {
                          MySwal.fire('یافت نشد', `کالا یا خدمتی با کد یا بارکد "${code}" یافت نشد.`, 'error');
                        }
                      }
                    }
                  }}
                  className="px-3 py-1.5 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs bg-emerald-50/20 dark:bg-emerald-950/10 focus:outline-none focus:border-emerald-500 w-44 font-bold text-right placeholder-slate-400"
                />

                <input
                  type="text"
                  placeholder="جستجو کالا یا خدمت..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500 w-44 font-bold text-right placeholder-slate-400"
                />
                
                <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setCatalogView('card')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      catalogView === 'card'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>کارت فشرده</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogView('list')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      catalogView === 'list'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>جدول اقلام</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-100 dark:border-slate-800/60 rounded-xl p-2 bg-slate-50 dark:bg-slate-950">
              {filteredProducts.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">هیچ محصول، خدمت یا کالایی مطابق جستجوی شما یافت نشد.</p>
              ) : catalogView === 'card' ? (
                /* Smaller, ultra-compact cards layout */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {paginatedProducts.map(p => {
                    const isSvc = p.type === 'service';
                    const isOutOfStock = !isSvc && p.total_stock <= 0;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => {
                          if (isOutOfStock) {
                            MySwal.fire('کالای ناموجود', `کالای "${p.name}" موجودی ندارد و امکان انتخاب آن وجود ندارد.`, 'warning');
                            return;
                          }
                          handleAddItem(p);
                        }}
                        className={`p-2 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${
                          isOutOfStock 
                            ? 'opacity-40 bg-slate-100 dark:bg-slate-900 border-slate-200 cursor-not-allowed select-none'
                            : isSvc 
                            ? 'bg-purple-50/20 hover:bg-purple-100/30 border-purple-100/60 hover:scale-[1.01] hover:shadow-xs hover:border-purple-300' 
                            : 'bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-150/60 dark:border-slate-800 hover:scale-[1.01] hover:shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="text-[9px] font-mono font-bold text-slate-400">#{toPersianDigits(p.code)}</span>
                          <span className={`px-1 rounded text-[8px] font-bold ${
                            isSvc 
                              ? 'bg-purple-100/70 text-purple-700' 
                              : p.total_stock === 0 ? 'bg-rose-100 text-rose-700 font-extrabold' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {isSvc ? 'خدمت' : p.total_stock === 0 ? 'ناموجود' : `موجودی: ${toPersianDigits(p.total_stock)}`}
                          </span>
                        </div>
                        <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 block truncate leading-tight">{p.name}</span>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1.5 align-middle block">{formatCurrency(p.price)} ریال</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List/Table compact layout with select button */
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] font-bold">
                        <th className="p-2">کد</th>
                        <th className="p-2">عنوان کالا / خدمات</th>
                        <th className="p-2 text-center">نوع</th>
                        <th className="p-2 text-center">موجودی</th>
                        <th className="p-2 text-left">فی واحد (ریال)</th>
                        <th className="p-2 text-center">اقدام</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map(p => {
                        const isSvc = p.type === 'service';
                        const isOutOfStock = !isSvc && p.total_stock <= 0;
                        return (
                          <tr 
                            key={p.id}
                            onClick={() => {
                              if (isOutOfStock) {
                                MySwal.fire('کالای ناموجود', `کالای "${p.name}" موجودی ندارد و امکان انتخاب آن وجود ندارد.`, 'warning');
                                return;
                              }
                              handleAddItem(p);
                            }}
                            className={`border-b border-slate-100 dark:border-slate-900 transition-colors ${
                              isOutOfStock 
                                ? 'opacity-40 bg-slate-55 dark:bg-slate-950/40 cursor-not-allowed select-none' 
                                : 'hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer'
                            }`}
                          >
                            <td className="p-2 font-mono text-[10px] text-slate-400">#{toPersianDigits(p.code)}</td>
                            <td className="p-2 font-bold text-slate-700 dark:text-slate-200">{p.name}</td>
                            <td className="p-2 text-center">
                              <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                                isSvc ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {isSvc ? 'خدمت' : 'کالا'}
                              </span>
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                              {isSvc ? '---' : p.total_stock === 0 ? <span className="text-red-500 font-extrabold">ناموجود</span> : toPersianDigits(p.total_stock)}
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(p.price)}</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                disabled={isOutOfStock}
                                className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                  isOutOfStock 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                                }`}
                              >
                                {isOutOfStock ? 'ناموجود' : '+ افزودن'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Catalog pagination controls */}
            {totalCatalogPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1.5 text-xs">
                <button
                  type="button"
                  disabled={catalogPage === 1}
                  onClick={() => setCatalogPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-bold transition-all"
                >
                  قبلی
                </button>
                <span className="font-bold text-slate-500 text-[11px]">
                  صفحه {toPersianDigits(catalogPage)} از {toPersianDigits(totalCatalogPages)} — (شامل {toPersianDigits(filteredProducts.length)} کالا / خدمت)
                </span>
                <button
                  type="button"
                  disabled={catalogPage === totalCatalogPages}
                  onClick={() => setCatalogPage(prev => Math.min(prev + 1, totalCatalogPages))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-bold transition-all"
                >
                  بعدی
                </button>
              </div>
            )}
          </div>

          {/* Form items shopping cart list */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/40 dark:border-slate-800/40 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>۳. لیست اقلام تعبیه شده در فاکتور فروش</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-150 py-2">
                    <th className="p-3">ردیف</th>
                    <th className="p-3">کد / بارکد</th>
                    <th className="p-3">شرح خدمت یا کالا</th>
                    <th className="p-3 text-center">واحد</th>
                    <th className="p-3 text-center w-20">تعداد خرید</th>
                    <th className="p-3 text-left w-32">قیمت واحد</th>
                    <th className="p-3 text-left w-24">تخفیف</th>
                    <th className="p-3 text-center w-16">مالیات</th>
                    <th className="p-3 text-left w-36">مبلغ نهایی (ریال)</th>
                    <th className="p-3 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">هیچ کالا یا خدمتی به فاکتور افزوده نشده است.</td>
                    </tr>
                  ) : (
                    items.map((it, idx) => {
                      const lineSub = new Decimal(it.price).mul(it.quantity);
                      const lineDisc = new Decimal(it.discount || 0);
                      const lineTax = lineSub.minus(lineDisc).gt(0) 
                        ? lineSub.minus(lineDisc).mul(new Decimal(it.taxRate || 0).div(100)) 
                        : new Decimal(0);
                      const lineTotal = lineSub.minus(lineDisc).plus(lineTax);

                      return (
                        <tr key={it.product.id} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800/40">
                          <td className="p-3 font-semibold">{idx + 1}</td>
                          <td className="p-3">
                            <span className="block font-mono text-[10px]">#{it.product.code}</span>
                            {it.product.barcode && <span className="block text-[8px] text-slate-400 font-mono">{it.product.barcode}</span>}
                          </td>
                          <td className="p-3 font-bold">
                            <div>{it.product.name}</div>
                            {it.product.type === 'product' && (
                              <div className="text-[9px] font-normal text-slate-400">
                                موجودی لحظه‌ای: <span className="font-bold text-slate-600 dark:text-slate-300">{toPersianDigits(it.product.total_stock)}</span> {it.product.unit || 'عدد'}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-500">
                            {it.product.unit || 'عدد'}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => handleUpdateQty(it.product.id, Math.max(1, parseInt(e.target.value || '1')))}
                              dir="ltr"
                              onClick={moveCursorToEnd}
                              onFocus={moveCursorToEnd}
                              className="w-14 px-1 py-1 text-center font-bold font-mono border rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={it.price}
                              onChange={(e) => handleUpdatePrice(it.product.id, Math.max(0, parseInt(e.target.value || '0')))}
                              dir="ltr"
                              onClick={moveCursorToEnd}
                              onFocus={moveCursorToEnd}
                              className="w-28 px-1 py-1 text-right font-bold font-mono border rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500 no-spinners"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={it.discount}
                              onChange={(e) => handleUpdateItemDiscount(it.product.id, Math.max(0, parseInt(e.target.value || '0')))}
                              dir="ltr"
                              onClick={moveCursorToEnd}
                              onFocus={moveCursorToEnd}
                              className="w-20 px-1 py-1 text-right font-bold font-mono border rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500 no-spinners"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={it.taxRate}
                              onChange={(e) => handleUpdateItemTaxRate(it.product.id, Math.min(100, Math.max(0, parseFloat(e.target.value || '0'))))}
                              dir="ltr"
                              onClick={moveCursorToEnd}
                              onFocus={moveCursorToEnd}
                              className="w-12 px-1 py-1 text-center font-bold font-mono border rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="p-3 text-left font-bold font-mono text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.product.id)}
                              className="text-red-400 hover:text-red-500 hover:scale-105 transition-all"
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

        {/* Left Column: Settlement & Computations details */}
        <div className="space-y-6">
          
          {/* Versatile Payments block */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/40 dark:border-slate-800/40 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>۴. شرایط پرداخت و شیوه تسویه حساب</span>
            </h2>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400">شیوه تسویه:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
              >
                <option value="کارتخوان">کارت (POS)</option>
                <option value="نقدی">نقدی (صندوق پول)</option>
                <option value="چکی">چک صیادی مدت‌دار</option>
                <option value="نسیه">نسیه (فروش اعتباری)</option>
                <option value="کارت به کارت">پرداخت آنلاین کارت‌به‌کارت</option>
                <option value="واریز به حساب">حساب بانکی / سایت</option>
                <option value="اقساطی">فروش اقساطی (کارمزد ماهیانه)</option>
              </select>

              {/* Dynamic Payment field forms inside invoicing page */}
              {paymentMethod === 'کارت به کارت' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border rounded-xl space-y-2.5">
                  <label className="block text-[10px] font-bold text-slate-400">شماره کارت مقصد:</label>
                  <input
                    type="text"
                    placeholder="شماره کارت ۱۶ رقمی را وارد کنید..."
                    value={paymentDetails.cardToCardNumber}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, cardToCardNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-left font-mono font-bold text-xs"
                  />
                </div>
              )}

              {paymentMethod === 'واریز به حساب' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border rounded-xl space-y-2.5">
                  <label className="block text-[10px] font-bold text-slate-400">شماره ارجاع / حساب مقصد:</label>
                  <input
                    type="text"
                    placeholder="شماره حساب یا فیش بانکی..."
                    value={paymentDetails.bankAccountRef}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, bankAccountRef: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-left font-mono font-bold text-xs"
                  />
                </div>
              )}

              {paymentMethod === 'چکی' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400">شماره صیاد چک:</label>
                    <input
                      type="text"
                      placeholder="کد ۱۶ رقمی صیادی چک..."
                      value={paymentDetails.checkNumber}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, checkNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-left font-mono font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400">بانک صادرکننده چک:</label>
                    <input
                      type="text"
                      placeholder="مثال: بانک ملی شعبه مرکزی..."
                      value={paymentDetails.checkBank}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, checkBank: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <JalaliDatePicker
                      label="تاریخ سررسید چک:"
                      placeholder="روز / ماه / سال شمسی..."
                      value={paymentDetails.checkDueDate}
                      onChange={(val) => setPaymentDetails({ ...paymentDetails, checkDueDate: val })}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'اقساطی' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400">پیش‌پرداخت نقدی (ریال):</label>
                      <input
                        type="number"
                        value={paymentDetails.downPayment || ''}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, downPayment: Math.max(0, parseInt(e.target.value || '0')) })}
                        dir="ltr"
                        onClick={moveCursorToEnd}
                        onFocus={moveCursorToEnd}
                        className="w-full px-3 py-2 rounded-lg border text-right font-mono font-bold no-spinners"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400">تعداد اقساط ماهانه:</label>
                      <input
                        type="number"
                        value={paymentDetails.installmentsCount || ''}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, installmentsCount: Math.max(1, parseInt(e.target.value || '1')) })}
                        dir="ltr"
                        onClick={moveCursorToEnd}
                        onFocus={moveCursorToEnd}
                        className="w-full px-3 py-2 rounded-lg border text-right font-mono font-bold no-spinners"
                      />
                    </div>
                  </div>

                  {/* Dynamic generated installment rows */}
                  {installments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                      <h4 className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">برنامه زمان‌بندی اقساط ماهانه:</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {installments.map((inst, index) => (
                          <div key={index} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-500 w-12 text-center">قسط {index + 1}:</span>
                            
                            {/* Installment Amount Input */}
                            <div className="flex-1">
                              <input
                                type="number"
                                value={inst.amount}
                                onChange={(e) => {
                                  const amt = Math.max(0, parseInt(e.target.value || '0'));
                                  const newList = [...installments];
                                  newList[index].amount = amt;
                                  setInstallments(newList);
                                }}
                                dir="ltr"
                                onClick={moveCursorToEnd}
                                onFocus={moveCursorToEnd}
                                className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-right no-spinners"
                                placeholder="مبلغ قسط"
                              />
                            </div>

                            {/* Installment Due Date with JalaliDatePicker */}
                            <div className="w-32">
                              <JalaliDatePicker
                                value={inst.dueDate}
                                onChange={(val) => {
                                  const newList = [...installments];
                                  newList[index].dueDate = val;
                                  setInstallments(newList);
                                }}
                                placeholder="سررسید"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Computations list & Discount details */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/40 dark:border-slate-800/40 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span>۵. محاسبات مالی نهایی فاکتور</span>
            </h2>

            <div className="space-y-3.5">
              
              {/* Discount custom panel element */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">میزان اعمال تخفیف فاکتور (ریال):</label>
                <input
                  type="number"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value || '0')))}
                  dir="ltr"
                  onClick={moveCursorToEnd}
                  onFocus={moveCursorToEnd}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl text-right font-mono font-bold text-xs no-spinners"
                />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 pr-1 leading-relaxed">
                  <strong>تخفیف عمومی فاکتور:</strong> مبلغ ریالی که به عنوان تخفیف کلی به خریدار اعطا می‌کنید و مستقیماً از جمع ناخالص کسر می‌شود تا مبلغ نهایی پرداختی محاسبه گردد.
                </p>
              </div>

              {/* VAT rate panel */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">نرخ مالیات بر ارزش افزوده (درصد):</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Math.max(0, parseInt(e.target.value || '0')))}
                  dir="ltr"
                  onClick={moveCursorToEnd}
                  onFocus={moveCursorToEnd}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl text-right font-mono font-bold text-xs no-spinners"
                />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 pr-1 leading-relaxed">
                  <strong>مالیات ارزش افزوده:</strong> درصد مالیات قانونی صنف شما (به طور پیش‌فرض ۱۰ درصد) که روی مجموع خالص اعمال شده و برای محاسبات سود و ارسال گزارش فصلی مالیاتی استفاده می‌گردد.
                </p>
              </div>

              {/* Description box */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 font-sans">توضیحات یا یادداشت روی فاکتور چاپی:</label>
                <textarea
                  placeholder="مثال: گارانتی ۱۸ ماهه طلایی کالا پس از امضای فاکتور رسمی..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs"
                  rows={2}
                />
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>جمع ناخالص کل اقلام:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(calculateSubtotal())} ریال</span>
                </div>

                {calculateItemsDiscount().gt(0) && (
                  <div className="flex justify-between items-center text-rose-500">
                    <span>مجموع تخفیف اقلام:</span>
                    <span className="font-mono font-bold">-{formatCurrency(calculateItemsDiscount())} ریال</span>
                  </div>
                )}
                
                {discount > 0 && (
                  <div className="flex justify-between items-center text-rose-500">
                    <span>تخفیف عمومی فاکتور:</span>
                    <span className="font-mono font-bold">-{formatCurrency(new Decimal(discount))} ریال</span>
                  </div>
                )}
                
                {calculateItemsTax().gt(0) && (
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                    <span>مجموع مالیات اقلام:</span>
                    <span className="font-mono font-bold">+{formatCurrency(calculateItemsTax())} ریال</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-900 dark:text-white font-bold text-sm pt-2 border-t border-slate-150 dark:border-slate-850">
                  <span>مبلغ کل خالص فاکتور:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 text-base">{formatCurrency(calculateFinalTotal())} ریال</span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">مبلغ دریافتی نقدی / کارتخوان (ریال):</span>
                      <input
                        type="number"
                        value={receivedAmount || ''}
                        onChange={(e) => setReceivedAmount(Math.max(0, parseInt(e.target.value || '0')))}
                        dir="ltr"
                        onClick={moveCursorToEnd}
                        onFocus={moveCursorToEnd}
                        className="w-32 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-mono font-bold text-xs no-spinners text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 text-right leading-relaxed">
                      <strong>مبلغ دریافتی نقدی:</strong> میزان پولی که در زمان صدور فاکتور به صورت نقد، کارت‌به‌کارت یا کارتخوان از مشتری اخذ شده است. این مبلغ مستقیماً صندوق یا حساب بانکی شما را افزایش می‌دهد و مابقی فاکتور نسیه خواهد شد.
                    </p>
                  </div>

                  {selectedCustomer && (
                    <div className="pt-1.5 border-t border-slate-100/50 dark:border-slate-800/30 space-y-1">
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span>مانده پس از ثبت فاکتور:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {(() => {
                            const prev = new Decimal(selectedCustomer.financial_balance || 0);
                            const payable = calculateFinalTotal();
                            const rec = new Decimal(receivedAmount || 0);
                            const nextBal = prev.plus(payable).minus(rec);
                            if (nextBal.gt(0)) {
                              return `${toPersianDigits(nextBal.toLocaleString())} ریال بدهکار`;
                            } else if (nextBal.lt(0)) {
                              return `${toPersianDigits(Math.abs(nextBal.toNumber()).toLocaleString())} ریال بستانکار`;
                            }
                            return 'تسویه شده';
                          })()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 text-right leading-relaxed font-normal">
                        <strong>ثبت به صورت نسیه (حساب دفتری):</strong> مابه‌التفاوت بهای فاکتور و مبلغ نقدی دریافتی، به صورت اعتبار نسیه دفتری لحاظ گردیده و بدهکاری این مشتری را در سیستم کل مالی به روزرسانی می‌کند تا در گزارش بدهکاران نشان داده شود.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitInvoice}
                disabled={items.length === 0 || !selectedCustomerId}
                className={`w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-all ${
                  items.length === 0 || !selectedCustomerId
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-none cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>صدور و ابلاغ سند مالی فاکتور</span>
              </button>

            </div>
          </div>
        </div>

      </div>

      {/* Floating Printing Modal with Interactive Factor Designer */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          
          {/* Print preview CSS block to guarantee 100% margin-free official prints */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              /* Hide all unneeded UI elements completely */
              header, aside, footer, nav, .sidebar, .header, .no-print, button, input, select, textarea, .fixed, .bg-slate-950\\/70, .inset-0 {
                display: none !important;
                visibility: hidden !important;
              }

              /* Strip all background colors, borders, and shadows from parent containers */
              html, body, #root, [role="dialog"], div, section, main {
                background: transparent !important;
                background-color: transparent !important;
                box-shadow: none !important;
                border: none !important;
                overflow: visible !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              
              /* Default everything as hidden */
              body * {
                visibility: hidden !important;
              }

              /* Display and show only the printable invoice component */
              #printable-invoice, #printable-invoice * {
                visibility: visible !important;
              }

              /* Align the invoice on the physical page */
              #printable-invoice {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
                z-index: 9999999 !important;
              }

              /* Enforce background colors and images */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              @page {
                size: ${printLayout === 'a4' ? 'A4 portrait' : printLayout === 'a5' ? 'A5 portrait' : '80mm auto'};
                margin: ${printLayout === 'thermal' ? '0' : '8mm'} !important;
              }
            }
          `}} />

          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-6xl h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            
            {/* Modal Title Row */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>پنل هوشمند طراحی فاکتور رسمی و اختصاصی چاپی</span>
              </h3>
              <button 
                onClick={() => setShowPrintModal(false)} 
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                title="بستن پنجره"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Interactive Work Area: Sidebar Control & Realtime Preview */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row-reverse">
              
              {/* Sidebar actions: direct print trigger and paper layout selection only */}
              <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-950/40 border-l border-slate-200 dark:border-slate-850 p-5 flex flex-col justify-between text-xs">
                <div className="space-y-4">
                  <div className="border-b border-slate-200/50 dark:border-slate-800 pb-3">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-indigo-500" />
                      <span>آماده‌سازی چاپ فاکتور</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">طراحی فاکتور بر اساس قالب تعریف شده در تنظیمات اعمال شده است.</p>
                  </div>

                  {/* Format/Layout selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500">انتخاب اندازه کاغذ خروجی:</label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'a4', label: 'قطع رسمی A4' },
                        { id: 'a5', label: 'قطع نیم‌سایز A5' },
                        { id: 'thermal', label: 'فیش پرینتر حرارتی (POS)' }
                      ].map(layout => (
                        <button
                          key={layout.id}
                          type="button"
                          onClick={() => setPrintLayout(layout.id as any)}
                          className={`w-full py-2.5 px-3 rounded-xl border text-right transition-all font-bold flex items-center justify-between ${
                            printLayout === layout.id
                              ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/10'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{layout.label}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${printLayout === layout.id ? 'bg-white' : 'bg-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Print Action Buttons */}
                  <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800 space-y-2">
                    <button
                      type="button"
                      onClick={triggerPrintCmd}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all text-xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>چاپ فاکتور / ذخیره به صورت PDF</span>
                    </button>
                    <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 leading-normal">
                      راهنما: جهت ذخیره فاکتور به صورت فایل دیجیتال PDF، در پنجره چاپ مرورگر گزینه <strong>Save as PDF (ذخیره به عنوان PDF)</strong> را به عنوان مقصد چاپ انتخاب نمایید.
                    </p>
                    <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 leading-normal">
                      توجه: طراحی و جزئیات فاکتور صرفاً از صفحه اختصاصی «طراحی فاکتور» بارگذاری شده و در اینجا قابل تغییر نیست.
                    </p>
                  </div>
                </div>
              </div>

              {/* Central/Left Workspace: Canvas Previewer */}
              <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-950/80 flex items-start justify-center">
                
                {/* 1. Thermal POS template preview */}
                {printLayout === 'thermal' && (
                  <CustomDesignedInvoice
                    invoiceDesign={invoiceDesign}
                    printLayout="thermal"
                    printShopName={printShopName}
                    printShopSlogan={printShopSlogan}
                    printShopAddress={printShopAddress}
                    printShopPhone={printShopPhone}
                    printShopLogo={printShopLogo}
                    invoiceNumber={printInvoiceNumber}
                    paymentMethod={printPaymentMethod}
                    selectedCustomer={printCustomer}
                    items={printItems}
                    discount={printDiscount}
                    taxRate={taxRate}
                    calculateSubtotal={printCalculateSubtotal}
                    calculateTax={printCalculateTax}
                    calculateFinalTotal={printCalculateFinalTotal}
                    installments={printInstallments}
                    description={printDescription}
                    printColCodeLabel={printColCodeLabel}
                    printColNameLabel={printColNameLabel}
                    printColQtyLabel={printColQtyLabel}
                    printColPriceLabel={printColPriceLabel}
                    printColTotalLabel={printColTotalLabel}
                    printColCurrencyLabel={printColCurrencyLabel}
                    receivedAmount={printReceivedAmount}
                    previousBalance={printPreviousBalance}
                  />
                )}

                {/* 2. Professional A4 & A5 Invoice Formats (Standard design) */}
                {(printLayout === 'a4' || printLayout === 'a5') && invoiceTemplate === 'standard' && (
                  <CustomDesignedInvoice
                    invoiceDesign={invoiceDesign}
                    printLayout={printLayout as 'a4' | 'a5'}
                    printShopName={printShopName}
                    printShopSlogan={printShopSlogan}
                    printShopAddress={printShopAddress}
                    printShopPhone={printShopPhone}
                    printShopLogo={printShopLogo}
                    invoiceNumber={printInvoiceNumber}
                    paymentMethod={printPaymentMethod}
                    selectedCustomer={printCustomer}
                    items={printItems}
                    discount={printDiscount}
                    taxRate={taxRate}
                    calculateSubtotal={printCalculateSubtotal}
                    calculateTax={printCalculateTax}
                    calculateFinalTotal={printCalculateFinalTotal}
                    installments={printInstallments}
                    description={printDescription}
                    printColCodeLabel={printColCodeLabel}
                    printColNameLabel={printColNameLabel}
                    printColQtyLabel={printColQtyLabel}
                    printColPriceLabel={printColPriceLabel}
                    printColTotalLabel={printColTotalLabel}
                    printColCurrencyLabel={printColCurrencyLabel}
                    receivedAmount={printReceivedAmount}
                    previousBalance={printPreviousBalance}
                  />
                )}
                {false && (
                  <div 
                    id="printable-invoice" 
                    className={`bg-white text-slate-900 p-8 shadow-xl border border-slate-200/50 leading-loose flex flex-col justify-between ${
                      printLayout === 'a4' ? 'w-[210mm] min-h-[297mm]' : 'w-[148mm] min-h-[210mm]'
                    }`}
                  >
                    <div>
                      {/* Interactive Header Style Shapes rendering */}
                      {printHeaderStyle === 'wave' && (
                        <div className={`-mt-8 -mx-8 mb-6 h-20 relative overflow-hidden flex items-center px-8 text-white ${
                          printThemeAccent === 'navy' ? 'bg-gradient-to-r from-indigo-900 to-slate-800' :
                          printThemeAccent === 'emerald' ? 'bg-gradient-to-r from-emerald-900 to-slate-800' :
                          printThemeAccent === 'amber' ? 'bg-gradient-to-r from-amber-700 to-slate-800' :
                          printThemeAccent === 'rose' ? 'bg-gradient-to-r from-rose-900 to-slate-800' :
                          'bg-gradient-to-r from-slate-800 to-slate-600'
                        }`}>
                          {/* Left artistic shape representation */}
                          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-gradient-radial from-white to-transparent" />
                          <div className="relative flex items-center justify-between w-full">
                            <div>
                              <h4 className="font-extrabold text-base tracking-wide">فاکتور رسمی فروش کالا و خدمات ملینا</h4>
                              <p className="text-[10px] opacity-70">سریال چاپی استاندارد امور حسابداری مالی مراجع قانونی کشور</p>
                            </div>
                            <span className="font-mono text-sm font-extrabold bg-white/20 px-3 py-1 rounded-lg">ش ف: {toPersianDigits(invoiceNumber)}</span>
                          </div>
                        </div>
                      )}

                      {printHeaderStyle === 'ribbon' && (
                        <div className="mb-6 flex items-center justify-between border-b-4 border-double pb-3" style={{ borderColor: 
                          printThemeAccent === 'navy' ? '#312e81' :
                          printThemeAccent === 'emerald' ? '#064e3b' :
                          printThemeAccent === 'amber' ? '#78350f' :
                          printThemeAccent === 'rose' ? '#9f1239' : '#334155'
                        }}>
                          <div>
                            <span className="inline-block px-3 py-1 text-[10px] font-bold text-white rounded-md mb-1" style={{ backgroundColor: 
                              printThemeAccent === 'navy' ? '#3b82f6' :
                              printThemeAccent === 'emerald' ? '#10b981' :
                              printThemeAccent === 'amber' ? '#f59e0b' :
                              printThemeAccent === 'rose' ? '#f43f5e' : '#64748b'
                            }}>
                              صورت‌حساب رسمی مودیان و مراجع مالیاتی کشور
                            </span>
                            <h4 className="font-black text-lg text-slate-900">سند مالی صورتحساب خدمات و فروش کالا</h4>
                          </div>
                          <span className="font-mono text-xs font-bold bg-slate-100 border px-2.5 py-1 rounded-md text-slate-800">سری فاکتور: {toPersianDigits(invoiceNumber)}</span>
                        </div>
                      )}

                      {(printHeaderStyle === 'modern' || printHeaderStyle === 'simple') && (
                        <div className={`mb-6 flex justify-between items-start border-b-2 pb-4 ${
                          printThemeAccent === 'navy' ? 'border-indigo-900' :
                          printThemeAccent === 'emerald' ? 'border-emerald-800' :
                          printThemeAccent === 'amber' ? 'border-amber-700' :
                          printThemeAccent === 'rose' ? 'border-rose-800' : 'border-slate-800'
                        }`}>
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-md text-slate-900">سند رسمی حسابداری صورتحساب فروش کالا و خدمات</h4>
                            <p className="text-[10px] text-slate-500 font-bold">{printShopSlogan} — تاییدیه مبادلات رسمی مشتریان</p>
                          </div>
                          <div className="text-left text-[10px] font-bold text-slate-600 space-y-0.5 font-mono">
                            <p>شماره سند: <span className="font-extrabold text-indigo-700">{toPersianDigits(invoiceNumber)}</span></p>
                            <p>تاریخ ثبت مودی: {toPersianDigits('1405/03/30')}</p>
                            <p className="font-sans">نحوه تصفیه: <span className="font-extrabold">{paymentMethod}</span></p>
                          </div>
                        </div>
                      )}

                      {/* Store dynamic Identification and Client parameters */}
                      <div className="mb-4 grid grid-cols-2 gap-4 text-[11px] leading-relaxed">
                        <div className="p-3 border rounded-xl space-y-1 bg-slate-50/50">
                          <p className="font-extrabold border-b pb-0.5 mb-1" style={{ color: 
                            printThemeAccent === 'navy' ? '#1e3a8a' :
                            printThemeAccent === 'emerald' ? '#064e3b' :
                            printThemeAccent === 'amber' ? '#78350f' :
                            printThemeAccent === 'rose' ? '#881337' : '#1e293b'
                          }}>مشخصات فروشنده رسمی کالا و خدمات:</p>
                          
                          <div className="flex items-center gap-2 mb-1.5">
                             {printShopLogo ? (
                               <img src={printShopLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                             ) : (
                               <>
                                 {printLogoStyle === 'circle' && (
                                   <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: 
                                     printThemeAccent === 'navy' ? '#312e81' :
                                     printThemeAccent === 'emerald' ? '#064e3b' :
                                     printThemeAccent === 'amber' ? '#78350f' :
                                     printThemeAccent === 'rose' ? '#9f1239' : '#334155'
                                   }}>
                                     {printLogoText}
                                   </span>
                                 )}
                                 {printLogoStyle === 'square' && (
                                   <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: 
                                     printThemeAccent === 'navy' ? '#312e81' :
                                     printThemeAccent === 'emerald' ? '#064e3b' :
                                     printThemeAccent === 'amber' ? '#78350f' :
                                     printThemeAccent === 'rose' ? '#9f1239' : '#334155'
                                   }}>
                                     {printLogoText}
                                   </span>
                                 )}
                               </>
                             )}
                            <div>
                              <p className="font-black text-xs text-slate-900">{printShopName}</p>
                            </div>
                          </div>

                          <p>تلفن‌های تماس صنف: <strong>{toPersianDigits(printShopPhone)}</strong></p>
                          <p>نشانی محل مودی: {printShopAddress}</p>
                        </div>
                        
                        <div className="p-3 border rounded-xl space-y-1 bg-slate-50/50">
                          <p className="font-extrabold border-b pb-0.5 mb-1" style={{ color: 
                            printThemeAccent === 'navy' ? '#1e3a8a' :
                            printThemeAccent === 'emerald' ? '#064e3b' :
                            printThemeAccent === 'amber' ? '#78350f' :
                            printThemeAccent === 'rose' ? '#881337' : '#1e293b'
                          }}>مشخصات خریدار / خریدار تجاری خدمات:</p>
                          <p>نام و نام خانوادگی خریدار: <strong>{selectedCustomer ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}` : 'خریدار متفرقه عمومی'}</strong></p>
                          <p>کد ملی / شناسه ملی خریدار: <strong className="font-mono">{selectedCustomer ? toPersianDigits(selectedCustomer.national_id) : '---'}</strong></p>
                          <p>تلفن خریدار: <strong className="font-mono">{selectedCustomer ? toPersianDigits(selectedCustomer.phone1) : '---'}</strong></p>
                          <p className="truncate">نشانی محل اقامت خریدار: {selectedCustomer ? selectedCustomer.address : '---'}</p>
                        </div>
                      </div>

                      {/* Invoice columns list */}
                      <table className="w-full text-right text-[11px] border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-extrabold h-9 font-sans text-xs">
                            <th className="p-2 border-l text-center w-8 font-black">ردیف</th>
                            {printShowProductCode && (
                              <th className="p-2 border-l text-center w-16">{printColCodeLabel}</th>
                            )}
                            {printShowProductImage && (
                              <th className="p-2 border-l text-center w-12">تصویر</th>
                            )}
                            <th className="p-2 border-l text-right">{printColNameLabel}</th>
                            <th className="p-2 border-l text-center w-14">{printColQtyLabel}</th>
                            <th className="p-2 border-l text-left w-28">{printColPriceLabel} ({printColCurrencyLabel})</th>
                            <th className="p-2 text-left w-32">{printColTotalLabel} ({printColCurrencyLabel})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, index) => (
                            <tr key={it.product.id} className="border-b border-slate-200 h-9">
                              <td className="p-2 border-l text-center font-bold font-mono">{toPersianDigits(index + 1)}</td>
                              {printShowProductCode && (
                                <td className="p-2 border-l font-mono text-center text-slate-500 font-bold">#{toPersianDigits(it.product.code || '')}</td>
                              )}
                              {printShowProductImage && (
                                <td className="p-1 border-l text-center">
                                  <div className="w-7 h-7 mx-auto bg-slate-100 rounded border flex items-center justify-center text-slate-400">
                                    <Image className="w-3.5 h-3.5" />
                                  </div>
                                </td>
                              )}
                              <td className="p-2 border-l font-black text-slate-800 text-xs">{it.product.name}</td>
                              <td className="p-2 border-l text-center font-bold font-mono text-sm">{toPersianDigits(it.quantity)}</td>
                              <td className="p-2 border-l text-left font-mono font-bold text-slate-600">{toPersianDigits(it.price.toLocaleString())}</td>
                              <td className="p-2 text-left font-mono font-bold text-sm" style={{ color: 
                                printThemeAccent === 'navy' ? '#4f46e5' :
                                printThemeAccent === 'emerald' ? '#059669' :
                                printThemeAccent === 'amber' ? '#d97706' :
                                printThemeAccent === 'rose' ? '#e11d48' : '#475569'
                              }}>{toPersianDigits(new Decimal(it.price).mul(it.quantity).toNumber().toLocaleString())}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Detailed installments breakdown as requested inside observations panel */}
                      {printShowNotesField && (
                        <div className="mt-5 flex justify-between items-start text-[11px] leading-relaxed gap-4">
                          <div className="flex-1 p-3 border rounded-xl bg-slate-50/50">
                            <p className="font-extrabold mb-1" style={{ color: 
                              printThemeAccent === 'navy' ? '#1e3a8a' :
                              printThemeAccent === 'emerald' ? '#064e3b' :
                              printThemeAccent === 'amber' ? '#78350f' :
                              printThemeAccent === 'rose' ? '#881337' : '#1e293b'
                            }}>شرایط و پائین‌نویس رسمی فاکتور:</p>
                            <p className="text-slate-600 leading-normal mb-1 font-bold">{invoiceTermsLine1}</p>
                            <p className="text-slate-600 leading-normal mb-1 font-bold">{invoiceTermsLine2}</p>
                            
                            {/* Dynamically display installments checklist inside invoice observations */}
                            {paymentMethod === 'اقساطی' && installments.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] space-y-1">
                                <p className="font-extrabold text-indigo-700 dark:text-indigo-400">جدول سررسید اقساط ماهانه خریدار بر روی فاکتور:</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-bold">
                                  <div className="col-span-2 text-slate-500 pb-0.5">
                                    مبلغ کل تسویه اقساطی: <span>{formatCurrency(calculateFinalTotal().sub(paymentDetails.downPayment))} {printColCurrencyLabel}</span> — {invoiceTermsPrepaymentLabel} <span>{formatCurrency(paymentDetails.downPayment)} {printColCurrencyLabel}</span>
                                  </div>
                                  {installments.map((inst, idx) => (
                                    <div key={idx} className="flex justify-between border-b border-slate-100 py-0.5 text-slate-700 font-mono">
                                      <span>قسط {toPersianDigits(idx + 1)}:</span>
                                      <span className="text-slate-800">{formatCurrency(inst.amount)} {printColCurrencyLabel} ({toPersianDigits(inst.dueDate)})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="w-80 text-[11px] space-y-2 p-3 bg-slate-50/40 rounded-xl border">
                            <p className="flex justify-between"><span>جمع خالص فروش فاکتور:</span> <strong className="font-mono">{formatCurrency(calculateSubtotal())} {printColCurrencyLabel}</strong></p>
                            {discount > 0 && <p className="flex justify-between text-rose-600"><span>تخفیف اعطایی:</span> <strong className="font-mono">-{formatCurrency(discount)} {printColCurrencyLabel}</strong></p>}
                            {taxRate > 0 && <p className="flex justify-between text-amber-600"><span>مالیات بر ارزش افزوده ({toPersianDigits(taxRate)}%):</span> <strong className="font-mono">+{formatCurrency(calculateTax())} {printColCurrencyLabel}</strong></p>}
                            <p className="flex justify-between font-extrabold text-xs border-t pt-1.5 text-slate-900" style={{ color: 
                              printThemeAccent === 'navy' ? '#312e81' :
                              printThemeAccent === 'emerald' ? '#064e3b' :
                              printThemeAccent === 'amber' ? '#78350f' :
                              printThemeAccent === 'rose' ? '#9f1239' : '#1e293b'
                            }}><span>مبلغ کل خالص قابل پرداخت برگه:</span> <strong className="font-mono text-indigo-700">{formatCurrency(calculateFinalTotal())} {printColCurrencyLabel}</strong></p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer stamps / signs */}
                    {printShowStamp && (
                      <div className="mt-12 pt-6 border-t border-slate-150 grid grid-cols-2 text-center text-[10px] text-slate-400 font-bold">
                        <p>مهر صادرکننده، امضا و تاییدیه فروشگاه (صندوقدار)</p>
                        <p>امضا و موافقت‌نامه خریدار کالا و خدمات رسمی</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Professional A4 & A5 Invoice Formats (BOX1 DESIGN STYLE MATCHING CUSTOM DESIDERATA) */}
                {(printLayout === 'a4' || printLayout === 'a5') && invoiceTemplate === 'box1' && (
                  <CustomDesignedInvoice
                    invoiceDesign={invoiceDesign}
                    printLayout={printLayout as 'a4' | 'a5'}
                    printShopName={printShopName}
                    printShopSlogan={printShopSlogan}
                    printShopAddress={printShopAddress}
                    printShopPhone={printShopPhone}
                    printShopLogo={printShopLogo}
                    invoiceNumber={printInvoiceNumber}
                    paymentMethod={printPaymentMethod}
                    selectedCustomer={printCustomer}
                    items={printItems}
                    discount={printDiscount}
                    taxRate={taxRate}
                    calculateSubtotal={printCalculateSubtotal}
                    calculateTax={printCalculateTax}
                    calculateFinalTotal={printCalculateFinalTotal}
                    installments={printInstallments}
                    description={printDescription}
                    printColCodeLabel={printColCodeLabel}
                    printColNameLabel={printColNameLabel}
                    printColQtyLabel={printColQtyLabel}
                    printColPriceLabel={printColPriceLabel}
                    printColTotalLabel={printColTotalLabel}
                    printColCurrencyLabel={printColCurrencyLabel}
                    receivedAmount={printReceivedAmount}
                    previousBalance={printPreviousBalance}
                  />
                )}
                {false && (
                  <div
                    id="printable-invoice"
                    className={`bg-white text-slate-950 p-8 shadow-xl border-2 leading-loose flex flex-col justify-between ${
                      printLayout === 'a4' ? 'w-[210mm] min-h-[297mm] text-[10px]' : 'w-[148mm] min-h-[210mm] text-[8px]'
                    }`}
                    style={{ 
                      borderColor: 
                        printThemeAccent === 'navy' ? '#1e3a8a' :
                        printThemeAccent === 'emerald' ? '#064e3b' :
                        printThemeAccent === 'amber' ? '#78350f' :
                        printThemeAccent === 'rose' ? '#9f1239' : '#334155',
                      direction: 'rtl'
                    }}
                  >
                    <div>
                      {/* Visual Accent Top Bar */}
                      <div className="h-2.5 -mt-8 -mx-8 mb-4" style={{ backgroundColor: 
                        printThemeAccent === 'navy' ? '#1e3a8a' :
                        printThemeAccent === 'emerald' ? '#064e3b' :
                        printThemeAccent === 'amber' ? '#78350f' :
                        printThemeAccent === 'rose' ? '#9f1239' : '#334155'
                      }} />

                      {/* Slogan and Mini Header */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-slate-100 pb-2 mb-3">
                        <span>{invoiceBox1HeaderSlogan}</span>
                        <span>{invoiceBox1HeaderBrand}</span>
                      </div>

                      {/* Main Header Boxes block */}
                      <div className="grid grid-cols-12 gap-3 mb-4">
                        {/* Store Name & Title */}
                        <div className="col-span-7 border p-4 rounded-2xl flex flex-col justify-between" style={{ 
                          borderColor: 
                            printThemeAccent === 'navy' ? '#1e3a8a40' :
                            printThemeAccent === 'emerald' ? '#064e3b40' :
                            printThemeAccent === 'amber' ? '#78350f40' :
                            printThemeAccent === 'rose' ? '#9f123940' : '#33415540',
                          backgroundColor:
                            printThemeAccent === 'navy' ? '#1e3a8a05' :
                            printThemeAccent === 'emerald' ? '#064e3b05' :
                            printThemeAccent === 'amber' ? '#78350f05' :
                            printThemeAccent === 'rose' ? '#9f123905' : '#33415505'
                        }}>
                          <div className="space-y-1">
                            <span className="text-[9px] px-2.5 py-0.5 rounded-full text-white font-extrabold inline-block" style={{ backgroundColor: 
                              printThemeAccent === 'navy' ? '#1e3a8a' :
                              printThemeAccent === 'emerald' ? '#064e3b' :
                              printThemeAccent === 'amber' ? '#78350f' :
                              printThemeAccent === 'rose' ? '#9f1239' : '#334155'
                            }}>
                              {printShopName}
                            </span>
                            <h1 className="text-base font-black text-slate-900 mt-1">{invoiceBox1Title}</h1>
                          </div>
                          <div className="text-[9px] text-slate-500 space-y-0.5 mt-2">
                            <p>نشانی دفتر مرکزی: {printShopAddress}</p>
                            <p>شماره تماس مستقیم: {toPersianDigits(printShopPhone)}</p>
                          </div>
                        </div>

                        {/* Document Metas Box (No, Date, Due) */}
                        <div className="col-span-5 border p-4 rounded-2xl flex flex-col justify-between text-[11px]" style={{ 
                          borderColor: 
                            printThemeAccent === 'navy' ? '#1e3a8a40' :
                            printThemeAccent === 'emerald' ? '#064e3b40' :
                            printThemeAccent === 'amber' ? '#78350f40' :
                            printThemeAccent === 'rose' ? '#9f123940' : '#33415540'
                        }}>
                          <div className="space-y-1.5 font-bold">
                            <div className="flex justify-between">
                              <span className="text-slate-400">{invoiceBox1NoLabel}</span>
                              <span className="font-mono text-slate-800">{invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">تاریخ صدور وجه:</span>
                              <span className="text-slate-800">{toPersianDigits('۱۴۰۵/۰۳/۳۰')}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-dashed border-slate-100">
                              <span className="text-slate-400">{invoiceBox1DueDateLabel}</span>
                              <span className="text-indigo-600 font-extrabold text-[11px]">{toPersianDigits('۱۴۰۵/۰۴/۱۵')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Customer Info Box (صادر شده برای) */}
                      <div className="border rounded-2xl p-4 mb-4 bg-slate-50/50" style={{ 
                        borderColor: 
                          printThemeAccent === 'navy' ? '#1e3a8a30' :
                          printThemeAccent === 'emerald' ? '#064e3b30' :
                          printThemeAccent === 'amber' ? '#78350f30' :
                          printThemeAccent === 'rose' ? '#9f123930' : '#33415530'
                      }}>
                        <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                          {invoiceBox1ToLabel}
                        </div>
                        <div className="grid grid-cols-12 gap-2 text-[11px] font-bold">
                          <div className="col-span-5 text-slate-800 font-black">
                            {selectedCustomer ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}` : 'خریدار متفرقه عمومی'}
                          </div>
                          <div className="col-span-4 text-slate-500 text-[10px]">
                            تلفن: <span className="font-mono text-slate-700">{selectedCustomer ? toPersianDigits(selectedCustomer.phone1) : '---'}</span>
                          </div>
                          <div className="col-span-3 text-slate-500 text-[10px] text-left">
                            کد ملی/مودی: <span className="font-mono text-slate-700">{selectedCustomer ? toPersianDigits(selectedCustomer.national_id || '---') : '---'}</span>
                          </div>
                          <div className="col-span-12 text-slate-550 text-[10px] mt-1 pt-1 border-t border-slate-100 font-medium">
                            نشانی کامل خریدار: {selectedCustomer ? selectedCustomer.address : 'نشانی عمومی'}
                          </div>
                        </div>
                      </div>

                      {/* Table block */}
                      <div className="flex-grow mt-1">
                        <table className="w-full text-right border-collapse text-[11px]">
                          <thead>
                            <tr className="text-white bg-slate-900 border" style={{ 
                              borderColor: 
                                printThemeAccent === 'navy' ? '#1e3a8a' :
                                printThemeAccent === 'emerald' ? '#064e3b' :
                                printThemeAccent === 'amber' ? '#78350f' :
                                printThemeAccent === 'rose' ? '#9f1239' : '#334155'
                            }}>
                              <th className="p-2 border font-bold w-10 text-center">ردیف</th>
                              {printShowProductCode && (
                                <th className="p-2 border font-bold text-center w-20">{printColCodeLabel}</th>
                              )}
                              <th className="p-2 border font-bold text-right">{printColNameLabel}</th>
                              <th className="p-2 border font-bold w-14 text-center">{printColQtyLabel}</th>
                              <th className="p-2 border font-bold text-left w-28">{printColPriceLabel} ({printColCurrencyLabel})</th>
                              <th className="p-2 border font-bold text-left w-32">{printColTotalLabel} ({printColCurrencyLabel})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((it, idx) => (
                              <tr key={it.product.id} className="hover:bg-slate-50 border-b">
                                <td className="p-2 border text-center font-mono font-bold text-slate-400">{toPersianDigits(idx + 1)}</td>
                                {printShowProductCode && (
                                  <td className="p-2 border text-center font-mono font-bold text-slate-650">#{toPersianDigits(it.product.code || '')}</td>
                                )}
                                <td className="p-2 border font-black text-slate-800">{it.product.name}</td>
                                <td className="p-2 border text-center font-bold font-mono">{toPersianDigits(it.quantity)}</td>
                                <td className="p-2 border text-left font-bold font-mono">{toPersianDigits(it.price.toLocaleString())}</td>
                                <td className="p-2 border text-left font-black font-mono">{toPersianDigits(new Decimal(it.price).mul(it.quantity).toNumber().toLocaleString())}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Notes and Bank Columns Side-by-Side as double boxes */}
                      <div className="grid grid-cols-12 gap-3 mt-4">
                        {/* Left Column Box: Explanations and notes */}
                        <div className="col-span-7 border p-4 rounded-2xl bg-slate-50/20 flex flex-col justify-between" style={{ 
                          borderColor: 
                            printThemeAccent === 'navy' ? '#1e3a8a25' :
                            printThemeAccent === 'emerald' ? '#064e3b25' :
                            printThemeAccent === 'amber' ? '#78350f25' :
                            printThemeAccent === 'rose' ? '#9f123925' : '#33415525'
                        }}>
                          <div>
                            <p className="font-extrabold text-[10px] text-slate-800 mb-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 
                                printThemeAccent === 'navy' ? '#1e3a8a' :
                                printThemeAccent === 'emerald' ? '#064e3b' :
                                printThemeAccent === 'amber' ? '#78350f' :
                                printThemeAccent === 'rose' ? '#9f1239' : '#334155'
                              }} />
                              <span>{invoiceBox1NotesTitle}</span>
                            </p>
                            <p className="text-slate-550 text-[10px] leading-relaxed font-bold">
                              {description || invoiceBox1NotesText}
                            </p>
                          </div>

                          {paymentMethod === 'اقساطی' && installments.length > 0 && (
                            <div className="pt-2.5 mt-2.5 border-t border-dashed border-slate-200 text-[10px] space-y-1.5">
                              <p className="font-black text-indigo-700">{invoiceTermsInstallmentsLabel}</p>
                              <div className="grid grid-cols-1 gap-1 font-bold font-mono text-[9px] text-slate-600">
                                {installments.map((inst, idx) => (
                                  <div key={idx} className="flex justify-between border-b border-slate-100 pb-0.5">
                                    <span>قسط {toPersianDigits(idx + 1)}:</span>
                                    <span>{formatCurrency(inst.amount)} {printColCurrencyLabel} ({toPersianDigits(inst.dueDate)})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column Box: Financial Accounts & Bank Information */}
                        <div className="col-span-5 border p-4 rounded-2xl flex flex-col justify-between bg-slate-50/50" style={{ 
                          borderColor: 
                            printThemeAccent === 'navy' ? '#1e3a8a30' :
                            printThemeAccent === 'emerald' ? '#064e3b30' :
                            printThemeAccent === 'amber' ? '#78350f30' :
                            printThemeAccent === 'rose' ? '#9f123930' : '#33415530'
                        }}>
                          <div>
                            <span className="text-[9px] font-extrabold px-3 py-1 rounded text-white bg-slate-800 inline-block">
                              {invoiceBox1PaymentMethod}
                            </span>
                            <p className="text-[10px] text-slate-650 font-mono mt-2 whitespace-pre-line leading-relaxed font-bold">
                              {invoiceBox1BankText}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Math calculations summary rows & Signature card */}
                      <div className="grid grid-cols-12 gap-3 mt-4 items-stretch">
                        {/* Left Signature container */}
                        <div className="col-span-7 border p-4 rounded-2xl flex justify-between items-center" style={{ 
                          borderColor: 
                            printThemeAccent === 'navy' ? '#1e3a8a30' :
                            printThemeAccent === 'emerald' ? '#064e3b30' :
                            printThemeAccent === 'amber' ? '#78350f30' :
                            printThemeAccent === 'rose' ? '#9f123930' : '#33415530'
                        }}>
                          {printShowStamp ? (
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full border border-dashed border-rose-400 bg-rose-50/40 flex items-center justify-center text-[8px] text-rose-500 font-black rotate-12 scale-90">
                                مهر مومی
                              </div>
                              <div className="text-[10px] font-bold">
                                <p className="text-slate-500">{invoiceBox1SignTitle}:</p>
                                <p className="text-slate-900 font-extrabold">{invoiceBox1SignText}</p>
                              </div>
                            </div>
                          ) : <div />}

                          <div className="text-left pl-2">
                            <span className="text-[9px] text-slate-450 font-bold">مهر و امضای تاییدیه نهایی</span>
                          </div>
                        </div>

                        {/* Right calculations summary */}
                        <div className="col-span-5 border p-4 rounded-2xl space-y-2 text-[11px] font-bold" style={{ 
                          borderColor: 
                            printThemeAccent === 'navy' ? '#1e3a8a40' :
                            printThemeAccent === 'emerald' ? '#064e3b40' :
                            printThemeAccent === 'amber' ? '#78350f40' :
                            printThemeAccent === 'rose' ? '#9f123940' : '#33415540', 
                          backgroundColor: 
                            printThemeAccent === 'navy' ? '#1e3a8a05' :
                            printThemeAccent === 'emerald' ? '#064e3b05' :
                            printThemeAccent === 'amber' ? '#78350f05' :
                            printThemeAccent === 'rose' ? '#9f123905' : '#33415505'
                        }}>
                          <div className="flex justify-between items-center text-slate-500">
                            <span>جمع ناخالص اقلام:</span>
                            <span className="font-mono">{formatCurrency(calculateSubtotal())}</span>
                          </div>
                          <div className="flex justify-between items-center text-red-500">
                            <span>تخفیف نقدی:</span>
                            <span className="font-mono">({toPersianDigits(discount.toLocaleString())})</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-500">
                            <span>مالیات صنف پوشاک:</span>
                            <span className="font-mono">{formatCurrency(calculateTax())}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-slate-900 font-extrabold" style={{ 
                            color: 
                              printThemeAccent === 'navy' ? '#1e3a8a' :
                              printThemeAccent === 'emerald' ? '#064e3b' :
                              printThemeAccent === 'amber' ? '#78350f' :
                              printThemeAccent === 'rose' ? '#9f1239' : '#334155'
                          }}>
                            <span>صداق قابل پرداخت:</span>
                            <span className="font-mono text-sm">{formatCurrency(calculateFinalTotal())} {printColCurrencyLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer Slogan note */}
                      <div className="mt-auto pt-3 border-t border-slate-100 text-center text-[9px] text-slate-400 font-bold flex items-center justify-between">
                        <span>{invoiceBox1FooterHelp}</span>
                        <span className="font-mono">صفحه ۱ از ۱</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Quick Register customer popup modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleQuickAddCustomer} className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">ثبت فوری اطلاعات مشتری فاکتور</h3>
              <button type="button" onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-red-500 font-sans transition-colors text-xs font-bold">لغو</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">نام:</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.first_name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">نام خانوادگی:</label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.last_name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">تلفن همراه مشتری:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 09123456789"
                  value={newCustomerForm.phone1}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone1: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-left font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">نام مستعار یا شهرت ( اختیاری ):</label>
                <input
                  type="text"
                  value={newCustomerForm.nickname}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, nickname: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">شماره / شناسه ملی:</label>
                <input
                  type="text"
                  value={newCustomerForm.national_id}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, national_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-left font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">نشانی پستی خریدار:</label>
                <textarea
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs"
                  rows={2}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              ثبت نهایی و انتخاب سریع مشتری در فاکتور
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
