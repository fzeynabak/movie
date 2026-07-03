import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, 
  Layers, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronDown, 
  Image as ImageIcon, 
  Compass, 
  Tag, 
  Folder, 
  CheckCircle, 
  Package, 
  Plus, 
  X,
  FileText,
  AlertTriangle,
  HelpCircle,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Category, Brand } from '../types';

const MySwal = withReactContent(Swal);

// Beautiful stock illustration URLs for placeholder category & brand covers
const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=60', // tech / console
  'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=150&auto=format&fit=crop&q=60', // electronics
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=150&auto=format&fit=crop&q=60', // computer
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&auto=format&fit=crop&q=60', // headphones
  'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150&auto=format&fit=crop&q=60', // audio tools
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150&auto=format&fit=crop&q=60', // shop/boutique
  'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=150&auto=format&fit=crop&q=60', // bags
  'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=150&auto=format&fit=crop&q=60', // luxury
];

const PRESET_BRAND_LOGOS = [
  'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=150&auto=format&fit=crop&q=60', // colorful abstract
  'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=150&auto=format&fit=crop&q=60', // dark abstract
  'https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=150&auto=format&fit=crop&q=60', // stamp/monochrome
  'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=150&auto=format&fit=crop&q=60', // minimalist line
];

export default function ProductCategories() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Collapsed parents state (using node IDs)
  const [collapsedNodes, setCollapsedNodes] = useState<Record<number, boolean>>({});

  // CRUD Modal States
  const [categoryModal, setCategoryModal] = useState<{
    show: boolean;
    mode: 'add' | 'edit';
    categoryId?: number;
  }>({ show: false, mode: 'add' });

  const [brandModal, setBrandModal] = useState<{
    show: boolean;
    mode: 'add' | 'edit';
    brandId?: number;
  }>({ show: false, mode: 'add' });

  // Form states
  const [catForm, setCatForm] = useState({
    name: '',
    parent_id: '',
    image: PRESET_IMAGES[0],
    description: '',
    type: 'both' as Category['type']
  });

  const [brandForm, setBrandForm] = useState({
    name: '',
    logo: PRESET_BRAND_LOGOS[0],
    description: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchCategories = async () => {
    try {
      if (window.electronAPI?.getCategories) {
        const list = await window.electronAPI.getCategories();
        setCategories(list);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchBrands = async () => {
    try {
      if (window.electronAPI?.getBrands) {
        const list = await window.electronAPI.getBrands();
        setBrands(list);
      }
    } catch (e) {
      console.error('Error fetching brands:', e);
    }
  };

  const toPersianNum = (str: string | number) => {
    return String(str).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  };

  // Build recursive tree nested structure
  const buildTree = (flatList: Category[], parentId: any = null): Category[] => {
    return flatList
      .filter(item => {
        // Compare values strictly or allow undefined/null equivalents
        if (parentId === null) {
          return item.parent_id === null || item.parent_id === undefined || item.parent_id === 0;
        }
        return item.parent_id === parentId;
      })
      .map(item => ({
        ...item,
        children: buildTree(flatList, item.id)
      }));
  };

  const toggleNode = (id: number) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Categories Handlers
  const handleOpenAddCategory = (parent_id: number | null = null) => {
    setCatForm({
      name: '',
      parent_id: parent_id ? String(parent_id) : '',
      image: PRESET_IMAGES[Math.floor(Math.random() * PRESET_IMAGES.length)],
      description: '',
      type: 'both'
    });
    setCategoryModal({ show: true, mode: 'add' });
  };

  const handleOpenEditCategory = (cat: Category) => {
    setCatForm({
      name: cat.name,
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
      image: cat.image || PRESET_IMAGES[0],
      description: cat.description || '',
      type: cat.type || 'both'
    });
    setCategoryModal({ show: true, mode: 'edit', categoryId: cat.id });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      MySwal.fire('خطا', 'نام دسته‌بندی را وارد کنید.', 'warning');
      return;
    }

    try {
      if (window.electronAPI?.saveCategory) {
        const pid = catForm.parent_id ? parseInt(catForm.parent_id) : null;
        
        // Prevent setting parent as itself!
        if (categoryModal.mode === 'edit' && categoryModal.categoryId === pid) {
          MySwal.fire('خطای منطقی', 'یک دسته‌بندی نمی‌تواند زیر‌شاخه خودش باشد!', 'error');
          return;
        }

        const res = await window.electronAPI.saveCategory({
          id: categoryModal.mode === 'edit' ? categoryModal.categoryId : undefined,
          name: catForm.name.trim(),
          parent_id: pid,
          image: catForm.image,
          description: catForm.description.trim(),
          type: catForm.type
        });

        if (res.success) {
          setCategoryModal({ show: false, mode: 'add' });
          MySwal.fire({
            icon: 'success',
            title: 'موفقیت‌آمیز',
            text: 'دسته‌بندی با موفقیت ذخیره شد.',
            timer: 1500,
            showConfirmButton: false
          });
          fetchCategories();
        }
      }
    } catch (e: any) {
      MySwal.fire('خطا', e.message || 'مشکلی رخ داد', 'error');
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    const confirm = await MySwal.fire({
      title: `آیا از حذف دسته‌بندی "${name}" مطمئن هستید؟`,
      text: "با حذف این دسته‌بندی، دسته‌بندی‌های زیرشاخه آن به دسته‌بندی اصلی (ریشه) منتقل می‌شوند و ارتباط محصولات با آن قطع می‌گردد.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.deleteCategory) {
          const res = await window.electronAPI.deleteCategory(id);
          if (res.success) {
            MySwal.fire('حذف شد', 'دسته‌بندی با موفقیت حذف گردید.', 'success');
            fetchCategories();
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در حذف دسته‌بندی', 'error');
      }
    }
  };

  // Brands Handlers
  const handleOpenAddBrand = () => {
    setBrandForm({
      name: '',
      logo: PRESET_BRAND_LOGOS[Math.floor(Math.random() * PRESET_BRAND_LOGOS.length)],
      description: ''
    });
    setBrandModal({ show: true, mode: 'add' });
  };

  const handleOpenEditBrand = (brand: Brand) => {
    setBrandForm({
      name: brand.name,
      logo: brand.logo || PRESET_BRAND_LOGOS[0],
      description: brand.description || ''
    });
    setBrandModal({ show: true, mode: 'edit', brandId: brand.id });
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) {
      MySwal.fire('خطا', 'نام برند را وارد کنید.', 'warning');
      return;
    }

    try {
      if (window.electronAPI?.saveBrand) {
        const res = await window.electronAPI.saveBrand({
          id: brandModal.mode === 'edit' ? brandModal.brandId : undefined,
          name: brandForm.name.trim(),
          logo: brandForm.logo,
          description: brandForm.description.trim()
        });

        if (res.success) {
          setBrandModal({ show: false, mode: 'add' });
          MySwal.fire({
            icon: 'success',
            title: 'عملیات موفق',
            text: 'برند کالا با موفقیت ذخیره گردید.',
            timer: 1500,
            showConfirmButton: false
          });
          fetchBrands();
        }
      }
    } catch (e: any) {
      MySwal.fire('خطا', e.message || 'خطا در ثبت برند', 'error');
    }
  };

  const handleDeleteBrand = async (id: number, name: string) => {
    const confirm = await MySwal.fire({
      title: `آیا از حذف برند "${name}" مطمئن هستید؟`,
      text: "پس از حذف، اطلاعات پیوند محصولات با این برند از کار می‌افتد.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.deleteBrand) {
          const res = await window.electronAPI.deleteBrand(id);
          if (res.success) {
            MySwal.fire('برند حذف شد', 'برند کالا با موفقیت از سیستم برداشته شد.', 'success');
            fetchBrands();
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در حذف برند', 'error');
      }
    }
  };

  // Recursive Tree Component React Helper
  const CategoryNode = ({ node, depth = 0 }: { node: any; depth: number; key?: any }) => {
    const isCollapsed = collapsedNodes[node.id] || false;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="mr-1">
        
        {/* Node strip */}
        <div 
          className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-350 dark:hover:border-slate-700/80 transition-all gap-4 mb-2"
          style={{ marginRight: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Folder Toggle Icon */}
            {hasChildren ? (
              <button 
                onClick={() => toggleNode(node.id)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6 h-6 flex items-center justify-center text-slate-300">
                <Hash className="w-3.5 h-3.5" />
              </span>
            )}

            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-lg bg-indigo-50/50 text-indigo-500 overflow-hidden shrink-0 border border-slate-200/50 dark:border-slate-800">
              {node.image ? (
                <img src={node.image} alt={node.name} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center"><Folder className="w-4 h-4" /></span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-slate-800 dark:text-white truncate block">{node.name}</span>
                {node.type === 'product' && <span className="px-1.5 py-0.5 text-[9px] rounded font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">فقط محصولات</span>}
                {node.type === 'service' && <span className="px-1.5 py-0.5 text-[9px] rounded font-semibold bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">فقط خدمات</span>}
                {node.type === 'both' && <span className="px-1.5 py-0.5 text-[9px] rounded font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">محصولات و خدمات</span>}
              </div>
              {node.description && (
                <span className="text-[11px] text-slate-400 truncate block mt-0.5">{node.description}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={() => handleOpenAddCategory(node.id)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/25 dark:hover:text-indigo-400 text-slate-500"
              title="افزودن زیرشاخه"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOpenEditCategory(node)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-200/50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              title="ویرایش دسته‌بندی"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteCategory(node.id, node.name)}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 text-slate-500"
              title="حذف دسته‌بندی"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children Render recursion */}
        {hasChildren && !isCollapsed && (
          <div className="space-y-1">
            {node.children.map((child: any) => (
              <CategoryNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}

      </div>
    );
  };

  const rootCategoriesTree = buildTree(categories, null);

  return (
    <div className="h-full space-y-6 animate-in fade-in duration-300 mr-0.5">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white" id="categories-page-title">مدریت هوشمند دسته‌بندی و برندها</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ثبت دسته‌بندی‌های درختی نامحدود (مشترک برای خدمات و محصولات) و بخش برندسازی لوکس کالاها همراه تصویر لوگو
          </p>
        </div>
        
        {/* Tab Selection */}
        <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl flex gap-1 select-none">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>دسته‌بندی‌ها ({toPersianNum(categories.length)})</span>
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'brands'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>برندهای محصولات ({toPersianNum(brands.length)})</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB 1: CATEGORIES TREE MAP */}
        {activeTab === 'categories' && (
          <motion.div
            key="categories-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-6"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 dark:text-white text-base">ساختار درختی دسته‌بندی‌ها</h2>
                    <p className="text-xs text-slate-400 mt-0.5">درخت سلسله‌مراتبی با قابلیت گسترش بی‌نهایت زیرشاخه برای نظم دادن به کالاها و خدمات</p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddCategory(null)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-500/15 text-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>افزودن دسته‌بندی ریشه</span>
                </button>
              </div>

              {/* Recursive tree container */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 min-h-[300px]">
                {rootCategoriesTree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-3">
                    <Layers className="w-12 h-12 stroke-[1.2] text-slate-300" />
                    <div>
                      <h3 className="font-semibold text-slate-600 dark:text-slate-300 text-sm">هیچ شاخه‌ای تاسیس نشده است</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                        برای گروه بندی محصولات فروشگاه خود، اولین دسته‌بندی ریشه را با کلیک بر روی دکمه بالا ثبت کنید.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {rootCategoriesTree.map(rootNode => (
                      <CategoryNode key={rootNode.id} node={rootNode} depth={0} />
                    ))}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 2: BRANDS GRID MAP */}
        {activeTab === 'brands' && (
          <motion.div
            key="brands-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 dark:text-white text-base">دفتر ثبت برندها و سازندگان</h2>
                    <p className="text-xs text-slate-400 mt-0.5">مدیریت برندهای تجاری مختص محصولات فیزیکی فروشگاه به همراه تصویر نمایه</p>
                  </div>
                </div>

                <button
                  onClick={handleOpenAddBrand}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-500/15 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن برند جدید</span>
                </button>
              </div>

              {/* Brands Grid Layout */}
              {brands.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-405 text-slate-400 flex flex-col items-center justify-center space-y-4">
                  <Tag className="w-12 h-12 stroke-[1.2] text-slate-300" />
                  <div>
                    <h3 className="font-semibold text-slate-600 dark:text-slate-300 text-sm">برندی صادر نشده است</h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">با ایجاد برند، تفکیک کالاها از منظر کارخانه سازنده و گزارشات سوددهی برندها برای شما مهیا می‌گردد.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {brands.map(brand => (
                    <div 
                      key={brand.id}
                      className="group p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between shadow-sm hover:scale-[1.01] transition-all"
                    >
                      <div className="space-y-3">
                        <div className="w-full h-32 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden relative border border-slate-300/45 dark:border-slate-800/80">
                          {brand.logo ? (
                            <img src={brand.logo} alt={brand.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="w-8 h-8" /></div>
                          )}
                        </div>
                        <div className="min-w-0 px-0.5">
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">{brand.name}</h4>
                          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 h-8 line-clamp-2 overflow-hidden leading-relaxed">
                            {brand.description || 'توضیحات برند پربار ثبت نشده است.'}
                          </p>
                        </div>
                      </div>

                      {/* Tool strip */}
                      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end gap-1.5 align-middle select-none">
                        <button
                          onClick={() => handleOpenEditBrand(brand)}
                          className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>ویرایش</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBrand(brand.id, brand.name)}
                          className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 text-slate-500 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* MODAL: CATEGORY ADD/EDIT */}
      {categoryModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-right leading-relaxed"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-500" />
                <span>{categoryModal.mode === 'add' ? 'ثبت دسته‌بندی نوپا' : 'ویرایش دسته‌بندی'}</span>
              </h3>
              <button onClick={() => setCategoryModal({ show: false, mode: 'add' })} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">عنوان دسته‌بندی</label>
                  <input
                    type="text"
                    required
                    value={catForm.name}
                    onChange={(e) => setCatForm({...catForm, name: e.target.value})}
                    placeholder="لوازم خانگی برقی، خدمات تعمیرات"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">شاخه اصلی (والد)</label>
                  <select
                    value={catForm.parent_id}
                    onChange={(e) => setCatForm({...catForm, parent_id: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- فاقد شاخه والد (دسته‌بندی اصلی) --</option>
                    {categories
                      .filter(item => categoryModal.mode !== 'edit' || item.id !== categoryModal.categoryId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">نوع مصرف و محدوده خدمات</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatForm({...catForm, type: 'both'})}
                    className={`py-2 rounded-xl text-xs font-semibold text-center border transition ${
                      catForm.type === 'both'
                        ? 'bg-indigo-500/5 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                    }`}
                  >
                    هر دو
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatForm({...catForm, type: 'product'})}
                    className={`py-2 rounded-xl text-xs font-semibold text-center border transition ${
                      catForm.type === 'product'
                        ? 'bg-indigo-500/5 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                    }`}
                  >
                    فقط محصولات
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatForm({...catForm, type: 'service'})}
                    className={`py-2 rounded-xl text-xs font-semibold text-center border transition ${
                      catForm.type === 'service'
                        ? 'bg-indigo-500/5 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950'
                    }`}
                  >
                    فقط خدمات
                  </button>
                </div>
              </div>

              {/* Cover Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">انتخاب نمایه و تصویر شاخه</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {PRESET_IMAGES.map((imgUrl, i) => (
                    <div 
                      key={i}
                      onClick={() => setCatForm({...catForm, image: imgUrl})}
                      className={`h-12 rounded-lg bg-slate-200 dark:bg-slate-800 cursor-pointer overflow-hidden relative border-2 ${
                        catForm.image === imgUrl ? 'border-indigo-600' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  value={catForm.image}
                  onChange={(e) => setCatForm({...catForm, image: e.target.value})}
                  placeholder="آدرس اینترنتی سفارشی تصویر (آدرس خارجی) ..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">شرح یا توضیحات تکمیلی</label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({...catForm, description: e.target.value})}
                  placeholder="معین دسته‌بندی برای تفکیک بهتر سود دهی و یا جریمه‌های مالی کالاها"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/20 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ show: false, mode: 'add' })}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-850 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-0.5"
                >
                  ذخیره اطلاعات دسته‌بندی
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: BRAND ADD/EDIT */}
      {brandModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-right leading-relaxed"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-500" />
                <span>{brandModal.mode === 'add' ? 'ثبت برند نو کالاها' : 'ویرایش برند'}</span>
              </h3>
              <button onClick={() => setBrandModal({ show: false, mode: 'add' })} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">نام تجاری برند</label>
                <input
                  type="text"
                  required
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({...brandForm, name: e.target.value})}
                  placeholder="ال‌جی LG، اسنوا، سامسونگ"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Brand Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">انتخاب آرم / لوگو پیشنهادی</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {PRESET_BRAND_LOGOS.map((imgUrl, i) => (
                    <div 
                      key={i}
                      onClick={() => setBrandForm({...brandForm, logo: imgUrl})}
                      className={`h-12 rounded-lg bg-slate-200 dark:bg-slate-800 cursor-pointer overflow-hidden relative border-2 ${
                        brandForm.logo === imgUrl ? 'border-indigo-600' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  value={brandForm.logo}
                  onChange={(e) => setBrandForm({...brandForm, logo: e.target.value})}
                  placeholder="آدرس نمایه یا لوگوی اختصاصی برند (اینترنتی) ..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">توضیحات برند / کارخانه سازنده</label>
                <textarea
                  rows={3}
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({...brandForm, description: e.target.value})}
                  placeholder="تضمین خدمات پس از فروش، گارانتی ۲۴ ماهه، ساخت کره جنوبی ..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/20 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setBrandModal({ show: false, mode: 'add' })}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-850 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-0.5"
                >
                  ثبت نهایی برند
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
