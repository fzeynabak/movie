import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Layers, 
  Cpu, 
  Trash2, 
  Edit, 
  Archive, 
  AlertCircle,
  HelpCircle,
  DollarSign,
  Barcode,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  X,
  FileText,
  Calendar,
  Receipt,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useNavigate } from 'react-router-dom';
import Decimal from 'decimal.js';
import { Product } from '../types';
import { gregorianToJalali } from '../components/JalaliDatePicker';

const MySwal = withReactContent(Swal);

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Product ledger / dossier states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'purchases' | 'sales' | 'circulation'>('info');
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [inventoryCirculation, setInventoryCirculation] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleDeleteProduct = async (product: Product) => {
    const confirm = await MySwal.fire({
      title: `آیا از حذف محصول "${product.name}" مطمئن هستید؟`,
      text: "تمام سطرهای انبارگردانی و فاکتور فروش‌های متصل ممکن است فاقد ارجاع شوند!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.deleteProduct) {
          const res = await window.electronAPI.deleteProduct(product.id);
          if (res.success) {
            MySwal.fire('حذف شد', 'کالا با موفقیت از سیستم حذف گردید.', 'success');
            fetchProducts();
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در حذف کالا', 'error');
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    navigate('/products/new', { state: { product } });
  };

  const handleShowProductDetails = async (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
    setActiveDetailTab('info');
    setIsLoadingHistory(true);
    try {
      if (window.electronAPI) {
        const [sales, purchases, circulation] = await Promise.all([
          window.electronAPI.getProductSalesHistory ? window.electronAPI.getProductSalesHistory(product.id) : Promise.resolve([]),
          window.electronAPI.getProductPurchaseHistory ? window.electronAPI.getProductPurchaseHistory(product.id) : Promise.resolve([]),
          window.electronAPI.getProductInventoryCirculation ? window.electronAPI.getProductInventoryCirculation(product.id) : Promise.resolve([])
        ]);
        setSalesHistory(sales || []);
        setPurchaseHistory(purchases || []);
        setInventoryCirculation(circulation || []);
      }
    } catch (e) {
      console.error('Error fetching product history details:', e);
    } finally {
      setIsLoadingHistory(false);
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

  const formatDateToShamsi = (isoString: string) => {
    if (!isoString) return 'ثبت نشده';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return toPersianNum(isoString);
      const jalali = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return toPersianNum(`${jalali.y}/${String(jalali.m).padStart(2, '0')}/${String(jalali.d).padStart(2, '0')}`);
    } catch {
      return toPersianNum(isoString);
    }
  };

  const calculateTotalProfit = () => {
    if (!selectedProduct || salesHistory.length === 0) return 0;
    try {
      const cost = new Decimal(selectedProduct.cost || 0);
      let totalProfit = new Decimal(0);
      salesHistory.forEach(item => {
        const qty = new Decimal(item.quantity || 0);
        const unitPrice = new Decimal(item.unit_price || 0);
        const profitPerItem = unitPrice.minus(cost);
        totalProfit = totalProfit.plus(qty.times(profitPerItem));
      });
      return totalProfit.toNumber();
    } catch {
      return 0;
    }
  };

  const calculateMarkupPercent = (cost: number, price: number) => {
    if (!cost || cost <= 0) return 0;
    try {
      const costDec = new Decimal(cost);
      const priceDec = new Decimal(price);
      return priceDec.minus(costDec).div(costDec).times(100).toNumber();
    } catch {
      return 0;
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.internal_sku && p.internal_sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.serial_number && p.serial_number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && p.category_name === categoryFilter;
  });

  const uniqueCategories = Array.from(new Set(products.map(p => p.category_name).filter(Boolean)));

  // Low Stock Items (for physical goods only)
  const lowStockProducts = products.filter(p => p.type !== 'service' && p.total_stock <= (p.min_stock || 0));

  return (
    <div className="space-y-6 text-right animate-in fade-in duration-300 select-none">
      
      {/* Header control line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-500" />
            <span>کاتالوگ و انبارگردانی محصولات</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مشاهده موجودی کل کالاها، ویرایش کاتالوگ قیمت‌ها، کدهای مرجع، بارکد، گارانتی و کنترل فیزیکی کالاها به تفکیک دسته‌بندی
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/products/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن کالا یا خدمت جدید</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 flex items-start gap-3.5 text-red-850 dark:text-red-400">
          <AlertCircle className="w-5.5 h-5.5 shrink-0 text-red-500 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-black">هشدار کمبود موجودی انبار ({toPersianNum(lowStockProducts.length)} کالا)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              تعداد <span className="font-bold text-red-600 dark:text-red-400">{toPersianNum(lowStockProducts.length)}</span> کالا به حد آستانه حداقل موجودی مجاز رسیده‌اند یا ناموجود شده‌اند:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStockProducts.slice(0, 5).map(p => (
                <button
                  type="button"
                  onClick={() => handleShowProductDetails(p)}
                  key={p.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/10 border border-red-500/20 rounded-lg text-[10px] font-black transition-all shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span>{p.name}</span>
                  <span className="text-red-600 font-mono">({toPersianNum(p.total_stock)} {p.unit})</span>
                </button>
              ))}
              {lowStockProducts.length > 5 && (
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 self-center">و {toPersianNum(lowStockProducts.length - 5)} کالای دیگر...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm">
        
        {/* Statistics & Search bar */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام کالا، بارکد، کد، SKU، سریال..."
                className="w-full pl-3 pr-9 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-slate-850 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-650 dark:text-slate-350 hover:bg-slate-200'
                }`}
              >
                همه دسته‌ها ({toPersianNum(products.length)})
              </button>
              {uniqueCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    categoryFilter === cat
                      ? 'bg-slate-850 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-650 dark:text-slate-350 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-slate-450 dark:text-slate-400 font-semibold">
            نمایش <b className="text-indigo-600 dark:text-indigo-400 font-bold">{toPersianNum(filteredProducts.length)}</b> مورد از مجموع کل محصولات کاتالوگ
          </div>
        </div>

        {/* Data Grid table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-150 dark:border-slate-800">
                <th className="p-3.5 w-12 text-center">ردیف</th>
                <th className="p-3.5 w-12 text-center">تصویر</th>
                <th className="p-3.5">عنوان محصول / خدمات</th>
                <th className="p-3.5 text-center">کد کالا</th>
                <th className="p-3.5 text-center">بارکد</th>
                <th className="p-3.5 text-center">دسته‌بندی</th>
                <th className="p-3.5 text-center">واحد</th>
                <th className="p-3.5 font-mono text-left">قیمت خرید (ريال)</th>
                <th className="p-3.5 font-mono text-left">قیمت فروش (ريال)</th>
                <th className="p-3.5 text-center">موجودی فعلی</th>
                <th className="p-3.5 text-center">وضعیت موجودی</th>
                <th className="p-3.5 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-405">
                    <p className="text-sm">هیچ محصول یا خدمتی مطابق با شرایط جستجو یافت نشد.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-3.5 text-slate-400 text-center font-mono">{toPersianNum(idx + 1)}</td>
                    <td className="p-3.5">
                      <div className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden mx-auto">
                        {p.image_base64 ? (
                          <img src={p.image_base64} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400 stroke-[1.5]" />
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleShowProductDetails(p)}
                          className="font-black text-slate-800 dark:text-white text-sm hover:text-indigo-600 transition-all text-right"
                        >
                          {p.name}
                        </button>
                        {p.type === 'service' ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/20">خدمت</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/20">کالا</span>
                        )}
                        {p.status === 'غیرفعال' && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200/20">غیرفعال</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400">
                        {p.internal_sku && <span>SKU: {toPersianNum(p.internal_sku)}</span>}
                        {p.serial_number && <span>S/N: {toPersianNum(p.serial_number)}</span>}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-650 dark:text-slate-350 text-center">{toPersianNum(p.code)}</td>
                    <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400 text-center">{p.barcode ? toPersianNum(p.barcode) : '---'}</td>
                    <td className="p-3.5 text-center">
                      {p.category_name ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold text-[10px]">
                          {p.category_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center text-slate-600 dark:text-slate-450 font-bold">{p.unit || 'عدد'}</td>
                    <td className="p-3.5 font-mono font-bold text-left text-teal-650 dark:text-teal-400">
                      {p.type === 'service' ? '---' : formatCurrency(p.cost)}
                    </td>
                    <td className="p-3.5 font-mono font-black text-left text-indigo-650 dark:text-indigo-400">{formatCurrency(p.price)}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {p.type === 'service' ? '---' : `${toPersianNum(p.total_stock)} ${p.unit || 'عدد'}`}
                    </td>
                    <td className="p-3.5 text-center">
                      {p.type === 'service' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200/20">
                          بدون مرز انبار
                        </span>
                      ) : p.total_stock <= 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/20">
                          ناموجود
                        </span>
                      ) : p.total_stock <= (p.min_stock || 0) ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-955/30 dark:text-amber-400 border border-amber-200/20 animate-pulse">
                          کمبود موجودی
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/20">
                          موجود کافی
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleShowProductDetails(p)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-450 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all"
                          title="نمایش پرونده محصول"
                        >
                          <HelpCircle className="w-4.5 h-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditProduct(p)}
                          className="text-amber-650 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all"
                          title="ویرایش محصول"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p)}
                          className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                          title="حذف کالا"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
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

      {/* PRODUCT LEDGER/DOSSIER MODAL ("پرونده کامل محصول") */}
      <AnimatePresence>
        {isDetailModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] text-right"
            >
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50 dark:bg-slate-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl border border-indigo-200 dark:border-slate-800 bg-indigo-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {selectedProduct.image_base64 ? (
                      <img src={selectedProduct.image_base64} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-indigo-500 stroke-[1.5]" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">{selectedProduct.name}</h2>
                      {selectedProduct.type === 'service' ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200/20">خدمات</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/20">کالای فیزیکی</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-550 dark:text-slate-450 font-mono">
                      <span>کد سیستم: {toPersianNum(selectedProduct.code)}</span>
                      {selectedProduct.barcode && <span className="mr-3">بارکد: {toPersianNum(selectedProduct.barcode)}</span>}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-350 transition-all hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-1 pt-3">
                <button
                  onClick={() => setActiveDetailTab('info')}
                  className={`px-4.5 py-3 text-xs font-black border-b-2 transition-all flex items-center gap-2 ${
                    activeDetailTab === 'info'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>اطلاعات پایه و سودآوری</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('purchases')}
                  className={`px-4.5 py-3 text-xs font-black border-b-2 transition-all flex items-center gap-2 ${
                    activeDetailTab === 'purchases'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>سابقه خریدها / موجودی اولیه</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    {toPersianNum(purchaseHistory.length)}
                  </span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('sales')}
                  className={`px-4.5 py-3 text-xs font-black border-b-2 transition-all flex items-center gap-2 ${
                    activeDetailTab === 'sales'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>سابقه فاکتورهای فروش</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    {toPersianNum(salesHistory.length)}
                  </span>
                </button>
                {selectedProduct.type !== 'service' && (
                  <button
                    onClick={() => setActiveDetailTab('circulation')}
                    className={`px-4.5 py-3 text-xs font-black border-b-2 transition-all flex items-center gap-2 ${
                      activeDetailTab === 'circulation'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>گردش و کاردکس انبار</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      {toPersianNum(inventoryCirculation.length)}
                    </span>
                  </button>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/10">
                {isLoadingHistory ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                    <span className="text-xs font-bold">در حال بازیابی امن اطلاعات پرونده کالا...</span>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    
                    {/* TAB 1: Base Details & Profits */}
                    {activeDetailTab === 'info' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          
                          {/* Cost */}
                          {selectedProduct.type !== 'service' && (
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">قیمت خرید مصوب (مبلغ دفتری)</span>
                              <span className="text-lg font-black text-teal-650 dark:text-teal-400 font-mono mt-auto">{formatCurrency(selectedProduct.cost)} <small className="text-[10px] font-sans font-bold">ریال</small></span>
                            </div>
                          )}

                          {/* Price */}
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                              {selectedProduct.type === 'service' ? 'تعرفه مصوب خدمت (کارمزد)' : 'قیمت فروش مصوب (تک‌فروشی)'}
                            </span>
                            <span className="text-lg font-black text-indigo-650 dark:text-indigo-400 font-mono mt-auto">{formatCurrency(selectedProduct.price)} <small className="text-[10px] font-sans font-bold">ریال</small></span>
                          </div>

                          {/* Markup / Profit Percent */}
                          {selectedProduct.type !== 'service' && (
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">درصد سود روی خرید (مارک‌آپ)</span>
                              <span className="text-lg font-black text-amber-650 mt-auto font-mono">
                                %{toPersianNum(calculateMarkupPercent(selectedProduct.cost, selectedProduct.price).toFixed(1))}
                              </span>
                            </div>
                          )}

                          {/* Total Cumulative Profit Earned */}
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:col-span-1">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                              <span>سود انباشته ناخالص حاصل از فروش</span>
                            </span>
                            <span className="text-lg font-black text-emerald-650 dark:text-emerald-450 font-mono mt-auto">
                              {formatCurrency(calculateTotalProfit())} <small className="text-[10px] font-sans font-bold">ریال</small>
                            </span>
                          </div>

                          {/* Stock status indicator card */}
                          {selectedProduct.type !== 'service' && (
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">موجودی فعلی / حد هشدار</span>
                              <div className="mt-auto flex items-baseline gap-1 font-mono">
                                <span className="text-lg font-black text-slate-800 dark:text-white">
                                  {toPersianNum(selectedProduct.total_stock)}
                                </span>
                                <span className="text-xs text-slate-450">/ {toPersianNum(selectedProduct.min_stock || 0)} {selectedProduct.unit}</span>
                              </div>
                            </div>
                          )}

                          {/* Wholesale Price */}
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">قیمت فروش عمده</span>
                            <span className="text-lg font-black text-indigo-650 dark:text-indigo-400 font-mono mt-auto">{formatCurrency(selectedProduct.wholesale_price || 0)} <small className="text-[10px] font-sans font-bold">ریال</small></span>
                          </div>

                          {/* Min Selling Price */}
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">کف قیمت فروش (حداقل قیمت)</span>
                            <span className="text-lg font-black text-red-650 dark:text-red-450 font-mono mt-auto">{formatCurrency(selectedProduct.min_selling_price || 0)} <small className="text-[10px] font-sans font-bold">ریال</small></span>
                          </div>

                        </div>

                        {/* Technical details bento box */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-850 pb-2 flex items-center gap-1.5">
                              <Layers className="w-4 h-4" />
                              <span>مشخصات فنی و طبقه‌بندی کاتالوگ</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                              <div className="text-slate-400">دسته‌بندی مربوطه:</div>
                              <div className="font-bold text-slate-800 dark:text-white">{selectedProduct.category_name || 'ثبت نشده'}</div>
                              
                              <div className="text-slate-400">برند ثبت‌شده:</div>
                              <div className="font-bold text-slate-800 dark:text-white">{selectedProduct.brand_name || 'ثبت نشده'}</div>

                              <div className="text-slate-400">واحد سنجش / شمارش:</div>
                              <div className="font-bold text-slate-850 dark:text-white">{selectedProduct.unit || 'عدد'}</div>

                              <div className="text-slate-400">وضعیت کالا در سیستم:</div>
                              <div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedProduct.status === 'غیرفعال' ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-450' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>
                                  {selectedProduct.status || 'فعال'}
                                </span>
                              </div>

                              {selectedProduct.internal_sku && (
                                <>
                                  <div className="text-slate-400">شناسه فنی کالا (SKU):</div>
                                  <div className="font-mono font-semibold text-slate-800 dark:text-white">{toPersianNum(selectedProduct.internal_sku)}</div>
                                </>
                              )}

                              {selectedProduct.serial_number && (
                                <>
                                  <div className="text-slate-400">شماره سریال انفرادی (S/N):</div>
                                  <div className="font-mono font-semibold text-slate-800 dark:text-white">{toPersianNum(selectedProduct.serial_number)}</div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-850 pb-2 flex items-center gap-1.5">
                              <FileText className="w-4 h-4" />
                              <span>توضیحات و الزامات مستنداتی</span>
                            </h4>
                            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                              {selectedProduct.description ? selectedProduct.description : 'توضیحات تکمیلی بابت این رکورد در کاتالوگ درج نشده است.'}
                            </div>
                            
                            {/* Required docs list for service */}
                            {selectedProduct.type === 'service' && selectedProduct.required_docs && (
                              <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-2 mt-4">
                                <span className="block text-[10px] font-black text-purple-800 dark:text-purple-400">مدارک و اطلاعات الزامی تحویلی از مشتری:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {JSON.parse(selectedProduct.required_docs).map((doc: string, dIdx: number) => (
                                    <span key={dIdx} className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-purple-200/20 text-[10px] font-black text-slate-750 dark:text-slate-300">
                                      {doc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>

                        </div>
                      </motion.div>
                    )}

                    {/* TAB 2: Purchase history */}
                    {activeDetailTab === 'purchases' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-150">
                                <th className="p-3">ردیف</th>
                                <th className="p-3">تاریخ ثبت</th>
                                <th className="p-3">تامین‌کننده / منبع ورود</th>
                                <th className="p-3 text-center">تعداد خریداری شده</th>
                                <th className="p-3 font-mono text-left">مبلغ خرید تک (ريال)</th>
                                <th className="p-3 font-mono text-left">جمع کل فاکتور خرید</th>
                                <th className="p-3">شرح رویداد</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                              {purchaseHistory.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                    هیچ فاکتور خرید یا سندی از تامین‌کنندگان بابت این کالا یافت نشد.
                                  </td>
                                </tr>
                              ) : (
                                purchaseHistory.map((item, pIdx) => (
                                  <tr key={item.id || pIdx} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="p-3 text-slate-400 font-mono">{toPersianNum(pIdx + 1)}</td>
                                    <td className="p-3 text-slate-500 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{formatDateToShamsi(item.date)}</span>
                                    </td>
                                    <td className="p-3 font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>{item.source_name || 'ثبت دستی مدیر'}</span>
                                    </td>
                                    <td className="p-3 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                                      +{toPersianNum(item.quantity)} {selectedProduct.unit}
                                    </td>
                                    <td className="p-3 font-mono text-left text-slate-600">{formatCurrency(item.unit_price)}</td>
                                    <td className="p-3 font-mono text-left text-teal-650 font-black">{formatCurrency(item.total)}</td>
                                    <td className="p-3 text-slate-450 italic max-w-xs truncate" title={item.description}>{item.description || 'ثبت اولیه کالا در بانک داده'}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}

                    {/* TAB 3: Sales history */}
                    {activeDetailTab === 'sales' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-150">
                                <th className="p-3">ردیف</th>
                                <th className="p-3">شماره فاکتور</th>
                                <th className="p-3">خریدار / مشتری</th>
                                <th className="p-3 text-center">تعداد فروش رفته</th>
                                <th className="p-3 font-mono text-left">فی فروش فاکتور (ريال)</th>
                                <th className="p-3 font-mono text-left">جمع کل ردیف فروش</th>
                                {selectedProduct.type !== 'service' && <th className="p-3 font-mono text-left text-emerald-700">سود ناخالص ردیف (ريال)</th>}
                                <th className="p-3">تاریخ فاکتور</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                              {salesHistory.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                                    هیچ فاکتور فروش صادره‌ای برای این محصول در پایگاه داده حسابداری به ثبت نرسیده است.
                                  </td>
                                </tr>
                              ) : (
                                salesHistory.map((item, sIdx) => {
                                  const costPerUnit = new Decimal(selectedProduct.cost || 0);
                                  const qty = new Decimal(item.quantity || 0);
                                  const unitPrice = new Decimal(item.unit_price || 0);
                                  const singleProfit = unitPrice.minus(costPerUnit);
                                  const rowProfit = qty.times(singleProfit).toNumber();

                                  return (
                                    <tr key={item.id || sIdx} className="hover:bg-slate-50/40 transition-colors">
                                      <td className="p-3 text-slate-400 font-mono">{toPersianNum(sIdx + 1)}</td>
                                      <td className="p-3 font-mono font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                        <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{toPersianNum(item.invoice_number)}</span>
                                      </td>
                                      <td className="p-3 font-semibold text-slate-800 dark:text-white">{item.customer_name || 'خریدار عمومی (متفرقه)'}</td>
                                      <td className="p-3 text-center font-mono font-bold text-indigo-700 dark:text-indigo-450">
                                        {toPersianNum(item.quantity)} {selectedProduct.unit}
                                      </td>
                                      <td className="p-3 font-mono text-left text-slate-600">{formatCurrency(item.unit_price)}</td>
                                      <td className="p-3 font-mono text-left text-slate-800 dark:text-white font-bold">{formatCurrency(item.total)}</td>
                                      {selectedProduct.type !== 'service' && (
                                        <td className="p-3 font-mono text-left font-extrabold text-emerald-650 dark:text-emerald-450">
                                          {formatCurrency(rowProfit)}
                                        </td>
                                      )}
                                      <td className="p-3 text-slate-500">{formatDateToShamsi(item.date)}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}

                    {/* TAB 4: Stock Movement circulation */}
                    {activeDetailTab === 'circulation' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-150">
                                <th className="p-3">کد تراکنش</th>
                                <th className="p-3 text-center">نوع رویداد</th>
                                <th className="p-3 text-center">تعداد تغییر</th>
                                <th className="p-3">انبار مبدا / هدف</th>
                                <th className="p-3">تاریخ رویداد</th>
                                <th className="p-3">توضیحات و علت انبارگردانی</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                              {inventoryCirculation.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                    تراکنش گردش موجودی بابت این کالا ثبت نشده است.
                                  </td>
                                </tr>
                              ) : (
                                inventoryCirculation.map((circ, cIdx) => (
                                  <tr key={circ.id || cIdx} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="p-3 text-slate-400 font-mono">TX-{toPersianNum(circ.id)}</td>
                                    <td className="p-3 text-center">
                                      {circ.type === 'ورود' ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-teal-50 text-teal-850 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200/20 font-black">ورود کالا</span>
                                      ) : circ.type === 'فروش' ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-850 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/20 font-black">خروج فروش</span>
                                      ) : circ.type === 'خروج' ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-850 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/20 font-black">کسری / خروج</span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-850 dark:bg-amber-955/40 dark:text-amber-400 border border-amber-200/20 font-black">{circ.type}</span>
                                      )}
                                    </td>
                                    <td className={`p-3 text-center font-mono font-black ${circ.quantity_change > 0 ? 'text-teal-650' : 'text-rose-650'}`}>
                                      {circ.quantity_change > 0 ? `+${toPersianNum(circ.quantity_change)}` : toPersianNum(circ.quantity_change)} {selectedProduct.unit}
                                    </td>
                                    <td className="p-3 text-slate-700 dark:text-slate-350 font-bold">
                                      {circ.warehouse_name ? circ.warehouse_name : 'انبار مرکزی شماره ۱'}
                                      {circ.to_warehouse_name && <span className="text-slate-400 font-normal"> ← {circ.to_warehouse_name}</span>}
                                    </td>
                                    <td className="p-3 text-slate-500 font-mono">{formatDateToShamsi(circ.date)}</td>
                                    <td className="p-3 text-slate-500 italic max-w-sm truncate" title={circ.description}>{circ.description || 'بدون شرح'}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
                <button
                  type="button"
                  onClick={() => handleEditProduct(selectedProduct)}
                  className="px-4.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                  <span>ویرایش مشخصات کالا</span>
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl transition-all"
                >
                  بستن پرونده
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
