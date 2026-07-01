import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  Building, 
  MapPin, 
  Phone, 
  FileText, 
  User, 
  Lock, 
  HelpCircle, 
  KeyRound, 
  ShieldAlert, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PlaceholderPage from './pages/PlaceholderPage';
import DbTest from './pages/DbTest';
import SettingsGeneral from './pages/SettingsGeneral';
import PersonNew from './pages/PersonNew';
import PersonList from './pages/PersonList';
import Shareholders from './pages/Shareholders';
import Sellers from './pages/Sellers';
import UsersPage from './pages/Users';
import SettingsStoreInfo from './pages/SettingsStoreInfo';
import Employees from './pages/Employees';
import ProductCategories from './pages/ProductCategories';
import DebtorsCreditors from './pages/DebtorsCreditors';
import ProductNew from './pages/ProductNew';
import ProductList from './pages/ProductList';
import WarehouseManagement from './pages/WarehouseManagement';
import PriceUpdateManagement from './pages/PriceUpdateManagement';
import SalesQuick from './pages/SalesQuick';
import SalesInvoice from './pages/SalesInvoice';
import SalesHistory from './pages/SalesHistory';
import InvoiceDesignSettings from './pages/InvoiceDesignSettings';
import Training from './pages/Training';
import LogsPage from './pages/Logs';

const MySwal = withReactContent(Swal);

// Unrestricted/Shared routes
const GUEST_ALLOWED_PAGES = ['dashboard'];

const LocalPlaceholderPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 text-center animate-in fade-in duration-550">
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full flex justify-center items-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-150 mb-2">در حال ساخت...</h2>
      <p className="text-slate-500 max-w-md">
        این صفحه در مراحل بعدی توسعه پیاده‌سازی خواهد شد.
      </p>
    </div>
  );
};

