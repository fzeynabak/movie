import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Landmark, 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  Calendar, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  X,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  Wallet,
  BookOpen,
  SlidersHorizontal,
  RefreshCw,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JalaliDatePicker, { getTodayJalali, toPersianDigits } from '../components/JalaliDatePicker';

const getTodayShamsi = () => {
  const t = getTodayJalali();
  return `${t.y}/${String(t.m).padStart(2, '0')}/${String(t.d).padStart(2, '0')}`;
};

const formatCurrency = (val: number | string) => {
  const num = Math.round(parseFloat(String(val)) || 0);
  return num.toLocaleString('fa-IR');
};

export default function CashAndBankPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'daily_report'>('overview');
  const [loading, setLoading] = useState(true);

  // Core Data State
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);

  // Modals Toggle State
  const [showCashModal, setShowCashModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState<any>(null); // 'deposit' | 'withdrawal' | 'transfer'

  // Forms State
  const [newCashName, setNewCashName] = useState('');
  const [newBankForm, setNewBankForm] = useState({
    bank_name: '',
    account_number: '',
    card_number: ''
  });

  const [txForm, setTxForm] = useState({
    date: getTodayShamsi(),
    source_type: 'cash', // 'cash' | 'bank'
    source_id: '',
    amount: '',
    destination_type: 'other', // 'cash' | 'bank' | 'person' | 'other'
    destination_id: '',
    description: ''
  });

  // History Filter State
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all', // 'all', 'deposit', 'withdrawal', 'transfer'
    sourceType: 'all', // 'all', 'cash', 'bank'
    sourceId: 'all',
    search: ''
  });

  // Daily Report State
  const [reportDate, setReportDate] = useState(getTodayShamsi());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const [cash, banks, txs, people] = await Promise.all([
          window.electronAPI.getCashRegisters?.() || [],
          window.electronAPI.getBankAccounts?.() || [],
          window.electronAPI.getTreasuryTransactions?.() || [],
          window.electronAPI.getPersons?.() || []
        ]);
        setCashRegisters(cash);
        setBankAccounts(banks);
        setTransactions(txs);
        setPersons(people);
      }
    } catch (e) {
      console.error('Error loading treasury data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Submit handlers
  const handleAddCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashName.trim()) return;
    try {
      if (window.electronAPI?.addCashRegister) {
        const res = await window.electronAPI.addCashRegister(newCashName.trim());
        if (res.success) {
          setNewCashName('');
          setShowCashModal(false);
          await loadData();
        } else {
          alert('خطا در ثبت صندوق: ' + res.error);
        }
      }
    } catch (err: any) {
      alert('خطای فنی: ' + err.message);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankForm.bank_name.trim() || !newBankForm.account_number.trim()) return;
    try {
      if (window.electronAPI?.addBankAccount) {
        const res = await window.electronAPI.addBankAccount(newBankForm);
        if (res.success) {
          setNewBankForm({ bank_name: '', account_number: '', card_number: '' });
          setShowBankModal(false);
          await loadData();
        } else {
          alert('خطا در ثبت حساب بانکی: ' + res.error);
        }
      }
    } catch (err: any) {
      alert('خطای فنی: ' + err.message);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.source_id || !txForm.amount) return;

    try {
      if (window.electronAPI?.addTreasuryTransaction) {
        const payload = {
          date: txForm.date,
          source_type: txForm.source_type,
          source_id: parseInt(txForm.source_id),
          type: showTxModal, // 'deposit' | 'withdrawal' | 'transfer'
          amount: parseFloat(txForm.amount),
          destination_type: showTxModal === 'transfer' ? txForm.destination_type : (txForm.destination_type === 'person' ? 'person' : 'other'),
          destination_id: txForm.destination_id ? parseInt(txForm.destination_id) : null,
          description: txForm.description
        };

        const res = await window.electronAPI.addTreasuryTransaction(payload);
        if (res.success) {
          setShowTxModal(null);
          // reset form
          setTxForm({
            date: getTodayShamsi(),
            source_type: 'cash',
            source_id: '',
            amount: '',
            destination_type: 'other',
            destination_id: '',
            description: ''
          });
          await loadData();
        } else {
          alert('خطا در انجام تراکنش مال: ' + res.error);
        }
      }
    } catch (err: any) {
      alert('خطای فنی: ' + err.message);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!window.confirm('آیا از حذف این تراکنش و بازگردانی مبالغ آن مطمئن هستید؟')) return;
    try {
      if (window.electronAPI?.deleteTreasuryTransaction) {
        const res = await window.electronAPI.deleteTreasuryTransaction(id);
        if (res.success) {
          await loadData();
        } else {
          alert('خطا در حذف تراکنش: ' + res.error);
        }
      }
    } catch (err: any) {
      alert('خطای فنی: ' + err.message);
    }
  };

  // Calculations
  const totalCashBalance = cashRegisters.reduce((sum, item) => sum + (item.balance || 0), 0);
  const totalBankBalance = bankAccounts.reduce((sum, item) => sum + (item.balance || 0), 0);
  const totalLiquidity = totalCashBalance + totalBankBalance;

  // Filtered transactions for the Ledger tab
  const filteredTransactions = transactions.filter(tx => {
    // 1. Start Date filter
    if (historyFilters.startDate && tx.date < historyFilters.startDate) return false;
    // 2. End Date filter
    if (historyFilters.endDate && tx.date > historyFilters.endDate) return false;
    // 3. Type filter
    if (historyFilters.type !== 'all' && tx.type !== historyFilters.type) return false;
    // 4. Source Type filter
    if (historyFilters.sourceType !== 'all' && tx.source_type !== historyFilters.sourceType) return false;
    // 5. Source ID filter
    if (historyFilters.sourceId !== 'all' && tx.source_id !== parseInt(historyFilters.sourceId)) return false;
    // 6. Search text filter
    if (historyFilters.search) {
      const s = historyFilters.search.toLowerCase();
      const descMatches = tx.description?.toLowerCase().includes(s);
      const sourceMatches = tx.source_name?.toLowerCase().includes(s);
      const destMatches = tx.destination_name?.toLowerCase().includes(s);
      return descMatches || sourceMatches || destMatches;
    }
    return true;
  });

  // Daily Cash Report Calculations
  const getDailyCashReportData = () => {
    // We only care about CASH registers
    const cashTxsOfDay = transactions.filter(tx => tx.date === reportDate && tx.source_type === 'cash');
    
    // Sum receipts & payments of the selected day for Cash
    const receiptsOfDay = cashTxsOfDay
      .filter(tx => tx.type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const paymentsOfDay = cashTxsOfDay
      .filter(tx => tx.type === 'withdrawal' || tx.type === 'transfer')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Sum cash transfers into cash registers of the selected day
    const transfersIntoCashOfDay = transactions.filter(tx => 
      tx.date === reportDate && 
      tx.type === 'transfer' && 
      tx.destination_type === 'cash'
    ).reduce((sum, tx) => sum + tx.amount, 0);

    const totalInflow = receiptsOfDay + transfersIntoCashOfDay;
    const totalOutflow = paymentsOfDay;

    // To find the cash balance at the start of reportDate:
    // We take current totalCashBalance, and then reverse all cash movements that happened AFTER reportDate,
    // and also reverse all movements of reportDate itself to get the start of the day.
    const netMovementsAfterAndOnReportDate = transactions
      .filter(tx => tx.date >= reportDate)
      .reduce((net, tx) => {
        let change = 0;
        // Source changes
        if (tx.source_type === 'cash') {
          if (tx.type === 'deposit') {
            change += tx.amount;
          } else if (tx.type === 'withdrawal' || tx.type === 'transfer') {
            change -= tx.amount;
          }
        }
        // Destination changes
        if (tx.type === 'transfer' && tx.destination_type === 'cash') {
          change += tx.amount;
        }
        return net + change;
      }, 0);

    const startingCashBalance = totalCashBalance - netMovementsAfterAndOnReportDate;
    const endingCashBalance = startingCashBalance + totalInflow - totalOutflow;

    return {
      startingCashBalance,
      receiptsOfDay: totalInflow,
      paymentsOfDay: totalOutflow,
      endingCashBalance,
      transactions: cashTxsOfDay
    };
  };

  const dailyReport = getDailyCashReportData();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500" dir="rtl">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
        <span className="text-xs">در حال بارگذاری اطلاعات صندوق و بانک...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full max-w-7xl mx-auto p-4 md:p-6" dir="rtl">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Coins className="w-7 h-7 text-indigo-600" />
            صندوق و بانک
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">مدیریت نقدینگی فروشگاه، گردش حساب‌ها، صندوق‌ها و بانک‌ها</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl self-stretch md:self-auto">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            بررسی کلی نقدینگی
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ledger' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            گردش حساب جامع
          </button>
          <button 
            onClick={() => setActiveTab('daily_report')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'daily_report' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            گزارش روزانه صندوق
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Liquidity Stats */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/40 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-indigo-600 text-white rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">کل موجودی صندوق‌ها</span>
                <span className="text-xl font-black text-indigo-600 mt-1 block tracking-tight">{formatCurrency(totalCashBalance)} <span className="text-xs font-normal text-slate-500">ریال</span></span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/40 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-emerald-600 text-white rounded-xl">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">کل موجودی بانک‌ها</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block tracking-tight">{formatCurrency(totalBankBalance)} <span className="text-xs font-normal text-slate-500">ریال</span></span>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-slate-800 text-slate-300 rounded-xl">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">کل نقدینگی فروشگاه</span>
                <span className="text-xl font-black mt-1 block tracking-tight text-white">{formatCurrency(totalLiquidity)} <span className="text-xs font-normal text-slate-400">ریال</span></span>
              </div>
            </div>
          </div>

          {/* Side by Side Lists */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Cash Registers Card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl p-5 flex flex-col h-[350px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Coins className="w-4.5 h-4.5 text-indigo-600" />
                  صندوق‌ها
                </h3>
                <button 
                  onClick={() => setShowCashModal(true)}
                  className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-md transition-all"
                >
                  <Plus className="w-3 h-3" />
                  صندوق جدید
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {cashRegisters.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/50 rounded-xl transition-all border border-slate-100/50 dark:border-slate-800/30">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.name}</span>
                      {item.is_default === 1 && <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 px-1.5 py-0.5 rounded-md mt-1 inline-block">پیش‌فرض</span>}
                    </div>
                    <span className="text-xs font-black text-indigo-600">{formatCurrency(item.balance || 0)} <span className="text-[10px] font-normal text-slate-400">ریال</span></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Accounts Card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl p-5 flex flex-col h-[350px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Landmark className="w-4.5 h-4.5 text-emerald-600" />
                  حساب‌های بانکی
                </h3>
                <button 
                  onClick={() => setShowBankModal(true)}
                  className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md transition-all"
                >
                  <Plus className="w-3 h-3" />
                  حساب جدید
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {bankAccounts.map(item => (
                  <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/50 rounded-xl transition-all border border-slate-100/50 dark:border-slate-800/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.bank_name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5" dir="ltr">{item.account_number}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-600">{formatCurrency(item.balance || 0)} <span className="text-[10px] font-normal text-slate-400">ریال</span></span>
                    </div>
                    {item.card_number && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-400 font-mono">
                        <span>شماره کارت:</span>
                        <span dir="ltr">{item.card_number.replace(/(\d{4})/g, '$1-').replace(/-$/, '')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-2">
                <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-600" />
                عملیات سریع صندوق و بانک
              </h3>
              <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">با استفاده از ابزارهای زیر می‌توانید مبالغ دریافتی، پرداختی یا انتقال بین حساب‌های مالی فروشگاه را با ثبت فوری در اسناد و گردش مالی ثبت نمایید.</p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => {
                  setShowTxModal('deposit');
                  setTxForm({ ...txForm, source_type: 'cash' });
                }}
                className="w-full flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl transition-all font-black text-xs"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  واریز / دریافت جدید
                </div>
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button 
                onClick={() => {
                  setShowTxModal('withdrawal');
                  setTxForm({ ...txForm, source_type: 'cash' });
                }}
                className="w-full flex items-center justify-between p-3.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-xl transition-all font-black text-xs"
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                  برداشت / پرداخت جدید
                </div>
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button 
                onClick={() => {
                  setShowTxModal('transfer');
                  setTxForm({ ...txForm, source_type: 'cash', destination_type: 'bank' });
                }}
                className="w-full flex items-center justify-between p-3.5 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded-xl transition-all font-black text-xs"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                  انتقال وجه بین حساب‌ها
                </div>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ledger History Tab */}
      {activeTab === 'ledger' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl p-5 space-y-5">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">از تاریخ</label>
              <JalaliDatePicker value={historyFilters.startDate} onChange={(val) => setHistoryFilters({ ...historyFilters, startDate: val })} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">تا تاریخ</label>
              <JalaliDatePicker value={historyFilters.endDate} onChange={(val) => setHistoryFilters({ ...historyFilters, endDate: val })} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">نوع تراکنش</label>
              <select 
                value={historyFilters.type}
                onChange={(e) => setHistoryFilters({ ...historyFilters, type: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">همه نوع تراکنش‌ها</option>
                <option value="deposit">دریافت / واریز</option>
                <option value="withdrawal">پرداخت / برداشت</option>
                <option value="transfer">انتقال بین حساب‌ها</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">منبع مالی</label>
              <select 
                value={historyFilters.sourceType}
                onChange={(e) => setHistoryFilters({ ...historyFilters, sourceType: e.target.value, sourceId: 'all' })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">همه منابع مالی</option>
                <option value="cash">صندوق‌ها</option>
                <option value="bank">بانک‌ها</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">جستجو توضیحات / نام</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="مثال: واریزی مشتری..."
                  value={historyFilters.search}
                  onChange={(e) => setHistoryFilters({ ...historyFilters, search: e.target.value })}
                  className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/55 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-900">
                <tr>
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">منبع تراکنش</th>
                  <th className="p-3">نوع تراکنش</th>
                  <th className="p-3">مبلغ (ریال)</th>
                  <th className="p-3">طرف حساب / مقصد</th>
                  <th className="p-3">توضیحات</th>
                  <th className="p-3 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">هیچ تراکنش منطبق با فیلترها یافت نشد.</td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                      <td className="p-3 font-mono text-[10px] text-slate-600 dark:text-slate-350">{toPersianDigits(tx.date)}</td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {tx.source_type === 'cash' ? <Coins className="w-3.5 h-3.5 text-indigo-600" /> : <Landmark className="w-3.5 h-3.5 text-emerald-600" />}
                          {tx.source_name}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          tx.type === 'deposit' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                          tx.type === 'withdrawal' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' :
                          'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600'
                        }`}>
                          {tx.type === 'deposit' ? 'دریافت / واریز' : tx.type === 'withdrawal' ? 'پرداخت / برداشت' : 'انتقال بین حساب‌ها'}
                        </span>
                      </td>
                      <td className={`p-3 font-black ${tx.type === 'deposit' ? 'text-emerald-600' : tx.type === 'withdrawal' ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {tx.type === 'deposit' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-350">
                        {tx.destination_name ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold">
                            {tx.destination_type === 'person' ? <User className="w-3 h-3 text-slate-400" /> : <ArrowRightLeft className="w-3 h-3 text-slate-400" />}
                            {tx.destination_name}
                          </span>
                        ) : '---'}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{tx.description || 'بدون توضیحات'}</td>
                      <td className="p-3 text-left">
                        <button 
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition-all"
                          title="حذف تراکنش"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Daily Cash Report Tab */}
      {activeTab === 'daily_report' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl p-5">
            {/* Report Date Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تاریخ گزارش روزانه صندوق:</span>
                <div className="w-44">
                  <JalaliDatePicker value={reportDate} onChange={(val) => setReportDate(val)} />
                </div>
              </div>

              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl transition-all"
              >
                <Printer className="w-4 h-4" />
                چاپ گزارش روزانه
              </button>
            </div>

            {/* Daily Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:grid-cols-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 block">موجودی اول دوره صندوق</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-150 mt-1 block tracking-tight">{formatCurrency(dailyReport.startingCashBalance)} <span className="text-[10px] font-normal text-slate-400">ریال</span></span>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 block">جمع کل دریافتی صندوق (ورودی)</span>
                <span className="text-sm font-black text-emerald-600 mt-1 block tracking-tight">{formatCurrency(dailyReport.receiptsOfDay)} <span className="text-[10px] font-normal text-slate-400">ریال</span></span>
              </div>

              <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-rose-600 block">جمع کل پرداختی صندوق (خروجی)</span>
                <span className="text-sm font-black text-rose-600 mt-1 block tracking-tight">{formatCurrency(dailyReport.paymentsOfDay)} <span className="text-[10px] font-normal text-slate-400">ریال</span></span>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-600 block">موجودی پایان دوره صندوق</span>
                <span className="text-sm font-black text-indigo-600 mt-1 block tracking-tight">{formatCurrency(dailyReport.endingCashBalance)} <span className="text-[10px] font-normal text-slate-400">ریال</span></span>
              </div>
            </div>

            {/* Daily Transactions List */}
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-150 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              جزئیات گردش وجه نقد در روز {toPersianDigits(reportDate)}
            </h3>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold">
                  <tr>
                    <th className="p-3">صندوق منبع</th>
                    <th className="p-3">نوع عملیات</th>
                    <th className="p-3">مبلغ (ریال)</th>
                    <th className="p-3">طرف حساب / مقصد</th>
                    <th className="p-3">توضیحات تراکنش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {dailyReport.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">هیچ تراکنش نقدی در این روز ثبت نشده است.</td>
                    </tr>
                  ) : (
                    dailyReport.transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{tx.source_name}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                            tx.type === 'deposit' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                          }`}>
                            {tx.type === 'deposit' ? 'دریافت نقدی / واریز' : 'پرداخت نقدی / برداشت'}
                          </span>
                        </td>
                        <td className={`p-3 font-black ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-350">{tx.destination_name || 'بدون مقصد'}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{tx.description || '---'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- MODALS --- */}
      <AnimatePresence>
        {/* Cash Register Modal */}
        {showCashModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-150 flex items-center gap-1.5">
                  <Coins className="w-5 h-5 text-indigo-600" />
                  ایجاد صندوق جدید
                </h3>
                <button onClick={() => setShowCashModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCash} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">نام صندوق جدید</label>
                  <input 
                    type="text" 
                    placeholder="مثال: صندوق فرعی طبقه دوم..."
                    value={newCashName}
                    onChange={(e) => setNewCashName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowCashModal(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    انصراف
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-black transition-all shadow-sm shadow-indigo-600/10"
                  >
                    ثبت صندوق
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Bank Account Modal */}
        {showBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-150 flex items-center gap-1.5">
                  <Landmark className="w-5 h-5 text-emerald-600" />
                  ثبت حساب بانکی جدید
                </h3>
                <button onClick={() => setShowBankModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddBank} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">نام بانک</label>
                  <input 
                    type="text" 
                    placeholder="مثال: بانک صادرات..."
                    value={newBankForm.bank_name}
                    onChange={(e) => setNewBankForm({ ...newBankForm, bank_name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">شماره حساب</label>
                  <input 
                    type="text" 
                    placeholder="010XXXXXXXX"
                    value={newBankForm.account_number}
                    onChange={(e) => setNewBankForm({ ...newBankForm, account_number: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono dir-ltr text-right outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">شماره کارت (اختیاری)</label>
                  <input 
                    type="text" 
                    placeholder="6037-XXXX-XXXX-XXXX"
                    maxLength={16}
                    value={newBankForm.card_number}
                    onChange={(e) => setNewBankForm({ ...newBankForm, card_number: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono dir-ltr text-right outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowBankModal(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    انصراف
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-black transition-all shadow-sm shadow-emerald-600/10"
                  >
                    ثبت حساب بانکی
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Transaction Modal (Deposit, Withdrawal, Transfer) */}
        {showTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 w-full max-w-lg p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-150 flex items-center gap-1.5">
                  {showTxModal === 'deposit' && <TrendingUp className="w-5 h-5 text-emerald-600" />}
                  {showTxModal === 'withdrawal' && <TrendingDown className="w-5 h-5 text-rose-600" />}
                  {showTxModal === 'transfer' && <ArrowRightLeft className="w-5 h-5 text-indigo-600" />}
                  {showTxModal === 'deposit' && 'ثبت واریز / دریافت وجه جدید'}
                  {showTxModal === 'withdrawal' && 'ثبت برداشت / پرداخت وجه جدید'}
                  {showTxModal === 'transfer' && 'انتقال وجه بین حساب‌ها'}
                </h3>
                <button onClick={() => setShowTxModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date Picker */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">تاریخ تراکنش</label>
                    <JalaliDatePicker value={txForm.date} onChange={(val) => setTxForm({ ...txForm, date: val })} />
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">مبلغ تراکنش (ریال)</label>
                    <input 
                      type="number" 
                      placeholder="ریال..."
                      required
                      min="1"
                      value={txForm.amount}
                      onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Source Type */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">منبع مالی (مبداء)</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setTxForm({ ...txForm, source_type: 'cash', source_id: '' })}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all border ${txForm.source_type === 'cash' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-200' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}
                      >
                        صندوق‌ها
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTxForm({ ...txForm, source_type: 'bank', source_id: '' })}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all border ${txForm.source_type === 'bank' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-200' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}
                      >
                        حساب بانکی
                      </button>
                    </div>
                  </div>

                  {/* Source ID Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">انتخاب حساب / صندوق مبداء</label>
                    <select 
                      value={txForm.source_id}
                      onChange={(e) => setTxForm({ ...txForm, source_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">انتخاب کنید...</option>
                      {txForm.source_type === 'cash' 
                        ? cashRegisters.map(c => <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.balance || 0)} ریال)</option>)
                        : bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({formatCurrency(b.balance || 0)} ریال)</option>)
                      }
                    </select>
                  </div>
                </div>

                {/* TRANSFER Specific fields */}
                {showTxModal === 'transfer' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 block">مقصد انتقال</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setTxForm({ ...txForm, destination_type: 'cash', destination_id: '' })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all border ${txForm.destination_type === 'cash' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-200' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}
                        >
                          صندوق‌ها
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTxForm({ ...txForm, destination_type: 'bank', destination_id: '' })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all border ${txForm.destination_type === 'bank' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-200' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}
                        >
                          حساب بانکی
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 block">انتخاب حساب / صندوق مقصد</label>
                      <select 
                        value={txForm.destination_id}
                        onChange={(e) => setTxForm({ ...txForm, destination_id: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">انتخاب کنید...</option>
                        {txForm.destination_type === 'cash' 
                          ? cashRegisters.map(c => <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.balance || 0)} ریال)</option>)
                          : bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({formatCurrency(b.balance || 0)} ریال)</option>)
                        }
                      </select>
                    </div>
                  </div>
                ) : (
                  /* DEPOSIT & WITHDRAWAL: Option to link to Person (گردش حساب طرف حساب) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 block">اتصال به گردش حساب طرف حساب؟</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setTxForm({ ...txForm, destination_type: 'other', destination_id: '' })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all border ${txForm.destination_type === 'other' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-200' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}
                        >
                          خیر (تراکنش عمومی)
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTxForm({ ...txForm, destination_type: 'person', destination_id: '' })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all border ${txForm.destination_type === 'person' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-200' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}
                        >
                          بله (اتصال به شخص)
                        </button>
                      </div>
                    </div>

                    {txForm.destination_type === 'person' && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="text-[11px] font-bold text-slate-500 block">انتخاب شخص طرف حساب</label>
                        <select 
                          value={txForm.destination_id}
                          onChange={(e) => setTxForm({ ...txForm, destination_id: e.target.value })}
                          required
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">انتخاب کنید...</option>
                          {persons.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.nickname || 'بدون لقب'})</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <label className="text-[11px] font-bold text-slate-500 block">توضیحات تراکنش مالی</label>
                  <textarea 
                    placeholder="جزئیات، دلیل واریز یا برداشت..."
                    value={txForm.description}
                    onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200 transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowTxModal(null)}
                    className="flex-1 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    انصراف
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-black transition-all shadow-sm"
                  >
                    ثبت تراکنش مالی
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
