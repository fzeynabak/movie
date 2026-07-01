import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Boxes, 
  Settings, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Database,
  Coins
} from 'lucide-react';

const menuItems = [
  {
    title: 'داشبورد',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    title: 'اشخاص',
    icon: Users,
    path: '/persons',
    subItems: [
      { title: 'شخص جدید', path: '/persons/new' },
      { title: 'لیست اشخاص', path: '/persons/list' },
      { title: 'فروشندگان', path: '/persons/sellers' },
      { title: 'سهامداران', path: '/persons/shareholders' },
      { title: 'کارمندان', path: '/persons/employees' },
      { title: 'بدهکاران و بستانکاران', path: '/persons/debtors-creditors' },
    ]
  },
  {
    title: 'محصولات و خدمات',
    icon: Package,
    path: '/products',
    subItems: [
      { title: 'افزودن محصول و خدمات', path: '/products/new' },
      { title: 'لیست محصولات و خدمات', path: '/products/list' },
      { title: 'مدیریت دسته‌بندی‌ها', path: '/products/categories' },
      { title: 'بروزرسانی لیست قیمت', path: '/products/price-update' },
    ]
  },
  {
    title: 'فروش و فاکتور',
    icon: ShoppingCart,
    path: '/sales',
    subItems: [
      { title: 'فروش سریع', path: '/sales/quick' },
      { title: 'ثبت فاکتور فروش', path: '/sales/new-invoice' },
      { title: 'تاریخچه فاکتور', path: '/sales/history' },
    ]
  },
  {
    title: 'صندوق و بانک',
    icon: Coins,
    path: '/treasury',
  },
  {
    title: 'انبارداری',
    icon: Boxes,
    path: '/inventory',
    subItems: [
      { title: 'کنترل موجودی و انبارداری', path: '/inventory/control' },
      { title: 'تاریخچه انبارداری', path: '/inventory/history' },
    ]
  },
  {
    title: 'کاربران و دسترسی‌ها',
    icon: ShieldCheck,
    path: '/users',
  },
  {
    title: 'تنظیمات',
    icon: Settings,
    path: '/settings',
    subItems: [
      { title: 'آموزش و راهنمای برنامه', path: '/settings/training' },
      { title: 'تنظیمات برنامه', path: '/settings/general' },
      { title: 'تنظیمات چاپ', path: '/settings/print' },
      { title: 'طراحی فاکتور', path: '/settings/invoice-design' },
      { title: 'اطلاعات فروشگاه', path: '/settings/store-info' },
      { title: 'لاگ برنامه', path: '/settings/logs' },
    ]
  },
  {
    title: 'ابزارهای توسعه',
    icon: Database,
    path: '/dev',
    subItems: [
      { title: 'تست دیتابیس', path: '/dev/db-test' }
    ]
  }
];

