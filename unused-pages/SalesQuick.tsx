import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Search, 
  CreditCard, 
  Coins, 
  Smartphone, 
  CheckCircle2, 
  Hash, 
  BookOpen, 
  Sparkles, 
  Info,
  Layers,
  Archive,
  ShoppingCart,
  X,
  FileText,
  Percent,
  Calculator
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Decimal from 'decimal.js';
import { Product } from '../types';

const MySwal = withReactContent(Swal);

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

interface CustomerTab {
  id: number;
  name: string;
  cart: CartItem[];
  paymentMethod: 'کارتخوان' | 'نقدی' | 'کارت به کارت';
  cardToCardNumber: string;
  discount: number;
}

export default function SalesQuick() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Simultaneous sales tabs state
  const [tabs, setTabs] = useState<CustomerTab[]>([
    { id: 1, name: 'سبد خرید ۱', cart: [], paymentMethod: 'کارتخوان', cardToCardNumber: '', discount: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const [nextTabSeq, setNextTabSeq] = useState(2);

  // Active tab convenience selector
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      if (window.electronAPI?.getProducts) {
        const list = await window.electronAPI.getProducts();
        setProducts(list);
        
        // Extract distinct category names
        const cats = new Set<string>();
        list.forEach(p => {
          if (p.category_name) cats.add(p.category_name);
        });
        setCategories(['همه', ...Array.from(cats)]);
      }
    } catch (e) {
      console.error('Error loading products for quick sales:', e);
    }
  };

  // Multiple tabs controls
  const addTab = () => {
    const newTab: CustomerTab = {
      id: nextTabSeq,
      name: `سبد خرید ${nextTabSeq}`,
      cart: [],
      paymentMethod: 'کارتخوان',
      cardToCardNumber: '',
      discount: 0
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(nextTabSeq);
    setNextTabSeq(nextTabSeq + 1);
  };

  const removeTab = (tabId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      MySwal.fire({
        title: 'خطا',
        text: 'باید حداقل یک سبد خرید فعال داشته باشید.',
        icon: 'warning',
        confirmButtonText: 'تایید'
      });
      return;
    }
    const filtered = tabs.filter(t => t.id !== tabId);
    setTabs(filtered);
    if (activeTabId === tabId) {
      setActiveTabId(filtered[0].id);
    }
  };

  // Cart operations
  const updateActiveTab = (updated: CustomerTab) => {
    setTabs(tabs.map(t => t.id === updated.id ? updated : t));
  };

  const addToCart = (product: Product) => {
    const cart = [...activeTab.cart];
    const existing = cart.find(item => item.product.id === product.id);

    if (product.type === 'product' && product.total_stock <= 0) {
      MySwal.fire({
        title: 'عدم موجودی کالا',
        text: `کالای "${product.name}" در انبار موجود نیست و امکان افزودن آن وجود ندارد.`,
        icon: 'error',
        confirmButtonText: 'تایید'
      });
      return;
    }

    if (existing && product.type === 'product' && existing.quantity >= product.total_stock) {
      MySwal.fire({
        title: 'کمبود موجودی',
        text: `تعداد انتخابی نمی‌تواند بیشتر از موجودی انبار (${product.total_stock}) باشد.`,
        icon: 'error',
        confirmButtonText: 'تایید'
      });
      return;
    }

    proceedAdd(cart, product, existing);
  };

  const proceedAdd = (cart: CartItem[], product: Product, existing?: CartItem) => {
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        product,
        quantity: 1,
        price: product.price
      });
    }
    updateActiveTab({
      ...activeTab,
      cart
    });
  };

  const updateQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const item = activeTab.cart.find(it => it.product.id === productId);
    if (item && item.product.type === 'product') {
      if (item.product.total_stock <= 0) {
        removeFromCart(productId);
        MySwal.fire({
          title: 'اتمام موجودی کالا',
          text: `کالای "${item.product.name}" موجودی ندارد و از سبد حذف شد.`,
          icon: 'error',
          confirmButtonText: 'تایید'
        });
        return;
      }
      if (newQty > item.product.total_stock) {
        MySwal.fire({
          title: 'کمبود موجودی',
          text: `بیشتر از موجودی انبار (${item.product.total_stock}) امکان انتخاب وجود ندارد.`,
          icon: 'error',
          confirmButtonText: 'تایید'
        });
        newQty = item.product.total_stock;
      }
    }
    const cart = activeTab.cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: newQty };
      }
      return item;
    });
    updateActiveTab({
      ...activeTab,
      cart
    });
  };

  const removeFromCart = (productId: number) => {
    const cart = activeTab.cart.filter(item => item.product.id !== productId);
    updateActiveTab({
      ...activeTab,
      cart
    });
  };

  const clearActiveCart = () => {
    updateActiveTab({
      ...activeTab,
      cart: [],
      discount: 0,
      paymentMethod: 'کارتخوان',
      cardToCardNumber: ''
    });
  };

  // Calculations using decimal.js safely
  const calculateCartSubtotal = () => {
    return activeTab.cart.reduce((sum, item) => {
      const itemTotal = new Decimal(item.price).mul(item.quantity);
      return sum.plus(itemTotal);
    }, new Decimal(0));
  };

  const calculateTotal = () => {
    const subtotal = calculateCartSubtotal();
    const discount = new Decimal(activeTab.discount || 0);
    const finalAmount = subtotal.minus(discount);
    return finalAmount.lt(0) ? new Decimal(0) : finalAmount;
  };

  // Save Quick Sale
  const handleCheckout = async () => {
    if (activeTab.cart.length === 0) {
      MySwal.fire({
        title: 'سبد خرید خالی است',
        text: 'لطفاً ابتدا کالا یا خدماتی به سبد خرید اضافه کنید.',
        icon: 'error',
        confirmButtonText: 'تایید'
      });
      return;
    }

    if (activeTab.paymentMethod === 'کارت کارت' && !activeTab.cardToCardNumber.trim()) {
      MySwal.fire({
        title: 'خطای شماره کارت',
        text: 'لطفاً شماره کارت مقصد پرداخت کارت‌به‌کارت را وارد نمایید.',
        icon: 'error',
        confirmButtonText: 'تایید'
      });
      return;
    }

    const subtotal = calculateCartSubtotal().toNumber();
    const finalTotal = calculateTotal().toNumber();

    // Show neat checkout confirmation summary
    MySwal.fire({
      title: 'تأیید نهایی فروش سریع',
      html: `
        <div class="text-right text-xs space-y-2.5 p-3 leading-relaxed font-sans">
          <p>مبلغ ناخالص: <strong>${subtotal.toLocaleString()} ریال</strong></p>
          <p>تخفیف: <strong>${activeTab.discount.toLocaleString()} ریال</strong></p>
          <hr class="my-2 border-slate-200 dark:border-slate-800" />
          <p class="text-sm font-bold text-indigo-600 dark:text-indigo-400">مبلغ قابل پرداخت: ${finalTotal.toLocaleString()} ریال</p>
          <p>نوع پرداخت: <strong>${activeTab.paymentMethod}</strong></p>
          ${activeTab.paymentMethod === 'کارت به کارت' ? `<p>کارت مقصد: <code>${activeTab.cardToCardNumber}</code></p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ثبت و صدور فاکتور سریع',
      cancelButtonText: 'انصراف / بازگشت',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#94a3b8'
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          // Prepare payload for saveInvoice
          const invoiceItems = activeTab.cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.price,
            total: new Decimal(item.price).mul(item.quantity).toNumber()
          }));

          const invoicePayload = {
            customer_id: null, // Guest/Quick Sale customer is null
            total_amount: subtotal,
            discount: activeTab.discount || 0,
            tax: 0,
            final_amount: finalTotal,
            status: 'پرداخت شده',
            payment_method: activeTab.paymentMethod,
            payment_details: JSON.stringify({
              cardToCardNumber: activeTab.cardToCardNumber || '',
              salesChannel: 'فروش سریع (گیشه)',
              checkoutTimestamp: new Date().toISOString()
            }),
            description: `فروش سریع گیشه - پرداخت با ${activeTab.paymentMethod}`,
            items: invoiceItems
          };

          if (window.electronAPI?.saveInvoice) {
            const result = await window.electronAPI.saveInvoice(invoicePayload);
            if (result.success) {
              MySwal.fire({
                title: 'فروش موفقیت‌آمیز',
                text: `فاکتور فروش با شماره ${result.invoice_number} در سیستم ثبت شد.`,
                icon: 'success',
                confirmButtonText: 'بسیار عالی'
              });
              // Clear current tab
              clearActiveCart();
              loadProducts(); // reload stock totals
            } else {
              throw new Error(result.error || 'ناشناخته');
            }
          } else {
            MySwal.fire({
              title: 'شبیه‌سازی موفق',
              text: 'داده‌ها به دلیل نبود کانال بستر الکترون شبیه‌سازی شدند ولی با موفقیت ثبت گردید.',
              icon: 'success',
              confirmButtonText: 'باشه'
            });
            clearActiveCart();
          }
        } catch (error: any) {
          MySwal.fire({
            title: 'خطا در ثبت فروش',
            text: error.message || 'خطایی نامشخص رخ داد.',
            icon: 'error',
            confirmButtonText: 'تایید'
          });
        }
      }
    });
  };

  const filteredProducts = products.filter(p => {
    if (p.status === 'غیرفعال') return false;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'همه' || p.category_name === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const formatCurrency = (val: number | string | Decimal) => {
    const parsed = typeof val === 'object' ? val.toNumber() : parseFloat(val.toString() || '0');
    return parsed.toLocaleString('fa-IR');
  };

  return (
    <div id="quick_sales_page" className="flex flex-col lg:flex-row gap-5 p-4 lg:p-6 bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100">
      
      {/* Right Column: Search & Selectable Items */}
      <div className="flex-1 space-y-4" id="quick_sales_catalog_pnl">
        
        {/* Top bar with simultaneous sales tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-2">
              <ShoppingCart className="w-4 h-4" />
              <span>مشتریان فعال گیشه:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                const itemsCount = tab.cart.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all relative ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-105 border border-indigo-700' 
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 border border-slate-200/30 dark:border-slate-700/50'
                    }`}
                  >
                    <span>{tab.name}</span>
                    {itemsCount > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}>
                        {itemsCount} کالا
                      </span>
                    )}
                    <X 
                      className="w-3 h-3 hover:text-red-500 dark:hover:text-red-400 transition-colors" 
                      onClick={(e) => removeTab(tab.id, e)} 
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={addTab}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
            title="افزودن لاین فروش جدید"
          >
            <Plus className="w-4 h-4" />
            <span>گیشه جدید</span>
          </button>
        </div>

        {/* Searching and categorizing box */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/40 shadow-sm space-y-3">
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی سریع بین نام، بارکد یا کد کالا و خدمات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:outline-none text-xs text-slate-800 dark:text-white transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">دسته‌بندی:</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-indigo-600/25 text-white dark:text-indigo-200 border border-slate-800 dark:border-indigo-500/40'
                    : 'bg-slate-100 hover:bg-slate-150 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
          <AnimatePresence>
            {filteredProducts.map(p => {
              const isService = p.type === 'service';
              const isOutOfStock = !isService && p.total_stock <= 0;
              return (
                <motion.div
                  key={p.id}
                  layoutId={`product-card-${p.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    if (isOutOfStock) {
                      MySwal.fire({
                        title: 'کالای ناموجود',
                        text: `کالای "${p.name}" در انبار موجود نیست و به هیچ عنوان امکان فروش آن وجود ندارد.`,
                        icon: 'warning',
                        confirmButtonText: 'تایید'
                      });
                      return;
                    }
                    addToCart(p);
                  }}
                  className={`group relative rounded-2xl p-3.5 border hover:shadow-md cursor-pointer transition-all flex flex-col justify-between ${
                    isOutOfStock
                      ? 'opacity-40 bg-slate-100 dark:bg-slate-950 border-slate-250 cursor-not-allowed select-none'
                      : isService 
                      ? 'bg-purple-50/50 hover:bg-purple-50/90 dark:bg-purple-950/15 dark:hover:bg-purple-950/25 border-purple-200/50 dark:border-purple-800/30' 
                      : 'bg-white hover:bg-emerald-50/15 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-200/50 dark:border-slate-800/60'
                  }`}
                >
                  {/* Visual flag for Product vs Service */}
                  <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                    isService 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' 
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  }`}>
                    {isService ? 'خدمات / سرویس' : 'کالا / جنس'}
                  </span>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-500 transition-colors">#{p.code}</span>
                    <h3 className="text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-200 line-clamp-1">{p.name}</h3>
                    {p.brand_name && (
                      <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Archive className="w-3 h-3 text-slate-400" />
                        <span>برند: {p.brand_name}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">قیمت واحد فروش:</span>
                      <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(p.price)}
                        <span className="text-[10px] font-normal mr-1 font-sans text-slate-400">ریال</span>
                      </span>
                    </div>

                    <div className="text-left">
                      {isService ? (
                        <div className="px-2 py-1 rounded bg-purple-100/40 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-[10px] font-bold">
                          ارائه خدمت فوری
                        </div>
                      ) : (
                        <div className={`px-2 py-1 rounded text-[10px] font-semibold ${
                          p.total_stock > 10 
                            ? 'bg-neutral-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : p.total_stock > 0 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                        }`}>
                          {p.total_stock > 0 ? `موجودی: ${p.total_stock} ${p.unit}` : 'ناموجود در انبار'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Left Column: Cart Checkout Management */}
      <div className="w-full lg:w-96 shrink-0" id="quick_sales_checkout_panel">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm p-4 sticky top-6 flex flex-col justify-between min-h-[calc(100vh-80px)]">
          <div className="space-y-4">
            
            {/* Active shopping cart list header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xs font-bold font-sans">
                  اقلام {activeTab.name}
                </h2>
              </div>
              <button
                onClick={clearActiveCart}
                className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                title="خالی کردن کامل گیشه فعلی"
              >
                <Trash2 className="w-4 h-4" />
                <span>پاکسازی کامل</span>
              </button>
            </div>

            {/* Shopping Cart List items */}
            <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto pl-1">
              <AnimatePresence>
                {activeTab.cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-300 dark:text-slate-600 flex flex-col items-center justify-center gap-2">
                    <ShoppingCart className="w-12 h-12 stroke-[1]" />
                    <span className="text-xs font-semibold">هیچ موردی انتخاب نشده است</span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">روی کالاها یا خدمات سمت راست کلیک کنید</span>
                  </div>
                ) : (
                  activeTab.cart.map(item => {
                    const isSvc = item.product.type === 'service';
                    return (
                      <motion.div
                        key={item.product.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`p-3 rounded-xl border flex flex-col gap-2 ${
                          isSvc 
                            ? 'bg-purple-50/20 dark:bg-purple-950/5 border-purple-200/30' 
                            : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block">#{item.product.code}</span>
                            <span className="text-xs font-bold leading-relaxed line-clamp-1">{item.product.name}</span>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quantity and Prices info */}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 rounded-lg p-1 border border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center transition-all"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-mono font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center transition-all"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 block">مجموع ردیف:</span>
                            <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                              {formatCurrency(new Decimal(item.price).mul(item.quantity))}
                              <span className="text-[9px] font-sans mr-0.5 text-slate-400">ریալ</span>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
            
            {/* Quick Discount box */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-805 space-y-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-500" />
                <span>اعمال تخفیف سریع (ریال)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-[10px]">ریال</span>
                <input
                  type="number"
                  placeholder="مبلغ تخفیف را وارد کنید..."
                  value={activeTab.discount || ''}
                  onChange={(e) => updateActiveTab({ ...activeTab, discount: Math.max(0, parseInt(e.target.value || '0')) })}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/10 text-xs text-left text-slate-800 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Payment Method section */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-805 space-y-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-300">
                شیوه تسویه و پرداخت
              </label>
              
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'کارتخوان', label: 'کارتخوان', icon: CreditCard },
                  { id: 'نقدی', label: 'نقدی', icon: Coins },
                  { id: 'کارت به کارت', label: 'کارت‌به‌کارت', icon: Smartphone }
                ].map(method => {
                  const Icon = method.icon;
                  const isSel = activeTab.paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => updateActiveTab({ 
                        ...activeTab, 
                        paymentMethod: method.id as any,
                        // Clear card number if not card-to-card
                        cardToCardNumber: method.id === 'کارت به کارت' ? activeTab.cardToCardNumber : '' 
                      })}
                      className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all text-[11px] font-bold ${
                        isSel
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-600/10'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic field for Destination Card number */}
              {activeTab.paymentMethod === 'کارت به کارت' && (
                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    شماره کارت مقصد جهت ثبت تراکنش:
                  </label>
                  <div className="relative">
                    <Hash className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="**** - **** - **** - ****"
                      value={activeTab.cardToCardNumber}
                      onChange={(e) => updateActiveTab({ ...activeTab, cardToCardNumber: e.target.value })}
                      className="w-full pr-8 pl-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl text-left font-mono font-bold text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Checkout Totals display and Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3.5 bg-white dark:bg-slate-900 mt-4">
            
            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between items-center">
                <span>جمع ناخالص اقلام:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(calculateCartSubtotal())} ریال</span>
              </div>
              
              {activeTab.discount > 0 && (
                <div className="flex justify-between items-center text-red-500">
                  <span>میزان تفریق تخفیف:</span>
                  <span className="font-mono font-bold">-{formatCurrency(activeTab.discount)} ریال</span>
                </div>
              )}

              <hr className="border-slate-100 dark:border-slate-800/80 my-1" />

              <div className="flex justify-between items-center text-slate-900 dark:text-white">
                <span className="font-bold text-xs">مبلغ خالص قابل ثبت:</span>
                <span className="font-mono font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(calculateTotal())}
                  <span className="text-[10px] font-sans mr-0.5 text-slate-400">ریال</span>
                </span>
              </div>
            </div>

            {/* Invoice checkout submission button */}
            <button
              onClick={handleCheckout}
              disabled={activeTab.cart.length === 0}
              className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                activeTab.cart.length === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت موفق و صدور فاکتور گیشه</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
