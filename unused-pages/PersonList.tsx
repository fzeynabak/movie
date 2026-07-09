import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  Search, 
  User, 
  Building2, 
  Edit, 
  Trash2, 
  Eye, 
  Phone, 
  MapPin, 
  CreditCard, 
  FileText, 
  Plus, 
  X, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Briefcase,
  HelpCircle,
  Hash,
  Activity,
  UserCheck,
  Check,
  UserCircle2,
  ShoppingBag,
  FileEdit,
  Printer,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Person } from '../types';
import { useNavigate } from 'react-router-dom';
import Decimal from 'decimal.js';
import JalaliDatePicker, { toPersianDigits, getTodayJalali } from '../components/JalaliDatePicker';

const MySwal = withReactContent(Swal);

// Helper to format currency in Rial with Persian digits
const formatPersianCurrency = (amount: number): string => {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('fa-IR');
  return formatted;
};

// Shamsi date helper
const getTodayShamsi = () => {
  const t = getTodayJalali();
  return `${t.y}/${String(t.m).padStart(2, '0')}/${String(t.d).padStart(2, '0')}`;
};

export default function PersonList() {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('همه');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Account details and ledger states
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [personInvoices, setPersonInvoices] = useState<any[]>([]);
  const [calculatedBalance, setCalculatedBalance] = useState<number>(0);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Person detail modal tabs and notes state
  const [detailActiveTab, setDetailActiveTab] = useState<'info' | 'ledger' | 'sales' | 'purchases' | 'tx' | 'notes'>('info');
  const [personNotes, setPersonNotes] = useState<any[]>([]);
  const [noteForm, setNoteForm] = useState({
    description: '',
    followup_date: '',
    reminder: 'خیر'
  });

  // Quick transaction form toggles
  const [showQuickTxModal, setShowQuickTxModal] = useState<'received' | 'paid' | null>(null);
  const [quickTxForm, setQuickTxForm] = useState({
    amount: '',
    date: '',
    description: ''
  });
  
  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Person>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [storeInfo, setStoreInfo] = useState<any>({
    name: 'حسابداری ملینا',
    phone: '۰۲۱-۵۵۶۶۷۷۸۸',
    address: 'تهران، بازار بزرگ، سرای ملی، طبقه اول'
  });

  useEffect(() => {
    fetchPersons();
    const fetchStore = async () => {
      try {
        if (window.electronAPI?.checkOnboardingStatus) {
          const res = await window.electronAPI.checkOnboardingStatus();
          if (res?.storeInfo) {
            setStoreInfo(res.storeInfo);
          }
        }
      } catch (e) {
        console.error('Error fetching onboarding store info:', e);
      }
    };
    fetchStore();
  }, []);

  const fetchPersons = async () => {
    if (window.electronAPI?.getPersons) {
      try {
        const data = await window.electronAPI.getPersons();
        setPersons(data || []);
      } catch (e: any) {
        console.error('Error fetching persons:', e);
        MySwal.fire('خطا', 'خطا در بارگذاری اطلاعات از پایگاه داده', 'error');
      }
    } else {
      // Stub for preview / development environment
      setPersons([
        {
          id: 1,
          accounting_code: '1000-ACC',
          first_name: 'امیر',
          last_name: 'اکرمی',
          title: '',
          nickname: 'آکرمی',
          type: 'حقیقی',
          category: 'مشتری',
          national_id: '0012345678',
          phone1: '09121111111',
          city: 'تهران',
          address: 'خیابان ولیعصر، کوچه نصر، پلاک ۱۰',
          credit_limit: 50000000,
          bank_name: 'بانک ملی',
          bank_account: '1234567890',
          iban: '123456789012345678901234',
          tax_registered: 1,
          is_shareholder: 1,
          is_employee: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          accounting_code: '1001-ACC',
          first_name: '',
          last_name: '',
          title: 'شرکت فناوری نوین رایان',
          nickname: 'رایان تک',
          type: 'حقوقی',
          category: 'تامین‌کننده',
          national_id: '10100234567',
          economic_code: '411122233344',
          registration_number: '54321',
          phone1: '02188888888',
          city: 'اصفهان',
          address: 'خیابان ونک، برج نگار، طبقه ۵',
          credit_limit: 200000000,
          bank_name: 'بانک سامان',
          bank_account: '9876543210',
          iban: '987654321098765432109876',
          tax_registered: 0,
          is_shareholder: 0,
          is_employee: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          accounting_code: '1002-ACC',
          first_name: 'سهراب',
          last_name: 'سپهری',
          title: '',
          nickname: 'سهراب',
          type: 'حقیقی',
          category: 'سایر',
          national_id: '1234567890',
          phone1: '09123334455',
          city: 'کاشان',
          address: 'محله گلستان، کوچه شاعر، پلاک ۵',
          credit_limit: 0,
          bank_name: 'بانک ملت',
          tax_registered: 0,
          is_shareholder: 1,
          is_employee: 1,
          created_at: new Date().toISOString()
        }
      ]);
    }
  };

  const getPersonRoles = (p: Person) => {
    const roles: string[] = [];
    if (p.is_shareholder === 1) roles.push('سهامدار');
    if (p.is_employee === 1) roles.push('کارمند');
    if (p.category === 'مشتری') roles.push('مشتری');
    if (p.category === 'تامین‌کننده') roles.push('تامین‌کننده');
    if (p.category === 'فروشنده') roles.push('فروشنده');
    return roles;
  };

  const handleEditClick = (person: Person) => {
    // Reconstruct roles array
    const roles = getPersonRoles(person);
    setEditForm({ 
      ...person,
      roles 
    });
    setIsEditModalOpen(true);
  };

  const handleDetailClick = async (person: Person) => {
    setSelectedPerson(person);
    setIsDetailModalOpen(true);
    setIsLoadingDetails(true);
    try {
      let txList: any[] = [];
      let invList: any[] = [];

      if (window.electronAPI?.getPersonFinancialTransactions) {
        txList = await window.electronAPI.getPersonFinancialTransactions(person.id);
        setFinancialTransactions(txList);
      }
      
      if (window.electronAPI?.getInvoices) {
        const allInvoices = await window.electronAPI.getInvoices();
        invList = allInvoices.filter(inv => inv.customer_id === person.id);
        setPersonInvoices(invList);
      }

      // Calculate balance using decimal.js
      let bal = new Decimal(0);
      invList.forEach(inv => {
        if (inv.status !== 'پرداخت شده') {
          bal = bal.plus(new Decimal(inv.final_amount || 0));
        }
      });
      txList.forEach(tx => {
        bal = bal.plus(new Decimal(tx.amount || 0));
      });
      setCalculatedBalance(bal.toNumber());
      
      setDetailActiveTab('info');
      if (window.electronAPI?.getPersonNotes) {
        const notes = await window.electronAPI.getPersonNotes(person.id);
        setPersonNotes(notes || []);
      }

    } catch (err) {
      console.error('Error loading person account details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchPersonNotes = async (personId: number) => {
    if (window.electronAPI?.getPersonNotes) {
      try {
        const notes = await window.electronAPI.getPersonNotes(personId);
        setPersonNotes(notes || []);
      } catch (err) {
        console.error('Error fetching person notes:', err);
      }
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !noteForm.description) return;
    if (window.electronAPI?.addPersonNote) {
      try {
        const res = await window.electronAPI.addPersonNote({
          person_id: selectedPerson.id,
          description: noteForm.description,
          followup_date: noteForm.followup_date || getTodayShamsi(),
          reminder: noteForm.reminder || 'خیر'
        });
        if (res.success) {
          setNoteForm({ description: '', followup_date: '', reminder: 'خیر' });
          fetchPersonNotes(selectedPerson.id);
          MySwal.fire({
            icon: 'success',
            title: 'یادداشت ثبت شد',
            text: 'یادداشت با موفقیت برای این شخص ثبت گردید.',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
        }
      } catch (err: any) {
        MySwal.fire('خطا', err.message || 'مشکل در ثبت یادداشت', 'error');
      }
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!selectedPerson) return;
    const confirm = await MySwal.fire({
      title: 'آیا از حذف این یادداشت مطمئن هستید؟',
      text: 'این عمل غیرقابل بازگشت است.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف شود',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (confirm.isConfirmed && window.electronAPI?.deletePersonNote) {
      try {
        const res = await window.electronAPI.deletePersonNote(id);
        if (res.success) {
          fetchPersonNotes(selectedPerson.id);
          MySwal.fire({
            icon: 'success',
            title: 'یادداشت حذف شد',
            text: 'یادداشت انتخابی با موفقیت حذف گردید.',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
        }
      } catch (err: any) {
        MySwal.fire('خطا', err.message || 'مشکل در حذف یادداشت', 'error');
      }
    }
  };

  const getLedgerStatement = () => {
    const list: any[] = [];

    // Add Invoices (including paid ones, so that the ledger balance is always complete and correct)
    personInvoices.forEach(inv => {
      const amt = inv.final_amount || 0;
      
      if (inv.type === 'برگشت از فروش') {
        list.push({
          id: `inv-${inv.id}`,
          date: inv.invoice_date || inv.date || getTodayShamsi(),
          type: 'برگشت از فروش',
          description: inv.description || `برگشت از فروش شماره #${toPersianDigits(inv.invoice_number)}`,
          debit: 0,
          credit: amt,
          rawDate: inv.invoice_date || inv.date || '',
          sortKey: 1
        });
      } else if (inv.type === 'برگشت از خرید') {
        list.push({
          id: `inv-${inv.id}`,
          date: inv.invoice_date || inv.date || getTodayShamsi(),
          type: 'برگشت از خرید (تامین‌کننده)',
          description: inv.description || `برگشت به تامین‌کننده شماره #${toPersianDigits(inv.invoice_number)}`,
          debit: amt,
          credit: 0,
          rawDate: inv.invoice_date || inv.date || '',
          sortKey: 1
        });
      } else {
        const isPurchase = inv.type === 'Purchase' || inv.type === 'purchase' || inv.is_purchase === 1 || inv.type === 'فاکتور خرید' || inv.type === 'خرید';
        if (isPurchase) {
          list.push({
            id: `inv-${inv.id}`,
            date: inv.invoice_date || inv.date || getTodayShamsi(),
            type: 'فاکتور خرید',
            description: inv.description || `فاکتور خرید شماره #${toPersianDigits(inv.invoice_number)}`,
            debit: 0,
            credit: amt,
            rawDate: inv.invoice_date || inv.date || '',
            sortKey: 1
          });
        } else {
          list.push({
            id: `inv-${inv.id}`,
            date: inv.invoice_date || inv.date || getTodayShamsi(),
            type: 'فاکتور فروش',
            description: inv.description || `فاکتور فروش شماره #${toPersianDigits(inv.invoice_number)}`,
            debit: amt,
            credit: 0,
            rawDate: inv.invoice_date || inv.date || '',
            sortKey: 1
          });
        }
      }
    });

    // Add financial transactions
    financialTransactions.forEach(tx => {
      // Filter out double-counted return transactions since return invoices represent them directly
      if (tx.type === 'sales_return' || tx.type === 'purchase_return') {
        return;
      }
      const amt = Math.abs(tx.amount || 0);
      if (tx.amount < 0 || tx.type === 'received') {
        list.push({
          id: `tx-${tx.id}`,
          date: tx.date || getTodayShamsi(),
          type: 'دریافت وجه',
          description: tx.description || 'دریافت نقدی وجه',
          debit: 0,
          credit: amt,
          rawDate: tx.date || '',
          sortKey: 2
        });
      } else {
        list.push({
          id: `tx-${tx.id}`,
          date: tx.date || getTodayShamsi(),
          type: 'پرداخت وجه',
          description: tx.description || 'پرداخت نقدی وجه',
          debit: amt,
          credit: 0,
          rawDate: tx.date || '',
          sortKey: 3
        });
      }
    });

    // Sort by date (chronologically oldest first)
    list.sort((a, b) => {
      if (a.rawDate !== b.rawDate) {
        return a.rawDate.localeCompare(b.rawDate);
      }
      return a.sortKey - b.sortKey;
    });

    // Compute running balance
    let running = new Decimal(0);
    const result = list.map(item => {
      if (item.debit > 0) {
        running = running.plus(new Decimal(item.debit));
      } 
      if (item.credit > 0) {
        running = running.minus(new Decimal(item.credit));
      }
      return {
        ...item,
        runningBalance: running.toNumber()
      };
    });

    return result;
  };

  const handleQuickTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !quickTxForm.amount || !showQuickTxModal) return;

    try {
      if (window.electronAPI?.addPersonFinancialTransaction) {
        const rawAmount = parseFloat(quickTxForm.amount);
        let finalAmount = rawAmount;
        if (showQuickTxModal === 'received') {
          finalAmount = -rawAmount; // credit (customer paid us)
        } else if (showQuickTxModal === 'paid') {
          finalAmount = rawAmount; // debit (we paid customer)
        }

        const txDate = quickTxForm.date || getTodayShamsi();

        const res = await window.electronAPI.addPersonFinancialTransaction({
          person_id: selectedPerson.id,
          date: txDate,
          type: showQuickTxModal,
          amount: finalAmount,
          description: quickTxForm.description || (showQuickTxModal === 'received' ? 'دریافت نقدی سریع' : 'پرداخت نقدی سریع')
        });

        if (res.success) {
          MySwal.fire({
            icon: 'success',
            title: 'ثبت موفقیت‌آمیز',
            text: 'تراکنش مالی جدید با موفقیت ثبت گردید.',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });

          // Reset form and close modal
          setQuickTxForm({ amount: '', date: '', description: '' });
          setShowQuickTxModal(null);

          // Reload the details for selected person if details drawer is open
          if (isDetailModalOpen) {
            await handleDetailClick(selectedPerson);
          } else {
            setSelectedPerson(null);
          }
          // Also refetch persons to update list if needed
          await fetchPersons();
        }
      }
    } catch (err) {
      console.error('Error submitting quick financial transaction:', err);
      MySwal.fire('خطا', 'ثبت تراکنش با خطا مواجه شد.', 'error');
    }
  };

  const handleQuickSale = (person: any) => {
    localStorage.setItem('preselected_customer_id', String(person.id));
    navigate('/sales/new-invoice');
  };

  const handleQuickPurchase = (person: any) => {
    localStorage.setItem('preselected_supplier_id', String(person.id));
    navigate('/inventory/control');
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: 'آیا مطمئن هستید؟',
      text: 'این شخص و تمام وابستگی‌های آن (پوشه پرونده، داده‌های سهام و استخدام) برای همیشه حذف خواهند شد.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف'
    });

    if (result.isConfirmed) {
      if (window.electronAPI?.deletePerson) {
        try {
          const res = await window.electronAPI.deletePerson(id);
          if (res.success) {
            MySwal.fire({
              title: 'حذف شد!',
              text: 'شخص با موفقیت از سیستم حذف گردید.',
              icon: 'success',
              confirmButtonColor: '#4f46e5'
            });
            fetchPersons();
          }
        } catch (e: any) {
          MySwal.fire('خطا', e.message || 'خطا در حذف رکورد از دیتابیس', 'error');
        }
      } else {
        setPersons(prev => prev.filter(p => p.id !== id));
        MySwal.fire('محیط وب', 'رکورد به صورت فرضی در محیط پیش‌نمایش حذف شد.', 'success');
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.type === 'حقیقی' && !editForm.first_name && !editForm.last_name) {
      MySwal.fire('خطا', 'نام و نام خانوادگی برای شخص حقیقی الزامی است.', 'warning');
      return;
    }
    if (editForm.type === 'حقوقی' && !editForm.title) {
      MySwal.fire('خطا', 'نام شرکت الزامی است.', 'warning');
      return;
    }

    setIsLoading(true);
    if (window.electronAPI?.updatePerson) {
      try {
        const res = await window.electronAPI.updatePerson(editForm);
        if (res.success) {
          MySwal.fire({
            icon: 'success',
            title: 'بروزرسانی موفق',
            text: 'اطلاعات شخص با موفقیت در دایتکث ذخیره شد.',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
          setIsEditModalOpen(false);
          fetchPersons();
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'مشکل در ذخیره‌سازی داده‌ها', 'error');
      } finally {
        setIsLoading(false);
      }
    } else {
      setPersons(prev => prev.map(p => {
        if (p.id === editForm.id) {
          const finalRoles = editForm.roles || [];
          return { 
            ...p, 
            ...editForm,
            is_shareholder: finalRoles.includes('سهامدار') ? 1 : 0,
            is_employee: finalRoles.includes('کارمند') ? 1 : 0
          } as Person;
        }
        return p;
      }));
      MySwal.fire('محیط وب', 'اطلاعات به صورت موقت در محیط پیش‌نمایش ذخیره شد.', 'success');
      setIsEditModalOpen(false);
      setIsLoading(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setEditForm(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleEditRoleToggle = (role: string) => {
    setEditForm(prev => {
      const currentRoles = prev.roles || [];
      const updatedRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
      
      // Keep category synced if they toggle client/supplier role
      let category = prev.category || 'سایر';
      if (role === 'مشتری' && updatedRoles.includes('مشتری')) {
        category = 'مشتری';
      } else if (role === 'تامین‌کننده' && updatedRoles.includes('تامین‌کننده')) {
        category = 'تامین‌کننده';
      } else if (role === 'فروشنده' && updatedRoles.includes('فروشنده')) {
        category = 'فروشنده';
      }

      return {
        ...prev,
        roles: updatedRoles,
        category
      };
    });
  };

  const getFullName = (p: Partial<Person>) => {
    if (p.type === 'حقوقی') return p.title || 'شرکت بدون عنوان';
    return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'نامشخص';
  };

  // Modern design cards helper
  const getCardTheme = (p: Person) => {
    // Theme prioritisation
    if (p.is_shareholder === 1) {
      return {
        accentBorder: 'border-t-[6px] border-t-emerald-500 border-x border-b border-light dark:border-slate-800/80',
        bg: 'bg-white dark:bg-slate-900',
        shadow: 'hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5',
        textAccent: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
        iconBg: 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
        label: 'سهامدار شرکت'
      };
    }
    if (p.is_employee === 1) {
      return {
        accentBorder: 'border-t-[6px] border-t-sky-500 border-x border-b border-light dark:border-slate-800/80',
        bg: 'bg-white dark:bg-slate-900',
        shadow: 'hover:shadow-sky-500/10 dark:hover:shadow-sky-500/5',
        textAccent: 'text-sky-600 dark:text-sky-400',
        badgeBg: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
        iconBg: 'bg-sky-100/50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
        label: 'کارمند رسمی'
      };
    }
    if (p.category === 'مشتری') {
      return {
        accentBorder: 'border-t-[6px] border-t-amber-500 border-x border-b border-light dark:border-slate-800/80',
        bg: 'bg-white dark:bg-slate-900',
        shadow: 'hover:shadow-amber-500/10 dark:hover:shadow-amber-500/5',
        textAccent: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
        iconBg: 'bg-amber-100/50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
        label: 'مشتری تجاری'
      };
    }
    if (p.category === 'تامین‌کننده') {
      return {
        accentBorder: 'border-t-[6px] border-t-purple-500 border-x border-b border-light dark:border-slate-800/80',
        bg: 'bg-white dark:bg-slate-900',
        shadow: 'hover:shadow-purple-500/10 dark:hover:shadow-purple-500/5',
        textAccent: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
        iconBg: 'bg-purple-100/50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
        label: 'تامین‌کننده کالا'
      };
    }
    return {
      accentBorder: 'border-t-[6px] border-t-slate-400 border-x border-b border-light dark:border-slate-800/80',
      bg: 'bg-white dark:bg-slate-900',
      shadow: 'hover:shadow-slate-500/10 dark:hover:shadow-slate-500/5',
      textAccent: 'text-slate-600 dark:text-slate-400',
      badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
      iconBg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
      label: 'عضو عمومی'
    };
  };

  // Filter and search
  const filteredPersons = persons.filter(p => {
    const term = searchQuery.toLowerCase().trim();
    const fullName = getFullName(p).toLowerCase();
    const phone = (p.phone1 || '').toLowerCase();
    const code = (p.accounting_code || '').toLowerCase();
    const city = (p.city || '').toLowerCase();
    const natId = (p.national_id || '').toLowerCase();

    const matchesSearch = 
      fullName.includes(term) || 
      phone.includes(term) || 
      code.includes(term) || 
      city.includes(term) || 
      natId.includes(term);

    if (activeTab === 'همه') return matchesSearch;
    if (activeTab === 'سهامدار') return matchesSearch && p.is_shareholder === 1;
    if (activeTab === 'کارمند') return matchesSearch && p.is_employee === 1;
    if (activeTab === 'مشتری') return matchesSearch && p.category === 'مشتری';
    if (activeTab === 'تامین‌کننده') return matchesSearch && p.category === 'تامین‌کننده';
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-20 overflow-y-auto custom-scrollbar pr-1" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/10 dark:bg-transparent py-4 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">لیست تفکیکی اشخاص</h2>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">
            مشاهده کارت‌های مشخصات شرکا، کارمندان و نهادهای مالی مرتبط با سیستم به همراه فیلترهای پیشرفته
          </p>
        </div>
        <button 
          onClick={() => navigate('/persons/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          ثبت شخص الکترونیکی جدید
        </button>
      </div>

      {/* Advanced Filter Segment Control */}
      <div className="bg-slate-100/70 dark:bg-slate-900/60 p-1.5 rounded-3xl border border-slate-200/45 dark:border-slate-800/40 flex flex-wrap gap-1 items-center">
        {[
          { key: 'همه', label: 'همه اشخاص', count: persons.length },
          { key: 'مشتری', label: 'مشتریان', count: persons.filter(p => p.category === 'مشتری').length },
          { key: 'تامین‌کننده', label: 'تامین‌کنندگان', count: persons.filter(p => p.category === 'تامین‌کننده').length },
          { key: 'سهامدار', label: 'سهام‌داران', count: persons.filter(p => p.is_shareholder === 1).length },
          { key: 'کارمند', label: 'کارمندان', count: persons.filter(p => p.is_employee === 1).length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer relative",
              activeTab === tab.key 
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-slate-200/50 dark:shadow-none"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            {tab.label}
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all",
              activeTab === tab.key 
                ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                : "bg-slate-200/60 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>      {/* Control Panel / Search */}
      <div className="bg-white/50 dark:bg-slate-900/30 backdrop-blur-md rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/30 flex items-center justify-between">
        <div className="relative w-full">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input 
            type="text" 
            placeholder="جستجوی همزمان بر اساس نام، فامیل، کدملی، شماره تلفن همراه، نام شرکت یا کد تفصیلی حساب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-5 pr-12 py-3 bg-slate-100/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm font-semibold transition-all text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Cards Grid Layout */}
      {filteredPersons.length === 0 ? (
        <div className="bg-white/40 dark:bg-slate-900/10 rounded-3xl p-16 border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-800">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-md font-bold text-slate-700 dark:text-slate-350">هیچ شخص منطبقی پیدا نشد</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            هیچ کارتی با معیار کلمه‌ی کلیدی "{searchQuery || 'بدون فیلتر'}" در تب "{activeTab === 'همه' ? 'همه اشخاص' : activeTab}" وجود ندارد.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50">
          {filteredPersons.map(person => {
            const theme = getCardTheme(person);
            const rolesList = getPersonRoles(person);
            return (
              <div 
                key={person.id}
                className={cn(
                  "rounded-2xl p-4 transition-all duration-300 shadow-sm relative group flex flex-col justify-between overflow-hidden",
                  theme.accentBorder,
                  theme.bg,
                  theme.shadow,
                  "hover:-translate-y-0.5 border border-slate-150 dark:border-slate-800/80"
                )}
              >
                {/* Accent Highlight Glow */}
                <div className="absolute -left-10 -top-10 w-20 h-20 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-xl group-hover:scale-125 transition-all pointer-events-none"></div>
                
                {/* Upper Section */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-slate-400 dark:text-slate-500">
                      ID: {person.id}
                    </span>
                    <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-lg shadow-inner", theme.badgeBg)}>
                      {theme.label}
                    </span>
                  </div>

                  {/* Contact Avatar & Header details */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={cn("w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800 shrink-0", theme.iconBg)}>
                      {person.avatar ? (
                        <img src={person.avatar} alt={getFullName(person)} className="w-full h-full object-cover" />
                      ) : person.type === 'حقیقی' ? (
                        <User className="w-5 h-5 shrink-0" />
                      ) : (
                        <Building2 className="w-5 h-5 shrink-0" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug truncate">
                        {getFullName(person)}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold truncate">
                        {person.nickname ? `(${person.nickname})` : person.type}
                      </p>
                    </div>
                  </div>

                  {/* Separation line */}
                  <div className="border-t border-slate-100 dark:border-slate-800/30 my-2.5"></div>

                  {/* Body elements / Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-350">
                    {/* Accounting key */}
                    <div className="flex justify-between items-center bg-slate-100/40 dark:bg-slate-950/20 p-1.5 rounded-lg border border-slate-200/20 dark:border-slate-800/25">
                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 text-[11px]">
                        <Hash className="w-3 h-3" />
                        کد کل حسابداری:
                      </span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                        {person.accounting_code}
                      </span>
                    </div>

                    {/* Phone Number */}
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        شماره تماس:
                      </span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {person.phone1 || 'ثبت نشده'}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        موقعیت جغرافیایی:
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                        {person.city ? `${person.city}` : 'بدون آدرس'}
                      </span>
                    </div>

                    {/* Tax configuration */}
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 dark:text-slate-500">ارزش افزوده:</span>
                      {person.tax_registered ? (
                        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-extrabold font-sans">
                          <CheckCircle className="w-3 h-3" />
                          مشمول مالیاتی
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">نامشمول</span>
                      )}
                    </div>

                    {/* Financial block if set */}
                    {person.credit_limit && person.credit_limit > 0 ? (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          سقف اعتبار:
                        </span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-500">
                          {Number(person.credit_limit).toLocaleString('fa-IR')} ریال
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Footer Roles & Action toolbar */}
                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/40 flex flex-col gap-2">
                  {/* Dynamic Roles inside card footer */}
                  {rolesList.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rolesList.map(r => (
                        <span 
                          key={r}
                          className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick Transactions Toolbar */}
                  <div className="mt-3 bg-slate-50/70 dark:bg-slate-950/20 p-2 rounded-xl border border-dashed border-slate-150 dark:border-slate-800 flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 mr-1 block">عملیات مالی سریع</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* فروش جدید (New Sale) */}
                      <button
                        onClick={() => handleQuickSale(person)}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/40 dark:text-indigo-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-indigo-100/30"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>فروش جدید</span>
                      </button>
                      {/* خرید جدید (New Purchase) */}
                      <button
                        onClick={() => handleQuickPurchase(person)}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 bg-amber-50/50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:hover:bg-amber-900/40 dark:text-amber-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-amber-100/30"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>خرید جدید</span>
                      </button>
                      {/* دریافت (Receive) */}
                      <button
                        onClick={() => {
                          setSelectedPerson(person);
                          setShowQuickTxModal('received');
                          setQuickTxForm({ amount: '', date: getTodayShamsi(), description: '' });
                        }}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 dark:text-emerald-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-emerald-100/30"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>دریافت وجه</span>
                      </button>
                      {/* پرداخت (Pay) */}
                      <button
                        onClick={() => {
                          setSelectedPerson(person);
                          setShowQuickTxModal('paid');
                          setQuickTxForm({ amount: '', date: getTodayShamsi(), description: '' });
                        }}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 bg-rose-50/50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 dark:text-rose-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-rose-100/30"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>پرداخت وجه</span>
                      </button>
                    </div>
                  </div>

                  {/* Button interactions toolbar */}
                  <div className="flex items-center justify-between gap-1">
                    <button 
                      onClick={() => handleDetailClick(person)}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      رویت پرونده
                    </button>
                    
                    <button 
                      onClick={() => handleEditClick(person)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20 dark:text-emerald-400 p-2 rounded-xl transition-all cursor-pointer"
                      title="ویرایش اطلاعات شخص"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button 
                      onClick={() => handleDelete(person.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/10 dark:hover:bg-red-900/20 dark:text-red-400 p-2 rounded-xl transition-all cursor-pointer animate-none"
                      title="حذف و ابطال پرونده"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- Details Drawer / modal --- */}
      {isDetailModalOpen && selectedPerson && (() => {
        // Compute financial totals using decimal.js for absolute precision
        const totalSales = personInvoices.reduce((sum, inv) => {
          if (inv.status !== 'لغو شده') {
            return sum.plus(new Decimal(inv.final_amount || 0));
          }
          return sum;
        }, new Decimal(0));

        const totalPurchases = new Decimal(0); // For now, all transactions in the goods/financial ledger are sales.

        const totalReceived = personInvoices.reduce((sum, inv) => {
          if (inv.status === 'پرداخت شده') {
            return sum.plus(new Decimal(inv.final_amount || 0));
          }
          return sum;
        }, new Decimal(0)).plus(
          financialTransactions.reduce((sum, tx) => {
            if (tx.type === 'received' || tx.amount < 0) {
              return sum.plus(new Decimal(Math.abs(tx.amount || 0)));
            }
            return sum;
          }, new Decimal(0))
        );

        const totalPaid = financialTransactions.reduce((sum, tx) => {
          if (tx.type === 'paid' || tx.amount > 0) {
            return sum.plus(new Decimal(Math.abs(tx.amount || 0)));
          }
          return sum;
        }, new Decimal(0));

        const ledger = getLedgerStatement();
        const finalBalance = new Decimal(ledger.length > 0 ? ledger[ledger.length - 1].runningBalance : 0);

        const handlePrintStatement = () => {
          if (!selectedPerson) return;

          const ledger = getLedgerStatement();
          
          // Construct HTML content
          const htmlContent = `
            <div style="font-family: 'Vazirmatn', sans-serif; direction: rtl; padding: 30px; color: #0f172a; line-height: 1.6; background-color: #ffffff;">
              <!-- Print Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 18px; margin-bottom: 25px;">
                <div>
                  <h1 style="font-size: 22px; font-weight: 900; color: #1e3a8a; margin: 0 0 6px 0;">صورت وضعیت پرونده و گردش حساب مالی</h1>
                  <p style="font-size: 12px; color: #475569; margin: 0; font-weight: bold;">مجموعه تجاری: ${storeInfo.name || 'حسابداری ملینا'}</p>
                </div>
                <div style="text-align: left; font-size: 11px; color: #334155; line-height: 1.8;">
                  <div><strong>تاریخ تهیه گزارش:</strong> ${toPersianDigits(getTodayShamsi())}</div>
                  <div><strong>شماره تماس:</strong> ${toPersianDigits(storeInfo.phone || '۰۲۱-۵۵۶۶۷۷۸۸')}</div>
                  <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>نشانی:</strong> ${storeInfo.address || 'تهران، بازار بزرگ، سرای ملی'}</div>
                </div>
              </div>

              <!-- Person Information Box -->
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; line-height: 2;">
                <div>
                  <div><strong>نام و نام خانوادگی:</strong> ${getFullName(selectedPerson)}</div>
                  <div><strong>نام مستعار/شهرت:</strong> ${selectedPerson.nickname || '---'}</div>
                  <div><strong>تلفن تماس:</strong> ${toPersianDigits(selectedPerson.phone1) || '---'}</div>
                </div>
                <div style="border-right: 1px solid #cbd5e1; padding-right: 20px;">
                  <div><strong>کد ملی / شناسه ملی:</strong> ${toPersianDigits(selectedPerson.national_id) || '---'}</div>
                  <div><strong>کد حسابداری پرونده:</strong> ${toPersianDigits(selectedPerson.accounting_code)}</div>
                  <div><strong>نشانی محل سکونت / تجارت:</strong> ${selectedPerson.address || 'ثبت نشده'}</div>
                </div>
              </div>

              <!-- Financial Summary Box -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px; border-radius: 10px; text-align: center;">
                  <span style="font-size: 10px; color: #475569; display: block; margin-bottom: 4px; font-weight: bold;">مجموع فاکتورهای فروش</span>
                  <strong style="font-size: 13px; color: #1e3a8a;">${formatPersianCurrency(totalSales.toNumber())} <span style="font-size: 9px;">ریال</span></strong>
                </div>
                <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px; border-radius: 10px; text-align: center;">
                  <span style="font-size: 10px; color: #475569; display: block; margin-bottom: 4px; font-weight: bold;">مجموع فاکتورهای خرید</span>
                  <strong style="font-size: 13px; color: #b45309;">${formatPersianCurrency(totalPurchases.toNumber())} <span style="font-size: 9px;">ریال</span></strong>
                </div>
                <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px; border-radius: 10px; text-align: center;">
                  <span style="font-size: 10px; color: #475569; display: block; margin-bottom: 4px; font-weight: bold;">مجموع کل دریافت‌ها</span>
                  <strong style="font-size: 13px; color: #047857;">${formatPersianCurrency(totalReceived.toNumber())} <span style="font-size: 9px;">ریال</span></strong>
                </div>
                <div style="background-color: ${finalBalance.greaterThan(0) ? '#fef2f2' : finalBalance.lessThan(0) ? '#ecfdf5' : '#f8fafc'}; border: 1px solid ${finalBalance.greaterThan(0) ? '#fca5a5' : finalBalance.lessThan(0) ? '#6ee7b7' : '#cbd5e1'}; padding: 12px; border-radius: 10px; text-align: center;">
                  <span style="font-size: 10px; color: #475569; display: block; margin-bottom: 4px; font-weight: bold;">مانده نهایی حساب</span>
                  <strong style="font-size: 14px; color: ${finalBalance.greaterThan(0) ? '#b91c1c' : finalBalance.lessThan(0) ? '#047857' : '#334155'};">
                    ${formatPersianCurrency(Math.abs(finalBalance.toNumber()))} <span style="font-size: 9px;">ریال</span>
                  </strong>
                  <span style="font-size: 8px; display: block; margin-top: 2px; font-weight: bold; color: ${finalBalance.greaterThan(0) ? '#b91c1c' : finalBalance.lessThan(0) ? '#047857' : '#475569'};">
                    (${finalBalance.greaterThan(0) ? 'بدهکار' : finalBalance.lessThan(0) ? 'بستانکار' : 'تسویه شده'})
                  </span>
                </div>
              </div>

              <!-- Ledger Circulation Table -->
              <h3 style="font-size: 13px; font-weight: 900; margin: 0 0 10px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; color: #1e3a8a;">گردش تراکنش‌های مالی و کارکرد حسابداری (دفتر روزنامه شخص)</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: right; margin-bottom: 30px;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #1e293b; font-weight: 900;">
                    <th style="padding: 10px; border: 1px solid #cbd5e1; width: 90px; text-align: center;">تاریخ سند</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; width: 110px; text-align: center;">نوع عملیات</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">شرح تفصیلی تراکنش</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; width: 120px;">بدهکار (ریال)</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; width: 120px;">بستانکار (ریال)</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; width: 130px;">مانده نهایی (ریال)</th>
                  </tr>
                </thead>
                <tbody>
                  ${ledger.length === 0 ? `
                    <tr>
                      <td colspan="6" style="padding: 25px; text-align: center; color: #64748b; border: 1px solid #cbd5e1; font-weight: bold;">هیچ سند مالی یا گردش حسابی برای این پرونده ثبت نگردیده است.</td>
                    </tr>
                  ` : ledger.map(item => `
                    <tr style="border-bottom: 1px solid #cbd5e1;">
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${toPersianDigits(item.date)}</td>
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${item.debit > 0 ? '#b91c1c' : '#047857'}">${item.type}</td>
                      <td style="padding: 8px; border: 1px solid #cbd5e1; color: #334155; font-weight: bold;">${item.description}</td>
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace;">${item.debit > 0 ? formatPersianCurrency(item.debit) : '۰'}</td>
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace;">${item.credit > 0 ? formatPersianCurrency(item.credit) : '۰'}</td>
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace; font-weight: bold; color: ${item.runningBalance > 0 ? '#b91c1c' : item.runningBalance < 0 ? '#047857' : '#334155'}">
                        ${formatPersianCurrency(Math.abs(item.runningBalance))} ${item.runningBalance > 0 ? 'بدهکار' : item.runningBalance < 0 ? 'بستانکار' : 'تصفیه'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- Invoices List Table -->
              <h3 style="font-size: 13px; font-weight: 900; margin: 0 0 10px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; color: #1e3a8a;">فهرست فاکتورهای صادره</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: right; margin-bottom: 40px;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #1e293b; font-weight: 900;">
                    <th style="padding: 10px; border: 1px solid #cbd5e1; width: 150px; text-align: center;">شماره فاکتور</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; width: 120px; text-align: center;">تاریخ صدور فاکتور</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; width: 180px;">مبلغ کل فاکتور (ریال)</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; width: 140px;">وضعیت تسویه</th>
                  </tr>
                </thead>
                <tbody>
                  ${personInvoices.length === 0 ? `
                    <tr>
                      <td colspan="4" style="padding: 25px; text-align: center; color: #64748b; border: 1px solid #cbd5e1; font-weight: bold;">هیچ فاکتوری برای این پرونده صادر نگردیده است.</td>
                    </tr>
                  ` : personInvoices.map(inv => `
                    <tr style="border-bottom: 1px solid #cbd5e1;">
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: bold;">${toPersianDigits(inv.invoice_number)}</td>
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${toPersianDigits(inv.date || inv.created_at?.split('T')[0] || '')}</td>
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-family: monospace; font-weight: bold;">${formatPersianCurrency(inv.final_amount || 0)}</td>
                      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">
                        <span style="padding: 3px 10px; border-radius: 12px; font-size: 8px; font-weight: bold; background-color: ${inv.status === 'پرداخت شده' ? '#d1fae5' : inv.status === 'لغو شده' ? '#f1f5f9' : '#fef3c7'}; color: ${inv.status === 'پرداخت شده' ? '#065f46' : inv.status === 'لغو شده' ? '#475569' : '#92400e'}; border: 1px solid ${inv.status === 'پرداخت شده' ? '#a7f3d0' : inv.status === 'لغو شده' ? '#cbd5e1' : '#fde68a'};">
                          ${inv.status}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- Signature Section -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 60px; font-size: 12px; font-weight: bold;">
                <div style="text-align: center; width: 220px; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px;">
                  <p style="margin: 0 0 40px 0; color: #475569;">امضا و مهر دایره مالی فروشگاه</p>
                  <div style="height: 30px;"></div>
                </div>
                <div style="text-align: center; width: 220px; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px;">
                  <p style="margin: 0 0 40px 0; color: #475569;">تاییدیه و امضای صاحب حساب (مشتری)</p>
                  <div style="height: 30px;"></div>
                </div>
              </div>
            </div>
          `;

          // Create temporary print container
          const printContainer = document.createElement('div');
          printContainer.id = 'print-temp-container';
          printContainer.innerHTML = htmlContent;
          document.body.appendChild(printContainer);

          // Trigger print
          window.print();

          // Cleanup
          document.body.removeChild(printContainer);
        };

        return (
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border border-slate-100 dark:border-slate-800 p-8 relative">
              
              {/* Close Button */}
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute left-6 top-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div className={cn(
                  "w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl bg-slate-100 dark:bg-slate-800 shrink-0",
                  !selectedPerson.avatar && (selectedPerson.is_shareholder === 1 ? "bg-emerald-500 text-white" : selectedPerson.is_employee === 1 ? "bg-sky-500 text-white" : "bg-indigo-500 text-white")
                )}>
                  {selectedPerson.avatar ? (
                    <img src={selectedPerson.avatar} alt={getFullName(selectedPerson)} className="w-full h-full object-cover" />
                  ) : selectedPerson.type === 'حقیقی' ? (
                    <User className="w-7 h-7" />
                  ) : (
                    <Building2 className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{getFullName(selectedPerson)}</h3>
                  <p className="text-xs text-indigo-500 font-mono mt-0.5">کد حسابداری کل: {selectedPerson.accounting_code}</p>
                </div>
              </div>

              {/* Financial Summary Bento-Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {/* Total Sales */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">مجموع فروش</span>
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {formatPersianCurrency(totalSales.toNumber())} <span className="text-[9px] font-bold">ریال</span>
                  </p>
                </div>

                {/* Total Purchases */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">مجموع خرید</span>
                  <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                    {formatPersianCurrency(totalPurchases.toNumber())} <span className="text-[9px] font-bold">ریال</span>
                  </p>
                </div>

                {/* Total Received */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">مجموع دریافت</span>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatPersianCurrency(totalReceived.toNumber())} <span className="text-[9px] font-bold">ریال</span>
                  </p>
                </div>

                {/* Total Paid */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">مجموع پرداخت</span>
                  <p className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                    {formatPersianCurrency(totalPaid.toNumber())} <span className="text-[9px] font-bold">ریال</span>
                  </p>
                </div>

                {/* Final Balance (Col-span-2 on mobile) */}
                <div className={cn(
                  "col-span-2 md:col-span-1 border rounded-2xl p-4 text-center",
                  finalBalance.greaterThan(0)
                    ? "bg-rose-50/50 border-rose-100 dark:bg-rose-950/5 dark:border-rose-900/30"
                    : finalBalance.lessThan(0)
                      ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30"
                      : "bg-slate-50 border-slate-150 dark:bg-slate-900/50 dark:border-slate-800"
                )}>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">مانده نهایی</span>
                  <p className={cn(
                    "text-sm font-black font-mono",
                    finalBalance.greaterThan(0)
                      ? "text-rose-600 dark:text-rose-400"
                      : finalBalance.lessThan(0)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-650 dark:text-slate-350"
                  )}>
                    {formatPersianCurrency(Math.abs(finalBalance.toNumber()))} <span className="text-[9px] font-bold">ریال</span>
                  </p>
                  <span className={cn(
                    "text-[8.5px] font-bold block mt-0.5",
                    finalBalance.greaterThan(0) ? "text-rose-500" : finalBalance.lessThan(0) ? "text-emerald-500" : "text-slate-400"
                  )}>
                    {finalBalance.greaterThan(0) ? 'بدهکار' : finalBalance.lessThan(0) ? 'بستانکار' : 'تصفیه شده'}
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons Grid */}
              <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-150/40 dark:border-slate-850/40 rounded-2xl p-4 mb-6">
                <span className="text-[10px] font-extrabold text-indigo-500 block mb-3">عملیات سریع پرونده شخص:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  {/* Register Sale for Person */}
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      localStorage.setItem('preselected_customer_id', String(selectedPerson.id));
                      navigate('/sales/new-invoice');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold cursor-pointer shadow-sm hover:scale-[1.02]"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                    <span>ثبت فروش جدید</span>
                  </button>

                  {/* Register Purchase for Person */}
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      localStorage.setItem('preselected_supplier_name', `${selectedPerson.first_name || ''} ${selectedPerson.last_name || ''} (${selectedPerson.nickname || ''})`.trim());
                      navigate('/inventory/control');
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold cursor-pointer shadow-sm hover:scale-[1.02]"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                    <span>ثبت خرید جدید</span>
                  </button>

                  {/* Register Receipt */}
                  <button
                    onClick={() => {
                      setShowQuickTxModal('received');
                      setQuickTxForm({
                        amount: '',
                        date: getTodayShamsi(),
                        description: `دریافت نقدی بابت تسویه حساب ${getFullName(selectedPerson)}`
                      });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold cursor-pointer shadow-sm hover:scale-[1.02]"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>ثبت دریافت وجه</span>
                  </button>

                  {/* Register Payment */}
                  <button
                    onClick={() => {
                      setShowQuickTxModal('paid');
                      setQuickTxForm({
                        amount: '',
                        date: getTodayShamsi(),
                        description: `پرداخت نقدی به حساب ${getFullName(selectedPerson)}`
                      });
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold cursor-pointer shadow-sm hover:scale-[1.02]"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    <span>ثبت پرداخت وجه</span>
                  </button>

                  {/* View Invoices */}
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      localStorage.setItem('sales_history_search', getFullName(selectedPerson));
                      navigate('/sales/history');
                    }}
                    className="bg-slate-500 hover:bg-slate-600 text-white rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold cursor-pointer shadow-sm hover:scale-[1.02]"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>مشاهده فاکتورها</span>
                  </button>

                  {/* Print Account file */}
                  <button
                    onClick={handlePrintStatement}
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 transition-all text-[11px] font-bold cursor-pointer shadow-sm hover:scale-[1.02]"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>چاپ پرونده حساب</span>
                  </button>
                </div>
              </div>

              {/* Tab Navigation buttons */}
              <div className="flex border-b border-slate-150 dark:border-slate-800 mb-6 overflow-x-auto scrollbar-none gap-2">
                {[
                  { id: 'info', name: 'اطلاعات شخص', icon: User },
                  { id: 'ledger', name: 'گردش حساب', icon: Activity },
                  { id: 'sales', name: 'فاکتورهای فروش', icon: FileText },
                  { id: 'purchases', name: 'فاکتورهای خرید', icon: ShoppingBag },
                  { id: 'tx', name: 'دریافت و پرداخت', icon: CreditCard },
                  { id: 'notes', name: 'یادداشت‌ها', icon: FileEdit },
                ].map(tab => {
                  const IconComponent = tab.icon;
                  const isActive = detailActiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDetailActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer",
                        isActive 
                          ? "border-indigo-650 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400" 
                          : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      <IconComponent className="w-4 h-4 shrink-0" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              <div className="min-h-[300px]">
                
                {/* 1. Person Information Tab */}
                {detailActiveTab === 'info' && (
                  <div className="space-y-6 animate-in fade-in duration-200 text-right">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Identity & Contact Details */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                        <h4 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2 pb-2 border-b">
                          <Phone className="w-4 h-4 text-indigo-500" />
                          اطلاعات هویتی و ارتباطی
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-400 block">نوع حقوقی :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">{selectedPerson.type}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">کد یا شناسه ملی :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 font-mono mt-1">{selectedPerson.national_id || 'تنظیم نشده'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block">تلفن همراه اصلی :</span>
                            <p className="text-xs font-bold text-slate-750 dark:text-slate-300 font-mono dir-ltr text-right mt-1">{selectedPerson.phone1 || 'تنظیم نشده'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">واتس‌اپ / پیام‌رسان :</span>
                            <p className="text-xs font-bold text-slate-750 dark:text-slate-300 font-mono dir-ltr text-right mt-1">{selectedPerson.whatsapp || 'تنظیم نشده'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block">موبایل دوم :</span>
                            <p className="text-xs font-bold text-slate-750 dark:text-slate-300 font-mono dir-ltr text-right mt-1">{selectedPerson.phone3 || 'تنظیم نشده'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">تلفن ثابت :</span>
                            <p className="text-xs font-bold text-slate-750 dark:text-slate-300 font-mono dir-ltr text-right mt-1">{selectedPerson.phone2 || 'تنظیم نشده'}</p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 block">پست الکترونیکی :</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 truncate font-mono">{selectedPerson.email || 'تنظیم نشده'}</p>
                        </div>
                      </div>

                      {/* Business & Commercial Details */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                        <h4 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2 pb-2 border-b">
                          <Briefcase className="w-4 h-4 text-indigo-500" />
                          مشخصات و اطلاعات تجاری کسب‌وکار
                        </h4>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block">نام کسب و کار :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">{selectedPerson.business_name || 'تنظیم نشده'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">برند تجاری :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">{selectedPerson.brand || 'تنظیم نشده'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">نوع فعالیت / رسته :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">{selectedPerson.business_activity || 'تنظیم نشده'}</p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 block">نشانی محل کار / دفتر مرکزی :</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{selectedPerson.business_address || 'هیچ آدرس پستی برای محل کار ثبت نگردیده است.'}</p>
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Bank & Financial Information */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                        <h4 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2 pb-2 border-b">
                          <CreditCard className="w-4 h-4 text-indigo-500" />
                          جزئیات حساب بانکی و اعتبار خرید
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-400 block">بانک عامل :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">{selectedPerson.bank_name || 'تنظیم نشده'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">سقف اعتبار تجاری :</span>
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                              {selectedPerson.credit_limit ? `${formatPersianCurrency(selectedPerson.credit_limit)} ریال` : 'نامحدود'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block">شماره کارت عابر بانک :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono mt-1">{selectedPerson.bank_card || 'تنظیم نشده'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">شماره حساب بانکی :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 font-mono mt-1">{selectedPerson.bank_account || 'تنظیم نشده'}</p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 block">شماره شبا بین‌المللی (IBAN) :</span>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono text-left dir-ltr mt-1">
                            {selectedPerson.iban ? `IR-${selectedPerson.iban}` : 'تنظیم نشده'}
                          </p>
                        </div>
                      </div>

                      {/* Location and Residence details */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                        <h4 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2 pb-2 border-b">
                          <MapPin className="w-4 h-4 text-indigo-500" />
                          موقعیت پستی و محل سکونت
                        </h4>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block">استان :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">{selectedPerson.province || 'تنظیم نشده'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">شهر :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">{selectedPerson.city || 'تنظیم نشده'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">منطقه :</span>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">{selectedPerson.region || 'تنظیم نشده'}</p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 block">کد پستی ۱۰ رقمی :</span>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-350 font-mono mt-1">{selectedPerson.postal_code || 'تنظیم نشده'}</p>
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 block">نشانی تفصیلی پستی سکونت :</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{selectedPerson.address || 'هیچ آدرس تفصیلی سکونتی برای این شخص مکتوب نشده است.'}</p>
                        </div>
                      </div>

                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6">
                      <span className="text-xs text-indigo-500 font-bold block mb-1">یادداشت اداری / توضیحات سیستمی اضافه :</span>
                      <p className="text-xs text-slate-750 dark:text-slate-300 leading-relaxed">{selectedPerson.description || 'توضیحات تکمیلی بیشتری برای این شخص در پرونده درج نشده است.'}</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          handleEditClick(selectedPerson);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-6 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        <span>ویرایش اطلاعات پرونده</span>
                      </button>
                    </div>

                  </div>
                )}

                {/* 2. Account Circulation / Ledger Tab */}
                {detailActiveTab === 'ledger' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        گردش حساب و دفتر معین تفصیلی
                      </h4>
                    </div>

                    {isLoadingDetails ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-550 border-t-transparent animate-spin mb-3" />
                        <span className="text-[11px] font-bold">در حال بارگذاری تراکنش‌ها و اسناد مالی...</span>
                      </div>
                    ) : (
                      <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                                <th className="p-3">تاریخ</th>
                                <th className="p-3">نوع عملیات</th>
                                <th className="p-3">شرح</th>
                                <th className="p-3 text-left">بدهکار</th>
                                <th className="p-3 text-left">بستانکار</th>
                                <th className="p-3 text-left">مانده</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-750 dark:text-slate-300">
                              {getLedgerStatement().length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-10 text-center text-slate-400 text-[11px] font-semibold leading-relaxed">
                                    هیچ فاکتور فروش معلق یا سند معین دریافت و پرداختی در سیستم برای این شخص ثبت نشده است.
                                  </td>
                                </tr>
                              ) : (
                                getLedgerStatement().map((row) => {
                                  const isPositive = row.runningBalance > 0;
                                  const isNegative = row.runningBalance < 0;
                                  return (
                                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                                      <td className="p-3 font-mono text-slate-400 font-bold text-[10.5px]">
                                        {toPersianDigits(row.date)}
                                      </td>
                                      <td className="p-3">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-md text-[9px] font-extrabold",
                                          row.type === 'فاکتور فروش' 
                                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450" 
                                            : row.type === 'دریافت وجه' 
                                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450" 
                                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450"
                                        )}>
                                          {row.type}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-700 dark:text-slate-300 font-bold truncate max-w-[180px]">
                                        {row.description}
                                      </td>
                                      <td className="p-3 text-left font-black text-slate-700 dark:text-slate-200 font-mono">
                                        {row.debit > 0 ? `${formatPersianCurrency(row.debit)}` : '-'}
                                      </td>
                                      <td className="p-3 text-left font-black text-slate-700 dark:text-slate-200 font-mono">
                                        {row.credit > 0 ? `${formatPersianCurrency(row.credit)}` : '-'}
                                      </td>
                                      <td className={cn(
                                        "p-3 text-left font-black font-mono",
                                        isPositive 
                                          ? "text-rose-600 dark:text-rose-400" 
                                          : isNegative 
                                            ? "text-emerald-600 dark:text-emerald-400" 
                                            : "text-slate-400 dark:text-slate-500"
                                      )}>
                                        {row.runningBalance !== 0 ? (
                                          <span>
                                            {formatPersianCurrency(Math.abs(row.runningBalance))}
                                            <span className="text-[8.5px] font-extrabold mr-1">
                                              {isPositive ? 'بدهکار' : 'بستانکار'}
                                            </span>
                                          </span>
                                        ) : 'تصفیه'}
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
                  </div>
                )}

                {/* 3. Sales Invoices Tab */}
                {detailActiveTab === 'sales' && (
                  <div className="space-y-4 animate-in fade-in duration-200 text-right">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5 mb-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      لیست فاکتورهای فروش ثبت شده
                    </h4>

                    {personInvoices.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl">هیچ فاکتور فروشی برای این شخص ثبت نشده است.</div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="p-3">شماره فاکتور</th>
                              <th className="p-3">تاریخ فاکتور</th>
                              <th className="p-3 text-left">مبلغ کل (ریال)</th>
                              <th className="p-3 text-center">وضعیت پرداخت</th>
                              <th className="p-3 text-center">عملیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {personInvoices.map(inv => (
                              <tr key={inv.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/10">
                                <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {toPersianDigits(inv.invoice_number)}
                                </td>
                                <td className="p-3 font-mono text-slate-400 font-bold">
                                  {toPersianDigits(inv.date || inv.created_at?.split('T')[0] || '')}
                                </td>
                                <td className="p-3 text-left font-black text-slate-700 dark:text-slate-200 font-mono">
                                  {formatPersianCurrency(inv.final_amount || 0)}
                                </td>
                                <td className="p-3 text-center">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-bold inline-block",
                                    inv.status === 'پرداخت شده'
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-400"
                                      : inv.status === 'لغو شده'
                                        ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-450"
                                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-450"
                                  )}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => {
                                      setIsDetailModalOpen(false);
                                      localStorage.setItem('sales_history_search', inv.invoice_number);
                                      navigate('/sales/history');
                                    }}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>مشاهده فاکتور</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Purchase Invoices Tab */}
                {detailActiveTab === 'purchases' && (
                  <div className="space-y-4 animate-in fade-in duration-200 text-right">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5 mb-2">
                      <ShoppingBag className="w-4 h-4 text-indigo-500" />
                      فاکتورهای خرید کالا / اسناد ورودی
                    </h4>
                    
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-2xl">
                      <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">هیچ فاکتور خریدی در سیستم برای این شخص پیدا نشد.</span>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs text-center leading-relaxed">
                        کلیه معاملات با این شخص در سیستم دایتکث در ردیف فاکتورهای فروش ثبت گردیده‌اند.
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. Receipts and Payments (دریافت و پرداخت) Tab */}
                {detailActiveTab === 'tx' && (
                  <div className="space-y-6 animate-in fade-in duration-200 text-right">
                    
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-indigo-500" />
                        اسناد دریافت و پرداخت وجوه
                      </h4>
                    </div>

                    {/* Quick Register Vouchers */}
                    <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-150/45 dark:border-slate-850/40 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-2">ثبت سریع سند مالی جدید:</span>
                      <div className="flex flex-wrap gap-3">
                        {/* Register Receipt */}
                        <button
                          onClick={() => {
                            setShowQuickTxModal('received');
                            setQuickTxForm({
                              amount: '',
                              date: getTodayShamsi(),
                              description: `دریافت نقدی بابت تسویه حساب ${getFullName(selectedPerson)}`
                            });
                          }}
                          className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl py-2.5 px-4 flex items-center gap-2 transition-all text-xs font-bold shadow-sm cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>ثبت دریافت وجه (بستانکار کردن شخص)</span>
                        </button>

                        {/* Register Payment */}
                        <button
                          onClick={() => {
                            setShowQuickTxModal('paid');
                            setQuickTxForm({
                              amount: '',
                              date: getTodayShamsi(),
                              description: `پرداخت نقدی به حساب ${getFullName(selectedPerson)}`
                            });
                          }}
                          className="bg-rose-650 hover:bg-rose-700 text-white rounded-xl py-2.5 px-4 flex items-center gap-2 transition-all text-xs font-bold shadow-sm cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>ثبت پرداخت وجه (بدهکار کردن شخص)</span>
                        </button>
                      </div>
                    </div>

                    {/* Receipts and Payments History */}
                    {financialTransactions.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl">هیچ سند دریافت و پرداخت نقدی برای این شخص ثبت نشده است.</div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="p-3">شناسه سند</th>
                              <th className="p-3">تاریخ ثبت</th>
                              <th className="p-3 font-bold">نوع تراکنش</th>
                              <th className="p-3">توضیحات و شرح</th>
                              <th className="p-3 text-left">مبلغ (ریال)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {financialTransactions.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/10">
                                <td className="p-3 font-mono text-slate-400 font-bold">
                                  {toPersianDigits(tx.id)}
                                </td>
                                <td className="p-3 font-mono text-slate-400 font-bold">
                                  {toPersianDigits(tx.date)}
                                </td>
                                <td className="p-3 font-bold">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[9px] font-extrabold",
                                    tx.type === 'received' || tx.amount < 0
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450"
                                      : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450"
                                  )}>
                                    {tx.type === 'received' || tx.amount < 0 ? 'دریافت وجه' : 'پرداخت وجه'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-700 dark:text-slate-350 max-w-xs truncate">
                                  {tx.description}
                                </td>
                                <td className="p-3 text-left font-black text-slate-700 dark:text-slate-200 font-mono">
                                  {formatPersianCurrency(Math.abs(tx.amount))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                )}

                {/* 6. Notes Tab */}
                {detailActiveTab === 'notes' && (
                  <div className="space-y-6 animate-in fade-in duration-200 text-right">
                    
                    {/* Add note form */}
                    <form onSubmit={handleAddNoteSubmit} className="bg-slate-50 dark:bg-slate-800/20 border border-slate-150/45 dark:border-slate-850/40 rounded-3xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 pb-2 border-b border-slate-200/50 dark:border-slate-800">
                        <FileEdit className="w-4 h-4 text-indigo-500" />
                        ثبت یادداشت یا پیگیری جدید برای مشتری
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">توضیحات و خلاصه گفتگو یا پیگیری:</label>
                          <textarea
                            required
                            value={noteForm.description}
                            onChange={(e) => setNoteForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="شرح گفتگو، تعهد مالی یا اطلاعات پیگیری دیگر را بنویسید..."
                            rows={2}
                            className="w-full px-4 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">تاریخ پیگیری بعدی:</label>
                          <JalaliDatePicker
                            value={noteForm.followup_date || getTodayShamsi()}
                            onChange={(val) => setNoteForm(prev => ({ ...prev, followup_date: val }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">یادآوری (سیستمی):</label>
                          <div className="flex bg-slate-200/50 dark:bg-slate-950/50 p-1 rounded-xl w-full">
                            {['بله', 'خیر'].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setNoteForm(prev => ({ ...prev, reminder: opt }))}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer", 
                                  noteForm.reminder === opt 
                                    ? "bg-indigo-600 text-white shadow-sm" 
                                    : "text-slate-500"
                                )}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2 border-t border-slate-150/45 dark:border-slate-800">
                        <button
                          type="submit"
                          className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl py-2 px-5 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>ثبت یادداشت</span>
                        </button>
                      </div>
                    </form>

                    {/* Notes List */}
                    <div className="space-y-4 text-right">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 pb-1 border-b">
                        تاریخچه یادداشت‌ها و پیگیری‌ها ({toPersianDigits(personNotes.length)})
                      </h4>
                      {personNotes.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">هیچ یادداشتی برای این شخص ثبت نشده است.</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {personNotes.map(note => (
                            <div key={note.id} className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-850 p-4 rounded-2xl flex justify-between items-start gap-4 shadow-sm">
                              <div className="space-y-2 text-right">
                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                                  {note.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-450 dark:text-slate-500">
                                  <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950/40 px-2 py-0.5 rounded-md font-mono">
                                    پیگیری: {toPersianDigits(note.followup_date)}
                                  </span>
                                  {note.reminder === 'بله' && (
                                    <span className="bg-rose-50 text-rose-600 dark:bg-rose-950/35 dark:text-rose-450 px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      نیازمند یادآوری
                                    </span>
                                  )}
                                  <span className="text-slate-400">
                                    ثبت‌شده در: {toPersianDigits(note.created_at?.split(' ')[0] || getTodayShamsi())}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-slate-400 hover:text-rose-650 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer shrink-0"
                                title="حذف یادداشت"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>

            </div>
          </div>
        );
      })()}

      {/* --- Inline Quick Transaction Modal --- */}
      {showQuickTxModal && selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-right">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 pb-2 border-b">
              {showQuickTxModal === 'received' ? 'ثبت دریافت وجه (بستانکار)' : 'ثبت پرداخت وجه (بدهکار)'}
            </h3>
            
            <form onSubmit={handleQuickTxSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">مبلغ سند مالی (ریال):</label>
                <input
                  type="number"
                  required
                  value={quickTxForm.amount}
                  onChange={(e) => setQuickTxForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="مبلغ به ریال"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-left font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <JalaliDatePicker
                value={quickTxForm.date || getTodayShamsi()}
                onChange={(val) => setQuickTxForm(prev => ({ ...prev, date: val }))}
                label="تاریخ ثبت سند مالی (شمسی):"
              />

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">شرح تفصیلی سند:</label>
                <textarea
                  required
                  value={quickTxForm.description}
                  onChange={(e) => setQuickTxForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={showQuickTxModal === 'received' ? 'مثال: تصفیه نقدی بخشی از مانده بدهی فاکتورها' : 'مثال: پرداخت علی‌الحساب بابت خرید کالا'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  ثبت نهایی سند مالی
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickTxModal(null);
                    setQuickTxForm({ amount: '', date: '', description: '' });
                  }}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Inline Editing Dialog --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl border border-slate-100 dark:border-slate-800 p-8 relative">
            
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute left-6 top-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-8 pb-4 border-b border-slate-150 dark:border-slate-800 flex items-center gap-2">
              <Edit className="w-6 h-6 text-indigo-500" />
              ویرایش اطلاعات {getFullName(editForm)}
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-8 text-right">
              {/* Type selection and roles section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-100/40 dark:bg-slate-800/30 p-6 rounded-3xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3">نوع حقوقی شخص</h4>
                  <div className="flex bg-slate-200/50 dark:bg-slate-950/50 p-1 rounded-2xl w-full">
                    <button 
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, type: 'حقیقی' }))}
                      className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all", editForm.type === 'حقیقی' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500")}
                    >
                      شخص حقیقی
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, type: 'حقوقی' }))}
                      className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all", editForm.type === 'حقوقی' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500")}
                    >
                      سازمان / حقوقی
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3">نقش‌ها و رده‌های انتسابی</h4>
                  <div className="flex flex-wrap gap-2">
                    {['سهامدار', 'کارمند', 'مشتری', 'تامین‌کننده', 'فروشنده'].map(role => {
                      const isActive = (editForm.roles || []).includes(role);
                      return (
                        <button 
                          key={role}
                          type="button"
                          onClick={() => handleEditRoleToggle(role)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                            isActive 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-850 dark:hover:bg-slate-800 dark:text-slate-400"
                          )}
                        >
                          {isActive && <Check className="w-3.5 h-3.5" />}
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Base Info Fields */}
              <div className="bg-slate-50/50 dark:bg-slate-950/10 p-6 rounded-2xl">
                {/* Profile Photo Upload Field in Edit Modal */}
                <div className="flex flex-col sm:flex-row gap-4 items-center mb-6 pb-6 border-b border-slate-200/55 dark:border-slate-800/60 justify-start">
                  <div className="relative group w-16 h-16 rounded-2xl overflow-hidden border-2 border-dashed border-slate-350 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center justify-center bg-slate-100 dark:bg-slate-900 cursor-pointer shadow-inner shrink-0">
                    {editForm.avatar ? (
                      <>
                        <img src={editForm.avatar} alt="Avatar Edit" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold text-center leading-tight">
                          تغییر تصویر
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <UserCircle2 className="w-6 h-6 mb-0.5" />
                        <span className="text-[8px] font-semibold">انتخاب تصویر</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            MySwal.fire('خطای حجم فایل', 'حجم تصویر نباید بیشتر از ۲ مگابایت باشد.', 'warning');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setEditForm(prev => ({
                                ...prev,
                                avatar: event.target!.result as string
                              }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    />
                  </div>
                  {editForm.avatar && (
                    <button 
                      type="button" 
                      onClick={() => setEditForm(prev => ({ ...prev, avatar: '' }))}
                      className="text-xs text-rose-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                    >
                      حذف تصویر فعلی
                    </button>
                  )}
                  <div className="text-right sm:mr-3">
                    <h4 className="text-xs font-black text-slate-750 dark:text-slate-200">تصویر شناسایی یا آواتار</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5 font-semibold">تصویری با حجم کمتر از دو مگابایت قرار دهید.</p>
                  </div>
                </div>

                {editForm.type === 'حقیقی' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-250">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">نام</label>
                      <input type="text" name="first_name" value={editForm.first_name || ''} onChange={handleEditChange} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">نام خانوادگی</label>
                      <input type="text" name="last_name" value={editForm.last_name || ''} onChange={handleEditChange} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">کد ملی</label>
                      <input type="text" name="national_id" value={editForm.national_id || ''} onChange={handleEditChange} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 text-sm font-mono dir-ltr text-right" placeholder="----------" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">نام مستعار یا برند</label>
                      <input type="text" name="nickname" value={editForm.nickname || ''} onChange={handleEditChange} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 text-sm" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-250">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">نام شرکت یا سازمان (عنوان به کار رفته)</label>
                      <input type="text" name="title" value={editForm.title || ''} onChange={handleEditChange} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-850 dark:text-slate-100 text-sm font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">شناسه یا سریال ملی</label>
                      <input type="text" name="national_id" value={editForm.national_id || ''} onChange={handleEditChange} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 text-sm font-mono dir-ltr text-right" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">کد اقتصادی دوازده رقمی</label>
                      <input type="text" name="economic_code" value={editForm.economic_code || ''} onChange={handleEditChange} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 text-sm font-mono dir-ltr text-right" />
                    </div>
                  </div>
                )}
              </div>

              {/* Box contact and location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350 mb-1 border-b pb-2 dark:border-slate-800">اطلاعات ارتباطی و ایمیل</h4>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">شماره تلفن همراه (اصلی)</label>
                    <input type="text" name="phone1" value={editForm.phone1 || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">موبایل دوم</label>
                      <input type="text" name="phone3" value={editForm.phone3 || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">تلفن ثابت دوم</label>
                      <input type="text" name="phone2" value={editForm.phone2 || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">آدرس ایمیل ارتباطی</label>
                    <input type="email" name="email" value={editForm.email || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm focus:border-indigo-500" placeholder="e.g. name@mail.com" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350 mb-1 border-b pb-2 dark:border-slate-800">آدرس و محل سکونت</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">استان</label>
                      <input type="text" name="province" value={editForm.province || ''} onChange={handleEditChange} className="w-full px-2 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">شهر</label>
                      <input type="text" name="city" value={editForm.city || ''} onChange={handleEditChange} className="w-full px-2 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">منطقه</label>
                      <input type="text" name="region" value={editForm.region || ''} onChange={handleEditChange} className="w-full px-2 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">کد پستی ۱۰ رقمی</label>
                      <input type="text" name="postal_code" value={editForm.postal_code || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm" placeholder="xxxxxxxxxx" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">واتس‌اپ / پیام‌رسان</label>
                      <input type="text" name="whatsapp" value={editForm.whatsapp || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm" placeholder="09xxxxxxxxx" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">آدرس دقیق پستی</label>
                    <textarea name="address" value={editForm.address || ''} onChange={handleEditChange} rows={2} className="w-full p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 resize-none text-xs leading-relaxed" />
                  </div>
                </div>
              </div>

              {/* Commercial Details */}
              <div className="bg-indigo-50/20 dark:bg-slate-850/10 p-6 rounded-3xl space-y-4 border border-indigo-100/50 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350 pb-2 border-b border-indigo-100/40 dark:border-slate-800">اطلاعات تجاری و کسب‌وکار</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">نام کسب و کار / فروشگاه</label>
                    <input type="text" name="business_name" value={editForm.business_name || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">برند</label>
                    <input type="text" name="brand" value={editForm.brand || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">نوع فعالیت / رسته شغلی</label>
                    <input type="text" name="business_activity" value={editForm.business_activity || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">آدرس محل کار / دفتر تجاری</label>
                    <textarea name="business_address" value={editForm.business_address || ''} onChange={handleEditChange} rows={2} className="w-full p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 resize-none text-xs leading-relaxed" />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-slate-50 dark:bg-slate-850/20 p-6 rounded-3xl space-y-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350 pb-2 border-b border-slate-150 dark:border-slate-800">مشخصات اعتباری، بانکی و مالیاتی</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">بانک عامل</label>
                    <input type="text" name="bank_name" value={editForm.bank_name || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">شماره حساب بانکی</label>
                    <input type="text" name="bank_account" value={editForm.bank_account || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">شماره کارت عابر بانک</label>
                    <input type="text" name="bank_card" value={editForm.bank_card || ''} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">شماره بین‌المللی شبا (IBAN)</label>
                    <div className="relative flex">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">IR</span>
                      <input type="text" name="iban" value={editForm.iban || ''} onChange={handleEditChange} className="w-full pl-12 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-left dark:text-slate-100 text-sm" placeholder="0000 0000 0000 0000 0000 0000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">سقف اعتبار تجاری (ریال)</label>
                    <input type="number" name="credit_limit" value={editForm.credit_limit || 0} onChange={handleEditChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono dir-ltr text-right dark:text-slate-100 text-sm" />
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" name="tax_registered" checked={!!editForm.tax_registered} onChange={(e) => setEditForm(prev => ({ ...prev, tax_registered: e.target.checked ? 1 : 0 }))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block">مشمول ثبت‌نام در نظام ارزش افزوده</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Text Description in Edit Form */}
              <div>
                <label className="block text-xs text-slate-500 mb-2">یادداشت اداری / توضیحات تکمیلی پرونده</label>
                <textarea name="description" value={editForm.description || ''} onChange={handleEditChange} rows={3} className="w-full p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-slate-100 resize-none text-xs leading-relaxed" />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-110 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                >
                  انصراف و لغو
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/15 transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  اعمال و ذخیره‌سازی تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
