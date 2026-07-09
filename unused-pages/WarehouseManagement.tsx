import React, { useState, useEffect } from 'react';
import { 
  Warehouse as WarehouseIcon, 
  MapPin, 
  Plus, 
  Check, 
  Trash2, 
  FileText, 
  Archive, 
  Tag, 
  ChevronLeft, 
  Search,
  Package,
  CheckCircle,
  X,
  PlusCircle,
  TrendingDown,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Coins,
  History,
  ClipboardList,
  ShoppingBag,
  Trash,
  Eye,
  FileSpreadsheet,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Decimal from 'decimal.js';
import { Warehouse, WarehouseStock, Product } from '../types';
import JalaliDatePicker, { toPersianDigits, getTodayJalali } from '../components/JalaliDatePicker';

const MySwal = withReactContent(Swal);

const getPersonDisplayName = (p: any): string => {
  if (!p) return '';
  const isLegal = p.type === 'حقوقی';
  const nameParts: string[] = [];
  
  if (isLegal) {
    if (p.title) nameParts.push(p.title);
    const personalName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    if (personalName) nameParts.push(`(نماینده: ${personalName})`);
  } else {
    const personalName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    if (personalName) nameParts.push(personalName);
    if (p.title) nameParts.push(`(${p.title})`);
  }
  
  if (p.nickname) {
    nameParts.push(`[${p.nickname}]`);
  }
  
  const finalName = nameParts.join(' ').trim();
  return finalName || p.accounting_code || 'بدون نام';
};

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  
  // Tab control: 'inventory' | 'history' | 'new_doc' | 'purchase_invoice' | 'purchase_history' | 'purchase_return' | 'purchase_return_history'
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'new_doc' | 'purchase_invoice' | 'purchase_history' | 'purchase_return' | 'purchase_return_history'>('inventory');

  // Supplier / Persons states
  const [persons, setPersons] = useState<any[]>([]);
  const [supplierSearchText, setSupplierSearchText] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Purchase Form states
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    date: '',
    invoiceNumber: '',
    discount: 0,
    paymentMethod: 'نسیه' as 'نقدی' | 'کارتخوان' | 'چکی' | 'نسیه',
    amountPaid: 0,
    description: ''
  });

  const [purchaseItems, setPurchaseItems] = useState<Array<{ product_id: string; quantity: number; unit_price: number; discount: number; total: number }>>([
    { product_id: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }
  ]);
  const [focusedRowIdx, setFocusedRowIdx] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // All purchase invoices for history
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [purchaseReturnInvoices, setPurchaseReturnInvoices] = useState<any[]>([]);
  
  // --- Purchase Return Form States ---
  const [selectedPurchaseIdForReturn, setSelectedPurchaseIdForReturn] = useState<number | null>(null);
  const [purchaseReturnItems, setPurchaseReturnItems] = useState<{
    product_id: number;
    product_name: string;
    product_code: string;
    original_qty: number;
    quantity: number;
    unit_price: number;
    selected: boolean;
  }[]>([]);
  const [purchaseReturnDiscount, setPurchaseReturnDiscount] = useState<number>(0);
  const [purchaseReturnAmountPaid, setPurchaseReturnAmountPaid] = useState<number>(0);
  const [purchaseReturnDescription, setPurchaseReturnDescription] = useState<string>('');
  const [purchaseReturnDate, setPurchaseReturnDate] = useState<string>(getTodayJalali());
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [viewingPurchase, setViewingPurchase] = useState<any | null>(null);

  // New Warehouse form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWhForm, setNewWhForm] = useState({
    name: '',
    code: '',
    address: '',
    description: ''
  });

  // Get current Shamsi Date
  const getTodayDateStr = () => {
    const t = getTodayJalali();
    return `${t.y}/${String(t.m).padStart(2, '0')}/${String(t.d).padStart(2, '0')}`;
  };

  const getTodayTimeStr = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // New Warehouse document form
  const [docForm, setDocForm] = useState({
    type: 'ورود' as 'ورود' | 'خروج' | 'انتقال',
    product_id: '',
    quantity_change: '',
    warehouse_id: '',
    to_warehouse_id: '',
    date: getTodayDateStr(),
    time: getTodayTimeStr(),
    description: ''
  });

  useEffect(() => {
    // Initialize purchaseForm date once today's date string is available
    setPurchaseForm(prev => ({
      ...prev,
      date: getTodayDateStr()
    }));
  }, []);

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
    fetchHistory();
    fetchPersons();
    fetchPurchaseInvoices();

    const preselectedSupplier = localStorage.getItem('preselected_supplier_name');
    if (preselectedSupplier) {
      setDocForm(prev => ({
        ...prev,
        type: 'ورود',
        description: `ورود کالا (خرید) از تامین‌کننده: ${preselectedSupplier}`
      }));
      localStorage.removeItem('preselected_supplier_name');
    }
  }, []);

  // Preselect supplier if preselected_supplier_id is set
  useEffect(() => {
    const preselectedId = localStorage.getItem('preselected_supplier_id');
    if (preselectedId && persons.length > 0) {
      const found = persons.find(p => String(p.id) === String(preselectedId));
      if (found) {
        setPurchaseForm(prev => ({ ...prev, supplierId: String(found.id) }));
        setSupplierSearchText(`${found.first_name || ''} ${found.last_name || ''} ${found.title || ''}`.trim());
        setActiveTab('purchase_invoice');
      }
      localStorage.removeItem('preselected_supplier_id');
    }
  }, [persons]);

  // Update form default warehouse when selected warehouse changes
  useEffect(() => {
    if (selectedWarehouse) {
      setDocForm(prev => ({
        ...prev,
        warehouse_id: String(selectedWarehouse.id)
      }));
    }
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      if (window.electronAPI?.getWarehouses) {
        const list = await window.electronAPI.getWarehouses();
        setWarehouses(list);
        if (list.length > 0) {
          // If already selected, update it
          if (selectedWarehouse) {
            const up = list.find(w => w.id === selectedWarehouse.id);
            if (up) {
              setSelectedWarehouse(up);
              fetchStocks(up.id);
              return;
            }
          }
          setSelectedWarehouse(list[0]);
          fetchStocks(list[0].id);
        } else {
          setSelectedWarehouse(null);
          setStocks([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      if (window.electronAPI?.getProducts) {
        const list = await window.electronAPI.getProducts();
        setProducts(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      if (window.electronAPI?.getInventoryHistory) {
        const list = await window.electronAPI.getInventoryHistory();
        setHistoryList(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPersons = async () => {
    try {
      if (window.electronAPI?.getPersons) {
        const list = await window.electronAPI.getPersons();
        setPersons(list || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPurchaseInvoices = async () => {
    try {
      if (window.electronAPI?.getInvoices) {
        const allInvoices = await window.electronAPI.getInvoices();
        const purchases = allInvoices.filter((inv: any) => inv.type === 'خرید');
        setPurchaseInvoices(purchases || []);
        const returns = allInvoices.filter((inv: any) => inv.type === 'برگشت از خرید');
        setPurchaseReturnInvoices(returns || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Purchase Return Form Helper Handlers ---
  const handleSelectPurchaseForReturn = (id: number) => {
    const inv = purchaseInvoices.find(i => i.id === id);
    if (!inv) return;
    setSelectedPurchaseIdForReturn(id);
    const items = (inv.items || []).map((item: any) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code || '---',
      original_qty: item.quantity,
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected: true
    }));
    setPurchaseReturnItems(items);
    setPurchaseReturnDescription(`برگشت از خرید (مرجوع کالا به تامین‌کننده) بابت فاکتور خرید شماره ${inv.invoice_number}`);
  };

  const handlePurchaseReturnItemToggle = (index: number) => {
    const updated = [...purchaseReturnItems];
    updated[index].selected = !updated[index].selected;
    setPurchaseReturnItems(updated);
  };

  const handlePurchaseReturnQtyChange = (index: number, val: string) => {
    const updated = [...purchaseReturnItems];
    updated[index].quantity = parseFloat(val) || 0;
    setPurchaseReturnItems(updated);
  };

  const handlePurchaseReturnPriceChange = (index: number, val: string) => {
    const updated = [...purchaseReturnItems];
    updated[index].unit_price = parseFloat(val) || 0;
    setPurchaseReturnItems(updated);
  };

  const calculatePurchaseReturnTotal = () => {
    return purchaseReturnItems.reduce((sum, item) => {
      if (item.selected) {
        return sum.plus(new Decimal(item.quantity).mul(item.unit_price));
      }
      return sum;
    }, new Decimal(0));
  };

  const handlePurchaseReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseIdForReturn) {
      MySwal.fire('خطا', 'لطفاً ابتدا فاکتور خرید مرجع را انتخاب کنید.', 'warning');
      return;
    }
    const selectedItems = purchaseReturnItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      MySwal.fire('خطا', 'لطفاً حداقل یک کالا را برای برگشت انتخاب کنید.', 'warning');
      return;
    }

    // Validation
    for (const item of selectedItems) {
      if (item.quantity <= 0) {
        MySwal.fire('خطا', `تعداد برگشتی برای ${item.product_name} باید بزرگتر از صفر باشد.`, 'warning');
        return;
      }
      if (item.quantity > item.original_qty) {
        MySwal.fire('خطا', `تعداد مرجوعی کالا (${item.quantity}) برای ${item.product_name} نمی‌تواند بیشتر از فاکتور خرید اصلی (${item.original_qty}) باشد.`, 'warning');
        return;
      }
    }

    const originalInvoice = purchaseInvoices.find(i => i.id === selectedPurchaseIdForReturn);

    const returnData = {
      type: 'purchase_return',
      customer_id: originalInvoice?.customer_id || null, // supplier_id
      invoice_id: selectedPurchaseIdForReturn,
      original_invoice_num: originalInvoice?.invoice_number || '',
      date: purchaseReturnDate,
      items: selectedItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      })),
      discount: purchaseReturnDiscount,
      amountPaid: purchaseReturnAmountPaid, // cash received back from supplier
      description: purchaseReturnDescription
    };

    try {
      if (window.electronAPI?.saveReturn) {
        const res = await window.electronAPI.saveReturn(returnData);
        if (res.success) {
          await MySwal.fire({
            icon: 'success',
            title: 'برگشت به تامین‌کننده با موفقیت ثبت شد',
            text: `سند برگشت به تامین‌کننده شماره ${res.invoice_number} ثبت گردید، کاردکس انبار ثبت شد، موجودی انبارها کاهش یافت و حساب تامین‌کننده اصلاح شد.`,
            confirmButtonText: 'تایید و بستن'
          });
          // Reset form
          setSelectedPurchaseIdForReturn(null);
          setPurchaseReturnItems([]);
          setPurchaseReturnDiscount(0);
          setPurchaseReturnAmountPaid(0);
          setPurchaseReturnDescription('');
          // Refresh everything
          fetchPurchaseInvoices();
          fetchWarehouses();
          fetchProducts();
          fetchHistory();
          setActiveTab('purchase_return_history');
        } else {
          throw new Error(res.error || 'خطا در ثبت برگشت');
        }
      }
    } catch (err: any) {
      MySwal.fire('خطا', err.message || 'ثبت سند برگشتی با خطا مواجه شد.', 'error');
    }
  };

  const addPurchaseItemRow = () => {
    setPurchaseItems(prev => [
      ...prev,
      { product_id: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }
    ]);
  };

  const removePurchaseItemRow = (index: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };

  const updatePurchaseItemField = (index: number, field: string, value: any) => {
    setPurchaseItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      
      // Calculate row total
      const qty = parseFloat(String(field === 'quantity' ? value : item.quantity)) || 0;
      const price = parseFloat(String(field === 'unit_price' ? value : item.unit_price)) || 0;
      const disc = parseFloat(String(field === 'discount' ? value : item.discount)) || 0;
      
      item.total = (qty * price) - disc;
      updated[index] = item;
      return updated;
    });
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.supplierId) {
      MySwal.fire('خطا', 'لطفاً تامین‌کننده را انتخاب کنید.', 'warning');
      return;
    }

    const validItems = purchaseItems.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) {
      MySwal.fire('خطا', 'حداقل یک کالا باید با تعداد بزرگتر از صفر ثبت شود.', 'warning');
      return;
    }

    // Calculating summary
    const totalAmount = validItems.reduce((sum, item) => sum + item.total, 0);
    const finalAmount = Math.max(0, totalAmount - parseFloat(String(purchaseForm.discount || 0)));
    const receivedAmount = parseFloat(String(purchaseForm.amountPaid || 0));

    // Determine invoice status
    // If it's cash/card and fully paid, or amountPaid equals or exceeds finalAmount
    const status = (purchaseForm.paymentMethod !== 'نسیه' && receivedAmount >= finalAmount) ? 'پرداخت شده' : 'پرداخت نشده';

    const invoiceData = {
      invoice_number: purchaseForm.invoiceNumber.trim() || undefined,
      customer_id: parseInt(purchaseForm.supplierId),
      date: purchaseForm.date,
      total_amount: totalAmount,
      discount: parseFloat(String(purchaseForm.discount || 0)),
      tax: 0,
      final_amount: finalAmount,
      status: status,
      payment_method: purchaseForm.paymentMethod,
      received_amount: receivedAmount,
      description: purchaseForm.description,
      type: 'خرید',
      items: validItems.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: parseFloat(String(item.quantity)),
        unit_price: parseFloat(String(item.unit_price)),
        total: item.total
      }))
    };

    try {
      if (window.electronAPI?.saveInvoice) {
        const res = await window.electronAPI.saveInvoice(invoiceData);
        if (res.success) {
          MySwal.fire({
            icon: 'success',
            title: 'فاکتور خرید ثبت شد',
            text: `فاکتور خرید شماره ${res.invoice_number} با موفقیت ثبت شد و موجودی کالاها بروزرسانی گردید.`,
            timer: 2000,
            showConfirmButton: false
          });

          // Reset Form
          setPurchaseForm({
            supplierId: '',
            date: getTodayDateStr(),
            invoiceNumber: '',
            discount: 0,
            paymentMethod: 'نسیه' as 'نقدی' | 'کارتخوان' | 'چکی' | 'نسیه',
            amountPaid: 0,
            description: ''
          });
          setPurchaseItems([{ product_id: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }]);

          // Refresh states
          fetchProducts();
          fetchHistory();
          fetchPurchaseInvoices();
          if (selectedWarehouse) {
            fetchStocks(selectedWarehouse.id);
          }
          setActiveTab('purchase_history');
        } else {
          MySwal.fire('خطا', res.error || 'خطا در ثبت فاکتور خرید', 'error');
        }
      }
    } catch (err: any) {
      MySwal.fire('خطا', err.message || 'خطا در ثبت فاکتور خرید', 'error');
    }
  };

  const handleDeletePurchaseInvoice = async (invoiceId: number, invoiceNum: string) => {
    const confirm = await MySwal.fire({
      title: 'آیا مطمئن هستید؟',
      text: `با حذف فاکتور خرید شماره ${invoiceNum}، تمام موجودی‌های ورودی کسر شده و گردش مالی تامین‌کننده برگشت داده خواهد شد.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.deleteInvoice) {
          const savedUserStr = sessionStorage.getItem('current_user');
          const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
          const currentUsername = savedUser?.username || 'مدیر سیستم';
          const res = await window.electronAPI.deleteInvoice({ id: invoiceId, username: currentUsername });
          if (res.success) {
            MySwal.fire({
              icon: 'success',
              title: 'فاکتور خرید حذف شد',
              text: 'عملیات با موفقیت انجام شد.',
              timer: 1500,
              showConfirmButton: false
            });
            fetchProducts();
            fetchHistory();
            fetchPurchaseInvoices();
            if (selectedWarehouse) {
              fetchStocks(selectedWarehouse.id);
            }
          } else {
            MySwal.fire('خطا', res.error || 'خطا در حذف فاکتور', 'error');
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در ارتباط با سرور', 'error');
      }
    }
  };

  const handleDeletePurchaseReturnInvoice = async (invoiceId: number, returnNum: string) => {
    const confirm = await MySwal.fire({
      title: 'آیا مطمئن هستید؟',
      text: `با حذف سند برگشت خرید شماره ${returnNum}، کالاها دوباره به موجودی انبار بازمی‌گردند و بدهی تامین‌کننده اصلاح خواهد شد.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.deleteInvoice) {
          const savedUserStr = sessionStorage.getItem('current_user');
          const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
          const currentUsername = savedUser?.username || 'مدیر سیستم';
          const res = await window.electronAPI.deleteInvoice({ id: invoiceId, username: currentUsername });
          if (res.success) {
            MySwal.fire({
              icon: 'success',
              title: 'سند برگشت خرید حذف شد',
              text: 'عملیات با موفقیت انجام شد.',
              timer: 1500,
              showConfirmButton: false
            });
            fetchProducts();
            fetchHistory();
            fetchPurchaseInvoices();
            if (selectedWarehouse) {
              fetchStocks(selectedWarehouse.id);
            }
          } else {
            MySwal.fire('خطا', res.error || 'خطا در حذف سند برگشت خرید', 'error');
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در ارتباط با سرور', 'error');
      }
    }
  };

  const fetchStocks = async (warehouseId: any) => {
    try {
      if (window.electronAPI?.getWarehouseStocks) {
        const data = await window.electronAPI.getWarehouseStocks(warehouseId);
        setStocks(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectWarehouse = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    fetchStocks(wh.id);
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhForm.name || !newWhForm.code) {
      MySwal.fire('خطا', 'نام و کد انبار اجباری هستند.', 'warning');
      return;
    }

    try {
      if (window.electronAPI?.saveWarehouse) {
        const res = await window.electronAPI.saveWarehouse(newWhForm);
        if (res.success) {
          setShowAddModal(false);
          setNewWhForm({
            name: '',
            code: '',
            address: '',
            description: ''
          });
          MySwal.fire({
            icon: 'success',
            title: 'انبار ایجاد شد',
            text: 'انبار جدید با موفقیت به انبارداری سیستم اضافه شد.',
            timer: 1500,
            showConfirmButton: false
          });
          fetchWarehouses();
        }
      }
    } catch (e: any) {
      MySwal.fire('خطا', e.message || 'خطا در ثبت انبار جدید', 'error');
    }
  };

  const handleDeleteWarehouse = async (wh: Warehouse) => {
    if (wh.code === 'WH-01') {
      MySwal.fire('خطای دسترسی', 'انبار پیش‌فرض سیستم (مغازه/ویترین) قابل حذف نمی‌باشد.', 'error');
      return;
    }

    const confirm = await MySwal.fire({
      title: `آیا از حذف انبار "${wh.name}" اطمینان دارید؟`,
      text: "با حذف انبار، تمام سطرهای تخصیص کالا در این انبار حذف خواهند شد. این عمل قابل بازگشت نیست!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'بله، حذف شود',
      cancelButtonText: 'انصراف'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.deleteWarehouse) {
          const res = await window.electronAPI.deleteWarehouse(wh.id);
          if (res.success) {
            MySwal.fire('حذف شد', 'انبار با موفقیت حذف گردید.', 'success');
            if (selectedWarehouse?.id === wh.id) {
              setSelectedWarehouse(null);
            }
            fetchWarehouses();
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در حذف انبار', 'error');
      }
    }
  };

  // Submit manual entry/exit/transfer document
  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.product_id || !docForm.quantity_change || !docForm.warehouse_id) {
      MySwal.fire('خطا', 'لطفاً تمامی فیلدهای اجباری را تکمیل نمایید.', 'warning');
      return;
    }

    if (docForm.type === 'انتقال' && !docForm.to_warehouse_id) {
      MySwal.fire('خطا', 'برای انتقال کالا، انتخاب انبار مقصد اجباری است.', 'warning');
      return;
    }

    try {
      if (window.electronAPI?.addWarehouseTransaction) {
        const formattedDate = `${docForm.date} ${docForm.time}`;
        const prod = products.find(p => p.id === parseInt(docForm.product_id));
        const whSource = warehouses.find(w => w.id === parseInt(docForm.warehouse_id));
        const whDest = warehouses.find(w => w.id === parseInt(docForm.to_warehouse_id));

        let dynamicDesc = docForm.description;
        if (!dynamicDesc) {
          if (docForm.type === 'ورود') {
            dynamicDesc = `ورود دستی کالا به انبار ${whSource?.name || ''}`;
          } else if (docForm.type === 'خروج') {
            dynamicDesc = `خروج دستی و ضایعات کالا از انبار ${whSource?.name || ''}`;
          } else if (docForm.type === 'انتقال') {
            dynamicDesc = `انتقال فیزیکی کالا از انبار ${whSource?.name || ''} به انبار ${whDest?.name || ''}`;
          }
        }

        const savedUserStr = sessionStorage.getItem('current_user');
        const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        const currentUsername = savedUser?.username || 'مدیر سیستم';

        const res = await window.electronAPI.addWarehouseTransaction({
          warehouse_id: parseInt(docForm.warehouse_id),
          to_warehouse_id: docForm.to_warehouse_id ? parseInt(docForm.to_warehouse_id) : undefined,
          product_id: parseInt(docForm.product_id),
          quantity_change: parseFloat(docForm.quantity_change),
          type: docForm.type,
          description: dynamicDesc,
          date: formattedDate,
          username: currentUsername
        });

        if (res.success) {
          MySwal.fire({
            icon: 'success',
            title: 'سند انبار ثبت شد',
            text: 'تراکنش انبارداری با موفقیت پردازش شده و موجودی انبارها بروزرسانی گردید.',
            timer: 1500,
            showConfirmButton: false
          });

          // Reset form fields
          setDocForm(prev => ({
            ...prev,
            product_id: '',
            quantity_change: '',
            to_warehouse_id: '',
            description: '',
            time: getTodayTimeStr()
          }));

          // Reload data
          await fetchWarehouses();
          if (selectedWarehouse) {
            await fetchStocks(selectedWarehouse.id);
          }
          await fetchHistory();
          setActiveTab('inventory'); // Go back to inventory view
        } else {
          MySwal.fire('خطای پردازش', res.error || 'عملیات با خطا مواجه شد.', 'error');
        }
      }
    } catch (err: any) {
      MySwal.fire('خطای سرور', err.message || 'خطای غیرمنتظره', 'error');
    }
  };

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

  const filteredStocks = stocks.filter(st => {
    // Exclude services from physical inventory list
    const prod = products.find(p => p.id === st.product_id);
    if (prod && prod.type === 'service') return false;
    
    return st.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           st.product_code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredHistory = historyList.filter(tx => {
    // If we're filtering by a selected warehouse, only show transactions relating to it
    const whMatch = !selectedWarehouse || 
                    tx.warehouse_id === selectedWarehouse.id || 
                    tx.to_warehouse_id === selectedWarehouse.id;
    
    const queryMatch = !historySearchQuery ||
                       tx.product_name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                       tx.product_code.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                       (tx.description && tx.description.toLowerCase().includes(historySearchQuery.toLowerCase()));

    return whMatch && queryMatch;
  });

  return (
    <div className="space-y-6 text-right animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <WarehouseIcon className="w-7 h-7 text-indigo-500" />
            <span>سیستم انبارداری و مدیریت فیزیکی کالا</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            کنترل دقیق موجودی کالاها، ورود و خروج دستی کالا با فاکتور، انتقال بین انبارها و تاریخچه تراکنش‌های حسابداری انبار
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 text-xs"
          >
            <Plus className="w-5 h-5" />
            <span>ایجاد انبار جدید</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Right Menu: Warehouse cards list */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-14rem)] shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
              <WarehouseIcon className="w-5 h-5 text-indigo-500" />
              <span>لیست انبارها ({toPersianNum(warehouses.length)})</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
            {warehouses.map(wh => {
              const isSelected = selectedWarehouse?.id === wh.id;
              return (
                <div
                  key={wh.id}
                  onClick={() => handleSelectWarehouse(wh)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-3 relative ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/10 shadow-sm shadow-indigo-500/5'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white text-sm">{wh.name}</h3>
                      <span className="text-[10px] text-slate-400 block font-mono font-bold mt-0.5">{toPersianNum(wh.code)}</span>
                    </div>

                    {wh.code !== 'WH-01' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWarehouse(wh);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                        title="حذف انبار"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {wh.address && (
                    <p className="text-[10px] text-slate-450 flex items-center gap-1 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{wh.address}</span>
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>اقلام متمایز: <b className="text-slate-700 dark:text-white font-black">{toPersianNum(wh.unique_products || 0)}</b> کالا</span>
                    <span>موجودی کل: <b className="text-slate-700 dark:text-white font-black">{toPersianNum(wh.total_items || 0)}</b> عدد</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Left Side: Advanced Tabbed Panel */}
        <div className="lg:col-span-3 space-y-6">
          {selectedWarehouse ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[calc(100vh-14rem)] overflow-hidden">
              
              {/* Warehouse summary info & Tab buttons */}
              <div className="p-6 pb-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md font-mono">{toPersianNum(selectedWarehouse.code)}</span>
                    <h2 className="text-lg font-black text-slate-850 dark:text-white mt-1">{selectedWarehouse.name}</h2>
                    {selectedWarehouse.description && (
                      <p className="text-[11px] text-slate-400 mt-1 max-w-lg leading-relaxed">{selectedWarehouse.description}</p>
                    )}
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'inventory'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-200/20'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>موجودی فعلی انبار</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('purchase_invoice')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'purchase_invoice'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-200/20'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>ثبت فاکتور خرید</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('purchase_history')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'purchase_history'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-200/20'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>سابقه خرید تامین‌کنندگان</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('purchase_return')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'purchase_return'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-200/20'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4 text-orange-500" />
                      <span>برگشت به تامین‌کننده</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('purchase_return_history')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'purchase_return_history'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-200/20'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      <History className="w-4 h-4 text-orange-500" />
                      <span>سابقه برگشتی خرید</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'history'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-200/20'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      <span>تاریخچه تراکنش‌ها (کاردکس)</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('new_doc')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeTab === 'new_doc'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-200/20'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>ثبت سند جدید انبار</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TAB CONTENT VIEWPORT */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                
                {/* 1. CURRENT STOCK TAB */}
                {activeTab === 'inventory' && (
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="flex justify-between items-center shrink-0">
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">کالاهای موجود در {selectedWarehouse.name} ({toPersianNum(filteredStocks.length)} قلم)</h3>
                      <div className="relative w-full sm:w-64">
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="جستجو کالا در این انبار..."
                          className="w-full pl-3 pr-9 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {filteredStocks.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full space-y-3">
                          <Package className="w-12 h-12 stroke-[1.5] text-slate-350" />
                          <span className="text-xs">هیچ موجودی یا محصولی در این انبار یافت نشد.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredStocks.map(stock => {
                            return (
                                <div
                                  key={stock.id}
                                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 space-y-3 shadow-xs hover:border-indigo-550/30 dark:hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-900 transition-all group"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-mono text-[9px] font-bold text-slate-400">کد: {toPersianNum(stock.product_code)}</span>
                                      <h4 className="font-bold text-slate-850 dark:text-white text-xs mt-0.5">{stock.product_name}</h4>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                      <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-mono" title="موجودی فیزیکی کل">
                                        {toPersianNum(stock.quantity)} {stock.unit}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/40 flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                    <span>خرید: <b className="font-bold text-slate-700 dark:text-white font-mono">{formatCurrency(stock.cost)}</b> ریال</span>
                                    <span>فروش: <b className="font-bold text-slate-700 dark:text-white font-mono">{formatCurrency(stock.price)}</b> ریال</span>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. TRANSACTION HISTORY TAB */}
                {activeTab === 'history' && (
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">سندهای حسابداری و ورود/خروج کالا مربوط به این انبار</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">تراکنش‌هایی که در این انبار پردازش شده‌اند را در زیر مشاهده می‌نمایید.</p>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          placeholder="جستجو کالا یا توضیحات سند..."
                          className="w-full pl-3 pr-9 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-800 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                      {filteredHistory.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full space-y-3">
                          <History className="w-12 h-12 stroke-[1.5] text-slate-350 animate-pulse" />
                          <span className="text-xs">هیچ تراکنش یا سند انبارداری یافت نشد.</span>
                        </div>
                      ) : (
                        <table className="w-full text-right text-xs border-collapse min-w-[700px]">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-950/10">
                              <th className="py-3 px-2 text-center w-12">ردیف</th>
                              <th className="py-3 px-2">تاریخ و ساعت سند</th>
                              <th className="py-3 px-4">نام کالا</th>
                              <th className="py-3 px-2 text-center">نوع عملیات</th>
                              <th className="py-3 px-2 text-center">تعداد فیزیکی</th>
                              <th className="py-3 px-4">جزئیات انبار</th>
                              <th className="py-3 px-4">شرح تراکنش و بابت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHistory.map((tx, idx) => {
                              // Color Tag for transactions
                              let typeBg = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
                              if (tx.type === 'ورود' || tx.type === 'خرید' || tx.type === 'برگشت') {
                                typeBg = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400';
                              } else if (tx.type === 'خروج' || tx.type === 'فروش' || tx.type === 'ضایعات') {
                                typeBg = 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400';
                              } else if (tx.type === 'انتقال') {
                                typeBg = 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400';
                              }

                              const isPositive = tx.quantity_change > 0;

                              return (
                                <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors">
                                  <td className="py-3 px-2 text-center font-bold text-slate-400 font-mono">{toPersianNum(idx + 1)}</td>
                                  <td className="py-3 px-2 font-mono font-bold text-slate-600 dark:text-slate-300">
                                    {toPersianNum(tx.date)}
                                  </td>
                                  <td className="py-3 px-4 font-black text-slate-800 dark:text-white">
                                    {tx.product_name}
                                    <span className="block text-[9px] text-slate-400 font-mono font-bold">کد کالا: {toPersianNum(tx.product_code)}</span>
                                  </td>
                                  <td className="py-3 px-2 text-center">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${typeBg}`}>
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2 text-center font-mono font-bold">
                                    <span className={isPositive ? 'text-emerald-600' : 'text-rose-500'}>
                                      {isPositive ? '+' : ''}{toPersianNum(tx.quantity_change)}
                                    </span>
                                    <span className="text-[9px] text-slate-400 mr-0.5">{tx.unit}</span>
                                  </td>
                                  <td className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {tx.type === 'انتقال' ? (
                                      <div className="flex items-center gap-1">
                                        <span>{tx.warehouse_name}</span>
                                        <ArrowRightLeft className="w-3 h-3 text-indigo-500" />
                                        <span>{tx.to_warehouse_name}</span>
                                      </div>
                                    ) : (
                                      <span>{tx.warehouse_name || selectedWarehouse.name}</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-xs text-slate-550 dark:text-slate-400 leading-relaxed max-w-xs truncate" title={tx.description}>
                                    {tx.description || 'توضیحات ندارد'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. NEW DOCUMENT TAB (ENTRY / EXIT / TRANSFER FORM) */}
                {activeTab === 'new_doc' && (
                  <div className="space-y-6 max-w-xl mx-auto">
                    <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                        <PlusCircle className="w-5 h-5 text-indigo-500" />
                        <span>ثبت سند ورود، خروج، یا انتقال فیزیکی انبار کالا</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تراکنش مورد نظر خود را انتخاب کرده و موجودی را با دقت بروزرسانی کنید.</p>
                    </div>

                    <form onSubmit={handleSubmitDocument} className="space-y-4">
                      
                      {/* Form Operation Type buttons */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 mb-2">نوع تراکنش انبار:</label>
                        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-150 dark:bg-slate-950 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setDocForm(prev => ({ ...prev, type: 'ورود', to_warehouse_id: '' }))}
                            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              docForm.type === 'ورود' 
                                ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm font-black' 
                                : 'text-slate-550 hover:text-slate-800'
                            }`}
                          >
                            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                            <span>ورود کالا (خرید)</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setDocForm(prev => ({ ...prev, type: 'خروج', to_warehouse_id: '' }))}
                            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              docForm.type === 'خروج' 
                                ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm font-black' 
                                : 'text-slate-550 hover:text-slate-800'
                            }`}
                          >
                            <ArrowUpRight className="w-4 h-4 text-rose-500" />
                            <span>خروج کالا (ضایعات)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDocForm(prev => ({ ...prev, type: 'انتقال' }))}
                            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              docForm.type === 'انتقال' 
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-black' 
                                : 'text-slate-550 hover:text-slate-800'
                            }`}
                          >
                            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                            <span>انتقال بین انبارها</span>
                          </button>
                        </div>
                      </div>

                      {/* Product select Dropdown */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">انتخاب کالا جهت عملیات:</label>
                        <select
                          required
                          value={docForm.product_id}
                          onChange={(e) => setDocForm(prev => ({ ...prev, product_id: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                        >
                          <option value="">-- کالا را انتخاب کنید --</option>
                          {products.filter(p => p.type !== 'service').map(p => (
                            <option key={p.id} value={p.id}>{p.name} (کد: {p.code})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Target Warehouse (Source) */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">
                            {docForm.type === 'انتقال' ? 'انبار مبدا:' : 'انبار مورد نظر:'}
                          </label>
                          <select
                            required
                            value={docForm.warehouse_id}
                            onChange={(e) => setDocForm(prev => ({ ...prev, warehouse_id: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                          >
                            {warehouses.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Destination Warehouse (only for transfer operation) */}
                        {docForm.type === 'انتقال' && (
                          <div className="animate-in slide-in-from-right duration-200">
                            <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">انبار مقصد:</label>
                            <select
                              required
                              value={docForm.to_warehouse_id}
                              onChange={(e) => setDocForm(prev => ({ ...prev, to_warehouse_id: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                            >
                              <option value="">-- انتخاب انبار مقصد --</option>
                              {warehouses.map(w => (
                                <option key={w.id} value={w.id} disabled={String(w.id) === docForm.warehouse_id}>{w.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Quantity to change */}
                        <div className={docForm.type !== 'انتقال' ? 'sm:col-span-1' : ''}>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">تعداد / مقدار فیزیکی کالا:</label>
                          <input
                            type="number"
                            step="any"
                            required
                            min="0.001"
                            value={docForm.quantity_change}
                            onChange={(e) => setDocForm(prev => ({ ...prev, quantity_change: e.target.value }))}
                            placeholder="مثال: ۵۰"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-left font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Date & Time fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <JalaliDatePicker
                          value={docForm.date}
                          onChange={(val) => setDocForm(prev => ({ ...prev, date: val }))}
                          label="تاریخ ثبت سند (شمسی):"
                        />

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-1">ساعت ثبت (ساعت:دقیقه):</label>
                          <input
                            type="text"
                            required
                            value={docForm.time}
                            onChange={(e) => setDocForm(prev => ({ ...prev, time: e.target.value }))}
                            placeholder="۱۲:۳۰"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-center font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Custom transaction details/description */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">شرح سند یا دلیل تراکنش (اختیاری):</label>
                        <textarea
                          rows={2}
                          value={docForm.description}
                          onChange={(e) => setDocForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="مثال: ورود محموله جدید غله خریداری شده از دولت، یا انتقال به انبار توزیع کالا"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs resize-none"
                        />
                      </div>

                      {/* Submit action buttons */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('inventory')}
                          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-all"
                        >
                          انصراف
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/15 transition-all hover:-translate-y-0.5"
                        >
                          ثبت نهایی سند انبارداری
                        </button>
                      </div>

                    </form>
                  </div>
                )}

                {/* 4. REGISTER PURCHASE INVOICE TAB */}
                {activeTab === 'purchase_invoice' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                          <ShoppingBag className="w-5 h-5 text-indigo-500" />
                          <span>ثبت فاکتور خرید جدید و ورود کالا</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          ثبت اقلام فاکتور خرید دریافتی از تامین‌کننده. موجودی کالاها به طور خودکار افزایش یافته، کاردکس کالاها و حساب تامین‌کننده بروزرسانی خواهد شد.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitPurchase} className="space-y-6">
                      {/* Supplier & Header details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80">
                        {/* Supplier Select (Searchable) */}
                        <div className="relative">
                          <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 mb-1.5">تامین‌کننده / فروشنده کالا:</label>
                          <div className="relative z-50">
                            <input
                              type="text"
                              required
                              placeholder="برای جستجو نام تامین‌کننده تایپ کنید..."
                              value={
                                supplierSearchText || 
                                (purchaseForm.supplierId 
                                  ? (() => {
                                      const s = persons.find(p => String(p.id) === String(purchaseForm.supplierId));
                                      return s ? getPersonDisplayName(s) : '';
                                    })()
                                  : ''
                                )
                              }
                              onFocus={() => setShowSupplierDropdown(true)}
                              onChange={(e) => {
                                setSupplierSearchText(e.target.value);
                                setShowSupplierDropdown(true);
                                if (!e.target.value) {
                                  setPurchaseForm(prev => ({ ...prev, supplierId: '' }));
                                }
                              }}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {purchaseForm.supplierId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPurchaseForm(prev => ({ ...prev, supplierId: '' }));
                                  setSupplierSearchText('');
                                }}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-black"
                              >
                                حذف
                              </button>
                            )}
                          </div>

                          {showSupplierDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowSupplierDropdown(false)} />
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                {(() => {
                                  const q = supplierSearchText.toLowerCase().trim();
                                  const matchedList = persons.filter(p => {
                                    if (!q) {
                                      return p.category === 'تامین‌کننده';
                                    }
                                    const first_name = (p.first_name || '').toLowerCase();
                                    const last_name = (p.last_name || '').toLowerCase();
                                    const fullName = `${first_name} ${last_name}`.toLowerCase();
                                    const title = (p.title || '').toLowerCase();
                                    const nickname = (p.nickname || '').toLowerCase();
                                    const phone1 = (p.phone1 || '').toLowerCase();
                                    const phone2 = (p.phone2 || '').toLowerCase();
                                    const phone3 = (p.phone3 || '').toLowerCase();
                                    const nationalId = (p.national_id || '').toLowerCase();
                                    const regNum = (p.registration_number || '').toLowerCase();
                                    const econCode = (p.economic_code || '').toLowerCase();
                                    const accCode = (p.accounting_code || '').toLowerCase();
                                    
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
                                  
                                  if (matchedList.length === 0) {
                                    return <div className="p-3 text-center text-xs text-slate-400">تامین‌کننده‌ای با این مشخصات یافت نشد.</div>;
                                  }
                                  
                                  return matchedList.map(p => {
                                    const name = getPersonDisplayName(p);
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          setPurchaseForm(prev => ({ ...prev, supplierId: String(p.id) }));
                                          setSupplierSearchText(name);
                                          setShowSupplierDropdown(false);
                                        }}
                                        className="w-full text-right px-4 py-2.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/50 last:border-b-0 block transition-colors duration-150"
                                      >
                                        <div className="font-bold text-slate-800 dark:text-slate-100">{name}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 font-normal">
                                          کد حسابداری: {p.accounting_code || '---'} | تلفن: {p.phone1 || '---'} | کد‌ملی/ثبت: {p.national_id || p.registration_number || '---'}
                                        </div>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Invoice Number */}
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 mb-1.5">شماره فاکتور خرید:</label>
                          <input
                            type="text"
                            required
                            value={purchaseForm.invoiceNumber}
                            onChange={(e) => setPurchaseForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                            placeholder="شماره فاکتور خرید تامین‌کننده"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-center font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        {/* Invoice Date */}
                        <JalaliDatePicker
                          value={purchaseForm.date}
                          onChange={(val) => setPurchaseForm(prev => ({ ...prev, date: val }))}
                          label="تاریخ فاکتور خرید (شمسی):"
                        />
                      </div>

                      {/* Items Table */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">لیست کالاهای فاکتور</span>
                          <button
                            type="button"
                            onClick={addPurchaseItemRow}
                            className="px-3 py-1.5 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>افزودن ردیف کالا</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-950/20 text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800 select-none">
                                <th className="py-2.5 px-3 text-center w-12">ردیف</th>
                                <th className="py-2.5 px-3">انتخاب کالا / محصول انبار</th>
                                <th className="py-2.5 px-3 w-28 text-center">تعداد / مقدار</th>
                                <th className="py-2.5 px-3 w-40 text-center">قیمت خرید واحد (ریال)</th>
                                <th className="py-2.5 px-3 w-32 text-center">تخفیف ردیف (ریال)</th>
                                <th className="py-2.5 px-3 w-40 text-left pl-6">مبلغ کل ردیف (ریال)</th>
                                <th className="py-2.5 px-3 w-12 text-center">حذف</th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchaseItems.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/20 dark:hover:bg-slate-950/10">
                                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">{toPersianNum(idx + 1)}</td>
                                  <td className="py-2 px-3">
                                    <div className="relative">
                                      {focusedRowIdx === idx && (
                                        <div 
                                          className="fixed inset-0 z-10" 
                                          onClick={() => {
                                            setFocusedRowIdx(null);
                                            setProductSearchQuery('');
                                          }} 
                                        />
                                      )}
                                      <div className="relative z-10">
                                        <input
                                          type="text"
                                          placeholder="جستجوی کالا با نام یا کد..."
                                          value={focusedRowIdx === idx ? productSearchQuery : (products.find(p => String(p.id) === String(item.product_id))?.name || '')}
                                          onFocus={() => {
                                            setFocusedRowIdx(idx);
                                            const curr = products.find(p => String(p.id) === String(item.product_id));
                                            setProductSearchQuery(curr ? curr.name : '');
                                          }}
                                          onChange={(e) => setProductSearchQuery(e.target.value)}
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-semibold focus:outline-none focus:bg-white dark:focus:bg-slate-950 text-slate-800 dark:text-white"
                                        />
                                        {item.product_id && focusedRowIdx !== idx && (
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-mono bg-slate-100/80 dark:bg-slate-900 px-1 py-0.5 rounded">
                                            کد: {toPersianNum(products.find(p => String(p.id) === String(item.product_id))?.code || '')}
                                          </span>
                                        )}
                                      </div>

                                      {focusedRowIdx === idx && (
                                        <div className="absolute right-0 left-0 z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-150 dark:divide-slate-800/60 scrollbar-thin text-right">
                                          {products.filter(p => p.type !== 'service' && (!productSearchQuery || p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || p.code.toLowerCase().includes(productSearchQuery.toLowerCase()))).length === 0 ? (
                                            <div className="p-3 text-center text-xs text-slate-400">کالایی یافت نشد.</div>
                                          ) : (
                                            products.filter(p => p.type !== 'service' && (!productSearchQuery || p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || p.code.toLowerCase().includes(productSearchQuery.toLowerCase()))).map(p => (
                                              <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                  updatePurchaseItemField(idx, 'product_id', String(p.id));
                                                  updatePurchaseItemField(idx, 'unit_price', p.cost || 0);
                                                  setFocusedRowIdx(null);
                                                  setProductSearchQuery('');
                                                }}
                                                className="w-full text-right px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-950/40 text-slate-700 dark:text-slate-200 flex justify-between items-center transition-colors"
                                              >
                                                <div>
                                                  <span className="font-bold text-slate-850 dark:text-white block">{p.name}</span>
                                                  <span className="text-[10px] text-slate-400 block font-mono">کد کالا: {toPersianNum(p.code)}</span>
                                                </div>
                                                <div className="text-left font-mono shrink-0">
                                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">آخرین خرید: {p.cost ? `${toPersianNum(p.cost.toLocaleString())} ریال` : 'بدون سابقه'}</span>
                                                  <span className="text-[9px] text-slate-400 block">موجودی: {toPersianNum(p.total_stock)} {p.unit}</span>
                                                </div>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0.01"
                                      required
                                      value={item.quantity}
                                      onChange={(e) => updatePurchaseItemField(idx, 'quantity', e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-center font-mono font-bold focus:outline-none focus:bg-white dark:focus:bg-slate-950"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="number"
                                      required
                                      min="0"
                                      value={item.unit_price}
                                      onChange={(e) => updatePurchaseItemField(idx, 'unit_price', e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-center font-mono font-bold focus:outline-none focus:bg-white dark:focus:bg-slate-950"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="number"
                                      required
                                      min="0"
                                      value={item.discount}
                                      onChange={(e) => updatePurchaseItemField(idx, 'discount', e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-center font-mono font-bold focus:outline-none focus:bg-white dark:focus:bg-slate-950"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-left pl-6 font-mono font-black text-slate-700 dark:text-white">
                                    {toPersianNum(Math.max(0, item.total).toLocaleString())}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      disabled={purchaseItems.length === 1}
                                      onClick={() => removePurchaseItemRow(idx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md transition-colors disabled:opacity-30"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Financial details summary panel */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                        {/* Summary numbers block */}
                        <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-inner">
                          <h4 className="text-xs font-black text-slate-500 mb-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5">خلاصه وضعیت مالی فاکتور خرید</h4>
                          
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-550 dark:text-slate-400">جمع کل اقلام:</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {toPersianNum(purchaseItems.reduce((s, i) => s + i.total, 0).toLocaleString())} ریال
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-550 dark:text-slate-400">تخفیف فاکتور:</span>
                            <span className="font-mono font-bold text-rose-500">
                              {toPersianNum(parseFloat(String(purchaseForm.discount || 0)).toLocaleString())} ریال
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-200 dark:border-slate-800">
                            <span className="font-extrabold text-slate-800 dark:text-white">مبلغ قابل پرداخت:</span>
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                              {toPersianNum(Math.max(0, purchaseItems.reduce((s, i) => s + i.total, 0) - parseFloat(String(purchaseForm.discount || 0))).toLocaleString())} ریال
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/50 dark:border-slate-800/55">
                            <span className="text-slate-550 dark:text-slate-400">پرداخت شده (نقدی/بانک):</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {toPersianNum(parseFloat(String(purchaseForm.amountPaid || 0)).toLocaleString())} ریال
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-550 dark:text-slate-400">باقی‌مانده نسیه (بدهی ما):</span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              {toPersianNum(Math.max(0, (purchaseItems.reduce((s, i) => s + i.total, 0) - parseFloat(String(purchaseForm.discount || 0))) - parseFloat(String(purchaseForm.amountPaid || 0))).toLocaleString())} ریال
                            </span>
                          </div>
                        </div>

                        {/* Payment & Terms settings */}
                        <div className="lg:col-span-2 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Overall Discount Input */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 mb-1.5">تخفیف کلی فاکتور (ریال):</label>
                              <input
                                type="number"
                                min="0"
                                value={purchaseForm.discount}
                                onChange={(e) => setPurchaseForm(prev => {
                                  const disc = parseFloat(e.target.value) || 0;
                                  const total = purchaseItems.reduce((s, i) => s + i.total, 0) - disc;
                                  const finalTotal = Math.max(0, total);
                                  return {
                                    ...prev,
                                    discount: disc,
                                    amountPaid: prev.paymentMethod === 'نسیه' ? 0 : finalTotal
                                  };
                                })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold font-mono text-left focus:outline-none"
                              />
                            </div>

                            {/* Payment Method */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 mb-1.5">روش پرداخت و تسویه:</label>
                              <select
                                value={purchaseForm.paymentMethod}
                                onChange={(e) => {
                                  const method = e.target.value as any;
                                  setPurchaseForm(prev => {
                                    const total = purchaseItems.reduce((s, i) => s + i.total, 0) - parseFloat(String(prev.discount || 0));
                                    const finalTotal = Math.max(0, total);
                                    return {
                                      ...prev,
                                      paymentMethod: method,
                                      amountPaid: method === 'نسیه' ? 0 : finalTotal
                                    };
                                  });
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold focus:outline-none"
                              >
                                <option value="نقدی">💸 نقدی (صندوق)</option>
                                <option value="کارتخوان">💳 کارت به کارت / پوز</option>
                                <option value="چکی">✍️ چک بانکی</option>
                                <option value="نسیه">🤝 نسیه (حساب دفتری)</option>
                              </select>
                            </div>

                            {/* Amount Paid */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 mb-1.5">مبلغ پرداخت شده فعلی (ریال):</label>
                              <input
                                type="number"
                                min="0"
                                disabled={purchaseForm.paymentMethod === 'نسیه'}
                                value={purchaseForm.amountPaid}
                                onChange={(e) => setPurchaseForm(prev => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold font-mono text-left focus:outline-none disabled:opacity-50"
                              />
                            </div>
                          </div>

                          {/* Description text input */}
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-450 dark:text-slate-400 mb-1.5">شرح فاکتور یا توضیحات تکمیلی:</label>
                            <input
                              type="text"
                              value={purchaseForm.description}
                              onChange={(e) => setPurchaseForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="توضیحات تکمیلی در مورد شرایط تحویل، تامین‌کننده، فاکتور و غیره..."
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-right focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Final Submit action buttons */}
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPurchaseForm({
                              supplierId: '',
                              date: getTodayDateStr(),
                              invoiceNumber: '',
                              discount: 0,
                              paymentMethod: 'نسیه',
                              amountPaid: 0,
                              description: ''
                            });
                            setPurchaseItems([{ product_id: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }]);
                            setActiveTab('inventory');
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-all"
                        >
                          انصراف
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/15 transition-all hover:-translate-y-0.5 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>ثبت نهایی فاکتور خرید تامین‌کننده</span>
                        </button>
                      </div>

                    </form>
                  </div>
                )}

                {/* 5. PURCHASE HISTORY TAB */}
                {activeTab === 'purchase_history' && (
                  <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-200">
                    
                    {/* Filter toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
                      
                      {/* Search inputs */}
                      <div className="flex flex-1 w-full gap-2">
                        {/* Invoice Number Search */}
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                            <Search className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="جستجوی شماره فاکتور خرید..."
                            value={purchaseSearchQuery}
                            onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold focus:outline-none"
                          />
                        </div>

                        {/* Supplier filter */}
                        <div className="w-48 sm:w-64">
                          <select
                            value={selectedSupplierFilter}
                            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold focus:outline-none"
                          >
                            <option value="">-- نمایش همه تامین‌کنندگان --</option>
                            {persons.filter(p => p.category === 'تامین‌کننده').map(p => (
                              <option key={p.id} value={p.id}>{getPersonDisplayName(p)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                        تعداد کل: {toPersianNum(purchaseInvoices.length)} فاکتور خرید ثبت شده
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                      {purchaseInvoices.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                          <ShoppingBag className="w-10 h-10 stroke-[1.5] text-indigo-400" />
                          <p className="text-xs font-bold">هیچ فاکتور خریدی در سیستم یافت نشد.</p>
                          <p className="text-[11px] text-slate-500">برای ثبت اولین خرید، از تب "ثبت فاکتور خرید" استفاده نمایید.</p>
                        </div>
                      ) : (
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800 select-none">
                              <th className="py-3 px-3 text-center w-12">ردیف</th>
                              <th className="py-3 px-3">شماره فاکتور خرید</th>
                              <th className="py-3 px-3">تاریخ فاکتور</th>
                              <th className="py-3 px-3">تامین‌کننده / فروشنده</th>
                              <th className="py-3 px-3 text-left pl-6">مبلغ نهایی (ریال)</th>
                              <th className="py-3 px-3 text-left pl-6">مبلغ پرداخت شده (ریال)</th>
                              <th className="py-3 px-3 text-center">روش تسویه</th>
                              <th className="py-3 px-3 text-center">وضعیت تسویه</th>
                              <th className="py-3 px-3 text-center w-24">عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchaseInvoices
                              .filter(inv => {
                                if (selectedSupplierFilter && String(inv.customer_id) !== selectedSupplierFilter) return false;
                                if (purchaseSearchQuery && !inv.invoice_number.toLowerCase().includes(purchaseSearchQuery.toLowerCase())) return false;
                                return true;
                              })
                              .map((inv, index) => {
                                const isPaid = inv.status === 'پرداخت شده';
                                return (
                                  <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/20 dark:hover:bg-slate-950/10">
                                    <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400">{toPersianNum(index + 1)}</td>
                                    <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{toPersianNum(inv.invoice_number)}</td>
                                    <td className="py-3.5 px-3 font-mono">{toPersianNum(inv.date)}</td>
                                    <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white">{inv.customer_name || 'تامین‌کننده ناشناس'}</td>
                                    <td className="py-3.5 px-3 text-left pl-6 font-mono font-black text-slate-700 dark:text-white">
                                      {toPersianNum(inv.final_amount.toLocaleString())}
                                    </td>
                                    <td className="py-3.5 px-3 text-left pl-6 font-mono text-slate-600 dark:text-slate-400">
                                      {toPersianNum((inv.received_amount || 0).toLocaleString())}
                                    </td>
                                    <td className="py-3.5 px-3 text-center font-bold text-slate-500">{inv.payment_method || 'نسیه'}</td>
                                    <td className="py-3.5 px-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        isPaid
                                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {isPaid ? 'تسویه شده' : 'دارای باقی‌مانده / نسیه'}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setViewingPurchase(inv)}
                                          className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-all"
                                          title="مشاهده اقلام فاکتور"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeletePurchaseInvoice(inv.id, inv.invoice_number)}
                                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all"
                                          title="حذف و ابطال فاکتور خرید"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. REGISTER PURCHASE RETURN TAB */}
                {activeTab === 'purchase_return' && (
                  <div className="space-y-4 h-full flex flex-col overflow-y-auto animate-in fade-in duration-200">
                    <form onSubmit={handlePurchaseReturnSubmit} className="space-y-4 pb-6">
                      
                      <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <label className="block text-xs font-black text-slate-550 dark:text-slate-400 mb-2">
                          انتخاب فاکتور خرید مرجع (تامین‌کننده):
                        </label>
                        <select
                          value={selectedPurchaseIdForReturn || ''}
                          onChange={(e) => handleSelectPurchaseForReturn(Number(e.target.value))}
                          className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 font-bold focus:outline-none text-slate-800 dark:text-white"
                        >
                          <option value="">-- فاکتور خرید اصلی را جهت برگشت کالا انتخاب کنید --</option>
                          {purchaseInvoices.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              فاکتور خرید شماره {toPersianNum(inv.invoice_number)} - تاریخ {toPersianNum(inv.date)} - {inv.customer_name} ({toPersianNum(inv.final_amount.toLocaleString())} ریال)
                            </option>
                          ))}
                        </select>
                      </div>

                      {!selectedPurchaseIdForReturn ? (
                        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex flex-col items-center justify-center space-y-3">
                          <RotateCcw className="w-10 h-10 stroke-[1.5] text-orange-400 animate-pulse" />
                          <p className="text-xs font-bold">در انتظار انتخاب فاکتور مرجع...</p>
                          <p className="text-[11px] text-slate-500">لطفاً فاکتور خرید اصلی ثبت‌شده از تامین‌کننده را انتخاب کنید تا اقلام آن برای مرجوعی بارگذاری شود.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                          
                          {/* Items Checklist Table */}
                          <div className="lg:col-span-2 space-y-4">
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-black text-slate-700 dark:text-white">اقلام قابل مرجوع در این فاکتور خرید</span>
                                <span className="text-[10px] text-slate-500 font-bold">تعداد اقلام: {toPersianNum(purchaseReturnItems.length)} کالا</span>
                              </div>
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950/20 text-slate-400 font-extrabold border-b border-slate-150 dark:border-slate-800">
                                    <th className="py-2.5 px-3 text-center w-12">برگشت؟</th>
                                    <th className="py-2.5 px-3">نام و مشخصات کالا</th>
                                    <th className="py-2.5 px-3 text-center w-24">تعداد خرید</th>
                                    <th className="py-2.5 px-3 text-center w-28">تعداد برگشتی</th>
                                    <th className="py-2.5 px-3 text-center w-32">قیمت برگشتی (ریال)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {purchaseReturnItems.map((item, idx) => (
                                    <tr key={idx} className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/10 ${item.selected ? 'bg-orange-50/10 dark:bg-orange-950/5' : 'opacity-60'}`}>
                                      <td className="py-3 px-3 text-center">
                                        <input
                                          type="checkbox"
                                          checked={item.selected}
                                          onChange={() => handlePurchaseReturnItemToggle(idx)}
                                          className="w-4 h-4 text-orange-600 focus:ring-orange-500 rounded border-slate-300"
                                        />
                                      </td>
                                      <td className="py-3 px-3">
                                        <p className="font-bold text-slate-800 dark:text-white">{item.product_name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">کد: {toPersianNum(item.product_code)}</p>
                                      </td>
                                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">{toPersianNum(item.original_qty)}</td>
                                      <td className="py-3 px-3">
                                        <input
                                          type="number"
                                          disabled={!item.selected}
                                          value={item.quantity}
                                          onChange={(e) => handlePurchaseReturnQtyChange(idx, e.target.value)}
                                          max={item.original_qty}
                                          min="0.01"
                                          step="0.01"
                                          className="w-20 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 dark:text-white"
                                        />
                                      </td>
                                      <td className="py-3 px-3">
                                        <input
                                          type="number"
                                          disabled={!item.selected}
                                          value={item.unit_price}
                                          onChange={(e) => handlePurchaseReturnPriceChange(idx, e.target.value)}
                                          min="0"
                                          className="w-28 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 dark:text-white"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Purchase Return Metadata & Summary */}
                          <div className="space-y-4">
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
                              <h3 className="font-black text-xs text-slate-700 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                                <RotateCcw className="w-4 h-4 text-orange-500" />
                                <span>خلاصه و مقادیر سند برگشتی</span>
                              </h3>

                              <div className="space-y-3">
                                <JalaliDatePicker
                                  value={purchaseReturnDate}
                                  onChange={setPurchaseReturnDate}
                                  label="تاریخ ثبت برگشت کالا (شمسی):"
                                />

                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1">کاهش حساب / طلب از تامین‌کننده (ریال):</label>
                                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-850 text-left">
                                    <span className="font-mono font-black text-sm text-slate-800 dark:text-white">
                                      {toPersianNum(calculatePurchaseReturnTotal().toLocaleString())}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 mr-1">ریال</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1">مبلغ تخفیف توافق شده (ریال):</label>
                                  <input
                                    type="number"
                                    value={purchaseReturnDiscount}
                                    onChange={(e) => setPurchaseReturnDiscount(parseFloat(e.target.value) || 0)}
                                    placeholder="۰"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-left text-slate-800 dark:text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1">مبلغ نقدی دریافتی از تامین‌کننده (ریال):</label>
                                  <input
                                    type="number"
                                    value={purchaseReturnAmountPaid}
                                    onChange={(e) => setPurchaseReturnAmountPaid(parseFloat(e.target.value) || 0)}
                                    placeholder="مثال: نقدی دریافتی"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-left text-emerald-600 dark:text-emerald-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-400 mb-1">توضیحات و شرح سند برگشتی:</label>
                                  <textarea
                                    value={purchaseReturnDescription}
                                    onChange={(e) => setPurchaseReturnDescription(e.target.value)}
                                    rows={3}
                                    placeholder="توضیحات مربوط به علت برگشت..."
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                                  />
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPurchaseIdForReturn(null);
                                    setPurchaseReturnItems([]);
                                    setPurchaseReturnDiscount(0);
                                    setPurchaseReturnAmountPaid(0);
                                    setPurchaseReturnDescription('');
                                    setActiveTab('inventory');
                                  }}
                                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-all"
                                >
                                  انصراف
                                </button>
                                <button
                                  type="submit"
                                  className="flex-[2] py-2.5 text-xs font-extrabold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-lg shadow-orange-500/15 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>ثبت نهایی برگشت خرید</span>
                                </button>
                              </div>

                            </div>
                          </div>

                        </div>
                      )}

                    </form>
                  </div>
                )}

                {/* 7. PURCHASE RETURNS HISTORY TAB */}
                {activeTab === 'purchase_return_history' && (
                  <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-200 font-sans">
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0">
                      <div className="text-xs font-black text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                        تعداد کل: {toPersianNum(purchaseReturnInvoices.length)} سند برگشتی خرید ثبت شده
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                      {purchaseReturnInvoices.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                          <RotateCcw className="w-10 h-10 stroke-[1.5] text-orange-400" />
                          <p className="text-xs font-bold">هیچ برگشتی خریدی ثبت نشده است.</p>
                          <p className="text-[11px] text-slate-500">جهت مرجوع کالاها، از تب "برگشت به تامین‌کننده" اقدام نمایید.</p>
                        </div>
                      ) : (
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800 select-none">
                              <th className="py-3 px-3 text-center w-12">ردیف</th>
                              <th className="py-3 px-3">شماره سند برگشتی</th>
                              <th className="py-3 px-3">فاکتور خرید مرجع</th>
                              <th className="py-3 px-3">تاریخ برگشت</th>
                              <th className="py-3 px-3">تامین‌کننده / فروشنده</th>
                              <th className="py-3 px-3 text-left pl-6">مبلغ برگشتی (ریال)</th>
                              <th className="py-3 px-3 text-left pl-6">تخفیف برگشتی (ریال)</th>
                              <th className="py-3 px-3 text-left pl-6">مبلغ دریافتی (ریال)</th>
                              <th className="py-3 px-3 text-center w-24">عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchaseReturnInvoices.map((inv, index) => (
                              <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/20 dark:hover:bg-slate-950/10">
                                <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400">{toPersianNum(index + 1)}</td>
                                <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{toPersianNum(inv.invoice_number)}</td>
                                <td className="py-3.5 px-3 font-mono text-slate-500">فاکتور {toPersianNum(inv.original_invoice_num || '---')}</td>
                                <td className="py-3.5 px-3 font-mono">{toPersianNum(inv.date)}</td>
                                <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white">{inv.customer_name || 'تامین‌کننده ناشناس'}</td>
                                <td className="py-3.5 px-3 text-left pl-6 font-mono font-black text-slate-700 dark:text-white">
                                  {toPersianNum((inv.total_amount || 0).toLocaleString())}
                                </td>
                                <td className="py-3.5 px-3 text-left pl-6 font-mono text-rose-500">
                                  {toPersianNum((inv.discount || 0).toLocaleString())}
                                </td>
                                <td className="py-3.5 px-3 text-left pl-6 font-mono text-emerald-600 dark:text-emerald-400">
                                  {toPersianNum((inv.received_amount || 0).toLocaleString())}
                                </td>
                                <td className="py-3.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setViewingPurchase(inv)}
                                      className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-all"
                                      title="مشاهده اقلام مرجوعی"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePurchaseReturnInvoice(inv.id, inv.invoice_number)}
                                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all"
                                      title="حذف و ابطال سند برگشت خرید"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full shadow-sm space-y-4">
              <WarehouseIcon className="w-12 h-12 stroke-[1.5] text-slate-350" />
              <h3 className="font-bold text-sm">هیچ انباری انتخاب نشده است</h3>
              <p className="text-xs text-slate-500 max-w-sm">لطفاً یکی از انبارهای موجود در نوار سمت راست را جهت دسترسی به تراز کالا، موجودی و تراکنش‌ها انتخاب نمایید.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: CREATE WAREHOUSE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-right leading-relaxed"
          >
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-indigo-500" />
                <span>تعریف انبار فیزیکی جدید</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">کد انحصاری انبار (مانند WH-02)</label>
                <input
                  type="text"
                  required
                  value={newWhForm.code}
                  onChange={(e) => setNewWhForm({...newWhForm, code: e.target.value})}
                  placeholder="WH-02"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">نام انبار</label>
                <input
                  type="text"
                  required
                  value={newWhForm.name}
                  onChange={(e) => setNewWhForm({...newWhForm, name: e.target.value})}
                  placeholder="مثال: انبار ویترین یا انبار طبقه دوم"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">آدرس فیزیکی انبار</label>
                <input
                  type="text"
                  value={newWhForm.address}
                  onChange={(e) => setNewWhForm({...newWhForm, address: e.target.value})}
                  placeholder="خیابان جمهوری، اتاق شماره ۴"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">شرح انبار</label>
                <textarea
                  rows={2}
                  value={newWhForm.description}
                  onChange={(e) => setNewWhForm({...newWhForm, description: e.target.value})}
                  placeholder="توضیحات کلی برای پرسنل..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/20 -mx-5 -mb-5 p-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-850 rounded-lg transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-0.5"
                >
                  ثبت انبار فیزیکی
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: VIEW PURCHASE DETAILS */}
      {viewingPurchase && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-right leading-relaxed"
          >
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                <span>جزئیات فاکتور خرید شماره {toPersianNum(viewingPurchase.invoice_number)}</span>
              </h3>
              <button onClick={() => setViewingPurchase(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-400">تامین‌کننده / فروشنده:</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{viewingPurchase.customer_name}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-400">تاریخ ثبت فاکتور:</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-white">{toPersianNum(viewingPurchase.date)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-400">روش تسویه فاکتور:</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{viewingPurchase.payment_method || 'نسیه'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-400">وضعیت تسویه فاکتور:</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    {viewingPurchase.status === 'پرداخت شده' ? '✅ تسویه شده' : '❌ دارای بدهی دفتری'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-450 mb-2">اقلام خریداری شده فاکتور:</h4>
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/25 text-slate-400 font-extrabold border-b border-slate-150 dark:border-slate-800 select-none">
                        <th className="py-2 px-3 text-center w-12">ردیف</th>
                        <th className="py-2 px-3">نام کالا / کالا</th>
                        <th className="py-2 px-3 text-center w-24">تعداد / مقدار</th>
                        <th className="py-2 px-3 text-center w-32">قیمت خرید واحد (ریال)</th>
                        <th className="py-2 px-3 text-left pl-6 w-36">جمع کل ردیف (ریال)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingPurchase.items || []).map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/10">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">{toPersianNum(idx + 1)}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">{item.product_name} <span className="text-[10px] text-slate-400 font-mono font-bold">({toPersianNum(item.product_code)})</span></td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{toPersianNum(item.quantity)} {item.product_unit}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{toPersianNum((item.unit_price || 0).toLocaleString())}</td>
                          <td className="py-2.5 px-3 text-left pl-6 font-mono font-black text-slate-700 dark:text-white">
                            {toPersianNum((item.total || 0).toLocaleString())}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation breakdown */}
              <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between text-xs font-bold">
                <div className="space-y-1 text-slate-550 dark:text-slate-450">
                  <p>جمع فاکتور خرید: <span className="font-mono text-slate-800 dark:text-white mr-1">{toPersianNum((viewingPurchase.total_amount || 0).toLocaleString())}</span> ریال</p>
                  <p>تخفیف کل فاکتور: <span className="font-mono text-rose-500 mr-1">{toPersianNum((viewingPurchase.discount || 0).toLocaleString())}</span> ریال</p>
                </div>
                <div className="space-y-1 text-slate-550 dark:text-slate-450 text-left">
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">مبلغ کل نهایی: {toPersianNum((viewingPurchase.final_amount || 0).toLocaleString())} ریال</p>
                  <p className="text-emerald-600 dark:text-emerald-400">مبلغ پرداخت شده: {toPersianNum((viewingPurchase.received_amount || 0).toLocaleString())} ریال</p>
                </div>
              </div>

              {viewingPurchase.description && (
                <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-950/30 rounded-xl text-xs">
                  <span className="block font-extrabold text-slate-400 mb-1">توضیحات فاکتور خرید:</span>
                  <p className="text-slate-650 dark:text-slate-350 leading-relaxed">{viewingPurchase.description}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/25">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5"
              >
                <ClipboardList className="w-4 h-4" />
                <span>چاپ مستقیم فاکتور خرید</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-250/50 dark:hover:bg-slate-850 rounded-lg transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                بستن پنجره جزئیات
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