export default function App() {
  const [onboardingRequired, setOnboardingRequired] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Onboarding Wizard State
  const [onboardingForm, setOnboardingForm] = useState({
    storeName: 'حسابداری ملینا',
    storePhone: '۰۲۱-۵۵۶۶۷۷۸۸',
    storeAddress: 'تهران، بازار بزرگ، سرای ملی، طبقه اول',
    storeDescription: 'نرم افزار حسابداری و مدیریت مالی ملینا',
    username: 'admin',
    password: '',
    recoveryQuestion: 'نام معلم دوران ابتدایی شما چیست؟',
    recoveryAnswer: '',
  });

  // Login Screen State
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });

  // Password Recovery State
  const [recoveryStep, setRecoveryStep] = useState<'none' | 'username' | 'question' | 'success'>('none');
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryQuestionFetched, setRecoveryQuestionFetched] = useState('');
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [recoveredPassword, setRecoveredPassword] = useState('');

  useEffect(() => {
    checkAppStatus();
  }, []);

  const checkAppStatus = async () => {
    try {
      if (window.electronAPI?.checkOnboardingStatus) {
        const res = await window.electronAPI.checkOnboardingStatus();
        setOnboardingRequired(res.onboardingRequired);
      } else {
        // Fallback for browser testing
        setOnboardingRequired(false);
      }

      // Check current session
      const savedUser = sessionStorage.getItem('current_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('App init error:', e);
      setOnboardingRequired(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingForm.username || !onboardingForm.password || !onboardingForm.recoveryAnswer) {
      MySwal.fire('خطای ورودی', 'لطفاً نام کاربری، کلمه عبور و پاسخ سوال امنیتی را تکمیل نمایید.', 'warning');
      return;
    }

    try {
      setIsInitializing(true);
      if (window.electronAPI?.performOnboarding) {
        const res = await window.electronAPI.performOnboarding({
          storeName: onboardingForm.storeName,
          storePhone: onboardingForm.storePhone,
          storeAddress: onboardingForm.storeAddress,
          storeDescription: onboardingForm.storeDescription,
          storeLogo: '',
          username: onboardingForm.username.trim(),
          password: onboardingForm.password,
          recoveryQuestion: onboardingForm.recoveryQuestion,
          recoveryAnswer: onboardingForm.recoveryAnswer.trim(),
        });

        if (res?.success) {
          await MySwal.fire({
            icon: 'success',
            title: 'راه‌اندازی اولیه موفق',
            text: 'فروشگاه و حساب مدیریت شما با موفقیت ایجاد گردید.',
            confirmButtonText: 'ورود به نرم‌افزار'
          });
          setOnboardingRequired(false);
          // auto login
          const userSession = {
            username: onboardingForm.username.trim(),
            role: 'مدیر ارشد',
            permissions: '*',
            pwd_plain: onboardingForm.password
          };
          sessionStorage.setItem('current_user', JSON.stringify(userSession));
          setCurrentUser(userSession);
        }
      }
    } catch (err: any) {
      MySwal.fire('خطا در راه‌اندازی', err.message || 'مشکلی در راه‌اندازی رخ داد.', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      MySwal.fire('پرکردن فیلدها', 'نام کاربری و رمز عبور را وارد کنید.', 'warning');
      return;
    }

    try {
      setIsInitializing(true);
      if (window.electronAPI?.loginUser) {
        const res = await window.electronAPI.loginUser({
          username: loginForm.username.trim(),
          password: loginForm.password,
        });

        if (res?.success) {
          const userSession = {
            id: res.user.id,
            username: res.user.username,
            role: res.user.role,
            permissions: res.user.permissions,
            pwd_plain: loginForm.password
          };
          sessionStorage.setItem('current_user', JSON.stringify(userSession));
          setCurrentUser(userSession);
          MySwal.fire({
            icon: 'success',
            title: `خوش آمدید، ${userSession.username}`,
            timer: 1000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
        } else {
          MySwal.fire('عدم امکان ورود', res.message || 'اطلاعات کاربری نامعتبر است.', 'error');
        }
      } else {
        // Mock fallback for standard browser testing
        const userSession = { username: loginForm.username, role: 'مدیر', permissions: '*' };
        setCurrentUser(userSession);
      }
    } catch (err: any) {
      MySwal.fire('خطای فنی', err.message || 'مشکلی پیش آمد.', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  // Password Recovery handler
  const startPasswordRecovery = () => {
    setRecoveryStep('username');
    setRecoveryUsername('');
    setRecoveryAnswerInput('');
    setRecoveredPassword('');
  };

  const submitRecoveryUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUsername) return;

    try {
      setIsInitializing(true);
      if (window.electronAPI?.getUserSecurityQuestion) {
        const res = await window.electronAPI.getUserSecurityQuestion(recoveryUsername.trim());
        if (res?.success) {
          setRecoveryQuestionFetched(res.question || 'خالی');
          setRecoveryStep('question');
        } else {
          MySwal.fire('نام کاربری یافت نشد', 'کاربری با این نام کاربری یافت نشد.', 'error');
        }
      }
    } catch (err: any) {
      MySwal.fire('خطا', 'نام کاربری نامعتبر است.', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const submitRecoveryAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryAnswerInput) return;

    try {
      setIsInitializing(true);
      if (window.electronAPI?.recoverPassword) {
        const res = await window.electronAPI.recoverPassword({
          username: recoveryUsername.trim(),
          recoveryAnswer: recoveryAnswerInput.trim(),
        });

        if (res?.success && res.password) {
          setRecoveredPassword(res.password);
          setRecoveryStep('success');
        } else {
          MySwal.fire('پاسخ اشتباه', 'پاسخ سوال امنیتی نادرست است.', 'error');
        }
      }
    } catch (err: any) {
      MySwal.fire('خطا', 'اعتبار سنجی با مشکل برخورد کرد.', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('current_user');
    setCurrentUser(null);
  };

  // Restriction Checker
  const isAllowed = (pageKey: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'مدیر' || currentUser.role === 'مدیر ارشد' || currentUser.permissions === '*') return true;
    const allowed = currentUser.permissions ? currentUser.permissions.split(',') : [];
    if (allowed.includes(pageKey)) return true;
    if (allowed.some(p => p.startsWith(pageKey + ':'))) return true;
    return false;
  };

  const RestrictionGuard = ({ pageKey, children }: { pageKey: string; children: React.ReactNode }) => {
    if (isAllowed(pageKey)) {
      return <>{children}</>;
    }
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-center animate-in fade-in" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 mb-4 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">محدودیت دسترسی</h3>
        <p className="text-xs text-slate-455 mt-2 max-w-sm leading-relaxed">
          دسترسی حساب کاربری شما ({currentUser?.username}) به این صفحه توسط مدیر سیستم مسدود شده است. جهت کسب اجازه با مدیریت فروشگاه تماس حاصل فرمایید.
        </p>
      </div>
    );
  };

  // Loading Screen
  if (isInitializing && onboardingRequired === null) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-550 border-t-transparent animate-spin mb-4" />
        <span className="text-xs font-bold text-slate-400">در حال اتصال به دیتابیس حسابداری ملینا...</span>
      </div>
    );
  }

  // SHOW 1ST INSTALL ONBOARDING WIZARD
  if (onboardingRequired) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-indigo-650 selection:text-white" dir="rtl">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl" />

          {/* Wizard Header */}
          <div className="text-center mb-8 relative">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black mx-auto shadow-lg shadow-indigo-505/25 text-xl tracking-wider mb-3">
              M
            </div>
            <h2 className="text-lg font-black text-white">راه‌اندازی اولیه حسابداری ملینا</h2>
            <p className="text-[11px] text-slate-450 mt-1 font-semibold leading-relaxed">
              این نرم‌افزار برای اولین بار روی این سیستم نصب شده است. لطفماً مشخصات فروشگاه و حساب کاربری مدیریت کل را تعیین کنید.
            </p>
          </div>

          <form onSubmit={handleOnboardingSubmit} className="space-y-5 text-slate-300">
            
            {/* Step 1: Store info */}
            <div className="space-y-3">
              <span className="block text-xs font-black text-indigo-400">۱. مشخصات کلی فروشگاه</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-405 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-indigo-500" />
                    نام صنف / فروشگاه
                  </label>
                  <input 
                    type="text" 
                    required
                    value={onboardingForm.storeName}
                    onChange={(e) => setOnboardingForm(prev => ({ ...prev, storeName: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-405 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-500" />
                    تلفن ثابت
                  </label>
                  <input 
                    type="text" 
                    required
                    value={onboardingForm.storePhone}
                    onChange={(e) => setOnboardingForm(prev => ({ ...prev, storePhone: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-center font-mono outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-405 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  آدرس مجمع فروشگاه
                </label>
                <input 
                  type="text" 
                  required
                  value={onboardingForm.storeAddress}
                  onChange={(e) => setOnboardingForm(prev => ({ ...prev, storeAddress: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 my-4"></div>

            {/* Step 2: Authentication Credentials */}
            <div className="space-y-3">
              <span className="block text-xs font-black text-indigo-400">۲. مشخصات حساب مدیریت ارشد (سیستم تک‌کاربره مرجع)</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-450 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    نام کاربری مدیریت
                  </label>
                  <input 
                    type="text" 
                    required
                    value={onboardingForm.username}
                    onChange={(e) => setOnboardingForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-805 border border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-505 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-450 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-500" />
                    رمز عبور (قوی)
                  </label>
                  <input 
                    type="password" 
                    required
                    placeholder="کلمه عبور"
                    value={onboardingForm.password}
                    onChange={(e) => setOnboardingForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-805 border border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-white"
                  />
                </div>
              </div>

              {/* Recovery config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-[10px] font-black text-amber-500 mb-1 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    سوال امنیتی فراموشی رمز
                  </label>
                  <select
                    value={onboardingForm.recoveryQuestion}
                    onChange={(e) => setOnboardingForm(prev => ({ ...prev, recoveryQuestion: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-[11px] outline-none text-white font-bold"
                  >
                    <option value="نام معلم دوران ابتدایی شما چیست؟">نام معلم دوران ابتدایی شما چیست؟</option>
                    <option value="نام اولین حیوان خانگی شما چیست؟">نام اولین حیوان خانگی شما چیست؟</option>
                    <option value="نام شهر محل تولد پدربزرگ شما؟">نام شهر محل تولد پدربزرگ شما؟</option>
                    <option value="برند اولین گوشی همراه شما چه بود؟">برند اولین گوشی همراه شما چه بود؟</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-amber-500 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    پاسخ سوال امنیتی (جهت بازیابی رمز)
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: علیرضا"
                    value={onboardingForm.recoveryAnswer}
                    onChange={(e) => setOnboardingForm(prev => ({ ...prev, recoveryAnswer: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-650 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              <CheckCircle2 className="w-4 h-4" />
              ذخیره و ورود به صندوق حسابداری
            </button>
            
          </form>
        </div>
      </div>
    );
  }

  // SHOW SIGN IN VIEW / LOGIN SCREEN (with forgot password recovery link)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-indigo-650" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          
          {/* Recovery Step None: Standard Login Form */}
          {recoveryStep === 'none' && (
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-extrabold mx-auto mb-3 shadow-md">
                  M
                </div>
                <h2 className="text-base font-black text-slate-100">سامانه حسابداری و تراز مالی ملینا</h2>
                <p className="text-[11px] text-slate-500 mt-1">جهت ورود نام کاربری و رمز عبور خود را وارد نمایید</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">نام کاربری</label>
                  <input 
                    type="text" 
                    required
                    placeholder="نام کاربری انگلیسی"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono outline-none text-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">کلمه عبور</label>
                  <input 
                    type="password" 
                    required
                    placeholder="رمز ورود"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs outline-none text-white focus:border-indigo-500"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black transition-all select-none cursor-pointer"
                >
                  ورود به حساب کاربری
                </button>

                <div className="text-center pt-2">
                  <button 
                    type="button" 
                    onClick={startPasswordRecovery}
                    className="text-[10px] text-amber-500 hover:underline font-bold"
                  >
                    رمز عبور خود را فراموش کرده‌اید؟ (بازیابی رمز عبور)
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Recovery Step 1: Username Check */}
          {recoveryStep === 'username' && (
            <>
              <div className="text-center mb-6">
                <HelpCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h3 className="text-sm font-black text-slate-100">بازیابی رمز عبور (گام ۱ از ۳)</h3>
                <p className="text-[11px] text-slate-500 mt-1">نام کاربری حسابی که قصد بازیابی رمز آن دارید را وارد نمایید</p>
              </div>

              <form onSubmit={submitRecoveryUsername} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">نام کاربری حساب</label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: admin"
                    value={recoveryUsername}
                    onChange={(e) => setRecoveryUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono outline-none text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setRecoveryStep('none')}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-400 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    بازگشت
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-[11px] font-black cursor-pointer"
                  >
                    تایید و ادامه
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Recovery Step 2: Security Question Check */}
          {recoveryStep === 'question' && (
            <>
              <div className="text-center mb-6">
                <Lock className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                <h3 className="text-sm font-black text-slate-100">سوال امنیتی فراموشی رمز (گام ۲ از ۳)</h3>
                <p className="text-[11px] text-slate-500 mt-1">لطفاً پاسخ دقیق کلمه عبور را ارائه نمایید</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl mb-4 text-xs font-black text-slate-300 text-center border border-slate-800">
                {recoveryQuestionFetched}
              </div>

              <form onSubmit={submitRecoveryAnswer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-405 mb-1">پاسخ سوال امنیتی</label>
                  <input 
                    type="text" 
                    required
                    placeholder="پاسخ را اینجا بنویسید"
                    value={recoveryAnswerInput}
                    onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs outline-none text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setRecoveryStep('username')}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-400 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    بازگشت
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-[11px] font-black cursor-pointer"
                  >
                    نمایش رمز عبور
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Recovery Step 3: Success password display */}
          {recoveryStep === 'success' && (
            <>
              <div className="text-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-black text-slate-100">رمز عبور با موفقیت واکشی شد</h3>
                <p className="text-[11px] text-slate-500 mt-1">اطلاعات بازیابی رمز عبور حساب شما به شرح زیر است:</p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-2 mb-6">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">کلمه عبور حساب کاربری شما</span>
                <span className="text-lg font-mono font-black text-emerald-550 select-all tracking-widest block py-2 bg-slate-900/50 rounded-xl border border-dashed border-emerald-900/30">
                  {recoveredPassword}
                </span>
                <span className="block text-[9px] text-slate-500">پاسخ هماهنگ با SQLite به کلاینت فاش شد.</span>
              </div>

              <button 
                type="button" 
                onClick={() => setRecoveryStep('none')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black cursor-pointer"
              >
                بازگشت به صفحه ورود (صندوق)
              </button>
            </>
          )}

        </div>
      </div>
    );
  }

  // STANDARD APPLICATION RENDERING WITH LAYOUT AND AUTHORIZED ROUTING
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout currentUser={currentUser} onLogout={logout} />}>
          {/* Dashboard */}
          <Route index element={
            <RestrictionGuard pageKey="dashboard">
              <Dashboard />
            </RestrictionGuard>
          } />
          
          {/* Persons subpages */}
          <Route path="persons">
            <Route path="new" element={
              <RestrictionGuard pageKey="persons">
                <PersonNew />
              </RestrictionGuard>
            } />
            <Route path="list" element={
              <RestrictionGuard pageKey="persons">
                <PersonList />
              </RestrictionGuard>
            } />
            <Route path="sellers" element={
              <RestrictionGuard pageKey="sellers">
                <Sellers />
              </RestrictionGuard>
            } />
            <Route path="shareholders" element={
              <RestrictionGuard pageKey="shareholders">
                <Shareholders />
              </RestrictionGuard>
            } />
            <Route path="employees" element={
              <RestrictionGuard pageKey="persons">
                <Employees />
              </RestrictionGuard>
            } />
            <Route path="debtors-creditors" element={
              <RestrictionGuard pageKey="persons">
                <DebtorsCreditors />
              </RestrictionGuard>
            } />
          </Route>

          {/* Products */}
          <Route path="products">
            <Route path="new" element={
              <RestrictionGuard pageKey="products">
                <ProductNew />
              </RestrictionGuard>
            } />
            <Route path="list" element={
              <RestrictionGuard pageKey="products">
                <ProductList />
              </RestrictionGuard>
            } />
            <Route path="categories" element={
              <RestrictionGuard pageKey="products">
                <ProductCategories />
              </RestrictionGuard>
            } />
            <Route path="price-update" element={
              <RestrictionGuard pageKey="products">
                <PriceUpdateManagement />
              </RestrictionGuard>
            } />
          </Route>

          {/* Sales */}
          <Route path="sales">
            <Route path="quick" element={
              <RestrictionGuard pageKey="sales">
                <SalesQuick />
              </RestrictionGuard>
            } />
            <Route path="new-invoice" element={
              <RestrictionGuard pageKey="sales">
                <SalesInvoice />
              </RestrictionGuard>
            } />
            <Route path="history" element={
              <RestrictionGuard pageKey="sales">
                <SalesHistory />
              </RestrictionGuard>
            } />
          </Route>

          {/* Inventory */}
          <Route path="inventory">
            <Route path="control" element={
              <RestrictionGuard pageKey="inventory">
                <WarehouseManagement />
              </RestrictionGuard>
            } />
            <Route path="history" element={
              <RestrictionGuard pageKey="inventory">
                <LocalPlaceholderPage />
              </RestrictionGuard>
            } />
          </Route>

          {/* Treasury - Cash and Bank */}
          <Route path="treasury" element={
            <RestrictionGuard pageKey="dashboard">
              <PlaceholderPage />
            </RestrictionGuard>
          } />

          {/* Users credentials / access management */}
          <Route path="users" element={
            <RestrictionGuard pageKey="settings">
              <UsersPage />
            </RestrictionGuard>
          } />

          {/* Settings */}
          <Route path="settings">
            <Route path="training" element={<Training />} />
            <Route path="general" element={
              <RestrictionGuard pageKey="settings">
                <SettingsGeneral />
              </RestrictionGuard>
            } />
            <Route path="print" element={<LocalPlaceholderPage />} />
            <Route path="invoice-design" element={
              <RestrictionGuard pageKey="settings">
                <InvoiceDesignSettings />
              </RestrictionGuard>
            } />
            <Route path="store-info" element={
              <RestrictionGuard pageKey="settings">
                <SettingsStoreInfo />
              </RestrictionGuard>
            } />
            <Route path="logs" element={
              <RestrictionGuard pageKey="settings">
                <LogsPage />
              </RestrictionGuard>
            } />
          </Route>
          
          {/* Dev options */}
          <Route path="dev">
            <Route path="db-test" element={<DbTest />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<LocalPlaceholderPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
