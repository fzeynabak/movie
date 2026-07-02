/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { dbService } from '../db/databaseService';
import { sendTelemetryToWordPress } from '../utils/telemetry';
import { 
  User, 
  Lock, 
  Mail, 
  Store, 
  Phone, 
  HelpCircle, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  RotateCcw
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (userProfile: any) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Fields for Registration & Login
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem('parstech_last_used_login') || '';
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('school');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Password Recovery States
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1); // 1: identify & answer question, 2: reset password

  // Questions dictionary
  const questions: Record<string, string> = {
    school: 'نام اولین مدرسه ابتدایی شما چه بود؟',
    friend: 'اسم صمیمی‌ترین دوست دوران کودکی شما چیست؟',
    pet: 'نام اولین حیوان خانگی یا پرنده شما چه بود؟',
    city: 'نام شهر یا محله‌ای که در آن متولد شدید چیست?'
  };

  const [profileExists, setProfileExists] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  const checkDbStatus = () => {
    dbService.checkUserExists().then(exists => {
      setProfileExists(exists);
      if (exists) {
        setIsRegistering(false);
        const saved = localStorage.getItem('parstech_user_profile');
        if (saved) {
          try { setExistingProfile(JSON.parse(saved)); } catch { }
        }
      } else {
        setIsRegistering(true);
      }
    });
  };

  React.useEffect(() => {
    checkDbStatus();
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName || !shopName || !phone || !email || !password || !securityAnswer) {
      setError('لطفاً تمامی فیلدهای اجباری ستاره‌دار (*) را پر کنید.');
      return;
    }

    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    if (password.length < 4) {
      setError('رمز عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }

    const newUserProfile = {
      fullName,
      shopName,
      phone,
      phoneSecondary,
      email,
      password,
      securityQuestion,
      securityAnswer: securityAnswer.trim().toLowerCase()
    };

    dbService.registerUser(newUserProfile).then(ok => {
      if (ok) {
        dbService.updateSettings({
          shopName: newUserProfile.shopName,
          shopPhone: newUserProfile.phone,
          shopPhoneSecondary: newUserProfile.phoneSecondary || '',
        });
        localStorage.setItem('parstech_last_used_login', email);
        setSuccess('ثبت‌نام شما با موفقیت در پایگاه‌داده SQLite ذخیره شد! اکنون می‌توانید وارد شوید.');

        if (navigator.onLine) {
          sendTelemetryToWordPress('register').catch(console.warn);
        } else {
          localStorage.setItem('parstech_telemetry_synced', 'false');
        }

        setTimeout(() => {
          setIsRegistering(false);
          setPassword('');
          checkDbStatus();
        }, 1500);
      } else {
        setError('خطا در ذخیره‌سازی اطلاعات در دیتابیس SQLite. لطفاً مجدداً تلاش کنید.');
      }
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    dbService.loginUser(email, password).then(profile => {
      if (profile) {
        localStorage.setItem('parstech_last_used_login', email);
        setSuccess('به سامانه خوش آمدید. در حال انتقال به پیش‌خوان...');
        setTimeout(() => {
          onLoginSuccess(profile);
        }, 1000);
      } else {
        setError('ایمیل/شماره همراه یا کلمه عبور وارد شده نادرست است.');
      }
    });
  };

  const handleStartRecovery = () => {
    setError('');
    setSuccess('');
    setIsRecovering(true);
    setRecoveryStep(1);
    setRecoveryAnswer('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleVerifyRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    dbService.verifySecurityAnswer(recoveryEmail, recoveryAnswer).then(profile => {
      if (profile) {
        setRecoveryStep(2);
      } else {
        setError('اطلاعات وارد شده یا پاسخ سوال امنیتی اشتباه است. لطفاً دقت کنید.');
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('رمز عبور جدید باید حداقل ۴ کاراکتر باشد.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('تکرار رمز عبور جدید مطابقت ندارد.');
      return;
    }

    dbService.resetUserPassword(recoveryEmail, newPassword).then(ok => {
      if (ok) {
        setSuccess('رمز عبور شما با موفقیت در دیتابیس SQLite تغییر یافت. اکنون می‌توانید وارد شوید.');
        setTimeout(() => {
          setIsRecovering(false);
          setPassword('');
          setError('');
          setSuccess('');
          checkDbStatus();
        }, 2000);
      } else {
        setError('خطا در بروزرسانی رمز عبور در دیتابیس.');
      }
    });
  };

  // Check if any profile exists (to determine recovery availability or cancel btn)
  // profileExists and existingProfile are managed in component state above

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-gray-100 font-sans p-4 relative overflow-hidden select-none" dir="rtl" id="auth-main-wrapper">
      {/* Visual glowing backgrounds */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[130px] -top-20 -right-20 pointer-events-none"></div>
      <div className="absolute w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[120px] -bottom-20 -left-20 pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 transition-all duration-300" id="auth-box">
        
        {/* Top Header Card Banner */}
        <div className="bg-gradient-to-tr from-indigo-950 to-slate-900 p-6 border-b border-slate-800 text-center relative">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/25 mb-3 animate-pulse">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-white">سامانه مدیریت رسانه پارس تک</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">پایگاه اطلاعاتی متمرکز و پیش‌خدمت فروش آفلاین</p>
        </div>

        {/* Form Body Context */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Status alerts */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/40 text-red-400 text-xs font-bold flex items-center gap-3 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-xs font-bold flex items-center gap-3 animate-scaleIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* PASSWORD RECOVERY VIEW */}
          {isRecovering ? (
            <div className="space-y-5 animate-scaleIn" id="recovery-form-panel">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-400" />
                  بازیابی رمز عبور (آفلاین)
                </span>
                <button 
                  onClick={() => setIsRecovering(false)} 
                  className="text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  بازگشت به ورود
                </button>
              </div>

              {recoveryStep === 1 ? (
                <form onSubmit={handleVerifyRecovery} className="space-y-4">
                  <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                    جهت بازیابی آفلاین رمز عبور، ایمیل یا شماره همراه ثبت‌شده به همراه پاسخ سوال امنیتی‌تان را وارد فرمایید:
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">ایمیل یا شماره همراه ثبت‌شده <span className="text-indigo-400">*</span></label>
                    <div className="relative">
                      <Mail className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="example@gmail.com یا ۰۹۱۲۳۴۵۶۷۸۹"
                        className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  {existingProfile && (
                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 font-extrabold block">سوال امنیتی شما هنگام ثبت‌نام:</span>
                      <span className="text-xs font-bold text-slate-300">{questions[existingProfile.securityQuestion] || questions.school}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">پاسخ سوال امنیتی <span className="text-indigo-400">*</span></label>
                    <div className="relative">
                      <HelpCircle className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        value={recoveryAnswer}
                        onChange={(e) => setRecoveryAnswer(e.target.value)}
                        placeholder="پاسخ دقیق را این‌جا یادداشت نمایید..."
                        className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    تایید هویت امنیتی
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-xs text-emerald-400 font-bold leading-relaxed">
                    هویت شما با موفقیت تایید شد! اکنون می‌توانید یک رمز عبور جدید برای برنامه تعریف کنید.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">رمز عبور جدید <span className="text-indigo-400">*</span></label>
                    <div className="relative">
                      <Lock className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="حداقل ۴ کاراکتر..."
                        className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">تکرار رمز عبور جدید <span className="text-indigo-400">*</span></label>
                    <div className="relative">
                      <Lock className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="تکرار رمز عبور..."
                        className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    ثبت رمز عبور جدید
                  </button>
                </form>
              )}
            </div>
          ) : isRegistering ? (
            
            /* REGISTRATION FORM (ثبت نام) */
            <form onSubmit={handleRegister} className="space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar" id="register-form">
              <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                برای فعال‌سازی و راه‌اندازی اولیه برنامه مدیریت رسانه پارس تک، لطفاً اطلاعات فروشگاه خود را تنظیم نمایید:
              </p>

              {/* Grid 1: Full name & Shop Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">نام و نام خانوادگی مدیر <span className="text-indigo-450 text-red-550">*</span></label>
                  <div className="relative">
                    <User className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثلا: مصطفی اکرادی"
                      className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">اسم مغازه / فروشگاه <span className="text-indigo-450 text-red-550">*</span></label>
                  <div className="relative">
                    <Store className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="مثلا: خدمات کامپیوتری پارس تک"
                      className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Grid 2: Phone Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">شماره تماس اصلی <span className="text-indigo-450 text-red-550">*</span></label>
                  <div className="relative">
                    <Phone className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="مثلا: ۰۹۳۸۰۰۷۲۰۱۹"
                      className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">شماره تماس پشتیبان</label>
                  <div className="relative">
                    <Phone className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={phoneSecondary}
                      onChange={(e) => setPhoneSecondary(e.target.value)}
                      placeholder="تماس ثابت یا موبایل همراه..."
                      className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 block">آدرس ایمیل <span className="text-indigo-450 text-red-550">*</span></label>
                <div className="relative">
                  <Mail className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Grid 3: Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">رمز عبور ورود <span className="text-white text-indigo-455 text-red-550">*</span></label>
                  <div className="relative">
                    <Lock className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="حداقل ۴ کاراکتر..."
                      className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">تکرار رمز عبور <span className="text-white text-indigo-455 text-red-550">*</span></label>
                  <div className="relative">
                    <Lock className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="تکرار رمز ورود..."
                      className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Security Questions Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 block">سوال امنیتی پشتیبان (جهت بازیابی رمزآفلاین) <span className="text-white text-indigo-455 text-red-550">*</span></label>
                <select 
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full h-11 bg-slate-950/75 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="school">{questions.school}</option>
                  <option value="friend">{questions.friend}</option>
                  <option value="pet">{questions.pet}</option>
                  <option value="city">{questions.city}</option>
                </select>
              </div>

              {/* Security Question Answer */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 block">پاسخ دقیق سوال امنیتی <span className="text-white text-indigo-455 text-red-550">*</span></label>
                <div className="relative">
                  <HelpCircle className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="این پاسخ را فراموش نکنید"
                    className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <button 
                type="submit" 
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                کامل کردن ثبت‌نام و ذخیره اطلاعات
              </button>

              <button 
                type="button" 
                onClick={() => setIsRegistering(false)} 
                className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer block mt-2"
              >
                قبلاً در سیستم ثبت‌نام کرده‌اید؟ رفتن به صفحه ورود
              </button>
            </form>
          ) : (
            
            /* LOGIN CARD (ورود) */
            <form onSubmit={handleLogin} className="space-y-5" id="login-form">
              <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                لطفاً اطلاعات حساب کاربری خود را جهت احراز صحت ورود ثبت و متصل نمایید:
              </p>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 block">ایمیل یا شماره همراه مدیر <span className="text-indigo-405 text-red-550">*</span></label>
                <div className="relative">
                  <Mail className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com یا ۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-4 text-xs font-bold text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 block">رمز عبور سیستم <span className="text-indigo-405 text-red-550">*</span></label>
                  <button 
                    type="button" 
                    onClick={handleStartRecovery} 
                    className="text-[10px] text-indigo-400 hover:text-white font-extrabold cursor-pointer transition-colors"
                  >
                    رمز عبور خود را فراموش کرده‌اید؟
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4.5 h-4.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="کلمه عبور ورود..."
                    className="w-full h-11 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 hover:border-slate-700 rounded-xl pr-10 pl-12 text-xs font-bold text-white focus:outline-none"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2"
                >
                  ورود امن به پنل مدیریت
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">کاربر جدید هستید؟ </span>
                <button 
                  type="button" 
                  onClick={() => setIsRegistering(true)}
                  className="text-xs font-extrabold text-indigo-400 hover:text-indigo-300 text-indigo-500/90 hover:underline cursor-pointer transition-all"
                >
                  ثبت‌نام مجدد یا تعریف فروشگاه
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer info badge */}
        <div className="bg-slate-950/40 p-4 border-t border-slate-800/60 text-center flex items-center justify-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] text-slate-500 font-extrabold">در صورت هرگونه مشکل آفلاین با پشتیبانی پارس تک ۰۹۳۸۰۰۷۲۰۱۹ تماس بگیرید.</span>
        </div>

      </div>
    </div>
  );
}
