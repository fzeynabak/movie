import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Briefcase, 
  Phone, 
  Search, 
  PlusCircle, 
  MinusCircle, 
  FileText, 
  ShoppingBag, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  CreditCard,
  UserCheck,
  Percent,
  ChevronLeft,
  X,
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Decimal from 'decimal.js';
import { Employee, EmployeeTransaction, Person } from '../types';

const MySwal = withReactContent(Swal);

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [transactions, setTransactions] = useState<EmployeeTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');

  // Solar (Jalali) to Gregorian Converter
  const jalaliToGregorian = (jStr: string): Date => {
    if (!jStr || !jStr.includes('/')) return new Date();
    // Convert Persian numbers to English
    const clean = jStr.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const parts = clean.split('/').map(x => parseInt(x));
    if (parts.length < 3) return new Date();
    let jy = parts[0];
    let jm = parts[1];
    let jd = parts[2];

    let jy2 = jy - 979;
    let jm2 = jm - 1;
    let jd2 = jd - 1;

    let jDays = jy2 * 365 + Math.floor(jy2 / 33) * 8 + Math.floor((jy2 % 33 + 3) / 4);
    for (let i = 0; i < jm2; ++i) {
      jDays += i < 6 ? 31 : 30;
    }
    jDays += jd2;

    let gDays = jDays + 79;
    let gy = 1600 + 400 * Math.floor(gDays / 146097);
    gDays %= 146097;

    let leap = 1;
    if (gDays >= 36525) {
      gDays--;
      gy += 100 * Math.floor(gDays / 36524);
      gDays %= 36524;
      if (gDays >= 365) {
        gDays++;
      } else {
        leap = 0;
      }
    }

    gy += 4 * Math.floor(gDays / 1461);
    gDays %= 1461;

    if (gDays >= 366) {
      leap = 0;
      gDays--;
      gy += Math.floor(gDays / 365);
      gDays %= 365;
    }

    let salG = [0, 31, 28 + leap, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 1;
    for (let i = 1; i <= 12; ++i) {
      if (gDays < salG[i]) {
        gm = i;
        break;
      }
      gDays -= salG[i];
    }
    let gd = gDays + 1;

    return new Date(gy, gm - 1, gd);
  };

  // Calculate elapsed days and automatic accrual values
  const getAccrualStats = (emp: Employee, txs: EmployeeTransaction[]) => {
    if (!emp) return { elapsedDays: 0, dailyWage: 0, totalAccruable: 0, lastDate: '' };
    
    // Find latest salary accrual date, otherwise use hire date
    const accruals = txs.filter(t => t.type === 'salary_accrual');
    let lastDateStr = emp.hire_date || new Date().toLocaleDateString('fa-IR');
    
    if (accruals.length > 0) {
      // Sort to find latest
      const sortedAccruals = [...accruals].sort((a, b) => {
        const dateA = jalaliToGregorian(a.date).getTime();
        const dateB = jalaliToGregorian(b.date).getTime();
        return dateB - dateA; // latest first
      });
      lastDateStr = sortedAccruals[0].date;
    }

    const lastG = jalaliToGregorian(lastDateStr);
    const todayG = new Date();
    
    // Calculate difference in days safely
    const diffTime = todayG.getTime() - lastG.getTime();
    let elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (elapsedDays < 0) elapsedDays = 0;

    const dailyWage = Math.round(emp.salary / 30);
    const totalAccruable = elapsedDays * dailyWage;

    return {
      elapsedDays,
      dailyWage,
      totalAccruable,
      lastDate: lastDateStr
    };
  };

  const executeAutoAccrual = async (emp: Employee, elapsedDays: number, totalAccruable: number, lastDate: string) => {
    if (elapsedDays <= 0) return;
    
    const confirm = await MySwal.fire({
      title: 'محاسبه و ثبت کارکرد روزانه',
      text: `آیا مایلید کارکرد ${toPersianNum(elapsedDays)} روز سپری شده (از آخرین وضعیت کارکرد تا امروز) به مبلغ کل ${formatCurrency(totalAccruable)} ریال را در بستانکاری این کارمند ثبت کنید؟`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'بله، ثبت شود',
      cancelButtonText: 'انصراف'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.addEmployeeTransaction) {
          const res = await window.electronAPI.addEmployeeTransaction({
            employee_id: emp.id,
            date: new Date().toLocaleDateString('fa-IR'),
            type: 'salary_accrual',
            amount: totalAccruable,
            item_name: 'محاسبه کارکرد روزانه خودکار',
            description: `ثبت اتوماتیک کارکرد روزانه برای ${elapsedDays} روز کاری (هر روز به مبلغ ${formatCurrency(Math.round(emp.salary / 30))} ریال)`
          });

          if (res.success) {
            MySwal.fire('ثبت شد', 'محاسبه کارکرد روزانه با موفقیت در کاردکس ثبت گردید.', 'success');
            fetchEmployees();
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطایی رخ داد', 'error');
      }
    }
  };

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState<EmployeeTransaction['type'] | null>(null);

  // Form States
  const [newEmpForm, setNewEmpForm] = useState({
    name: '',
    phone: '',
    position: '',
    salary: 0,
    hire_date: new Date().toLocaleDateString('fa-IR'),
    person_id: ''
  });

  const [txForm, setTxForm] = useState({
    date: new Date().toLocaleDateString('fa-IR'),
    amount: 0,
    item_name: '',
    description: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchPersons();
  }, []);

  const fetchEmployees = async () => {
    try {
      if (window.electronAPI?.getEmployees) {
        const list = await window.electronAPI.getEmployees();
        setEmployees(list);
        if (list.length > 0) {
          // Keep current selection synced if exists
          if (selectedEmployee) {
            const updated = list.find(e => e.id === selectedEmployee.id);
            if (updated) {
              setSelectedEmployee(updated);
              fetchTransactions(updated.id);
              return;
            }
          }
          setSelectedEmployee(list[0]);
          fetchTransactions(list[0].id);
        } else {
          setSelectedEmployee(null);
          setTransactions([]);
        }
      }
    } catch (e: any) {
      console.error('Error fetching employees:', e);
    }
  };

  const fetchPersons = async () => {
    try {
      if (window.electronAPI?.getPersons) {
        const list = await window.electronAPI.getPersons();
        setPersons(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async (empId: any) => {
    try {
      if (window.electronAPI?.getEmployeeTransactions) {
        const txs = await window.electronAPI.getEmployeeTransactions(empId);
        setTransactions(txs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    fetchTransactions(emp.id);
  };

  // Helper formatting currency
  const formatCurrency = (amount: number | string) => {
    try {
      const num = new Decimal(amount || 0).toFixed(0);
      return Number(num).toLocaleString('fa-IR');
    } catch {
      return Number(amount || 0).toLocaleString('fa-IR');
    }
  };

  const toPersianNum = (str: string | number) => {
    return String(str).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpForm.name && !newEmpForm.person_id) {
      MySwal.fire({
        icon: 'warning',
        title: 'خطای اعتبارسنجی',
        text: 'لطفاً نام یا شخص مرجع را انتخاب کنید.',
        confirmButtonText: 'تایید'
      });
      return;
    }

    try {
      if (window.electronAPI?.addEmployeeDirect) {
        const res = await window.electronAPI.addEmployeeDirect({
          name: newEmpForm.name,
          phone: newEmpForm.phone,
          position: newEmpForm.position,
          salary: Number(newEmpForm.salary),
          hire_date: newEmpForm.hire_date,
          person_id: newEmpForm.person_id ? parseInt(newEmpForm.person_id) : null
        });

        if (res.success) {
          setShowAddModal(false);
          setNewEmpForm({
            name: '',
            phone: '',
            position: '',
            salary: 0,
            hire_date: new Date().toLocaleDateString('fa-IR'),
            person_id: ''
          });
          MySwal.fire({
            icon: 'success',
            title: 'عملیات موفق',
            text: 'کارمند جدید با موفقیت اضافه شد.',
            timer: 2000,
            showConfirmButton: false,
          });
          fetchEmployees();
        }
      }
    } catch (e: any) {
      MySwal.fire('خطا', e.message || 'مشکلی رخ داد', 'error');
    }
  };

  const handleDeleteEmployee = async (empId: number, name: string) => {
    const confirm = await MySwal.fire({
      title: `آیا از حذف کارمند "${name}" مطمئن هستید؟`,
      text: "تمام اسناد و تاریخچه تراکنش‌های این کارمند نیز برای همیشه پاک خواهد شد!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'بله، حذف شود',
      cancelButtonText: 'انصراف'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.deleteEmployee) {
          const res = await window.electronAPI.deleteEmployee(empId);
          if (res.success) {
            MySwal.fire('حذف شد', 'کارمند با موفقیت از سیستم حذف گردید.', 'success');
            if (selectedEmployee?.id === empId) {
              setSelectedEmployee(null);
            }
            fetchEmployees();
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در حذف کارمند', 'error');
      }
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (txForm.amount <= 0) {
      MySwal.fire('خطا', 'مبلغ سند باید بزرگتر از صفر باشد.', 'warning');
      return;
    }

    try {
      if (window.electronAPI?.addEmployeeTransaction && showTransactionModal) {
        const res = await window.electronAPI.addEmployeeTransaction({
          employee_id: selectedEmployee.id,
          date: txForm.date,
          type: showTransactionModal,
          amount: Number(txForm.amount),
          item_name: txForm.item_name,
          description: txForm.description
        });

        if (res.success) {
          setShowTransactionModal(null);
          // Set to default
          setTxForm({
            date: new Date().toLocaleDateString('fa-IR'),
            amount: 0,
            item_name: '',
            description: ''
          });
          MySwal.fire({
            icon: 'success',
            title: 'سند ثبت شد',
            text: 'تراکنش مالی کارمند با موفقیت در دیتابیس ذخیره شد.',
            timer: 1500,
            showConfirmButton: false,
          });
          fetchEmployees(); // Will refresh list and current selectedEmployee with updated balance!
        }
      }
    } catch (e: any) {
      MySwal.fire('خطا', e.message || 'خطا در ثبت سند', 'error');
    }
  };

  const handleDeleteTransaction = async (txId: number) => {
    const confirm = await MySwal.fire({
      title: 'آیا از حذف این سند مالی مطمئن هستید؟',
      text: 'این تراکنش از کاردکس حسابداری کارمند حذف شده و روی مانده حساب مجددا تاثیر می‌گذارد.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف'
    });

    if (confirm.isConfirmed) {
      try {
        if (window.electronAPI?.deleteEmployeeTransaction) {
          const res = await window.electronAPI.deleteEmployeeTransaction(txId);
          if (res.success) {
            Swal.fire({
              icon: 'success',
              title: 'سند مالی حذف شد',
              timer: 1000,
              showConfirmButton: false
            });
            fetchEmployees();
          }
        }
      } catch (e: any) {
        MySwal.fire('خطا', e.message || 'خطا در حذف سند', 'error');
      }
    }
  };

  const getTransactionBadge = (type: EmployeeTransaction['type']) => {
    switch (type) {
      case 'salary_accrual':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">حقوق ثابت ماهانه</span>;
      case 'bonus':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">پاداش/غیرنقدی</span>;
      case 'cash_advance':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">مساعده / پرداختی</span>;
      case 'item_pickup':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">برداشت کالا</span>;
      case 'fine_deduction':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">جریمه و کسورات</span>;
      default:
        return null;
    }
  };

  // Safe checks for arrays
  const employeesList = employees || [];
  const filteredEmployees = employeesList.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (emp.position && emp.position.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (positionFilter === 'all') return matchesSearch;
    return matchesSearch && emp.position === positionFilter;
  });

  const uniquePositions = Array.from(new Set(employeesList.map(e => e.position).filter(Boolean)));

  // Calculate high-level statistics for current selected employee
  const totals = transactions.reduce((acc, current) => {
    const amt = new Decimal(current.amount);
    if (current.type === 'salary_accrual' || current.type === 'bonus') {
      acc.totalEarned = acc.totalEarned.plus(amt);
    } else {
      acc.totalDeducted = acc.totalDeducted.plus(amt);
      if (current.type === 'cash_advance') {
        acc.totalPaidCash = acc.totalPaidCash.plus(amt);
      } else if (current.type === 'item_pickup') {
        acc.totalGoodsTaken = acc.totalGoodsTaken.plus(amt);
      } else if (current.type === 'fine_deduction') {
        acc.totalFines = acc.totalFines.plus(amt);
      }
    }
    return acc;
  }, {
    totalEarned: new Decimal(0),
    totalDeducted: new Decimal(0),
    totalPaidCash: new Decimal(0),
    totalGoodsTaken: new Decimal(0),
    totalFines: new Decimal(0)
  });

  const netBalance = totals.totalEarned.minus(totals.totalDeducted);

  const handleSyncWithPerson = (personIdStr: string) => {
    if (!personIdStr) return;
    const selectedP = persons.find(p => p.id === parseInt(personIdStr));
    if (selectedP) {
      setNewEmpForm(prev => ({
        ...prev,
        name: selectedP.title || `${selectedP.first_name || ''} ${selectedP.last_name || ''}`.trim(),
        phone: selectedP.phone1 || '',
        person_id: personIdStr
      }));
    }
  };

  return (
    <div className="h-full space-y-6 animate-in fade-in duration-300">
      
      {/* Upper Status/Header panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white" id="employees-title">مدیریت حسابداری کارمندان</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ثبت مشخصات، حقوق پایه، مساعده نقدی، برداشت کالا از فروشگاه و جریمه‌ها و محاسبات مانده‌حساب کارمندان به‌صورت خودکار
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
            id="btn-add-employee"
          >
            <UserPlus className="w-5 h-5" />
            <span>ثبت کارمند جدید</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left List of staff */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-14rem)] shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <h2 className="font-semibold text-slate-800 dark:text-white mr-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <span>لیست پرسنل فروشگاه ({toPersianNum(filteredEmployees.length)})</span>
            </h2>

            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام یا سمت..."
                className="w-full pl-3 pr-9 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Position filter pillbox */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => setPositionFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  positionFilter === 'all' 
                    ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' 
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                همه سمت‌ها
              </button>
              {uniquePositions.map(pos => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    positionFilter === pos 
                      ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' 
                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <Users className="w-10 h-10 stroke-[1.5] text-slate-300" />
                <span className="text-sm">کارمندی با شرایط مد نظر یافت نشد.</span>
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedEmployee?.id === emp.id;
                const outstanding = new Decimal(emp.balance || 0);
                const earnsOwed = outstanding.gt(0);
                const owesStore = outstanding.lt(0);

                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected 
                        ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500 shadow-md shadow-indigo-500/5 scale-[0.99]' 
                        : 'bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 select-none overflow-hidden text-sm shrink-0 border border-slate-300 dark:border-slate-700">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{emp.name.split(' ').map(n=>n[0]).join('')}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate block">{emp.name}</h3>
                          {emp.position && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 block">{emp.position}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEmployee(emp.id, emp.name);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-all opacity-0 group-hover/menu:opacity-100 group-focus/menu:opacity-100 hover:opacity-100 focus:opacity-100"
                        title="حذف کارمند"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/50 text-[11px]">
                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>پایه ماهانه: {formatCurrency(emp.salary)} ریال</span>
                      </span>

                      <span className={`font-semibold flex items-center gap-1 ${
                        earnsOwed ? 'text-emerald-600 dark:text-emerald-400' :
                        owesStore ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        <span>
                          {earnsOwed ? 'طلبکار:' : owesStore ? 'بدهکار:' : 'تسویه'}
                        </span>
                        <span>{formatCurrency(outstanding.abs().toNumber())}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Dashboard panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEmployee ? (
            <>
              {/* Detailed Card View */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                
                {/* Employee general summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-2xl select-none shrink-0 border border-indigo-500/20">
                      {selectedEmployee.avatar ? (
                        <img src={selectedEmployee.avatar} alt={selectedEmployee.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{selectedEmployee.name.split(' ').map(n=>n[0]).join('')}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selectedEmployee.name}</h2>
                        {selectedEmployee.accounting_code && (
                          <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            کد معین: {toPersianNum(selectedEmployee.accounting_code)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {selectedEmployee.position && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>سمت: {selectedEmployee.position}</span>
                          </span>
                        )}
                        {selectedEmployee.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            <span>تلفن: {toPersianNum(selectedEmployee.phone)}</span>
                          </span>
                        )}
                        {selectedEmployee.hire_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>شروع همکاری: {toPersianNum(selectedEmployee.hire_date)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Balance Summary */}
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-left shrink-0 w-full sm:w-auto">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5 text-right font-medium">وضعیت حسابداری</span>
                    <span className={`text-xl font-black block text-right font-mono ${
                      netBalance.gt(0) ? 'text-emerald-600 dark:text-emerald-400' :
                      netBalance.lt(0) ? 'text-rose-500' : 'text-slate-500'
                    }`}>
                      {netBalance.gt(0) ? 'طلبکار:' : netBalance.lt(0) ? 'بدهکار:' : 'تسویه'} {formatCurrency(netBalance.abs().toNumber())} ریال
                    </span>
                  </div>
                </div>

                {/* Dynamic Auto-Accrual System banner */}
                {(() => {
                  const stats = getAccrualStats(selectedEmployee, transactions);
                  if (stats.elapsedDays <= 0) return null;
                  return (
                    <div className="p-4 rounded-2xl border border-indigo-400/30 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-slate-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500 animate-pulse" />
                          <span>محاسبه خودکار کارکرد روزانه معوقه</span>
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          تعداد <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{toPersianNum(stats.elapsedDays)}</strong> روز کاری از آخرین وضعیت ثبت کارکرد ({toPersianNum(stats.lastDate)}) سپری شده است.
                          کارکرد روزانه کارمند مبلغ <span className="font-mono font-bold">{formatCurrency(stats.dailyWage)}</span> ریال (کل مبلغ معوقه: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{formatCurrency(stats.totalAccruable)}</strong> ریال) محاسبه شد.
                        </p>
                      </div>
                      <button
                        onClick={() => executeAutoAccrual(selectedEmployee, stats.elapsedDays, stats.totalAccruable, stats.lastDate)}
                        className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-lg shadow-indigo-500/20 shrink-0"
                      >
                        بروزرسانی کارکرد و بستانکار کردن {toPersianNum(stats.elapsedDays)} روز
                      </button>
                    </div>
                  );
                })()}

                {/* Ledger Quick-Action Buttons (Employer/Management console) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">ثبت و صدور اسناد مالی پرسنل (کاردکس کارمند)</h3>
                  
                  {/* Highly Emphasized Payment button for Clear Identification */}
                  <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 text-right">
                      <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-400">💵 دکمه پرداخت پول به کارمند (حقوق / مساعده نقدی)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        هر زمان به کارمند پول نقد، مساعده، پیش‌پرداخت یا تصفیه حقوق پرداخت می‌کنید، از این دکمه استفاده کنید تا کارمند بدهکار شود.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowTransactionModal('cash_advance')}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:translate-y-0.5 transition-all"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>ثبت پرداخت پول به کارمند</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    
                    {/* 1. base salary */}
                    <button
                      onClick={() => setShowTransactionModal('salary_accrual')}
                      className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-blue-500/20 dark:border-blue-500/10 bg-blue-500/5 hover:bg-blue-500/10 text-blue-700 dark:text-blue-400 transition-all font-semibold hover:-translate-y-0.5"
                    >
                      <PlusCircle className="w-5 h-5 mb-1 text-blue-500" />
                      <span className="text-xs font-bold text-center">ثبت بستانکاری دستمزد (دستی)</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-1">(افزودن طلبکار دستی کارمند)</span>
                    </button>

                    {/* 2. bonus */}
                    <button
                      onClick={() => setShowTransactionModal('bonus')}
                      className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-indigo-500/20 dark:border-indigo-500/10 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 transition-all font-semibold hover:-translate-y-0.5"
                    >
                      <TrendingUp className="w-5 h-5 mb-1 text-indigo-500" />
                      <span className="text-xs font-bold text-center">ثبت پاداش و اضافه‌کار</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-1">(عیدی، تشویقی و کارانه)</span>
                    </button>

                    {/* 3. item pickup */}
                    <button
                      onClick={() => setShowTransactionModal('item_pickup')}
                      className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-purple-500/20 dark:border-purple-500/10 bg-purple-500/5 hover:bg-purple-500/10 text-purple-700 dark:text-purple-400 transition-all font-semibold hover:-translate-y-0.5"
                    >
                      <ShoppingBag className="w-5 h-5 mb-1 text-purple-400" />
                      <span className="text-xs font-bold text-center">برداشت کالا از فروشگاه</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-1">(کسر مبلغ اجناس برداشته شده)</span>
                    </button>

                    {/* 4. fines / less payments */}
                    <button
                      onClick={() => setShowTransactionModal('fine_deduction')}
                      className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-red-500/20 dark:border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-400 transition-all font-semibold hover:-translate-y-0.5"
                    >
                      <MinusCircle className="w-5 h-5 mb-1 text-red-500" />
                      <span className="text-xs font-bold text-center">ثبت جرایم و کسورات کالا</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-1">(جریمه دیرکرد، زیان یا خسارت)</span>
                    </button>

                  </div>
                </div>

                {/* Analytical summary cards of transactions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs text-slate-400 font-medium block">کل کارکرد بستانکار</span>
                    <span className="text-lg font-black font-mono text-slate-800 dark:text-white mt-1 block">
                      {formatCurrency(totals.totalEarned.toNumber())}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs text-slate-400 font-medium block">مساعده‌ها و پرداختی‌ها</span>
                    <span className="text-lg font-black font-mono text-slate-800 dark:text-white mt-1 block">
                      {formatCurrency(totals.totalPaidCash.toNumber())}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs text-slate-400 font-medium block">کالاهای برداشتی</span>
                    <span className="text-lg font-black font-mono text-slate-800 dark:text-white mt-1 block">
                      {formatCurrency(totals.totalGoodsTaken.toNumber())}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs text-slate-400 font-medium block">کسورات و جریمه‌ها</span>
                    <span className="text-lg font-black font-mono text-slate-800 dark:text-white mt-1 block">
                      {formatCurrency(totals.totalFines.toNumber())}
                    </span>
                  </div>
                </div>

              </div>

              {/* Transactions Ledger Grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-white mr-1 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span>کاردکس اسناد و جزئیات مالی</span>
                </h3>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/70 rounded-xl">
                  <table className="w-full text-right border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                        <th className="p-3.5">کد سند</th>
                        <th className="p-3.5">نوع سند</th>
                        <th className="p-3.5">تاریخ سند</th>
                        <th className="p-3.5">بابت / کلا</th>
                        <th className="p-3.5">شرح</th>
                        <th className="p-3.5 text-left">مبلغ (ريال)</th>
                        <th className="p-3.5 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                            سند مالی یافت نشد. می‌توانید با استفاده از پنل بالا اسناد حقوق و مساعده‌ها را صادر کنید.
                          </td>
                        </tr>
                      ) : (
                        transactions.map(tx => {
                          const isAdd = tx.type === 'salary_accrual' || tx.type === 'bonus';
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="p-3.5 font-mono text-xs text-slate-400">#{toPersianNum(tx.id)}</td>
                              <td className="p-3.5">{getTransactionBadge(tx.type)}</td>
                              <td className="p-3.5 font-mono text-xs">{toPersianNum(tx.date)}</td>
                              <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                                {tx.type === 'item_pickup' ? (
                                  <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span>{tx.item_name || 'کالای فروشگاه'}</span>
                                  </span>
                                ) : (
                                  'انتقال حساب پرسنل'
                                )}
                              </td>
                              <td className="p-3.5 text-xs text-slate-500 max-w-[200px] truncate" title={tx.description || ''}>
                                {tx.description || 'ثبت دستی از حساب مدیریت'}
                              </td>
                              <td className={`p-3.5 font-black text-left font-mono ${
                                isAdd ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                              }`}>
                                {isAdd ? '+' : '-'}{formatCurrency(tx.amount)}
                              </td>
                              <td className="p-3.5 text-center">
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                                  title="حذف سند"
                                >
                                  <X className="w-4 h-4" />
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
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full min-h-[400px] shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-350">
                <HelpCircle className="w-10 h-10 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="font-bold text-slate-700 dark:text-white">هیچ کارمندی انتخاب نشده است</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  لطفاً با کلیک بر روی یکی از کارمندان در منوی سمت چپ، بیانیه‌های مالی و کاردکس معین حساب او را مدیریت کنید.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: ADD EMPLOYEE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-right leading-relaxed"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-500" />
                <span>ثبت و تنظیم کارمند جدید</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">ارتباط مستقیم با دفترچه اشخاص (اختیاری)</label>
                <select
                  value={newEmpForm.person_id}
                  onChange={(e) => handleSyncWithPerson(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- هیچکدام (کارمند مستقل جدید) --</option>
                  {persons.filter(p => p.is_employee === 1).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title || `${p.first_name || ''} ${p.last_name || ''}`.trim()} (کد معین: {p.accounting_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">نام کامل کارمند</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.name}
                    onChange={(e) => setNewEmpForm({...newEmpForm, name: e.target.value})}
                    placeholder="مریم بهرامی"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">تلفن تماس (همراه)</label>
                  <input
                    type="text"
                    value={newEmpForm.phone}
                    onChange={(e) => setNewEmpForm({...newEmpForm, phone: e.target.value})}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">سمت کاری / مقام</label>
                  <input
                    type="text"
                    value={newEmpForm.position}
                    onChange={(e) => setNewEmpForm({...newEmpForm, position: e.target.value})}
                    placeholder="فروشنده، مدیر انبار و ..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">شروع همکاری (تاریخ شمسی)</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.hire_date}
                    onChange={(e) => setNewEmpForm({...newEmpForm, hire_date: e.target.value})}
                    placeholder="۱۴۰۵/۰۱/۱۵"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">حقوق پایه توافقی ماهانه (ریال)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs pointer-events-none">ریال</span>
                  <input
                    type="number"
                    value={newEmpForm.salary === 0 ? '' : newEmpForm.salary}
                    onChange={(e) => setNewEmpForm({...newEmpForm, salary: Number(e.target.value)})}
                    placeholder="مثلا ۷۵,۰۰۰,۰۰۰"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-left"
                  />
                </div>
                <span className="text-[10px] text-slate-450 mt-1 block px-1 text-slate-400">
                  مبلغ معادل: {formatCurrency(newEmpForm.salary)} ریال
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/20 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-0.5"
                >
                  ثبت مشخصات پرسنلی
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: SUBMIT GENERAL FINANCIAL TRANSACTION */}
      <AnimatePresence>
        {showTransactionModal && selectedEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-right leading-relaxed"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-indigo-500" />
                  <span>
                    {showTransactionModal === 'salary_accrual' && 'ثبت سند حقوق کارکرد ماهانه'}
                    {showTransactionModal === 'bonus' && 'ثبت پاداش و کارانه نقدی'}
                    {showTransactionModal === 'cash_advance' && 'پرداخت مساعده نقدی / علی‌الحساب'}
                    {showTransactionModal === 'item_pickup' && 'برداشت کالا / بده کار کردن کارمند'}
                    {showTransactionModal === 'fine_deduction' && 'ثبت جریمه و کسورات کسر از حقوق'}
                  </span>
                </h3>
                <button onClick={() => setShowTransactionModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border-b border-slate-100 dark:border-slate-800 mr-0.5 text-xs text-slate-500">
                <span>کارمند هدف: </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedEmployee.name}</span>
                {showTransactionModal === 'salary_accrual' && (
                  <span className="block mt-1">حقوق ماهانه کارمند به طور توافقی در معین او {formatCurrency(selectedEmployee.salary)} ریال ثبت شده است.</span>
                )}
              </div>

              <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">تاریخ ثبت سند</label>
                    <input
                      type="text"
                      required
                      value={txForm.date}
                      onChange={(e) => setTxForm({...txForm, date: e.target.value})}
                      placeholder="۱۴۰۵/۰۱/۳۱"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">مبلغ سند مالی</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400 text-[10px] pointer-events-none">ریال</span>
                      <input
                        type="number"
                        required
                        value={txForm.amount === 0 ? '' : txForm.amount}
                        onChange={(e) => setTxForm({...txForm, amount: Number(e.target.value)})}
                        placeholder={showTransactionModal === 'salary_accrual' ? String(selectedEmployee.salary) : "۱,۵۰۰,۰۰۰"}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-left font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-left py-0.5 px-1">
                  <span className="text-[10px] text-slate-400 font-mono">
                    معادل فارسی: {formatCurrency(txForm.amount || 0)} ریال
                  </span>
                </div>

                {showTransactionModal === 'item_pickup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">نام کالای برداشتی از فروشگاه</label>
                    <input
                      type="text"
                      required
                      value={txForm.item_name}
                      onChange={(e) => setTxForm({...txForm, item_name: e.target.value})}
                      placeholder="تلویزیون سامسونگ مدل ۵۰، ابزار صنعتی ..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">توضیحات و شرح معین سند</label>
                  <textarea
                    rows={3}
                    value={txForm.description}
                    onChange={(e) => setTxForm({...txForm, description: e.target.value})}
                    placeholder="بابت مساعده اواسط ماه فروردین، پرداخت اضافه کار، و یا مستندات جریمه ..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/20 -mx-6 -mb-6 p-4">
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(null)}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-850 rounded-lg transition-all"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-0.5"
                  >
                    ثبت نهایی و بستانکار/بدهکار کردن
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
