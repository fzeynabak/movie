import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Tag, 
  Layers, 
  Shuffle, 
  Image as ImageIcon, 
  Warehouse as WarehouseIcon, 
  Check, 
  X, 
  ChevronRight, 
  AlertCircle, 
  Cpu, 
  Barcode, 
  DollarSign, 
  Archive,
  ArrowRight,
  Plus,
  Briefcase,
  Layers2,
  FileText,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useNavigate, useLocation } from 'react-router-dom';
import Decimal from 'decimal.js';
import { Category, Brand, Warehouse } from '../types';

const MySwal = withReactContent(Swal);

export default function ProductNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingProduct = location.state?.product || null;

  // Configuration and Data lists
  const [config, setConfig] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productsCount, setProductsCount] = useState<number>(0);

  // Tab state 'product' | 'service'
  const [activeTab, setActiveTab] = useState<'product' | 'service'>('product');

  // Checklist of required documents for services
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [newDocText, setNewDocText] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    id: editingProduct?.id || null,
    name: editingProduct?.name || '',
    code: editingProduct?.code || '',
    price: editingProduct?.price || 0,
    cost: editingProduct?.cost || 0,
    category_id: editingProduct?.category_id || '',
    brand_id: editingProduct?.brand_id || '',
    unit: editingProduct?.unit || 'عدد',
    description: editingProduct?.description || '',
    internal_sku: editingProduct?.internal_sku || '',
    serial_number: editingProduct?.serial_number || '',
    image_base64: editingProduct?.image_base64 || '',
    barcode: editingProduct?.barcode || '',
    min_stock: editingProduct?.min_stock || 0,
    initial_warehouse_id: '',
    initial_qty: 0,
    wholesale_price: editingProduct?.wholesale_price || 0,
    min_selling_price: editingProduct?.min_selling_price || 0,
    status: editingProduct?.status || 'فعال'
  });

  const [profitPercent, setProfitPercent] = useState<number>(0);

  // Modal displays
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [showBrandPopup, setShowBrandPopup] = useState(false);

  // Quick temporary selects
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  // Dynamic calculation of profit percentage based on cost and price
  useEffect(() => {
    if (formData.cost > 0) {
      try {
        const costDec = new Decimal(formData.cost);
        const priceDec = new Decimal(formData.price);
        const diff = priceDec.minus(costDec);
        const pct = diff.div(costDec).times(100).toNumber();
        setProfitPercent(parseFloat(pct.toFixed(2)));
      } catch (err) {
        setProfitPercent(0);
      }
    } else {
      setProfitPercent(0);
    }
  }, [formData.cost, formData.price]);

  // When profit percent is modified by user, calculate and set price
  const handleProfitPercentChange = (pctValue: number) => {
    setProfitPercent(pctValue);
    if (formData.cost > 0) {
      try {
        const costDec = new Decimal(formData.cost);
        const pctDec = new Decimal(pctValue).div(100).plus(1);
        const computedPrice = costDec.times(pctDec).toFixed(0);
        setFormData(prev => ({ ...prev, price: parseInt(computedPrice) }));
      } catch (err) {
        // Safe fallback
      }
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (editingProduct) {
      setActiveTab(editingProduct.type || 'product');
      if (editingProduct.required_docs) {
        try {
          setRequiredDocs(JSON.parse(editingProduct.required_docs));
        } catch {
          setRequiredDocs([]);
        }
      }
    }
  }, [editingProduct]);

  const fetchMetadata = async () => {
    try {
      if (window.electronAPI?.getConfig) {
        const cfg = await window.electronAPI.getConfig();
        setConfig(cfg);
        
        // If adding a new product and no code has been inputted yet, auto generate
        if (!editingProduct) {
          generateAutoCode(cfg);
        }
      }

      if (window.electronAPI?.getCategories) {
        const cats = await window.electronAPI.getCategories();
        setCategories(cats);
        if (editingProduct?.category_id) {
          const found = cats.find(c => c.id === editingProduct.category_id);
          if (found) setSelectedCategory(found);
        }
      }

      if (window.electronAPI?.getBrands) {
        const brs = await window.electronAPI.getBrands();
        setBrands(brs);
        if (editingProduct?.brand_id) {
          const found = brs.find(b => b.id === editingProduct.brand_id);
          if (found) setSelectedBrand(found);
        }
      }

      if (window.electronAPI?.getWarehouses) {
        const whs = await window.electronAPI.getWarehouses();
        setWarehouses(whs);
        if (whs.length > 0) {
          setFormData(prev => ({ ...prev, initial_warehouse_id: String(whs[0].id) }));
        }
      }

      if (window.electronAPI?.getProducts) {
        const prods = await window.electronAPI.getProducts();
        setProductsCount(prods.length);
      }
    } catch (e) {
      console.error('Error fetching categories & configs:', e);
    }
  };

  const generateAutoCode = (cfg = config) => {
    const isService = activeTab === 'service';
    const prefix = isService ? 'SRV-' : (cfg?.productPrefix || 'PRD-');
    const startNum = Number(cfg?.productStartNumber || 1001);
    const nextCode = `${prefix}${startNum + productsCount}`;
    setFormData(prev => ({ ...prev, code: nextCode }));
  };

  // Whenever activeTab changes and we are creating a new item, update the code format automatically
  useEffect(() => {
    if (!editingProduct && config) {
      generateAutoCode(config);
    }
  }, [activeTab, config, productsCount]);

  const generateInternalSku = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generated = `SKU-${Date.now().toString().slice(-6)}-${randomSuffix}`;
    setFormData(prev => ({ ...prev, internal_sku: generated }));
  };

  const generateSerialNumber = () => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const generated = `SN-${randomSuffix}`;
    setFormData(prev => ({ ...prev, serial_number: generated }));
  };

  const handleSelectImage = async () => {
    try {
      if (window.electronAPI?.selectLocalImage) {
        const res = await window.electronAPI.selectLocalImage();
        if (res.success && res.base64) {
          setFormData(prev => ({ ...prev, image_base64: res.base64 }));
          MySwal.fire({
            icon: 'success',
            title: 'تصویر انتخاب شد',
            text: 'تصویر فایل با موفقیت از سیستم بارگذاری گردید.',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
    } catch (e: any) {
      MySwal.fire('خطا', e.message || 'خطا در بارگذاری تصویر', 'error');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name.trim()) {
      MySwal.fire('نقص اطلاعات', `نام ${activeTab === 'service' ? 'خدمت' : 'کالا'} نمی‌تواند خالی باشد.`, 'warning');
      return;
    }

    if (!formData.code || !formData.code.trim()) {
      MySwal.fire('نقص اطلاعات', `وارد کردن کد شناسه ${activeTab === 'service' ? 'خدمت' : 'کالا'} الزامی است.`, 'warning');
      return;
    }

    if (Number(formData.price) < 0) {
      MySwal.fire('مبلغ نامعتبر', `قیمت فروش ${activeTab === 'service' ? 'خدمت' : 'کالا'} نمی‌تواند یک عدد منفی باشد.`, 'warning');
      return;
    }

    if (activeTab === 'product' && Number(formData.cost) < 0) {
      MySwal.fire('مبلغ نامعتبر', 'مبلغ دفتری خرید (قیمت خرید) کالا نمی‌تواند منفی باشد.', 'warning');
      return;
    }

    try {
      if (window.electronAPI?.saveProduct) {
        const payload = {
          ...formData,
          type: activeTab,
          required_docs: activeTab === 'service' ? JSON.stringify(requiredDocs) : null,
          category_id: selectedCategory ? selectedCategory.id : null,
          brand_id: activeTab === 'product' && selectedBrand ? selectedBrand.id : null,
          price: Number(formData.price),
          cost: Number(formData.cost),
          wholesale_price: Number(formData.wholesale_price || 0),
          min_selling_price: Number(formData.min_selling_price || 0),
          status: formData.status || 'فعال',
          initial_qty: activeTab === 'product' ? Number(formData.initial_qty) : 0,
          initial_warehouse_id: activeTab === 'product' && formData.initial_warehouse_id ? parseInt(formData.initial_warehouse_id) : null
        };

        const res = await window.electronAPI.saveProduct(payload);
        if (res.success) {
          await MySwal.fire({
            icon: 'success',
            title: `${activeTab === 'service' ? 'خدمت / سرویس' : 'کالا / محصول'} با موفقیت ذخیره شد`,
            text: editingProduct ? 'تغییرات با موفقیت در دیتابیس بروزرسانی شد.' : 'رکورد جدید با موفقیت در دیتابیس ثبت گردید.',
            timer: 2000,
            showConfirmButton: false
          });
          navigate('/products/list');
        }
      }
    } catch (e: any) {
      MySwal.fire('خطا در ذخیره‌سازی', e.message || 'خطا در حین ثبت اطلاعات دیتابیس SQLite', 'error');
    }
  };

  const addDocChecklist = () => {
    if (!newDocText.trim()) return;
    if (requiredDocs.includes(newDocText.trim())) {
      MySwal.fire('تکراری', 'این مدرک قبلاً به لیست الزامات اضافه شده است.', 'info');
      return;
    }
    setRequiredDocs([...requiredDocs, newDocText.trim()]);
    setNewDocText('');
  };

  const removeDocChecklist = (index: number) => {
    setRequiredDocs(requiredDocs.filter((_, i) => i !== index));
  };

  const addQuickTemplate = (text: string) => {
    if (requiredDocs.includes(text)) return;
    setRequiredDocs([...requiredDocs, text]);
  };

  const formatCurrency = (amount: number | string) => {
    try {
      const num = new Decimal(amount || 0).toFixed(0);
      return Number(num).toLocaleString('fa-IR');
    } catch {
      return Number(amount || 0).toLocaleString('fa-IR');
    }
  };

  return (
    <div className="space-y-6 text-right animate-in fade-in duration-300">
      
      {/* Header card with Back action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-500" />
            <span>{editingProduct ? 'ویرایش اطلاعات پایه' : 'ثبت و تعریف ردیف جدید'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {editingProduct 
              ? 'ویرایش مشخصات فنی، تعرفه پولی، دسته‌بندی و مدارک مورد نیاز' 
              : 'تعریف کالای جدید گرید فیزیکی یا خدمات غیر فیزیکی به همراه کاتالوگ مدارک مشتری و فیلدهای هویتی'}
          </p>
        </div>
        <div>
          <button
            onClick={() => navigate('/products/list')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-950 font-semibold text-sm transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            <span>بازگشت به کاتالوگ</span>
          </button>
        </div>
      </div>

      {/* Tabs segment for selection */}
      {!editingProduct && (
        <div className="max-w-md ml-auto space-y-2">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('product')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'product'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-4 h-4 text-indigo-500" />
              <span>محصول فیزیکی (کالا)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('service')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'service'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>خدمات عمومی و VIP (سرویس)</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 text-right pr-1 leading-relaxed">
            <strong>کالا یا خدمت:</strong> کالا دارای موجودی فیزیکی و انبارداری است، اما خدمت جنبه غیرفیزیکی دارد (مانند دستمزد یا مشاوره)
          </p>
        </div>
      )}

      {editingProduct && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-800 dark:text-indigo-400 max-w-sm mr-auto text-xs font-bold shadow-sm">
          {activeTab === 'service' ? <Briefcase className="w-4 h-4" /> : <Package className="w-4 h-4" />}
          <span>در حال ویرایش ردیف از نوع: {activeTab === 'service' ? 'خدمات / سرویس غیر فیزیکی' : 'کالای فیزیکی انبار'}</span>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Image layout & initial inventory */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Product Image Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center">
            <h3 className="w-full text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-500" />
              <span>تصویر {activeTab === 'service' ? 'خدمات' : 'کالا'}</span>
            </h3>

            <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950/40 relative select-none group">
              {formData.image_base64 ? (
                <>
                  <img src={formData.image_base64} alt="Product logo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image_base64: '' }))}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:scale-115 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center p-4">
                  {activeTab === 'service' ? (
                    <Briefcase className="w-12 h-12 stroke-[1] text-indigo-400 mx-auto mb-2" />
                  ) : (
                    <ImageIcon className="w-12 h-12 stroke-[1] text-slate-400 mx-auto mb-2" />
                  )}
                  <span className="text-xs text-slate-450 block font-medium">بدون تصویر بارگذاری‌شده</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSelectImage}
              className="mt-5 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-350 py-2.5 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-750 transition-all flex items-center justify-center gap-1.5"
            >
              <span>انتخاب فایل تصویر از دیسک سخت...</span>
            </button>
            <span className="text-[10px] text-slate-400 mt-2 block text-center">اندازه پیشنهادی: ۵۱۲ در ۵۱۲ پیکسل</span>
          </div>

          {/* Warehouse Initial Stock placement - ONLY FOR PHYSICAL PRODUCTS */}
          {activeTab === 'product' && !editingProduct && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 animate-in slide-in-from-top duration-300">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-emerald-500" />
                <span>موجودی اولیه و انبارداری مستقل</span>
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">انتخاب انبار ذخیره اولیه</label>
                  <select
                    value={formData.initial_warehouse_id}
                    onChange={(e) => setFormData({ ...formData, initial_warehouse_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">تعداد موجودی ورودی اولیه</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs pointer-events-none">
                      {formData.unit}
                    </span>
                    <input
                      type="number"
                      value={formData.initial_qty === 0 ? '' : formData.initial_qty}
                      onChange={(e) => setFormData({ ...formData, initial_qty: Math.max(0, parseFloat(e.target.value || '0')) })}
                      placeholder="تعداد موجود در این انبار"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-550/15 flex items-start gap-2.5 text-xs text-orange-850/90 dark:text-orange-400">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  سیستم به صورت خودکار رویداد اولین ورود را با امضای حساب کاربری در دفتر تاریخچه کالا درج خواهد نمود.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Specific forms, Popups and values */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Specifications Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-500" />
              <span>مشخصات و شناسه‌گذاری {activeTab === 'service' ? 'خدمات / سرویس' : 'کالای انبار'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  {activeTab === 'service' ? 'نام کامل سرویس / خدمت' : 'نام کامل کالا / محصول'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={activeTab === 'service' ? 'مثال: ثبت نام اینترنتی دانشگاه سراسری' : 'مثال: گوشی آیفون پلاس ۱۳'}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>نام کامل:</strong> عنوان دقیق تجاری {activeTab === 'service' ? 'خدمت' : 'کالا'} که در فاکتورها، گزارش‌های فروش و کاتالوگ عمومی چاپ می‌شود.
                </p>
              </div>

              {/* Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">کد یکتا (خودکار)</label>
                  <button
                    type="button"
                    onClick={() => generateAutoCode()}
                    className="text-[10px] text-indigo-600 hover:underline font-bold"
                  >
                    تولید کد جدید
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="کد یکتا در سیستم"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>کد یکتا:</strong> شناسه منحصر‌به‌فرد سیستمی جهت جستجوی سریع و لینک فاکتورها به صورت غیر تکراری.
                </p>
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-indigo-500" />
                  <span>بارکد کالا / خدمت</span>
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="اسکن یا تایپ بارکد..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>بارکد:</strong> شماره بارکد بین‌المللی کالا یا خدمت جهت ثبت سریع و خودکار در فاکتور توسط دستگاه بارکدخوان.
                </p>
              </div>
            </div>

            {/* Render SKU & Serial ONLY for physical products */}
            {activeTab === 'product' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in duration-350">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500">کدهویت کالا (SKU)</label>
                    <button
                      type="button"
                      onClick={generateInternalSku}
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>تولید خودکار</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.internal_sku}
                    onChange={(e) => setFormData({ ...formData, internal_sku: e.target.value })}
                    placeholder="برای مثال SKU-6435-9011"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>کد مرجع:</strong> کد شناسایی کالا (کد قطعه، شناسه تولیدکننده یا SKU) برای ردیابی دقیق
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500">شماره سریال کالا (S/N)</label>
                    <button
                      type="button"
                      onClick={generateSerialNumber}
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>تولید خودکار</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="برای مثال SN-562985"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>شماره سریال:</strong> شماره سریال منحصر‌به‌فرد تولیدکننده جهت گارانتی، ردیابی قطعات و خدمات پس از فروش سخت‌افزاری.
                  </p>
                </div>
              </div>
            )}

            {/* Categories & Brands selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  دسته‌بندی مربوطه
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-white truncate">
                    {selectedCategory ? selectedCategory.name : 'انتخاب نشده --'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCategoryPopup(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-indigo-400 font-bold text-xs border border-indigo-200/50 dark:border-slate-700 transition-all flex items-center gap-1 shrink-0"
                  >
                    <Layers className="w-4 h-4" />
                    <span>انتخاب...</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>دسته‌بندی مربوطه:</strong> گروه درختی کالا یا خدمت جهت فیلترینگ کاتالوگ فروش و استخراج گزارش مالی تفکیکی سود هر گروه.
                </p>
              </div>

              {activeTab === 'product' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">برند محصول</label>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-white truncate">
                      {selectedBrand ? selectedBrand.name : 'انتخاب نشده --'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBrandPopup(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-indigo-400 font-bold text-xs border border-indigo-200/50 dark:border-slate-700 transition-all flex items-center gap-1 shrink-0"
                    >
                      <Cpu className="w-4 h-4" />
                      <span>انتخاب...</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>برند محصول:</strong> علامت تجاری سازنده کالا جهت دسته‌بندی کیفیت و اصالت کالا در انبار و صدور فاکتور مشتریان.
                  </p>
                </div>
              )}
            </div>

            {/* Pricing Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeTab === 'product' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    مبلغ دفتری خرید (قیمت خرید)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-[10px] pointer-events-none font-semibold">ریال</span>
                    <input
                      type="number"
                      value={formData.cost === 0 ? '' : formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: Math.max(0, parseInt(e.target.value || '0')) })}
                      placeholder="مبلغ خرید"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1">معادل: {formatCurrency(formData.cost)} ریال</span>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>قیمت خرید:</strong> بهای تمام‌شده خرید کالا از تامین‌کننده (مبنای محاسبه سود)
                  </p>
                </div>
              )}

              {activeTab === 'product' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    درصد سود فروش (حاشیه سود روی خرید)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-[11px] pointer-events-none font-bold">%</span>
                    <input
                      type="number"
                      step="any"
                      value={profitPercent === 0 ? '' : profitPercent}
                      onChange={(e) => handleProfitPercentChange(parseFloat(e.target.value || '0'))}
                      placeholder="درصد سود"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <span className="text-[9px] text-slate-450 block mt-1">
                    {formData.cost > 0 
                      ? `سود ناخالص هر کالا: ${formatCurrency(formData.price - formData.cost)} ریال`
                      : 'ابتدا قیمت خرید را وارد کنید'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  {activeTab === 'service' ? 'مبلغ مصوب ارایه خدمت (کارمزد)' : 'مبلغ فروش مصوب (تک‌فروشی)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-[10px] pointer-events-none font-semibold">ریال</span>
                  <input
                    type="number"
                    value={formData.price === 0 ? '' : formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Math.max(0, parseInt(e.target.value || '0')) })}
                    placeholder="مبلغ فروش"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-201 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <span className="text-[9px] text-slate-400 block mt-1">معادل: {formatCurrency(formData.price)} ریال</span>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>قیمت فروش:</strong> مبلغی که کالا یا خدمت را به مشتری می‌فروشید
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  قیمت فروش عمده
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-[10px] pointer-events-none font-semibold">ریال</span>
                  <input
                    type="number"
                    value={formData.wholesale_price === 0 ? '' : formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: Math.max(0, parseInt(e.target.value || '0')) })}
                    placeholder="مبلغ عمده فروشی"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <span className="text-[9px] text-slate-400 block mt-1 font-semibold">معادل: {formatCurrency(formData.wholesale_price)} ریال</span>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>قیمت عمده:</strong> قیمت فروش کالا به مشتریان عمده و فاکتورهای با تعداد بالا.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  حداقل قیمت فروش (کف قیمت)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-[10px] pointer-events-none font-semibold">ریال</span>
                  <input
                    type="number"
                    value={formData.min_selling_price === 0 ? '' : formData.min_selling_price}
                    onChange={(e) => setFormData({ ...formData, min_selling_price: Math.max(0, parseInt(e.target.value || '0')) })}
                    placeholder="کف قیمت فروش"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <span className="text-[9px] text-slate-400 block mt-1 font-semibold">معادل: {formatCurrency(formData.min_selling_price)} ریال</span>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>حداقل قیمت فروش:</strong> حداقل قیمتی که فروشندگان مجاز به ثبت آن در فاکتور فروش هستند.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">وضعیت فعال بودن</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="فعال">فعال</option>
                  <option value="غیرفعال">غیرفعال (عدم نمایش در فروش سریع)</option>
                </select>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                  <strong>وضعیت کالا:</strong> در صورت انتخاب غیرفعال، این کالا در فرم‌های انتخاب فروش سریع و فاکتور نمایش داده نخواهد شد.
                </p>
              </div>

              {activeTab === 'product' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    حد هشدار حداقل موجودی کالا
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-[10px] pointer-events-none">{formData.unit}</span>
                    <input
                      type="number"
                      value={formData.min_stock === 0 ? '' : formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: Math.max(0, parseFloat(e.target.value || '0')) })}
                      placeholder="حداقل کالا در انبار جهت هشدار"
                      className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-mono text-left font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <span className="text-[9px] text-orange-500 block mt-1 font-semibold">هشدار سیستم هنگام رسیدن موجودی به این حد</span>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-relaxed">
                    <strong>حداقل موجودی:</strong> حداقل تعداد کالا در انبار که کمتر از آن باعث هشدار کسری می‌شود
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">واحد شمارش / سنجش</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="عدد">عدد</option>
                  <option value="پروژه">پروژه</option>
                  <option value="ساعت">ساعت</option>
                  <option value="ترکینگ">مورد / پرونده</option>
                  <option value="بسته">بسته</option>
                  <option value="کیلوگرم">کیلوگرم</option>
                  <option value="متر">متر</option>
                  <option value="لیتر">لیتر</option>
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {activeTab === 'service' ? 'توضیحات و شرح شرایط انجام خدمت' : 'توضیحات و شرح کالا'}
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={activeTab === 'service' ? 'شرایط، فرآیند انجام کار، مدت زمان حدودی ارایه خدمت و تذکرات لازم...' : 'توضیحات مربوط به نگهداری کالا، گارانتی، گرید فنی یا شرایط انبارداری ویژه...'}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>

            {/* REQUIRED CUSTOMER DOCUMENTS - EXCLUSIVE FOR SERVICES */}
            {activeTab === 'service' && (
              <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-slate-950/20 border border-indigo-100 dark:border-slate-850/80 space-y-4 animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <FileText className="w-4.5 h-4.5" />
                    <span>فهرست اطلاعات و مدارک الزامی از مشتری</span>
                  </h4>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                    {requiredDocs.length} مدرک الزامی
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed mb-1">
                  مشخص کنید برای انجام این خدمت، اپراتور چه مدارک و اطلاعاتی را باید تحویل بگیرد تا در کارتابل پرونده مشتری اسکن یا بایگانی شود.
                </p>

                {/* Tags collection */}
                <div className="flex flex-wrap gap-1.5">
                  {requiredDocs.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">هیچ مدرک یا اطلاعاتی اضافه نشده است. فیلدهای زیر را وارد کنید.</span>
                  ) : (
                    requiredDocs.map((doc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-indigo-900 dark:text-indigo-350 shadow-sm"
                      >
                        <span>{doc}</span>
                        <button
                          type="button"
                          onClick={() => removeDocChecklist(idx)}
                          className="text-red-500 hover:text-red-700 p-0.5 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Input with Add button */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDocChecklist();
                      }
                    }}
                    placeholder="مثال: تصویر ۳*۴ پرسنلی مشتری"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                  />
                  <button
                    type="button"
                    onClick={addDocChecklist}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن به الزامات</span>
                  </button>
                </div>

                {/* Quick select templates */}
                <div className="space-y-1.5 pt-1.5">
                  <span className="block text-[10px] font-bold text-slate-400">الگوهای متداول جهت افزودن سریع:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'تصویر کارت ملی هوشمند',
                      'تصویر صفحه اول شناسنامه',
                      'عکس ۳*۴ پرسنلی',
                      'تکمیل فرم تعهدنامه',
                      'فیش واریزی بانکی',
                      'کد رهگیری سامانه ثنا',
                      'سند مالکیت یا اجاره‌نامه',
                      'گواهی کد پستی تایید شده'
                    ].map(tpl => (
                      <button
                        type="button"
                        key={tpl}
                        onClick={() => addQuickTemplate(tpl)}
                        className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200/40 dark:border-slate-750 transition-all"
                      >
                        <span>+ {tpl}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Submit layout buttons */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3.5 bg-slate-50 dark:bg-slate-950/20 -mx-6 -mb-6 p-4">
              <button
                type="button"
                onClick={() => navigate('/products/list')}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-lg shadow-indigo-550/20 flex items-center gap-1 transition-all"
              >
                <Check className="w-4 h-4 ml-1" />
                <span>ذخیره نهایی و ثبت ردیف اطلاعاتی</span>
              </button>
            </div>

          </div>

        </div>

      </form>

      {/* POPUP MODAL: CATEGORY SELECTOR */}
      {showCategoryPopup && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>انتخاب شاخه دسته‌بندی موضوعی</span>
              </h3>
              <button onClick={() => setShowCategoryPopup(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
              {categories.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  هیچ دسته‌بندی فعالی ثبت نشده است. ابتدا به صفحه دسته‌بندی بروید.
                </div>
              ) : (
                categories.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                      selectedCategory?.id === cat.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 font-bold'
                        : 'border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs">{cat.name} {cat.parent_name ? <span className="text-[10px] text-slate-400">({cat.parent_name})</span> : ''}</span>
                    {selectedCategory?.id === cat.id && <Check className="w-4 h-4 text-indigo-500" />}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setShowCategoryPopup(false);
                }}
                className="px-3.5 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-200/50 transition-all"
              >
                پاک کردن انتخاب
              </button>
              <button
                type="button"
                onClick={() => setShowCategoryPopup(false)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
              >
                تایید دسته‌بندی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: BRAND SELECTOR */}
      {showBrandPopup && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-500" />
                <span>انتخاب برند محصول</span>
              </h3>
              <button onClick={() => setShowBrandPopup(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
              {brands.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  هیچ برندی در سیستم ثبت نشده است. ابتدا به صفحه مدیریت برندها در شاخه کالا بروید.
                </div>
              ) : (
                brands.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBrand(b)}
                    className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                      selectedBrand?.id === b.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 font-bold'
                        : 'border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs">{b.name}</span>
                    {selectedBrand?.id === b.id && <Check className="w-4 h-4 text-indigo-500" />}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand(null);
                  setShowBrandPopup(false);
                }}
                className="px-3.5 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-slate-200/50 transition-all"
              >
                پاک کردن انتخاب
              </button>
              <button
                type="button"
                onClick={() => setShowBrandPopup(false)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
              >
                تایید برند
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
