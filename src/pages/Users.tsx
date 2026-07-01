import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  Users, 
  Lock, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  CheckSquare, 
  Square,
  KeyRound,
  UserPlus,
  ShieldAlert,
  FolderLock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SystemUser, Person } from '../types';

const MySwal = withReactContent(Swal);

interface PermissionItem {
  key: string;
  title: string;
}

interface PermissionGroup {
  category: string;
  items: PermissionItem[];
}

const GRANULAR_PERMISSIONS: PermissionGroup[] = [
  {
    category: 'داشبورد و گزارشات',
    items: [
      { key: 'dashboard', title: 'مشاهده داشبورد مدیریتی' },
      { key: 'reports:sales', title: 'مشاهده گزارشات فروش' },
      { key: 'reports:profit', title: 'مشاهده گزارشات سود و زیان (حساس)' },
      { key: 'reports:warehouse', title: 'مشاهده گزارشات انبارداری' },
      { key: 'reports:financial', title: 'مشاهده گزارشات مالی فروشگاه (حساس)' },
    ]
  },
  {
    category: 'کالاها و خدمات',
    items: [
      { key: 'products:view', title: 'مشاهده لیست کالاها/خدمات' },
      { key: 'products:create', title: 'ایجاد کالا یا خدمت جدید' },
      { key: 'products:edit', title: 'ویرایش اطلاعات کالاها' },
      { key: 'products:delete', title: 'حذف کالاها از دیتابیس (حساس)' },
    ]
  },
  {
    category: 'اشخاص و همکاران',
    items: [
      { key: 'persons:view', title: 'مشاهده لیست اشخاص' },
      { key: 'persons:create', title: 'ایجاد مشتری یا شخص جدید' },
      { key: 'persons:edit', title: 'ویرایش اطلاعات اشخاص' },
      { key: 'persons:delete', title: 'حذف اشخاص مهم از سیستم (حساس)' },
      { key: 'sellers:view', title: 'مشاهده فروشندگان و پورسانت' },
      { key: 'sellers:edit', title: 'تعیین/ویرایش درصد پورسانت فروشنده' },
      { key: 'shareholders:view', title: 'مشاهده سهامداران و سود و زیان' },
      { key: 'shareholders:edit', title: 'ویرایش سهم یا اطلاعات سهامدار' },
    ]
  },
  {
    category: 'امور فروش و فاکتور',
    items: [
      { key: 'sales:view', title: 'مشاهده فاکتورها و تاریخچه فروش' },
      { key: 'sales:create', title: 'صدور فاکتور رسمی و فروش سریع' },
      { key: 'sales:edit', title: 'ویرایش فاکتورهای صادر شده' },
      { key: 'sales:delete', title: 'حذف یا ابطال فاکتورهای فروش (حساس)' },
    ]
  },
  {
    category: 'انبارداری و کالا',
    items: [
      { key: 'inventory:view', title: 'مشاهده کاردکس و موجودی انبار' },
      { key: 'inventory:create_purchase', title: 'ثبت فاکتور خرید و تامین کالا' },
      { key: 'inventory:in', title: 'ورود کالا به انبار (In-transit)' },
      { key: 'inventory:out', title: 'خروج کالا از انبار (Out-transit)' },
      { key: 'inventory:adjust', title: 'اصلاح موجودی و تعدیل انبار (حساس)' },
    ]
  },
  {
    category: 'امور مالی و خزانه',
    items: [
      { key: 'financial:ledger', title: 'مشاهده دفتر معین اشخاص' },
      { key: 'financial:receive', title: 'دریافت وجه و شارژ صندوق' },
      { key: 'financial:pay', title: 'پرداخت وجه و پرداخت خزانه' },
      { key: 'financial:debtors_creditors', title: 'مشاهده بدهکاران و بستانکاران (حساس)' },
    ]
  },
  {
    category: 'تنظیمات برنامه',
    items: [
      { key: 'settings:view', title: 'مشاهده و ویرایش تنظیمات کلی سیستم' },
    ]
  }
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'فروشنده': [
    'products:view', 'products:create', 'products:edit',
    'persons:view', 'persons:create', 'persons:edit',
    'sales:view', 'sales:create'
  ],
  'کارمند': [
    'products:view',
    'persons:view', 'persons:create', 'persons:edit',
    'sales:view', 'sales:create'
  ],
  'انباردار': [
    'products:view',
    'inventory:view', 'inventory:create_purchase', 'inventory:in', 'inventory:out', 'inventory:adjust'
  ],
  'حسابدار': [
    'dashboard', 'products:view', 'persons:view', 'sales:view',
    'financial:ledger', 'financial:receive', 'financial:pay', 'financial:debtors_creditors',
    'reports:sales', 'reports:warehouse', 'reports:financial'
  ],
  'سهامدار': [
    'dashboard', 'shareholders:view',
    'reports:sales', 'reports:profit', 'reports:warehouse', 'reports:financial'
  ],
  'کاربر': [
    'dashboard', 'products:view', 'persons:view', 'sales:view'
  ]
};

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [activeUser, setActiveUser] = useState<SystemUser | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forms states
  const [addForm, setAddForm] = useState({
    username: '',
    password: '',
    role: 'فروشنده' as any,
    person_id: '',
    allowedPages: ['dashboard'] as string[],
  });

  const [editForm, setEditForm] = useState<Partial<SystemUser & { allowedPages: string[] }>>({});

  useEffect(() => {
    fetchUsers();
    // Fetch current user from session if stored
    const sess = sessionStorage.getItem('current_user');
    if (sess) {
      setActiveUser(JSON.parse(sess));
    }
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.getSystemUsers) {
        const uList = await window.electronAPI.getSystemUsers();
        setUsers(uList || []);
      }
      if (window.electronAPI?.getPersons) {
        const pList = await window.electronAPI.getPersons();
        setPersons(pList || []);
      }
    } catch (e: any) {
      console.error('Error fetching system users:', e);
      MySwal.fire('خطا', 'عدم امکان واکشی لیست کاربران.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin = activeUser?.role === 'مدیر ارشد';

  const handleRoleChangeInAdd = (role: string) => {
    const allowed = DEFAULT_ROLE_PERMISSIONS[role] || [];
    setAddForm(prev => ({
      ...prev,
      role: role as any,
      allowedPages: allowed
    }));
  };

  const handleRoleChangeInEdit = (role: string) => {
    const allowed = DEFAULT_ROLE_PERMISSIONS[role] || [];
    setEditForm(prev => ({
      ...prev,
      role: role as any,
      allowedPages: allowed
    }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSuperAdmin && activeUser?.role !== 'مدیر') {
      MySwal.fire('غیر مجاز', 'ایجاد کاربر جدید فقط توسط مدیران سیستم مجاز است.', 'error');
      return;
    }

    if (!addForm.username || !addForm.password) {
      MySwal.fire('بررسی ورودی', 'نام کاربری و کلمه عبور اجباری هستند.', 'warning');
      return;
    }

    if (users.some(u => u.username.trim().toLowerCase() === addForm.username.trim().toLowerCase())) {
      MySwal.fire('خطای همپوشانی', 'نام کاربری وارد شده تکراری است.', 'warning');
      return;
    }

    // Role protection: only system managers can create other managers, and only Super Admin can create Super Admins
    const isManager = activeUser?.role === 'مدیر' || activeUser?.role === 'مدیر ارشد';
    if ((addForm.role === 'مدیر' || addForm.role === 'مدیر ارشد') && !isManager) {
      MySwal.fire('محدودیت دسترسی', 'ثبت یا ارتقاء نقش به مدیر سیستم فقط برای مدیران سیستم مجاز است.', 'error');
      return;
    }
    if (addForm.role === 'مدیر ارشد' && activeUser?.role !== 'مدیر ارشد') {
      MySwal.fire('محدودیت دسترسی', 'ثبت یا ارتقاء نقش به مدیر ارشد فقط برای مدیر ارشد سیستم مجاز است.', 'error');
      return;
    }

    // Permissions logic
    const permissions = (addForm.role === 'مدیر' || addForm.role === 'مدیر ارشد') ? '*' : addForm.allowedPages.join(',');

    try {
      setIsLoading(true);
      const res = await window.electronAPI?.saveUserAccount({
        username: addForm.username.trim(),
        password: addForm.password,
        role: addForm.role,
        person_id: addForm.person_id ? Number(addForm.person_id) : null,
        permissions: permissions
      });

      if (res?.success) {
        // Write Audit Log
        await window.electronAPI?.addAuditLog?.({
          username: activeUser?.username || 'مدیر سیستم',
          action: 'ایجاد کاربر',
          target: `کاربر: ${addForm.username}`,
          details: `تعریف کاربر جدید با نقش [${addForm.role}] متصل به شخص ID: [${addForm.person_id || 'هیچکدام'}]`,
          date: new Date().toISOString()
        });

        MySwal.fire({
          icon: 'success',
          title: 'کاربر با موفقیت ثبت شد',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        setIsAddOpen(false);
        setAddForm({
          username: '',
          password: '',
          role: 'فروشنده',
          person_id: '',
          allowedPages: ['dashboard'],
        });
        fetchUsers();
      }
    } catch (err: any) {
      MySwal.fire('خطا', err.message || 'مشکلی رخ داد', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editForm.username || !editForm.password) {
      MySwal.fire('ورودی نامعتبر', 'نام کاربری و کلمه عبور نمی‌توانند خالی باشند.', 'warning');
      return;
    }

    const sameName = users.find(u => u.username.trim().toLowerCase() === editForm.username?.trim().toLowerCase());
    if (sameName && sameName.id !== editForm.id) {
      MySwal.fire('کپی نام مجاز نیست', 'این نام کاربری مربوط به کاربر دیگری است.', 'warning');
      return;
    }

    // Security check: Deleting or editing a Manager requires Admin/Super Admin.
    const originalUser = users.find(u => Number(u.id) === Number(editForm.id));
    const wasAdmin = originalUser?.role === 'مدیر';
    const wasSuperAdmin = originalUser?.role === 'مدیر ارشد';
    const isTargetAdmin = wasAdmin || wasSuperAdmin;

    const isEditingSelf = Number(editForm.id) === Number(activeUser?.id) ||
                          editForm.username?.trim().toLowerCase() === activeUser?.username?.trim().toLowerCase();

    // Allowed to edit if:
    // 1. Logged in user is Super Admin
    // 2. Logged in user is editing themselves (self-edit)
    // 3. Logged in user is Admin AND the target is NOT an admin (i.e. target is a regular user, accountant, etc.)
    const isAllowedToEdit = activeUser?.role === 'مدیر ارشد' || 
                            isEditingSelf || 
                            (activeUser?.role === 'مدیر' && !isTargetAdmin);

    if (!isAllowedToEdit) {
      MySwal.fire('محدودیت دسترسی', 'تغییر سطوح دسترسی یا مشخصات مدیران سیستم حتماً به تایید مدیر ارشد نیاز دارد.', 'error');
      return;
    }

    if (editForm.role === 'مدیر ارشد' && activeUser?.role !== 'مدیر ارشد') {
      MySwal.fire('محدودیت دسترسی', 'تغییر نقش به مدیر ارشد فقط برای مدیر ارشد مجاز است.', 'error');
      return;
    }

    const permissions = (editForm.role === 'مدیر' || editForm.role === 'مدیر ارشد') ? '*' : (editForm.allowedPages || []).join(',');

    try {
      setIsLoading(true);
      const res = await window.electronAPI?.saveUserAccount({
        id: editForm.id,
        username: editForm.username.trim(),
        password: editForm.password,
        role: editForm.role,
        person_id: editForm.person_id ? Number(editForm.person_id) : null,
        permissions: permissions
      });

      if (res?.success) {
        // Write Audit Log
        await window.electronAPI?.addAuditLog?.({
          username: activeUser?.username || 'مدیر ارشد',
          action: 'ویرایش کاربر',
          target: `کاربر: ${editForm.username}`,
          details: `ویرایش اطلاعات حساب و سطوح دسترسی به نقش [${editForm.role}]`,
          date: new Date().toISOString()
        });

        MySwal.fire({
          icon: 'success',
          title: 'تغییرات با موفقیت ذخیره شد.',
          timer: 1500,
          toast: true,
          position: 'top-end',
          showConfirmButton: false
        });
        setIsEditOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      MySwal.fire('خطای دیتابیس', err.message || 'اعمال تغییرات با خطا مواجه شد', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, targetRole: string, username: string) => {
    // Security constraint: Delete requires Super Admin approval
    if (!isSuperAdmin) {
      MySwal.fire('محدودیت امنیتی', 'حذف حساب‌های کاربری سیستم حتماً به تایید مدیر ارشد نیاز دارد.', 'error');
      return;
    }

    // Prevent delete self
    if (activeUser && activeUser.id === id) {
      MySwal.fire('غیر مجاز', 'امکان حذف حساب کاربری جاری وجود ندارد.', 'warning');
      return;
    }

    const confirm = await MySwal.fire({
      title: `حذف حساب کاربری "${username}"؟`,
      text: 'با حذف این حساب، شخص مورد نظر دیگر قادر به ورود به پنل نخواهد بود.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        setIsLoading(true);
        const res = await window.electronAPI?.deleteUserAccount(id);
        if (res?.success) {
          // Write Audit Log
          await window.electronAPI?.addAuditLog?.({
            username: activeUser?.username || 'مدیر ارشد',
            action: 'حذف کاربر',
            target: `کاربر: ${username}`,
            details: `حذف دائم حساب کاربری با نقش [${targetRole}]`,
            date: new Date().toISOString()
          });

          MySwal.fire('حذف شد', 'حساب کاربری با موفقیت حذف شد.', 'success');
          fetchUsers();
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در انجام عملیات', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const togglePagePermissionInAdd = (key: string) => {
    setAddForm(prev => {
      const idx = prev.allowedPages.indexOf(key);
      const updated = [...prev.allowedPages];
      if (idx > -1) {
        updated.splice(idx, 1);
      } else {
        updated.push(key);
      }
      return { ...prev, allowedPages: updated };
    });
  };

  const togglePagePermissionInEdit = (key: string) => {
    setEditForm(prev => {
      const allowed = prev.allowedPages ? [...prev.allowedPages] : [];
      const idx = allowed.indexOf(key);
      if (idx > -1) {
        allowed.splice(idx, 1);
      } else {
        allowed.push(key);
      }
      return { ...prev, allowedPages: allowed };
    });
  };

  // Helper to dynamically filter persons matching the chosen role
  const getSelectablePersonsForRole = (role: string) => {
    return persons.filter(p => {
      let rolesArr: string[] = [];
      if (p.roles) {
        if (Array.isArray(p.roles)) {
          rolesArr = p.roles;
        } else if (typeof p.roles === 'string') {
          try {
            rolesArr = JSON.parse(p.roles);
          } catch (e) {
            rolesArr = (p.roles as string).split(',');
          }
        }
      }

      if (role === 'سهامدار') {
        return p.category === 'سهامدار' || p.is_shareholder === 1 || rolesArr.includes('سهامدار');
      }
      if (role === 'کارمند') {
        return p.category === 'کارمند' || p.is_employee === 1 || rolesArr.includes('کارمند');
      }
      if (role === 'فروشنده') {
        return p.category === 'فروشنده' || p.category === 'بازاریاب' || rolesArr.includes('فروشنده');
      }
      if (role === 'انباردار' || role === 'حسابدار') {
        return p.category === 'کارمند' || p.is_employee === 1 || rolesArr.includes('کارمند') || rolesArr.includes('انباردار') || rolesArr.includes('حسابدار');
      }

      // Default/Managers: Show all employees, sellers, shareholders, or any staff role
      const isEmp = p.category === 'کارمند' || p.is_employee === 1;
      const isSel = p.category === 'فروشنده' || p.category === 'بازاریاب';
      const isSha = p.category === 'سهامدار' || p.is_shareholder === 1;
      const hasRole = rolesArr.some(r => r === 'کارمند' || r === 'فروشنده' || r === 'سهامدار' || r === 'انباردار' || r === 'حسابدار');
      return isEmp || isSel || isSha || hasRole;
    });
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-20 overflow-y-auto custom-scrollbar pr-1 animate-in fade-in duration-500" dir="rtl">
      
      {/* Header */}
      <div className="flex justify-between items-center py-4 bg-slate-50/80 dark:bg-slate-950/80 sticky top-0 z-10 border-b border-transparent">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            مدیریت کاربران و سطوح دسترسی (RBAC)
          </h2>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
            تعریف رمز عبور و مجوزهای دقیق (CRUD) جهت دسترسی انبارداران، حسابداران، سهامداران، کارمندان و فروشندگان
          </p>
        </div>
        
        {/* Only Admins can set up new users */}
        {(isSuperAdmin || activeUser?.role === 'مدیر') && (
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            تنظیم حساب جدید
          </button>
        )}
      </div>

      {/* Security alert for managers */}
      {!isSuperAdmin && (
        <div className="bg-amber-50/80 border border-amber-100 text-amber-800 rounded-2xl p-4 text-xs font-bold flex items-center gap-3 dark:bg-amber-950/10 dark:border-amber-900/30 dark:text-amber-400 animate-pulse">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
          <span>توجه: حساب جاری شما دارای دسترسی مدیر کل نیست. تغییر سطوح دسترسی یا حذف سایر مدیران سیستم منوط به تایید مستقیم <strong>مدیر ارشد سیستم</strong> می‌باشد.</span>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-500" />
            حساب‌های احراز هویت شده
          </h3>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border py-1 px-2.5 rounded-lg font-bold font-mono">
            {users.length.toLocaleString('fa-IR')} کاربر
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-inner text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 text-[11px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                <th className="p-4">کد کاربر</th>
                <th className="p-4">نام کاربری (جهت ورود)</th>
                <th className="p-4">شخص متناظر در پرونده‌ها</th>
                <th className="p-4">نقش دسترسی</th>
                <th className="p-4">کلمه عبور (Plain)</th>
                <th className="p-4 text-center">جزئیات مجوز</th>
                <th className="p-4 text-left">عملیات مدیریت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
              {users.map(u => {
                const linkedPersonName = u.title || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '---';
                const hasRootAccess = u.role === 'مدیر' || u.role === 'مدیر ارشد' || u.permissions === '*';
                const countOfPerms = hasRootAccess ? 'دسترسی کامل' : (u.permissions ? u.permissions.split(',').length + ' مجوز فعال' : 'فاقد دسترسی');

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 text-slate-700 dark:text-slate-350">
                    <td className="p-4 font-mono font-bold text-slate-400">USR-{u.id}</td>
                    <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 font-mono">{u.username}</td>
                    <td className="p-4">
                      {u.person_id ? (
                        <div className="flex flex-col">
                          <span className="font-bold">{linkedPersonName}</span>
                          <span className="text-[9px] text-slate-400">شناسه شخص: p-{u.person_id}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-semibold italic">عدم اتصال به اشخاص (مستقل)</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black",
                        u.role === 'مدیر ارشد' ? "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400 border border-red-200" :
                        u.role === 'مدیر' ? "bg-orange-50 text-orange-700 dark:bg-orange-950/10 dark:text-orange-400" :
                        u.role === 'فروشنده' ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/10" :
                        u.role === 'حسابدار' ? "bg-sky-50 text-sky-600 dark:bg-sky-950/10" :
                        u.role === 'انباردار' ? "bg-amber-50 text-amber-600 dark:bg-amber-950/10" :
                        u.role === 'کارمند' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/10" : "bg-slate-100 text-slate-600"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono select-all font-semibold tracking-widest">{u.password}</td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        "text-[10px] px-2.5 py-0.5 rounded-md font-bold",
                        hasRootAccess ? "bg-green-50 text-green-700 dark:bg-green-950/20" : "bg-slate-100 text-slate-500"
                      )}>
                        {countOfPerms}
                      </span>
                    </td>
                    <td className="p-4 text-left">
                      <div className="inline-flex gap-1.5 justify-end">
                        <button 
                          onClick={() => {
                            const allowed = u.permissions === '*' ? [] : (u.permissions ? u.permissions.split(',') : []);
                            setEditForm({
                              ...u,
                              allowedPages: allowed
                            });
                            setIsEditOpen(true);
                          }}
                          className="p-1 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          ویرایش دسترسی
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id!, u.role, u.username)}
                          disabled={activeUser?.id === u.id || u.role === 'مدیر ارشد'}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 cursor-pointer disabled:opacity-40"
                          title={u.role === 'مدیر ارشد' ? 'مدیر ارشد سیستم قابل حذف نیست' : 'حذف اکانت'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD SYSTEM USER MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 relative shadow-2xl border border-slate-150">
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute left-6 top-6 p-1 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 border-b pb-4 mb-5 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-500" />
              تعریف حساب احراز هویت جدید (RBAC)
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">نام کاربری ورود (انگلیسی)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: ali_acc"
                    value={addForm.username}
                    onChange={(e) => setAddForm(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">کلمه عبور ورود</label>
                  <input 
                    type="text" 
                    required
                    placeholder="حداقل ۶ کاراکتر"
                    value={addForm.password}
                    onChange={(e) => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">نقش اصلی کاربر</label>
                  <select 
                    value={addForm.role}
                    onChange={(e) => handleRoleChangeInAdd(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="فروشنده">فروشنده</option>
                    <option value="انباردار">انباردار (مدیریت کاردکس)</option>
                    <option value="حسابدار">حسابدار فروشگاه</option>
                    <option value="سهامدار">سهامدار / شریک تجاری</option>
                    <option value="کارمند">کارمند</option>
                    {isSuperAdmin && <option value="مدیر">مدیر سیستم (دسترسی نامحدود)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">اتصال متناظر به پرونده شخص (الزامی)</label>
                  <select 
                    value={addForm.person_id}
                    required
                    onChange={(e) => setAddForm(prev => ({ ...prev, person_id: e.target.value }))}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="">-- انتخاب شخص همکار --</option>
                    {getSelectablePersonsForRole(addForm.role).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title || `${p.first_name || ''} ${p.last_name || ''}`} (کد: {p.accounting_code} - {p.category})
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] text-slate-400 mt-1 block">توجه: بر اساس الزامات امنیتی، فقط اشخاصی با دسته‌بندی کارمند، فروشنده یا سهامدار مجاز به دریافت اکانت هستند.</span>
                </div>
              </div>

              {/* Page Permissions Select */}
              {addForm.role !== 'مدیر' && addForm.role !== 'مدیر ارشد' && (
                <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="block text-xs font-black text-indigo-700/80 dark:text-indigo-400 flex items-center gap-2">
                      <FolderLock className="w-4 h-4" />
                      شخصی‌سازی جزئیات دسترسی (Granular CRUD Permissions):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = GRANULAR_PERMISSIONS.flatMap(g => g.items.map(item => item.key));
                        const allSelected = allKeys.every(k => addForm.allowedPages.includes(k));
                        setAddForm(prev => ({
                          ...prev,
                          allowedPages: allSelected ? ['dashboard'] : allKeys
                        }));
                      }}
                      className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition-all"
                    >
                      {GRANULAR_PERMISSIONS.flatMap(g => g.items.map(item => item.key)).every(k => addForm.allowedPages.includes(k)) ? "عدم انتخاب همه" : "انتخاب همه دسترسی‌ها"}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {GRANULAR_PERMISSIONS.map(group => {
                      const groupKeys = group.items.map(item => item.key);
                      const isGroupAllSelected = groupKeys.every(k => addForm.allowedPages.includes(k));
                      return (
                        <div key={group.category} className="border-b border-slate-100 dark:border-slate-800/60 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="block text-[11px] font-bold text-slate-400">{group.category}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAddForm(prev => {
                                  let newList = [...prev.allowedPages];
                                  if (isGroupAllSelected) {
                                    newList = newList.filter(k => !groupKeys.includes(k));
                                    if (!newList.includes('dashboard')) newList.push('dashboard');
                                  } else {
                                    groupKeys.forEach(k => {
                                      if (!newList.includes(k)) newList.push(k);
                                    });
                                  }
                                  return { ...prev, allowedPages: newList };
                                });
                              }}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              {isGroupAllSelected ? "حذف انتخاب این بخش" : "انتخاب همه این بخش"}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {group.items.map(item => {
                              const isSelected = addForm.allowedPages.includes(item.key);
                              return (
                                <button
                                  type="button"
                                  key={item.key}
                                  onClick={() => togglePagePermissionInAdd(item.key)}
                                  className={cn(
                                    "flex items-center gap-2 text-right p-2 rounded-xl border text-[10px] font-bold transition-all",
                                    isSelected 
                                      ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400" 
                                      : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                                  )}
                                >
                                  {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                                  {item.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-650 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-indigo-500/15 animate-in fade-in"
                >
                  افزودن کاربر و ذخیره
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- EDIT SYSTEM USER MODAL --- */}
      {isEditOpen && editForm.id && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 relative shadow-2xl border border-slate-150">
            <button 
              onClick={() => setIsEditOpen(false)}
              className="absolute left-6 top-6 p-1 rounded-full hover:bg-slate-105 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 border-b pb-4 mb-5 flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-500 animate-pulse" />
              ویرایش حساب کاربری {editForm.username}
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">نام کاربری</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.username || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">کلمه عبور</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">نقش کاربر</label>
                  <select 
                    value={editForm.role || 'فروشنده'}
                    disabled={editForm.role === 'مدیر ارشد'}
                    onChange={(e) => handleRoleChangeInEdit(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="فروشنده">فروشنده</option>
                    <option value="انباردار">انباردار (مدیریت کاردکس)</option>
                    <option value="حسابدار">حسابدار فروشگاه</option>
                    <option value="سهامدار">سهامدار / شریک تجاری</option>
                    <option value="کارمند">کارمند</option>
                    {editForm.role === 'مدیر ارشد' && <option value="مدیر ارشد">مدیر ارشد سیستم</option>}
                    {(isSuperAdmin || activeUser?.role === 'مدیر') && editForm.role !== 'مدیر ارشد' && <option value="مدیر">مدیر سیستم (دسترسی نامحدود)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-505 mb-1.5">اتصال به پرونده شخص (الزامی)</label>
                  <select 
                    value={editForm.person_id || ''}
                    required
                    onChange={(e) => setEditForm(prev => ({ ...prev, person_id: e.target.value }))}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="">-- انتخاب شخص همکار --</option>
                    {getSelectablePersonsForRole(editForm.role || '').map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title || `${p.first_name || ''} ${p.last_name || ''}`} (کد: {p.accounting_code} - {p.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Page Permissions Select */}
              {editForm.role !== 'مدیر' && editForm.role !== 'مدیر ارشد' && (
                <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="block text-xs font-black text-indigo-700/80 dark:text-indigo-400 flex items-center gap-2">
                      <FolderLock className="w-4 h-4" />
                      شخصی‌سازی جزئیات دسترسی (Granular CRUD Permissions):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = GRANULAR_PERMISSIONS.flatMap(g => g.items.map(item => item.key));
                        const allSelected = allKeys.every(k => (editForm.allowedPages || []).includes(k));
                        setEditForm(prev => ({
                          ...prev,
                          allowedPages: allSelected ? ['dashboard'] : allKeys
                        }));
                      }}
                      className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition-all"
                    >
                      {GRANULAR_PERMISSIONS.flatMap(g => g.items.map(item => item.key)).every(k => (editForm.allowedPages || []).includes(k)) ? "عدم انتخاب همه" : "انتخاب همه دسترسی‌ها"}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {GRANULAR_PERMISSIONS.map(group => {
                      const groupKeys = group.items.map(item => item.key);
                      const isGroupAllSelected = groupKeys.every(k => (editForm.allowedPages || []).includes(k));
                      return (
                        <div key={group.category} className="border-b border-slate-100 dark:border-slate-800/60 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="block text-[11px] font-bold text-slate-400">{group.category}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditForm(prev => {
                                  let newList = [...(prev.allowedPages || [])];
                                  if (isGroupAllSelected) {
                                    newList = newList.filter(k => !groupKeys.includes(k));
                                    if (!newList.includes('dashboard')) newList.push('dashboard');
                                  } else {
                                    groupKeys.forEach(k => {
                                      if (!newList.includes(k)) newList.push(k);
                                    });
                                  }
                                  return { ...prev, allowedPages: newList };
                                });
                              }}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              {isGroupAllSelected ? "حذف انتخاب این بخش" : "انتخاب همه این بخش"}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {group.items.map(item => {
                              const isSelected = (editForm.allowedPages || []).includes(item.key);
                              return (
                                <button
                                  type="button"
                                  key={item.key}
                                  onClick={() => togglePagePermissionInEdit(item.key)}
                                  className={cn(
                                    "flex items-center gap-2 text-right p-2 rounded-xl border text-[10px] font-bold transition-all",
                                    isSelected 
                                      ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400" 
                                      : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                                  )}
                                >
                                  {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                                  {item.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-105 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-650 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  ذخیره تغییرات و ممیزی
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
