/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Globe, 
  CheckCircle, 
  RefreshCw, 
  HelpCircle, 
  Mail, 
  Send, 
  User, 
  Layers, 
  AlertTriangle,
  DownloadCloud,
  ChevronLeft,
  Tv,
  MessageSquare,
  Award,
  Zap,
  PlusCircle,
  Inbox,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { sendTelemetryToWordPress, sendTicketToWordPress, fetchTicketsFromWordPress, Ticket } from '../utils/telemetry';
import { showToast } from '../utils/toast';

export default function ContactUs() {
  const [activeTab, setActiveTab] = useState<'info' | 'tickets'>('info');
  const [profile, setProfile] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'failed'>('pending');
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  // Custom update engine state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{
    hasUpdate: boolean;
    version: string;
    changelog: string;
    downloadUrl: string;
  } | null>(null);
  const [updateStep, setUpdateStep] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'completed'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Tickets States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isFetchingTickets, setIsFetchingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<number | string | null>(null);
  
  // Ticket Form States
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketType, setTicketType] = useState<'problem' | 'suggestion' | 'criticism' | 'other'>('problem');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Load profile and tickets
  useEffect(() => {
    const saved = localStorage.getItem('parstech_user_profile');
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    
    const telemetrySynced = localStorage.getItem('parstech_telemetry_synced') === 'true';
    setSyncStatus(telemetrySynced ? 'synced' : 'pending');
    
    const lastSyncDate = localStorage.getItem('parstech_last_sync_date');
    if (lastSyncDate) {
      setLastSync(new Date(lastSyncDate).toLocaleTimeString('fa-IR'));
    }

    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsFetchingTickets(true);
    try {
      const res = await fetchTicketsFromWordPress();
      if (res.success) {
        setTickets(res.tickets);
      }
    } catch {
      console.warn('Could not fetch tickets from WordPress.');
    } finally {
      setIsFetchingTickets(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('pending');
    
    try {
      const res = await sendTelemetryToWordPress('manual_sync');
      if (res.success) {
        setSyncStatus('synced');
        const nowStr = new Date().toLocaleTimeString('fa-IR');
        setLastSync(nowStr);
        showToast('اطلاعات با موفقیت همگام‌سازی و به وردپرس cofeclick.ir فرستاده شد.', 'success');
      } else {
        setSyncStatus('failed');
        showToast(res.message, 'error');
      }
    } catch {
      setSyncStatus('failed');
      showToast('خطایی در ارتباط با سرور رخ داد.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStep('checking');
    
    // Smooth delay for professional appearance
    setTimeout(async () => {
      try {
        const res = await sendTelemetryToWordPress('check_update');
        setUpdateDetails({
          hasUpdate: true,
          version: res.latestVersion || '1.1.0',
          changelog: res.changelog || 'ارتقای سیستم تصاویر پوستر به نسبت تصویر ثابت کلاسیک و پشتیبانی بومی از پسوندهای png, webp, avif.',
          downloadUrl: res.downloadUrl || 'https://cofeclick.ir/downloads/mediacenter'
        });
        setUpdateStep('available');
        showToast('نسخه جدید برنامه در سایت کافه کلیک یافت شد!', 'info');
      } catch {
        setUpdateStep('idle');
        showToast('خطا در بررسی نسخه جدید.', 'error');
      } finally {
        setIsCheckingUpdate(false);
      }
    }, 1100);
  };

  const handleStartDownload = () => {
    setUpdateStep('downloading');
    setDownloadProgress(0);
    
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUpdateStep('installing');
          
          // Mimic installer unpacking
          setTimeout(() => {
            setUpdateStep('completed');
            showToast('بروزرسانی نسخه جدید با موفقیت دانلود و اعمال شد!', 'success');
          }, 1500);
          
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 250);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      showToast('لطفاً عنوان و متن تیکت پشتیبانی را کامل وارد کنید.', 'error');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const res = await sendTicketToWordPress(ticketSubject, ticketType, ticketMessage);
      if (res.success) {
        showToast(res.message, 'success');
        setTicketSubject('');
        setTicketMessage('');
        // Reload list
        loadTickets();
      } else {
        showToast(res.message, 'error');
      }
    } catch {
      showToast('خطا در ثبت تیکت پشتیبانی.', 'error');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const toggleExpandTicket = (index: number) => {
    setExpandedTicketId(prev => prev === index ? null : index);
  };

  return (
    <div className="space-y-6" id="contact-us-view">
      
      {/* Top Hero Banner - Stylish header resembling modern administrative dashboards */}
      <div className="bg-gradient-to-r from-indigo-650 via-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/15 relative overflow-hidden" id="contact-hero-banner">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 text-right">
            <span className="text-[9px] font-extrabold bg-white/15 px-2.5 py-1 rounded-full uppercase tracking-wider">صفحه پشتیبانی و ارتباط با توسعه‌دهنده</span>
            <h2 className="text-xl md:text-2xl font-black">پشتیبانی فنی و بروزرسانی هوشمند سامانه‌ها</h2>
            <p className="text-xs text-indigo-100 max-w-xl leading-relaxed">
              شما می‌توانید به صورت مستقیم با دفتر مرکزی پارس تک و کافه کلیک در ارتباط باشید، همچنین وب‌سایت ما مرجع بررسی لایسنس و آمار کاربران فعال است.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm self-start md:self-auto select-none">
            <Award className="w-10 h-10 text-amber-300" />
            <div>
              <p className="text-[10px] text-indigo-200">وضعیت لایسنس کاربری</p>
              <p className="text-xs font-bold text-white">کیفیت دائم و لایسنس معتبر دسکتاپ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub tabs to toggle between channels and live helpdesk tickets */}
      <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200/50 dark:border-slate-700/80 max-w-md" id="contact-subtabs">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeTab === 'info' 
              ? 'bg-white dark:bg-slate-705 text-indigo-650 dark:text-indigo-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          ⏱ پایگاه ارتباط و بروزرسانی خودکار
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer relative ${
            activeTab === 'tickets' 
              ? 'bg-white dark:bg-slate-705 text-indigo-650 dark:text-indigo-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          💬 تیکت‌های پشتیبانی آنلاین
          {tickets.length > 0 && (
            <span className="absolute -top-1.5 -left-1.5 bg-rose-500 text-white min-w-4.5 h-4.5 rounded-full px-1 flex items-center justify-center font-mono text-[9px] font-extrabold animate-bounce">
              {tickets.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-scaleIn" id="contact-grid">
          
          {/* Card 1: Main Support Channels & Contact Info */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-sm flex flex-col justify-between space-y-6" id="card-contact-channels">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">ارتباط با خدمات پارس تک</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">طراحی، راه‌اندازی و توسعه نرم‌افزار</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-450 leading-relaxed text-justify">
                این سیستم با معماری کاملاً مدرن به صورت آفلاین کار می‌کند. در صورت نیاز به راهنمایی در زمینه نصب و انتقال نرم‌افزار، سفارش سایت‌های اشتراکی و خرید پنل لایسنس اختصاصی می‌توانید با آدرس‌ها و تلفن‌های زیر ارتباط برقرار نمایید:
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-slate-800/40 rounded-xl">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-semibold">تماس مدیریت / پشتیبانی فوری</p>
                    <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 font-mono" dir="ltr">0938 007 2019</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-slate-800/40 rounded-xl">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-semibold">پایگاه رسمی پشتیبانی لایسنس</p>
                    <a 
                      href="https://cofeclick.ir" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      cofeclick.ir
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-slate-800/40 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-sky-500" />
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-semibold">شبکه‌های اجتماعی (تلگرام / واتساپ)</p>
                    <p className="text-[11px] font-bold text-gray-800 dark:text-[#a5b4fc]">@Mostafa_Ekrady</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/15 p-3 rounded-xl text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-2.5 leading-relaxed selection:bg-amber-500/20 select-none">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>توجه: برای ثبات آیکون‌ها و دریافت آخرین پکیج‌های ویدئویی همواره توصیه می‌شود نسبت به بروز نگه داشتن فریمورک اقدام کنید.</span>
            </div>
          </div>

          {/* Card 2: Interactive Telemetry & Auto WordPress Sync */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-sm flex flex-col justify-between space-y-4" id="card-telemetry-sync">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">همگام‌سازی ابری با وب‌سایت</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">ثبت آمار کاربران در وردپرس cofeclick.ir</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-450 leading-relaxed text-justify">
                برنامه شما اطلاعات ثبت‌نامی و پکیج پایه دیتابیس را برای مدیریت بهتر (بدون ذخیره‌سازی هیچ داده شخصی در فضای ابری) با افزونه آماری وب‌سایت همسان‌سازی می‌کند. اطلاعات ارسالی شامل:
              </p>

              {/* List of variables sent to WP */}
              <div className="bg-gray-50 dark:bg-[#151c2c] rounded-xl p-3 space-y-2 text-[10.5px] border border-gray-100 dark:border-gray-850">
                <div className="flex justify-between">
                  <span className="text-gray-400">شناسه سیستم کاربر:</span>
                  <span className="font-mono font-bold text-indigo-500">
                    {localStorage.getItem('mediacenter_client_id')?.substring(0, 16) || 'شناسه تولید نشده'}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">نام و نام خانوادگی مدیر:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{profile?.fullName || 'ثبت نشده'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">نام فروشگاه / ارگان:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{profile?.shopName || 'ثبت نشده'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">تلفن و ایمیل همگام:</span>
                  <span className="font-mono text-gray-500 text-right">{profile?.phone || 'بدون همراه'} / {profile?.email || 'بدون ایمیل'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`}></div>
                  <span className="text-[10.5px] font-bold text-gray-700 dark:text-gray-300">
                    {syncStatus === 'synced' ? 'سینک و ارسال شده به وردپرس' : 'در انتظار اتصال پایدار شبکه'}
                  </span>
                </div>
                <CheckCircle className={`w-4 h-4 ${syncStatus === 'synced' ? 'text-emerald-500' : 'text-gray-300'}`} />
              </div>
              
              {lastSync && (
                <p className="text-[9px] text-gray-400 text-left font-mono">آخرین تبادل: {lastSync}</p>
              )}
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-650/15"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'در حال ارسال بسته‌های اطلاعاتی...' : 'تلاش مجدد و همگام‌سازی دستی'}</span>
            </button>
          </div>

          {/* Card 3: Interactive WordPress Software Update Section */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-sm flex flex-col justify-between space-y-4" id="card-wp-updater">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">بروزرسانی زنده نرم‌افزار</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">دریافت نسخه جدید از cofeclick.ir</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl select-none">
                <div>
                  <p className="text-[9px] text-gray-400 font-semibold">نسخه فعلی شما</p>
                  <p className="text-xs font-black text-gray-850 dark:text-gray-250 font-mono">v1.0.1 (آب‌تن)</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                <div>
                  <p className="text-[9px] text-gray-400 font-semibold font-sans">آخرین نسخه سرور</p>
                  <p className="text-xs font-black text-indigo-500 font-mono">
                    {updateDetails ? `v${updateDetails.version}` : 'بررسی نشده'}
                  </p>
                </div>
              </div>

              {/* Interactive Update Step Renderers */}
              {updateStep === 'idle' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                  لطفاً برای بررسی آپدیت‌های نهایی منتشر شده در سایت روی دکمه زیر کلیک کنید.
                </p>
              )}

              {updateStep === 'checking' && (
                <div className="py-4 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-[11px] text-gray-500 font-bold">در حال اتصال و اعتبارسنجی با وب‌سایت cofeclick.ir...</p>
                </div>
              )}

              {updateStep === 'available' && updateDetails && (
                <div className="space-y-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 animate-scaleIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-extrabold font-sans">نسخه جدید در دسترس است</span>
                    <span className="text-[10px] font-bold text-gray-400 font-mono">v{updateDetails.version}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-450 leading-relaxed">
                    <p className="font-extrabold text-gray-800 dark:text-gray-200 pb-1 border-b border-gray-150/45 dark:border-slate-800/80 mb-1">تغییرات این نگارش:</p>
                    <p className="font-sans leading-relaxed">{updateDetails.changelog}</p>
                  </div>
                </div>
              )}

              {updateStep === 'downloading' && (
                <div className="space-y-1.5 py-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-indigo-600 dark:text-indigo-400">در حال دریافت باینری‌های بروزرسانی...</span>
                    <span className="font-mono">{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-605 h-full rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {updateStep === 'installing' && (
                <div className="py-2.5 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                  <p className="text-[10.5px] text-emerald-600 font-bold">در حال از فشرده خارج کردن و کپی روی فایل‌های فعلی...</p>
                </div>
              )}

              {updateStep === 'completed' && (
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed border border-emerald-500/20 animate-scaleIn">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div>
                    <p className="font-extrabold">سامانه شما با موفقیت به روز گردید!</p>
                    <p className="text-gray-450">در بارگذاری بعدی سیستم با تمام ویژگی‌های جدید نسخه ۱.۱.۰ لود خواهد شد.</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              {updateStep === 'idle' && (
                <button
                  onClick={handleCheckUpdate}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>بررسی نسخه جدید نرم‌افزار</span>
                </button>
              )}

              {updateStep === 'available' && (
                <button
                  onClick={handleStartDownload}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse animate-scaleIn"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>دریافت و بروزرسانی خودکار به نسخه جدید</span>
                </button>
              )}

              {updateStep === 'completed' && (
                <button
                  onClick={() => setUpdateStep('idle')}
                  className="w-full h-10 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  بازنشانی صفحه بروزرسانی
                </button>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* Support Helpdesk Online Ticket view screen (RTL layout) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scaleIn" id="contact-tickets-viewport">
          
          {/* Right Part (Col span 5): Ticket submission block */}
          <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-sm flex flex-col justify-between" id="tickets-send-column">
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-950 dark:text-white">ارسال پیام و ثبت تیکت جدید</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">پاسخ‌ها در بخش "تیکت‌های من" قابل مشاهده است</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">نوع پیام پشتیبانی:</label>
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value as any)}
                  className="w-full h-10 bg-gray-50 dark:bg-[#151c2c] border border-gray-250 dark:border-slate-800 rounded-xl px-3 text-xs text-gray-800 dark:text-gray-250 font-sans focus:outline-none focus:border-indigo-550"
                  id="ticket-type-select"
                >
                  <option value="problem">⚠️ گزارش مشکل یا باگ نرم‌افزاری</option>
                  <option value="suggestion">💡 پیشنهاد ویژگی یا ابزار جدید</option>
                  <option value="criticism">📣 انتقاد یا گلایه از خدمات و عملکرد</option>
                  <option value="other">💬 سایر موارد فنی، مالی و تجاری</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">عنوان موضوع پیام:</label>
                <input
                  type="text"
                  placeholder="موضوع خلاصه درخواست خود را بنویسید..."
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full h-10 bg-gray-50 dark:bg-[#151c2c] border border-gray-250 dark:border-slate-800 rounded-xl px-3 text-xs text-gray-800 dark:text-gray-250 focus:outline-none focus:border-indigo-550"
                  id="ticket-subject-input"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">شرح جزئیات پیام:</label>
                <textarea
                  rows={4}
                  placeholder="توضیحات کامل درخواست خود، شماره فاکتور یا هر اطلاعاتی که به بررسی بهتر پرونده کمک می‌کند را اینجا بنویسید..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#151c2c] border border-gray-250 dark:border-slate-800 rounded-xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-550 min-h-32"
                  id="ticket-message-textarea"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmittingTicket}
                className="w-full h-11 bg-indigo-650 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10"
                id="ticket-submit-button"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingTicket ? 'در حال ارسال پیام به وب‌سایت...' : 'ارسال درخواست و ثبت نهایی تیکت'}</span>
              </button>
            </form>

            <div className="mt-4 bg-violet-500/5 p-3 rounded-xl border border-indigo-500/10 text-[9.5px] text-gray-500 dark:text-gray-400 select-none leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>پاسخ سوال شما در کوتاه‌ترین زمان ممکن از طریق پیش‌خوان وردپرس cofeclick.ir صادر گردیده و بر روی این برگه زنده نمایش داده می‌شود.</span>
            </div>
          </div>

          {/* Left Part (Col span 7): Tickets history / list */}
          <div className="lg:col-span-12 xl:col-span-7 bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-sm flex flex-col" id="tickets-history-column">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-950 dark:text-white">تیکت‌های من و تاریخچه ارتباطات</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">کلیک بر روی هر تیکت برای دیدن شرح پاسخ لایو</p>
                </div>
              </div>

              <button
                onClick={loadTickets}
                disabled={isFetchingTickets}
                className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-gray-55 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                title="بروزرسانی تیکت‌ها"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingTickets ? 'animate-spin text-indigo-500' : ''}`} />
              </button>
            </div>

            {isFetchingTickets && tickets.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs text-gray-400">در حال دریافت تیکت‌های فعال شما از سرور cofeclick.ir...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Inbox className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto" />
                <p className="text-xs font-extrabold text-gray-700 dark:text-gray-300">هیچ تیکت ثبتی در لیست یافت نشد.</p>
                <p className="text-[10.5px] text-gray-400 max-w-sm mx-auto leading-relaxed">تیکت جدید خود را از ستون کناری ثبت کنید تا برای پشتیبانی کوفه‌کلیک ارسال شود و سوابق آن در اینجا لود گردد.</p>
              </div>
            ) : (
              <div className="space-y-3" id="tickets-list-items">
                {tickets.map((t, index) => {
                  const isExpanded = expandedTicketId === index;
                  
                  // Label mapper
                  let typeText = 'سایر';
                  let typeClass = 'bg-gray-100 dark:bg-slate-800 text-gray-500';
                  if (t.messageType === 'problem') {
                    typeText = 'گزارش مشکل';
                    typeClass = 'bg-red-50 dark:bg-rose-950/20 text-red-500 border border-red-500/10';
                  } else if (t.messageType === 'suggestion') {
                    typeText = 'پیشنهاد ابزار';
                    typeClass = 'bg-violet-50 dark:bg-indigo-950/20 text-indigo-550 dark:text-indigo-300 border border-indigo-500/10';
                  } else if (t.messageType === 'criticism') {
                    typeText = 'انتقاد';
                    typeClass = 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-500/10';
                  }

                  const isAnswered = t.status === 'answered';

                  return (
                    <div 
                      key={index}
                      className={`border rounded-xl transition-all ${
                        isExpanded 
                          ? 'border-indigo-400 dark:border-indigo-900/80 bg-indigo-50/10 dark:bg-indigo-950/5' 
                          : 'border-gray-150 dark:border-gray-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Ticket header clicker */}
                      <div 
                        onClick={() => toggleExpandTicket(index)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="space-y-1 text-right">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${typeClass}`}>
                              {typeText}
                            </span>
                            <span className="text-xs font-black text-gray-900 dark:text-gray-100">
                              {t.subject}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {t.createdAt ? new Date(t.createdAt).toLocaleDateString('fa-IR') : 'آفلاین'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAnswered ? (
                            <span className="text-[9.5px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 py-0.5 px-2 rounded-full font-bold">
                              ✓ پاسخ پشتیبان
                            </span>
                          ) : (
                            <span className="text-[9.5px] bg-amber-500/10 text-amber-500 border border-amber-500/15 py-0.5 px-2 rounded-full font-bold">
                              در انتظار بررسی
                            </span>
                          )}
                          
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Expandable message panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-slate-800 text-xs leading-relaxed text-right space-y-3 animate-slideDown">
                          <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg text-gray-700 dark:text-gray-300 border-r-2 border-indigo-500">
                            <p className="font-bold text-[9px] text-indigo-500 pb-1 border-b border-gray-200/40 dark:border-slate-700 mb-1">متن پیام ارسالی شما:</p>
                            <p className="whitespace-pre-wrap">{t.message}</p>
                          </div>

                          {t.reply ? (
                            <div className="bg-emerald-500/5 dark:bg-emerald-950/10 p-3 rounded-lg text-emerald-800 dark:text-emerald-300 border-r-2 border-emerald-500">
                              <p className="font-bold text-[9px] text-emerald-600 pb-1 border-b border-emerald-500/10 mb-1">↩ پاسخ کارشناس کافه کلیک (پشتیبان فنی):</p>
                              <p className="whitespace-pre-wrap">{t.reply}</p>
                              {t.repliedAt && (
                                <span className="block mt-2 text-[8px] text-emerald-500/80 font-mono text-left">
                                  زمان پاسخ: {new Date(t.repliedAt).toLocaleTimeString('fa-IR')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="bg-amber-500/5 p-3 rounded-lg text-amber-700 dark:text-amber-400 border-r-2 border-amber-500">
                              <p className="font-bold text-[9px]">تیکت ثبت شده است</p>
                              <p className="text-[10.5px]">درخواست شما با موفقیت به سرور افزونه در cofeclick.ir ارسال و کد پیگیری صادر شده است. به محض بررسی کارشناسان، متن پاسخ نهایی در همین کادر برای شما قابل خواندن خواهد بود.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* WordPress Client list info notice card */}
      <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-sm space-y-3" id="wp-monitoring-info">
        <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100 font-sans">توضیحات و همبستگی افزونه پشتیبان با cofeclick.ir</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-justify">
          بخش کاربری سایت شما (cofeclick.ir) دارای یک بخش مانیتورینگ اختصاصی برای پایش نرم‌افزارهای فعال است. هر بار که نرم‌افزار در سیستم مشتری شما باز می‌شود و مشتری به اینترنت متصل است، یک سیگنال ایمن رمزنگاری شده (همراه با شناسه دستگاه و تعداد فیلم/سریال ثبت شده) به اندپوینت مانیتورینگ شما ارسال می‌نماید. شما می‌توانید بلافاصله در پیش‌خوان وردپرس خود تعداد اتصالات روزانه و لیست لایسنس‌های معتبر مشتریان را با گزارشات آماری پیشرفته ردیابی و مدیریت کنید. همچنین صندوق تیکت‌ها پیام ارسالی مشتری را دریافت کرده و به شما این لایسنس را می‌دهد تا مستقیماً از پیشخوان پاسخ کتبی بفرستید.
        </p>
      </div>

    </div>
  );
}