export default function Sidebar({ collapsed, currentUser }: { collapsed: boolean; currentUser?: any }) {
  // We keep only the currently expanded item's path
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>(null);
  const location = useLocation();

  const isAllowed = (path: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'مدیر' || currentUser.role === 'مدیر ارشد' || currentUser.permissions === '*') return true;
    
    const allowed = currentUser.permissions ? currentUser.permissions.split(',') : [];
    
    // Map paths to permissions
    if (path === '/') return allowed.includes('dashboard');
    if (path.startsWith('/sales')) return allowed.includes('sales') || allowed.some(p => p.startsWith('sales:'));
    if (path.startsWith('/persons')) return allowed.includes('persons') || allowed.some(p => p.startsWith('persons:'));
    if (path.startsWith('/sellers')) return allowed.includes('sellers') || allowed.some(p => p.startsWith('sellers:'));
    if (path.startsWith('/shareholders')) return allowed.includes('shareholders') || allowed.some(p => p.startsWith('shareholders:'));
    if (path.startsWith('/products')) return allowed.includes('products') || allowed.some(p => p.startsWith('products:'));
    if (path.startsWith('/inventory')) return allowed.includes('inventory') || allowed.some(p => p.startsWith('inventory:'));
    if (path.startsWith('/users')) return allowed.includes('settings') || allowed.includes('users'); // users page is governed by settings permissions
    if (path.startsWith('/settings')) return allowed.includes('settings') || allowed.some(p => p.startsWith('settings:'));
    if (path.startsWith('/dev')) return currentUser.role === 'مدیر' || currentUser.role === 'مدیر ارشد';
    
    return false;
  };

  const filteredMenuItems = menuItems.map(item => {
    if (item.subItems) {
      const allowedSubItems = item.subItems.filter(sub => isAllowed(sub.path));
      if (allowedSubItems.length > 0) {
        return { ...item, subItems: allowedSubItems };
      }
      return null;
    }
    return isAllowed(item.path) ? item : null;
  }).filter(Boolean) as typeof menuItems;

  const toggleMenu = (path: string) => {
    // If collapsed, ignore or we could expand it and un-collapse. Let's ignore for now,
    // or uncollapse sidebar in parent? We'll just let it toggle.
    setExpandedMenu(prev => prev === path ? null : path);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const [storeName, setStoreName] = React.useState('حسابداری ملینا');
  const [storeLogo, setStoreLogo] = React.useState('');

  React.useEffect(() => {
    const fetchStore = async () => {
      try {
        if (window.electronAPI?.checkOnboardingStatus) {
          const res = await window.electronAPI.checkOnboardingStatus();
          if (res?.storeInfo) {
            if (res.storeInfo.name) setStoreName(res.storeInfo.name);
            if (res.storeInfo.logo) setStoreLogo(res.storeInfo.logo);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchStore();
  }, [location.pathname]); // Refresh when switching pages in case logo/name changes

  // Automatically expand active menu on mount/navigation
  React.useEffect(() => {
    const activeItem = menuItems.find(item => isActive(item.path));
    if (activeItem && activeItem.subItems && expandedMenu !== activeItem.path) {
       setExpandedMenu(activeItem.path);
    }
  }, [location.pathname]);

  return (
    <aside 
      className={cn(
        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 h-full flex flex-col flex-shrink-0 transition-all duration-300 shadow-lg overflow-hidden z-20",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Brand area */}
      <div className="h-16 flex items-center justify-center px-4 font-bold text-lg text-slate-800 dark:text-white tracking-wide border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0 overflow-hidden border border-slate-200/15">
          {storeLogo ? (
            <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        {!collapsed && <span className="mr-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px] select-none text-base">{storeName}</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredMenuItems.map((item) => {
          const isItemActive = isActive(item.path);
          const isExpanded = expandedMenu === item.path && !collapsed;
          const hasExpandedChild = item.subItems?.some(sub => location.pathname === sub.path);

          return (
            <div key={item.path} className="mb-1 relative group/menu">
              {item.subItems ? (
                // Group Header (Expandable)
                <>
                  <button
                    title={collapsed ? item.title : undefined}
                    onClick={() => toggleMenu(item.path)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all",
                      (isItemActive || hasExpandedChild)
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5 shrink-0 transition-transform", isItemActive ? "scale-110" : "opacity-80")} />
                      {!collapsed && <span className="text-sm whitespace-nowrap">{item.title}</span>}
                    </div>
                    {!collapsed && (
                      isExpanded ? <ChevronUp className="w-4 h-4 opacity-60 shrink-0" /> : <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
                    )}
                  </button>
                  
                  {/* Submenu Items */}
                  <div 
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isExpanded ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="mr-5 ml-2 pr-4 border-r-2 border-slate-100 dark:border-slate-800 space-y-1">
                      {item.subItems.map((subItem) => (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          className={({ isActive }) => cn(
                            "flex items-center py-2 px-3 rounded-lg text-sm transition-all relative overflow-hidden",
                            isActive 
                              ? "text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-slate-800/80 font-medium" 
                              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                          )}
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute right-0 w-1 h-full bg-indigo-500 rounded-l-full" />
                              )}
                              <span className="whitespace-nowrap">{subItem.title}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                // Link without submenus
                <NavLink
                  to={item.path}
                  onClick={() => setExpandedMenu(null)}
                  title={collapsed ? item.title : undefined}
                  className={({ isActive }) => cn(
                    "w-full flex items-center px-3 py-3 rounded-xl transition-all",
                    isActive 
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" 
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0 ml-3 transition-transform", isActive ? "scale-110" : "opacity-80")} />
                  {!collapsed && <span className="text-sm whitespace-nowrap">{item.title}</span>}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info (Footer) */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 animate-in fade-in">
        <div className={cn(
          "flex items-center gap-3 rounded-xl transition-all",
          collapsed ? "justify-center" : "px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-705"
        )}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm uppercase">
            {(currentUser?.username || 'مدیر')[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <h4 className="text-sm font-semibold text-slate-850 dark:text-white truncate">
                {currentUser?.username || 'مدیر سیستم'}
              </h4>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold truncate uppercase">
                {currentUser?.role || 'مدیر کل'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
