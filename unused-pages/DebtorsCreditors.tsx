import React, { useState, useEffect } from 'react';
import Decimal from 'decimal.js';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);
import { 
  ArrowLeft, 
  User, 
  Search, 
  Plus, 
  Trash2, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Package, 
  TrendingUp, 
  Scale, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  BookOpen, 
  AlertCircle, 
  Sliders, 
  Layers, 
  Clock,
  Briefcase,
  Coins
} from 'lucide-react';
import JalaliDatePicker, { toPersianDigits, getTodayJalali } from '../components/JalaliDatePicker';

// Simple helper to format currency in Rial with Persian digits
export const formatPersianCurrency = (amount: number): string => {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('fa-IR');
  return formatted;
};

// Shamsi date picker helper (defaulting to current Shamsi date for transactions)
const getTodayShamsi = () => {
  const t = getTodayJalali();
  return `${t.y}/${String(t.m).padStart(2, '0')}/${String(t.d).padStart(2, '0')}`;
};

interface PersonSummary {
  id: number;
  first_name: string;
  last_name: string;
  title?: string;
  nickname: string;
  phone1: string;
  type: string;
  accounting_code: string;
  financial_balance: number; // positive = debtor (بدهکار), negative = creditor (بستانکار)
  goods_balances: any[];
  total_goods_old_val: number;
  total_goods_new_val: number;
  has_active_items: boolean;
}

export default function DebtorsCreditors() {
  // Page states
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debtors' | 'creditors'>('all');
  
  // Selected Person Detail view
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'invoices' | 'demands'>('overview');

  // States inside person detail
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [personInvoices, setPersonInvoices] = useState<any[]>([]);

  // Modals / Quick forms toggle states
  const [showFinancialTxModal, setShowFinancialTxModal] = useState(false);

  const [financialTxForm, setFinancialTxForm] = useState({
    type: 'received', // 'received' (دریافت نقدی - بستانکار شدن مشتری), 'paid' (پرداخت نقدی - بدهکار شدن مشتری), 'adjustment' (تعدیل حساب)
    amount: '',
    date: getTodayShamsi(),
    description: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPersonId) {
      loadPersonDetails(selectedPersonId);
    }
  }, [selectedPersonId, persons]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getDebtorsCreditorsSummary) {
        const data = await window.electronAPI.getDebtorsCreditorsSummary();
        setPersons(data);
      }
      if (window.electronAPI?.getProducts) {
        const prodData = await window.electronAPI.getProducts();
        setProducts(prodData);
      }
    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonDetails = async (id: number) => {
    try {
      // Find person from list
      const p = persons.find(item => item.id === id);
      if (p) {
        setSelectedPerson(p);
      }

      // 1. Load Financial Ledger
      if (window.electronAPI?.getPersonFinancialTransactions) {
        const ftList = await window.electronAPI.getPersonFinancialTransactions(id);
        setFinancialTransactions(ftList);
      }

      // 2. Load Sales Invoices
      if (window.electronAPI?.getInvoices) {
        const allInvoices = await window.electronAPI.getInvoices();
        const pInvoices = allInvoices.filter(inv => inv.customer_id === id);
        setPersonInvoices(pInvoices);
      }
    } catch (err) {
      console.error('Error loading person details:', err);
    }
  };

  // Financial Transaction handlers
  const handleAddFinancialTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !financialTxForm.amount) return;

    try {
      if (window.electronAPI?.addPersonFinancialTransaction) {
        const rawAmount = parseFloat(financialTxForm.amount);
        // received = customer paid us cash (we credit them = amount decreases / negative)
        // paid = we paid customer cash / loan (we debit them = amount increases / positive)
        // adjustment = custom entry
        let finalAmount = rawAmount;
        if (financialTxForm.type === 'received') {
          finalAmount = -rawAmount; // credit
        } else if (financialTxForm.type === 'paid') {
          finalAmount = rawAmount; // debit
        }

        const res = await window.electronAPI.addPersonFinancialTransaction({
          person_id: selectedPersonId,
          date: financialTxForm.date,
          type: financialTxForm.type,
          amount: finalAmount,
          description: financialTxForm.description
        });

        if (res.success) {
          setShowFinancialTxModal(false);
          setFinancialTxForm({
            type: 'received',
            amount: '',
            date: getTodayShamsi(),
            description: ''
          });
          await loadInitialData();
          if (selectedPersonId) {
            await loadPersonDetails(selectedPersonId);
          }
          MySwal.fire('موفقیت‌آمیز', 'سند مالی با موفقیت ثبت شد.', 'success');
        } else {
          MySwal.fire('خطا', res.error || 'خطایی در ثبت سند مالی رخ داد.', 'error');
        }
      }
    } catch (err: any) {
      console.error('Error saving financial transaction:', err);
      MySwal.fire('خطا', err.message || 'خطایی در ثبت سند مالی رخ داد.', 'error');
    }
  };

  const handleDeleteFinancialTx = async (id: number) => {
    const confirm = await MySwal.fire({
      title: 'آیا اطمینان دارید؟',
      text: 'با حذف این سند مالی، تراز حساب طرف حساب تغییر خواهد کرد و این تغییر غیرقابل بازگشت است.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف شود',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    });
    if (!confirm.isConfirmed) return;

    try {
      if (window.electronAPI?.deletePersonFinancialTransaction) {
        const res = await window.electronAPI.deletePersonFinancialTransaction(id);
        if (res.success) {
          await loadInitialData();
          if (selectedPersonId) {
            await loadPersonDetails(selectedPersonId);
          }
          MySwal.fire('حذف شد', 'سند مالی با موفقیت حذف گردید.', 'success');
        } else {
          MySwal.fire('خطا', res.error || 'خطا در حذف سند مالی', 'error');
        }
      }
    } catch (err: any) {
      console.error(err);
      MySwal.fire('خطا', err.message || 'خطا در حذف سند مالی', 'error');
    }
  };

  // Stats Calculations for Dashboard
  const calculateStats = () => {
    let totalDebtorsSum = new Decimal(0);
    let totalCreditorsSum = new Decimal(0);

    persons.forEach(p => {
      const bal = p.financial_balance;
      if (bal > 0) {
        totalDebtorsSum = totalDebtorsSum.add(bal);
      } else if (bal < 0) {
        totalCreditorsSum = totalCreditorsSum.add(Math.abs(bal));
      }
    });

    const netCashFlow = totalDebtorsSum.minus(totalCreditorsSum);

    return {
      totalDebtors: totalDebtorsSum.toNumber(),
      totalCreditors: totalCreditorsSum.toNumber(),
      netCash: netCashFlow.toNumber()
    };
  };

  const stats = calculateStats();

  // Filters logic
  const filteredPersons = persons.filter(p => {
    // Search filter
    const q = searchTerm.toLowerCase().trim();
    const fullName = p.type === 'حقوقی' && p.title
      ? p.title.toLowerCase()
      : `${p.first_name || ''} ${p.last_name || ''} ${p.title || ''}`.toLowerCase();
    const nickname = (p.nickname || '').toLowerCase();
    const phone = (p.phone1 || '').toLowerCase();
    const accCode = (p.accounting_code || '').toLowerCase();
    
    const matchesSearch = !q || fullName.includes(q) || nickname.includes(q) || phone.includes(q) || accCode.includes(q);

    if (!matchesSearch) return false;

    // Type filter
    if (filterType === 'debtors') {
      return p.financial_balance > 10;
    }
    if (filterType === 'creditors') {
      return p.financial_balance < -10;
    }
    return true;
  });

  return (
    <div id="debtors_creditors_page" className="p-4 lg:p-6 bg-slate-50 dark:bg-slate-950 font-sans min-h-screen text-slate-800 dark:text-slate-100 space-y-6">
      
      {/* Header and Back Button if inside detail view */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-850 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-500" />
            <span>حساب‌های معین (بدهکاران، بستانکاران و امانات کالایی)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed">
            مدیریت پیشرفته مانده حساب‌های مالی، ثبت حواله‌های دریافتی/پرداختی، تعریف سهمیه‌های ماهیانه و رهگیری امانات کالایی به نرخ تاریخی و بازار.
          </p>
        </div>

        {selectedPersonId !== null && (
          <button
            onClick={() => {
              setSelectedPersonId(null);
              setSelectedPerson(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 transition-all shadow-sm border border-slate-200/50 dark:border-slate-800 self-start"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>بازگشت به لیست اصلی</span>
          </button>
        )}
      </div>

      {selectedPersonId === null ? (
        /* ==================== SCREEN 1: MAIN LIST & DASHBOARD METRICS ==================== */
        <div className="space-y-6">
          
          {/* Quick Stats Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Total Debtors */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] font-extrabold text-rose-500 tracking-wider">طلب کل ما از مشتریان (بدهکاران)</span>
                <span className="block text-xl font-black text-slate-800 dark:text-white mt-1">
                  {formatPersianCurrency(stats.totalDebtors)} <span className="text-[11px] font-normal text-slate-400">ریال</span>
                </span>
                <span className="block text-[9px] text-slate-400">مجموع مانده حساب‌های مثبت</span>
              </div>
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            {/* 2. Total Creditors */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] font-extrabold text-emerald-500 tracking-wider">بدهی ما به بازار (بستانکاران)</span>
                <span className="block text-xl font-black text-slate-800 dark:text-white mt-1">
                  {formatPersianCurrency(stats.totalCreditors)} <span className="text-[11px] font-normal text-slate-400">ریال</span>
                </span>
                <span className="block text-[9px] text-slate-400">مجموع مانده حساب‌های منفی</span>
              </div>
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Filter Bar and List Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterType === 'all' 
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm' 
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  همه اشخاص ({toPersianDigits(persons.length)})
                </button>
                <button
                  onClick={() => setFilterType('debtors')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterType === 'debtors' 
                      ? 'bg-rose-500 text-white shadow-sm' 
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  بدهکاران (طلب ما)
                </button>
                <button
                  onClick={() => setFilterType('creditors')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterType === 'creditors' 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  بستانکاران (بدهی ما)
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full lg:w-72">
                <input
                  type="text"
                  placeholder="جستجو بر اساس نام، تلفن، کدمعین..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

            </div>

            {/* Main Table */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-3">کدمعین</th>
                      <th className="p-3">نام و نام خانوادگی</th>
                      <th className="p-3">تلفن تماس</th>
                      <th className="p-3 text-left">مانده حساب مالی</th>
                      <th className="p-3 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredPersons.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-bold">
                          هیچ شخصی با شرایط فیلتر شده یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredPersons.map(p => {
                        const bal = p.financial_balance;
                        const isDebtor = bal > 10;
                        const isCreditor = bal < -10;
                        
                        return (
                          <tr 
                            key={p.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors group"
                          >
                            <td className="p-3 font-mono text-[10px] text-slate-400 font-bold">
                              {toPersianDigits(p.accounting_code || `p-${p.id}`)}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => setSelectedPersonId(p.id)}
                                className="font-extrabold text-slate-800 dark:text-white hover:text-emerald-500 dark:hover:text-emerald-400 text-right flex flex-col items-start gap-0.5"
                              >
                                <span>{p.type === 'حقوقی' && p.title ? p.title : `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'نامشخص'}</span>
                                {p.nickname && <span className="text-[9px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">لقب: {p.nickname}</span>}
                              </button>
                            </td>
                            <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                              {toPersianDigits(p.phone1 || 'ثبت نشده')}
                            </td>
                            <td className="p-3 text-left font-black font-mono">
                              {isDebtor ? (
                                <span className="text-rose-600 dark:text-rose-400 flex items-center justify-end gap-1">
                                  <span>{formatPersianCurrency(bal)}</span>
                                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/20">بدهکار (طلب ما)</span>
                                </span>
                              ) : isCreditor ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                                  <span>{formatPersianCurrency(Math.abs(bal))}</span>
                                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">بستانکار (بدهی ما)</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">تسویه کامل</span>
                              )}
                            </td>
                            <td className="p-3 text-left">
                              <button
                                onClick={() => setSelectedPersonId(p.id)}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-950 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all border border-slate-200/40 dark:border-slate-800 font-bold"
                              >
                                مشاهده پرونده مالی
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

        </div>
      ) : (
        /* ==================== SCREEN 2: INDIVIDUAL CUSTOMER DOSSIER / PROFILE ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Right/Side Block: Customer Profile Detail Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-150 dark:border-slate-850 shadow-xs space-y-5">
              
              {/* Profile Card Header */}
              <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    {selectedPerson?.type === 'حقوقی' && selectedPerson?.title ? selectedPerson.title : `${selectedPerson?.first_name || ''} ${selectedPerson?.last_name || ''}`.trim() || 'نامشخص'}
                  </h3>
                  {selectedPerson?.nickname && (
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-md mt-1 inline-block">
                      {selectedPerson.nickname}
                    </span>
                  )}
                </div>
                <div className="font-mono text-[9px] text-slate-400 font-bold">
                  کد معین: {toPersianDigits(selectedPerson?.accounting_code || '')}
                </div>
              </div>

              {/* Quick Contacts details */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>تلفن تماس:</span>
                  <strong className="font-mono text-slate-700 dark:text-slate-300">
                    {toPersianDigits(selectedPerson?.phone1 || 'ثبت نشده')}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>نوع شخص:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {selectedPerson?.type === 'vendor' ? 'فروشنده / تأمین‌کننده' : 'خریدار / مشتری'}
                  </span>
                </div>
              </div>

              {/* Highlight Financial Metrics */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">تراز نهایی مالی ریالی:</span>
                  <div className="text-base font-black">
                    {selectedPerson && selectedPerson.financial_balance > 10 ? (
                      <span className="text-rose-600 dark:text-rose-400 block font-mono">
                        {formatPersianCurrency(selectedPerson.financial_balance)} بدهکار <span className="text-[10px] font-normal text-slate-400">(طلب ما)</span>
                      </span>
                    ) : selectedPerson && selectedPerson.financial_balance < -10 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 block font-mono">
                        {formatPersianCurrency(Math.abs(selectedPerson.financial_balance))} بستانکار <span className="text-[10px] font-normal text-slate-400">(بدهی ما)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 block">تسویه بی‌حساب</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Dossier Quick actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => setShowFinancialTxModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-black hover:opacity-90 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت دریافت / پرداخت نقدی</span>
                </button>
              </div>

            </div>
          </div>

          {/* Left/Main Block: Tabs & Detailed Data Tables */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Dossier Tabs Selector */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 p-2 shadow-xs flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-950'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>داشبورد وضعیت</span>
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'financial'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-950'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>دفتر معین مالی (ریالی)</span>
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'invoices'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-950'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>فاکتورهای فروش صادر شده</span>
              </button>
              <button
                onClick={() => setActiveTab('demands')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'demands'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-950'
                }`}
              >
                <Coins className="w-4 h-4 text-indigo-500" />
                <span>مطالبات نسیه مالی</span>
              </button>
            </div>

            {/* Content for TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Visual Explanatory Alerts on Current Debts / Credits */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-xs space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>خلاصه گزارش تفصیلی پرونده معین</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border space-y-1">
                      <span className="text-slate-400 block font-bold">تعداد کل فاکتورها</span>
                      <strong className="text-lg font-black block text-slate-700 dark:text-slate-300 font-mono">
                        {toPersianDigits(personInvoices.length)} فاکتور
                      </strong>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border space-y-1">
                      <span className="text-slate-400 block font-bold">وضعیت تراز حساب مالی</span>
                      <strong className="text-lg font-black block text-slate-700 dark:text-slate-300 font-mono">
                        {selectedPerson && selectedPerson.financial_balance > 10 ? (
                          <span className="text-rose-600 dark:text-rose-400">{formatPersianCurrency(selectedPerson.financial_balance)} ریال بدهکار</span>
                        ) : selectedPerson && selectedPerson.financial_balance < -10 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{formatPersianCurrency(Math.abs(selectedPerson.financial_balance))} ریال بستانکار</span>
                        ) : (
                          <span className="text-slate-400">تسویه بی‌حساب</span>
                        )}
                      </strong>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* Content for TAB 2: FINANCIAL LEDGER */}
            {activeTab === 'financial' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    <span>گردش حساب مالی تفصیلی (ریالی)</span>
                  </h4>
                  <button
                    onClick={() => setShowFinancialTxModal(true)}
                    className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-black hover:opacity-90 transition-all"
                  >
                    + ثبت دریافت / پرداخت نقدی جدید
                  </button>
                </div>

                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                          <th className="p-3">تاریخ</th>
                          <th className="p-3">نوع سند</th>
                          <th className="p-3">شرح تراکنش مالی</th>
                          <th className="p-3 text-left">مبلغ بدهکار (بدهی مشتری)</th>
                          <th className="p-3 text-left">مبلغ بستانکار (پرداختی مشتری)</th>
                          <th className="p-3 text-left">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {/* Unpaid invoices displayed as Debit */}
                        {personInvoices.filter(inv => inv.status !== 'پرداخت شده').map(inv => (
                          <tr key={`inv-${inv.id}`} className="hover:bg-rose-50/5 dark:hover:bg-rose-950/5">
                            <td className="p-3 font-mono text-slate-400 font-bold">{toPersianDigits(inv.date.split(' ')[0] || '')}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 text-[10px] font-bold">فاکتور فروش</span>
                            </td>
                            <td className="p-3 font-extrabold">بابت فاکتور فروش شماره {toPersianDigits(inv.invoice_number)}</td>
                            <td className="p-3 text-left font-black text-rose-600 dark:text-rose-400 font-mono">
                              {formatPersianCurrency(inv.final_amount)} ریال
                            </td>
                            <td className="p-3 text-left text-slate-300">-</td>
                            <td className="p-3 text-left text-slate-300">-</td>
                          </tr>
                        ))}

                        {/* Manual financial ledger transactions */}
                        {financialTransactions.length === 0 && personInvoices.filter(inv => inv.status !== 'پرداخت شده').length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                              هیچ تراکنش مالی در دفتر معین این شخص ثبت نشده است.
                            </td>
                          </tr>
                        ) : (
                          financialTransactions.map(tx => {
                            const isDebit = tx.amount > 0; // بدهکار شدن مشتری (ما پرداخت کردیم)
                            const isCredit = tx.amount < 0; // بستانکار شدن مشتری (مشتری پرداخت کرده)
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                                <td className="p-3 font-mono text-slate-400 font-bold">{toPersianDigits(tx.date)}</td>
                                <td className="p-3">
                                  {isDebit ? (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 text-[10px] font-bold">پرداخت نقدی</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 text-[10px] font-bold">دریافت وجه / رسید</span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-700 dark:text-slate-300">{tx.description || 'ثبت دستی سند حسابداری'}</td>
                                <td className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 font-mono">
                                  {isDebit ? `${formatPersianCurrency(tx.amount)} ریال` : '-'}
                                </td>
                                <td className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 font-mono">
                                  {isCredit ? `${formatPersianCurrency(Math.abs(tx.amount))} ریال` : '-'}
                                </td>
                                <td className="p-3 text-left">
                                  <button
                                    onClick={() => handleDeleteFinancialTx(tx.id)}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
            )}



            {/* Content for TAB 4: INVOICE HISTORY */}
            {activeTab === 'invoices' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 p-5 shadow-xs space-y-4">
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>سابقه فاکتورهای فروش صادر شده برای خریدار</span>
                </h4>

                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                          <th className="p-3">شماره سند</th>
                          <th className="p-3">تاریخ ثبت</th>
                          <th className="p-3 text-left">جمع فاکتور (ریال)</th>
                          <th className="p-3 text-center">روش پرداخت</th>
                          <th className="p-3 text-center">وضعیت تسویه</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {personInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                              هیچ فاکتوری برای این مشتری یافت نشد.
                            </td>
                          </tr>
                        ) : (
                          personInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                              <td className="p-3 font-bold font-mono text-indigo-600 dark:text-indigo-450">#{toPersianDigits(inv.invoice_number)}</td>
                              <td className="p-3 font-mono text-slate-400">{toPersianDigits(inv.date)}</td>
                              <td className="p-3 text-left font-black font-mono">{formatPersianCurrency(inv.final_amount)} ریال</td>
                              <td className="p-3 text-center text-indigo-500 font-bold">{inv.payment_method}</td>
                              <td className="p-3 text-center">
                                {inv.status === 'پرداخت شده' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 text-[10px] font-bold">تسویه شده</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 text-[10px] font-bold">تسویه نشده</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ==================== MODALS / QUICK FORM OVERLAYS ==================== */}



      {/* 3. Manual Financial Receipt/Payment Modal */}
      {showFinancialTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-right">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 pb-2 border-b">
              <Scale className="w-4 h-4 text-emerald-500" />
              <span>ثبت سند دریافت / پرداخت نقدی</span>
            </h3>
            
            <form onSubmit={handleAddFinancialTx} className="space-y-4">
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFinancialTxForm(prev => ({ ...prev, type: 'received' }))}
                  className={`py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                    financialTxForm.type === 'received' 
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' 
                      : 'text-slate-500'
                  }`}
                >
                  دریافت وجه (بستانکار)
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialTxForm(prev => ({ ...prev, type: 'paid' }))}
                  className={`py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                    financialTxForm.type === 'paid' 
                      ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs' 
                      : 'text-slate-500'
                  }`}
                >
                  پرداخت نقدی (بدهکار)
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialTxForm(prev => ({ ...prev, type: 'adjustment' }))}
                  className={`py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                    financialTxForm.type === 'adjustment' 
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' 
                      : 'text-slate-500'
                  }`}
                >
                  تعدیل حساب
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">مبلغ سند مالی (ریال):</label>
                <input
                  type="number"
                  required
                  value={financialTxForm.amount}
                  onChange={(e) => setFinancialTxForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="مبلغ به ریال"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-left font-bold"
                />
              </div>

              <JalaliDatePicker
                value={financialTxForm.date}
                onChange={(val) => setFinancialTxForm(prev => ({ ...prev, date: val }))}
                label="تاریخ ثبت سند مالی (شمسی):"
              />

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 mb-1.5">شرح تفصیلی سند:</label>
                <textarea
                  required
                  value={financialTxForm.description}
                  onChange={(e) => setFinancialTxForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="مثال: تصفیه نقدی بخشی از مانده بدهی فاکتورها"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs h-16 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 rounded-xl text-xs font-black transition-all"
                >
                  ثبت نهایی سند مالی
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinancialTxModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-500"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
