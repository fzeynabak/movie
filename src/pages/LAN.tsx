/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Server, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  HardDrive, 
  Search, 
  Check, 
  Loader2, 
  Activity,
  Terminal,
  Trash2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toPersianNums } from './Dashboard';
import { showToast } from '../utils/toast';
import { dbService } from '../db/databaseService';

export default function LANSharingPage() {
  // My network states
  const [myIps, setMyIps] = useState<string[]>([]);
  const [selectedMyIp, setSelectedMyIp] = useState<string>('');
  
  // Peer states
  const [peerIp, setPeerIp] = useState<string>(() => localStorage.getItem('mediacenter_lan_peer_ip') || '');
  const [isPeerConnected, setIsPeerConnected] = useState<boolean>(false);
  const [peerHostname, setPeerHostname] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Radar scanning and Auto-Discovery states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanCurrentIp, setScanCurrentIp] = useState<string>('');
  const [discoveredPeers, setDiscoveredPeers] = useState<Array<{ ip: string; hostname: string }>>([]);

  // Detailed Connection and Diagnostic logs state
  const [logMessages, setLogMessages] = useState<Array<{ time: string; type: 'info' | 'success' | 'warn' | 'error'; msg: string }>>([
    { time: new Date().toLocaleTimeString('fa-IR'), type: 'info', msg: 'سیستم عیب‌یابی شبکه محلی با موفقیت راه‌اندازی شد.' }
  ]);

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setLogMessages(prev => [
      { time: new Date().toLocaleTimeString('fa-IR'), type, msg },
      ...prev
    ].slice(0, 50));
  };
  
  // Peer catalog data
  const [peerMovies, setPeerMovies] = useState<any[]>([]);
  const [peerSeries, setPeerSeries] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [peerTab, setPeerTab] = useState<'movies' | 'series'>('movies');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);

  useEffect(() => {
    // 1. Get my local IPs
    if (window.electronAPI && window.electronAPI.getLocalIps) {
      window.electronAPI.getLocalIps().then((ips: string[]) => {
        setMyIps(ips);
        if (ips.length > 0) {
          setSelectedMyIp(ips[0]);
        }
      });
    } else {
      // Simulate/mock browser env
      setMyIps(['192.168.1.50', '10.0.0.12']);
      setSelectedMyIp('192.168.1.50');
    }

    // Auto test connection if peerIp was saved
    if (peerIp) {
      handleTestConnection(peerIp);
    }
  }, []);

  // Save Peer IP to localStorage when changed
  const savePeerIp = (ip: string) => {
    setPeerIp(ip);
    localStorage.setItem('mediacenter_lan_peer_ip', ip);
  };

  const handleTestConnection = async (ipToTest: string) => {
    if (!ipToTest) return;
    setIsConnecting(true);
    setIsPeerConnected(false);
    
    const formattedIp = ipToTest.trim().replace(/^http:\/\/|https:\/\//g, '').split(':')[0];
    const testUrl = `http://${formattedIp}:3300/api/lan/status`;

    addLog(`در حال تلاش برای بررسی وضعیت اتصال شبکه با سیستم همکار (${formattedIp}:3300)...`, 'info');

    try {
      let data: any;
      if (window.electronAPI && window.electronAPI.fetchUrlData) {
        // Native CORS bypass fetch through Electron main
        addLog(`استفاده از مفسر فرعی سیستم دسکتاپ برای عبور ایمن از CORS به آدرس: ${testUrl}`, 'info');
        const res = await window.electronAPI.fetchUrlData(testUrl);
        if (res && res.success) {
          data = JSON.parse(res.data);
        } else {
          throw new Error(res ? res.error : 'فراخوانی سرویس شبکه محلی با خطا مواجه شد.');
        }
      } else {
        // Browser Fetch
        addLog(`استفاده از پروتکل پیش‌فرض مرورگر وب...`, 'info');
        const response = await fetch(testUrl, { mode: 'cors' });
        data = await response.json();
      }

      if (data && data.success) {
        setIsPeerConnected(true);
        setPeerHostname(data.hostname || 'سیستم همکار');
        addLog(`اتصال موفقیت‌آمیز برقرار شد! نام هاست همکار: "${data.hostname}"`, 'success');
        showToast(`با موفقیت به سیستم همکار (${data.hostname}) متصل شدید!`, 'success');
        // Fetch Catalog
        fetchPeerCatalog(formattedIp);
      } else {
        throw new Error('سیستم در شبکه متصل است اما پاسخ استانداردِ نرم‌افزاری بازنگرداند.');
      }
    } catch (err: any) {
      console.warn('LAN peer connection check failed', err);
      setIsPeerConnected(false);
      setPeerHostname('');
      
      const errMsg = err.message || '';
      addLog(`خطای اتصال شبکه: عدم پاسخ‌دهی از سیستم همکار در محدوده آی‌پی ${formattedIp}`, 'error');
      addLog(`جزئیات خطا: ${errMsg}`, 'error');
      addLog(`⚠️ دستورالعمل حل مشکل مپ‌سنتر:`, 'warn');
      addLog(`۱. مطمئن شوید هر دو رایانه به یک مودم یا سوییچ مشترک وصل هستند و آی‌پی هم‌رنج دارند.`, 'warn');
      addLog(`۲. در ویندوز حتما روی وضعیت شبکه کلیک کرده و Network Profile را از Public به Private (خصوصی) تغییر دهید تا فایروال محلی ویندوز دسترسی شبکه محلی برنامه را مسدود نکند.`, 'warn');
      addLog(`۳. برنامه را روی هر دو سیستم ببنید و باز کنید تا مطمئن شوید پورت ۳۳۰۰ آزاد و آماده است.`, 'warn');
      
      showToast('خطا در اتصال شبکه با همکار. بخش "لاگ نظارت و عیب‌یابی شبکه" را در پایین بررسی کنید.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncDatabaseWithPeer = (moviesToSync = peerMovies, seriesToSync = peerSeries) => {
    if (!peerIp) {
      showToast('لطفاً ابتدا آی‌پی همکار را وارد کنید.', 'error');
      return;
    }
    try {
      const formattedIp = peerIp.trim().replace(/^http:\/\/|https:\/\//g, '').split(':')[0];
      addLog(`در حال تلاش برای همگام‌سازی و ادغام دیتابیس با همکار (${formattedIp})...`, 'info');
      dbService.importPeerMedia(formattedIp, moviesToSync, seriesToSync);
      addLog(`دیتابیس سیستم محلی شما با موفقیت بروز شد! تعداد ${moviesToSync.length} فیلم و ${seriesToSync.length} سریال ادغام شدند.`, 'success');
      showToast(`همگام‌سازی موفقیت‌آمیز بود! تعداد ${toPersianNums(moviesToSync.length)} فیلم و ${toPersianNums(seriesToSync.length)} سریال از همکار دریافت شد.`, 'success');
    } catch (err: any) {
      console.error(err);
      addLog(`خطا در همگام‌سازی و نوشتن اطلاعات روی پایگاه‌داده محلی: ${err.message}`, 'error');
      showToast('خطا در همگام‌سازی دیتابیس با همکار', 'error');
    }
  };

  const fetchPeerCatalog = async (ipToFetch: string) => {
    setIsLoadingCatalog(true);
    const catalogUrl = `http://${ipToFetch}:3300/api/lan/catalog`;
    addLog(`در حال تلاش برای بارگیری کاتالوگ فیلم‌ها و سریال‌های همکار از مسیر ${catalogUrl}...`, 'info');
    
    try {
      let data: any;
      if (window.electronAPI && window.electronAPI.fetchUrlData) {
        const res = await window.electronAPI.fetchUrlData(catalogUrl);
        if (res && res.success) {
          data = JSON.parse(res.data);
        } else {
          throw new Error(res ? res.error : 'خطا در بارگیری کاتالوگ');
        }
      } else {
        const response = await fetch(catalogUrl);
        data = await response.json();
      }

      if (data && data.success) {
        let movies = data.movies || [];
        let series = data.series || [];
        
        // Rewrite poster paths and inject peer details
        movies = movies.map((m: any) => {
          let rewrittenPoster = m.poster;
          if (rewrittenPoster && !rewrittenPoster.startsWith('http://') && !rewrittenPoster.startsWith('https://') && !rewrittenPoster.startsWith('data:')) {
            rewrittenPoster = `http://${ipToFetch}:3300/api/lan/poster?path=${encodeURIComponent(m.poster)}`;
          }
          return { ...m, poster: rewrittenPoster, originPeerIp: ipToFetch, isPeerMedia: true };
        });

        series = series.map((s: any) => {
          let rewrittenPoster = s.poster;
          if (rewrittenPoster && !rewrittenPoster.startsWith('http://') && !rewrittenPoster.startsWith('https://') && !rewrittenPoster.startsWith('data:')) {
            rewrittenPoster = `http://${ipToFetch}:3300/api/lan/poster?path=${encodeURIComponent(s.poster)}`;
          }
          return { ...s, poster: rewrittenPoster, originPeerIp: ipToFetch, isPeerMedia: true };
        });

        setPeerMovies(movies);
        setPeerSeries(series);
        addLog(`مجموعه اطلاعات دریافت شد: تعداد ${movies.length} فیلم و ${series.length} سریال کشف شدند.`, 'success');
        
        // Automatically import colleague media into the local database
        addLog(`در حال ادغام خودکار کاتالوگ همکار به دیتابیس محلی این سیستم جهت جستجوی منسجم...`, 'info');
        dbService.importPeerMedia(ipToFetch, movies, series);
        addLog(`ادغام خودکار با موفقیت به پایان رسید. پورت فعال: 3300`, 'success');
        showToast(`دیتابیس همکار با موفقیت همگام‌سازی شد! (${toPersianNums(movies.length)} فیلم و ${toPersianNums(series.length)} سریال)`, 'success');
      }
    } catch (err: any) {
      console.error('Failed to load peer catalog', err);
      addLog(`خطا در بارگیری کاتالوگ همکار: ${err.message}`, 'error');
      showToast('خطا در بارگیری کاتالوگ فیلم‌ها و سریال‌های سیستم همکار.', 'error');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Radary network scanner for auto-discovery
  const startNetworkAutoScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setDiscoveredPeers([]);
    addLog('🔍 آغاز فرآیند اسکن راداریِ شبکه محلی (Auto-Discovery) برای یافتن رایانه‌های مپ‌سنتر فعال...', 'info');

    const subnetsToScan: string[] = [];
    const ipList = myIps.length > 0 ? myIps : ['192.168.1.1', '192.168.100.1'];
    
    // Extract base subnet prefixes
    for (const myIp of ipList) {
      const parts = myIp.split('.');
      if (parts.length === 4) {
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.`;
        if (!subnetsToScan.includes(subnet)) {
          subnetsToScan.push(subnet);
        }
      }
    }

    if (subnetsToScan.length === 0) {
      addLog('کارت شبکه محلی موقتاً یافت نشد. به عنوان فرض رنج‌های ۱۹۲.۱۶۸.۱.X و ۱۹۲.۱۶۸.۱۰۰.X اسکن می‌شوند.', 'warn');
      subnetsToScan.push('192.168.1.');
      subnetsToScan.push('192.168.100.');
    }

    // Generate scan targets (ranges 1 to 254)
    const targets: string[] = [];
    for (const sub of subnetsToScan) {
      for (let i = 1; i <= 254; i++) {
        targets.push(sub + i);
      }
    }

    addLog(`محدوده جستجو: ردیابی ${targets.length} آدرس IP فرضی روی پورت اشتراک‌گذاری دیتابیس ۳۳۰۰...`, 'info');

    // Run parallel scanning using chunk size 25 nodes to ensure smooth execution
    const batchSize = 25;
    let foundCount = 0;
    const totalTargets = targets.length;

    for (let index = 0; index < totalTargets; index += batchSize) {
      if (!isScanning) break; // support cancel if needed

      const currentBatch = targets.slice(index, index + batchSize);
      setScanCurrentIp(currentBatch[currentBatch.length - 1]);
      setScanProgress(Math.round((index / totalTargets) * 100));

      const scanPromises = currentBatch.map(async (ip) => {
        // Skip scanning self to keep logs clean
        if (myIps.includes(ip)) return;

        const checkUrl = `http://${ip}:3300/api/lan/status`;
        try {
          let data: any = null;
          if (window.electronAPI && window.electronAPI.fetchUrlData) {
            // pass custom very low timeout (1000ms) for fast peer scanning
            const res = await window.electronAPI.fetchUrlData(checkUrl, { timeout: 1000 });
            if (res && res.success) {
              data = JSON.parse(res.data);
            }
          } else {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1000);
            const response = await fetch(checkUrl, { signal: controller.signal });
            clearTimeout(timer);
            data = await response.json();
          }

          if (data && data.success) {
            foundCount++;
            const peerInfo = { ip, hostname: data.hostname || 'سیستم همکار' };
            setDiscoveredPeers(prev => {
              if (prev.some(p => p.ip === ip)) return prev;
              return [...prev, peerInfo];
            });
            addLog(`🚀 [کشف خودکار] یک همکار فعال در شبکه پیدا شد: آی‌پی ${ip} (${data.hostname})`, 'success');
          }
        } catch (e) {
          // Ignore scanning failures for single IPs
        }
      });

      await Promise.all(scanPromises);
    }

    setIsScanning(false);
    setScanProgress(100);
    if (foundCount > 0) {
      addLog(`✨ ردیابی پایان یافت! تعداد ${foundCount} سیستم مپ‌سنتر فعال در شبکه محلی شناسایی شد.`, 'success');
      showToast(`تعداد ${toPersianNums(foundCount)} همکار فعال در شبکه برای اتصال سریع پیدا شد.`, 'success');
    } else {
      addLog(`پیشنهاد: آرشیو همکار را دستی بررسی کنید یا فایروال را به حالت Private (خصوصی) تغییر دهید.`, 'info');
      showToast('رادار اتوماتیک مپ‌سنتری در شبکه پیدا نکرد. شبکه مقابل را دستی چک کنید.', 'info');
    }
  };

  // Filter movies and series based on catalogSearch query
  const filteredMovies = peerMovies.filter(movie => {
    if (!catalogSearch) return true;
    const searchLower = catalogSearch.toLowerCase();
    return (
      (movie.titleFa && movie.titleFa.toLowerCase().includes(searchLower)) ||
      (movie.titleEn && movie.titleEn.toLowerCase().includes(searchLower)) ||
      (movie.genre && movie.genre.toLowerCase().includes(searchLower)) ||
      (movie.director && movie.director.toLowerCase().includes(searchLower))
    );
  });

  const filteredSeries = peerSeries.filter(series => {
    if (!catalogSearch) return true;
    const searchLower = catalogSearch.toLowerCase();
    return (
      (series.titleFa && series.titleFa.toLowerCase().includes(searchLower)) ||
      (series.titleEn && series.titleEn.toLowerCase().includes(searchLower)) ||
      (series.genre && series.genre.toLowerCase().includes(searchLower)) ||
      (series.director && series.director.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6" id="lan-tab-content">
      
      {/* Tab Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-150 dark:border-gray-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Network className="w-5.5 h-5.5 text-indigo-600" />
            <span>همگام‌سازی و جستجوی شبکه محلی (LAN)</span>
          </h2>
          <p className="text-xs text-gray-550 dark:text-gray-400 mt-1">
            جستجوی رایانه‌های همکار فعال در شبکه محلی و همگام‌سازی و بروزرسانی خودکار لیست فیلم‌ها و سریال‌ها بدون امکان کپی فایل
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LAN Connection Controls (Left 4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Box 1: My configuration */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-105 dark:border-gray-800/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Server className="w-4.5 h-4.5 animate-pulse" />
              <h3 className="text-xs font-black">وضعیت سرور محلی من</h3>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
              این سیستم در پورت <code className="font-mono text-indigo-505 dark:text-indigo-400">3300</code> برای دریافت کاتالوگ و انتقال فایل توسط سیستم‌های همکار مهیا و روشن است.
            </p>

            <div className="p-3 bg-indigo-50/40 dark:bg-slate-900 border border-indigo-50/85 dark:border-gray-850 rounded-xl space-y-2">
              <span className="text-[9px] text-gray-400 font-extrabold block">آدرس IP محلی شما:</span>
              {myIps.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={selectedMyIp}
                    onChange={(e) => setSelectedMyIp(e.target.value)}
                    className="w-full text-xs font-bold bg-white dark:bg-slate-950 px-2 py-1.5 border border-indigo-100 dark:border-slate-800 text-indigo-650 dark:text-indigo-400 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    {myIps.map((ip) => (
                      <option key={ip} value={ip}>{ip}</option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9.5px] font-bold text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      سرویس LAN فعال
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`http://${selectedMyIp}:3300/api/lan/catalog`);
                        showToast('آدرس منبع شبکه کپی شد!');
                      }}
                      className="text-[9px] text-indigo-600 hover:underline font-bold"
                    >
                      کپی آدرس من برای همکار
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-yellow-500 font-extrabold">در حال شناسایی کارت شبکه...</p>
              )}
            </div>
          </div>

          {/* Box 2: Connect to colleague */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-105 dark:border-gray-800/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Wifi className="w-4.5 h-4.5" />
              <h3 className="text-xs font-black">اتصال به سیستمِ همکار</h3>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
              آدرس IP رایانه همکارتان که در یک مودم مشترک و متصل است را در زیر وارد کنید تا دایرکتوری و آرشیو او را ببینید.
            </p>

            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="مثال: 192.168.1.10"
                value={peerIp}
                onChange={(e) => savePeerIp(e.target.value)}
                className="w-full text-center h-10 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 font-mono"
                dir="ltr"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleTestConnection(peerIp)}
                  disabled={isConnecting || !peerIp}
                  className="flex-1 h-9.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال همگام‌سازی...</span>
                    </>
                  ) : (
                    <span>اتصال و دریافت دیتابیس</span>
                  )}
                </button>

                {isPeerConnected && (
                  <button
                    onClick={() => fetchPeerCatalog(peerIp)}
                    className="px-3 bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-extrabold"
                    title="بروزرسانی داده‌های همکار"
                  >
                    بروزرسانی لیست
                  </button>
                )}
              </div>

              {/* Connection Status Indicator Line */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800/80">
                {isPeerConnected ? (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold block">متصل به: {peerHostname}</span>
                      <span className="text-[9px] text-gray-4s0 truncate block font-mono" dir="ltr">{peerIp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 bg-red-550/5 rounded-xl border border-red-500/10">
                    <XCircle className="w-4.5 h-4.5 text-red-500" />
                    <div>
                      <span className="text-[10px] text-red-650 dark:text-red-400 font-extrabold block">غیرمتصل به سیستم همکار</span>
                      <span className="text-[9px] text-gray-400 font-medium">لطفاً مطمئن شوید رایانه همکار روشن و برنامه باز است.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Box 4: Radar Auto-Scan (Discovery like Zapya/SHAREit) */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-105 dark:border-gray-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                <Activity className={`w-4.5 h-4.5 ${isScanning ? 'animate-bounce text-emerald-500' : ''}`} />
                <h3 className="text-xs font-black">جستجوی خودکارِ همکار (راداری)</h3>
              </div>
              {isScanning && (
                <span className="text-[8.5px] font-bold text-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 rounded animate-pulse">
                  در حال اسکن...
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
              بدون نیاز به نوشتن دستی، مودم و سوییچ محلی شما را به طور هوشمند کاوش می‌کند تا برنامه‌های همکار باز را ردیابی کند.
            </p>

            {isScanning && (
              <div className="space-y-2 p-3 bg-indigo-50/20 dark:bg-slate-900 border border-indigo-100/40 rounded-xl">
                <div className="flex justify-between items-center text-[9px] text-gray-450 font-bold">
                  <span>در حال اسکن آدرس: <code className="font-mono text-indigo-600 dark:text-indigo-400">{scanCurrentIp}</code></span>
                  <span className="font-mono">{toPersianNums(scanProgress)}٪</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {discoveredPeers.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold block">✓ سیستم‌های کشف شده و فعال:</span>
                {discoveredPeers.map((peer, pIdx) => (
                  <div 
                    key={pIdx} 
                    className="flex items-center justify-between p-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 border border-emerald-500/20 rounded-xl transition-all"
                  >
                    <div className="min-w-0 pr-1">
                      <span className="text-[10px] text-gray-800 dark:text-gray-100 font-black block truncate">{peer.hostname}</span>
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono" dir="ltr">{peer.ip}</span>
                    </div>
                    <button
                      onClick={() => {
                        savePeerIp(peer.ip);
                        handleTestConnection(peer.ip);
                      }}
                      className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black cursor-pointer shadow-sm transition-all shrink-0 flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>اتصال سریع</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !isScanning && (
                <div className="text-center py-2.5 bg-gray-50 dark:bg-slate-900 border border-dotted border-gray-200 dark:border-gray-800 rounded-xl">
                  <span className="text-[9px] text-gray-400 font-semibold block">هیچ سیستم پیوندی هنوز شناسایی نشده است</span>
                </div>
              )
            )}

            <button
              onClick={startNetworkAutoScan}
              disabled={isScanning}
              className="w-full h-9 bg-gray-950 dark:bg-indigo-600 hover:bg-gray-900 dark:hover:bg-indigo-700 disabled:bg-indigo-400/40 text-white rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال اسکن فرکانسی شبکه...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>اسکن راداری محلی (Auto Discovery)</span>
                </>
              )}
            </button>
          </div>

          {/* Box 5: Live Activity Logs & Diagnostic Console */}
          <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-105 dark:border-gray-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                <Terminal className="w-4.5 h-4.5" />
                <h3 className="text-xs font-black">لاگ نظارت و عیب‌یابی بستر شبکه</h3>
              </div>
              <button
                onClick={() => setLogMessages([{ time: new Date().toLocaleTimeString('fa-IR'), type: 'info', msg: 'صفحه لاگ سیستم پاکسازی شد.' }])}
                className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all font-semibold"
                title="پاک کردن لاگ‌ها"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
              فعالیت‌های شبکه، اتصالات، بسته‌های دانلود شده و هشدارهای فایروال را به صورت زنده دنبال کنید:
            </p>

            <div className="bg-slate-950 text-[10px] font-mono leading-relaxed p-3.5 rounded-xl text-gray-300 h-52 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent border border-slate-900" dir="ltr">
              {logMessages.map((log, lIdx) => (
                <div key={lIdx} className="flex gap-2 text-left justify-start items-start">
                  <span className="text-gray-500 shrink-0 select-none font-bold">[{log.time}]</span>
                  <span className={`break-words ${
                    log.type === 'success' ? 'text-emerald-400 font-semibold' :
                    log.type === 'error' ? 'text-red-400 font-semibold' :
                    log.type === 'warn' ? 'text-amber-400 font-semibold' : 'text-indigo-300'
                  }`} dir={log.msg.match(/[\u0600-\u06FF]/) ? 'rtl' : 'ltr'}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/15 border border-amber-500/20 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <strong className="text-[10px] font-black">نکته کلیدی ویندوز:</strong>
              </div>
              <p className="text-[9px] text-gray-550 dark:text-gray-400 leading-relaxed font-semibold">
                در ویندوز، اگر فایروال دسترسی را مسدود کند، این سیستم‌ها با اینکه در یک مودم هستند همدیگر را نمی‌بینند. کافیست روی نماد شبکه (وای‌فای) در ویندوز کلیک کنید، Properties را بزنید و نوع شبکه را از <strong className="text-gray-700 dark:text-gray-200">Public</strong> به <strong className="text-indigo-600 dark:text-indigo-400">Private</strong> تغییر دهید.
              </p>
            </div>
          </div>
        </div>

        {/* Colleague's catalog browser grid (Right 8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-105 dark:border-gray-800/80 shadow-sm overflow-hidden min-h-[500px]">
          
          {/* Catalog header controls */}
          <div className="p-4 border-b border-gray-150 dark:border-gray-800 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                <HardDrive className="w-4.5 h-4.5 text-gray-400" />
                <strong className="text-xs font-black">کاتالوگ هارد همکار (Lan Storage catalog)</strong>
              </div>

              {/* Sub Tab selector */}
              <div className="flex rounded-lg bg-gray-100 dark:bg-slate-900 border border-gray-150 dark:border-gray-800/80 p-1 scale-95 shrink-0 self-start sm:self-center">
                <button
                  onClick={() => setPeerTab('movies')}
                  className={`px-3 py-1 rounded text-[10px] font-bold ${peerTab === 'movies' ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white shadow-sm' : 'text-gray-450 hover:text-gray-700'}`}
                >
                  فیلم‌های همکار ({toPersianNums(peerMovies.length)})
                </button>
                <button
                  onClick={() => setPeerTab('series')}
                  className={`px-3 py-1 rounded text-[10px] font-bold ${peerTab === 'series' ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white shadow-sm' : 'text-gray-450 hover:text-gray-700'}`}
                >
                  سریال‌های همکار ({toPersianNums(peerSeries.length)})
                </button>
              </div>
            </div>

            {/* Instant Search tool */}
            <div className="relative flex items-center">
              <Search className="absolute right-3.5 w-4 h-4 text-gray-450" />
              <input
                type="text"
                placeholder="جستجو در آرشیوِ هارد همکار (نام فیلم، خلاصه، کارگردان)..."
                value={catalogSearch}
                disabled={!isPeerConnected}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pr-10 pl-4 h-9.5 bg-gray-50 dark:bg-slate-900 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>

          {isPeerConnected && (peerMovies.length > 0 || peerSeries.length > 0) && (
            <div className="mx-4 mt-2 mb-1 p-2 bg-gradient-to-r from-indigo-500/5 to-teal-500/5 dark:from-indigo-950/20 dark:to-teal-950/20 border border-indigo-500/10 dark:border-indigo-500/20 rounded-xl flex items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-550 dark:bg-indigo-400 animate-pulse shrink-0"></span>
                <span className="text-[10px] text-gray-550 dark:text-gray-455 font-black leading-loose">
                  آرشیو سیستمِ همکار جهت دریافت و ادغام آماده است:
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSyncDatabaseWithPeer(peerMovies, peerSeries)}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-755 text-white text-[10px] font-black rounded-lg transition-all shadow-md shadow-indigo-600/15 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Network className="w-3.5 h-3.5" />
                <span>همگام‌سازی و بروزرسانی کامل لیست ({toPersianNums(peerMovies.length + peerSeries.length)} عنوان)</span>
              </button>
            </div>
          )}

          {/* Catalog Items list container */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[550px]">
            {!isPeerConnected ? (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-3">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-900 text-gray-400 rounded-full flex items-center justify-center border border-gray-200/50">
                  <Wifi className="w-8 h-8 opacity-60" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-xs font-black text-gray-805 dark:text-gray-200">عدم برقراری ارتباط با سیستم همکار</h4>
                  <p className="text-[10px] text-gray-450 mt-1.5 leading-relaxed font-semibold">
                    برای شروع دریافت لیست دیتابیس فیلم‌ها و سریال‌های همکار، لطفا IP سیستم مقصد را در کادر چپ وارد کرده و دکمه "اتصال و دریافت دیتابیس" را بزنید.
                  </p>
                </div>
              </div>
            ) : isLoadingCatalog ? (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-2">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-[10px] text-gray-400 font-bold">در حال خواندن دیتابیس همکار از طریق کابل شبکه محلی...</p>
              </div>
            ) : (peerTab === 'movies' ? filteredMovies : filteredSeries).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center text-gray-400">
                <p className="text-xs font-bold font-semibold">هیچ آیتمی مطابق فیلتر شما در هارد همکار یافت نشد.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {peerTab === 'movies' ? (
                  // ---------------- MOVIES LIST ----------------
                  filteredMovies.map((movie: any) => (
                    <div key={movie.id} className="p-3 bg-gray-50 dark:bg-slate-900 border border-gray-105 dark:border-gray-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-400/40 transition-colors">
                      <div className="flex gap-3 min-w-0">
                        <img 
                          src={movie.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=150'} 
                          alt="" 
                          className="w-10 h-14 object-cover rounded shadow-sm bg-gray-150 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-gray-805 dark:text-gray-100">{movie.titleFa}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate font-mono" dir="ltr">{movie.titleEn} ({movie.year})</p>
                          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded mt-1.5 inline-block">
                            {movie.quality || 'نامشخص'} • {movie.soundFa || 'بدون اطلاعات صدا'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 text-left sm:text-right">
                        <span className="text-[9.5px] font-mono text-gray-405 truncate max-w-xs block text-left" dir="ltr" title={movie.filePath}>
                          {movie.filePath || 'بدون فایل فیزیکی'}
                        </span>
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-gray-500 font-extrabold px-2 py-0.5 rounded border border-gray-200/50 dark:border-gray-700/50">
                          قابل بروزرسانی لیست
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  // ---------------- SERIES EPISODES LIST ----------------
                  filteredSeries.map((series: any) => (
                    <div key={series.id} className="p-3 bg-gray-50 dark:bg-slate-900 border border-gray-105 dark:border-gray-800/80 rounded-xl space-y-2.5 hover:border-indigo-400/40 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-3 min-w-0">
                          <img 
                            src={series.poster || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=150'} 
                            alt="" 
                            className="w-10 h-14 object-cover rounded shadow-sm bg-gray-150 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-gray-805 dark:text-gray-100">{series.titleFa}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate font-mono" dir="ltr">{series.titleEn} ({series.year})</p>
                            <span className="text-[9px] bg-violet-50 dark:bg-violet-955/40 text-violet-650 dark:text-violet-400 font-bold px-1.5 py-0.5 rounded mt-1 inline-block">
                              {series.seasons?.length || 0} فصل • {series.soundFa || 'بدون اطلاعات صدا'}
                            </span>
                          </div>
                        </div>
                        
                        <span className="text-[9.5px] font-mono text-gray-400 block text-left shrink-0" dir="ltr">
                          {series.filePath ? 'پوشه اصلی: ' + series.filePath.split(/[\\/]/).pop() : 'بدون پوشه'}
                        </span>
                      </div>

                      {/* Episodes Sub-List expandable inside colleague catalog */}
                      <div className="bg-white dark:bg-slate-950 p-2 border border-gray-150 dark:border-gray-850/60 rounded-xl space-y-1.5">
                        <span className="text-[9px] text-gray-450 font-extrabold block px-1">اطلاعات فصل‌ها و قسمت‌ها:</span>
                        
                        {(!series.seasons || series.seasons.length === 0) ? (
                          <p className="text-[9.5px] text-amber-500 font-bold px-1">هیچ فصلی برای این سریال وارد نشده است.</p>
                        ) : (
                          series.seasons.map((season: any) => (
                            <div key={season.id} className="space-y-1">
                              <span className="text-[9.5px] font-bold text-indigo-500 block px-1 mt-1">{season.name}</span>
                              {(!season.episodes || season.episodes.length === 0) ? (
                                <p className="text-[9px] text-gray-400 px-2 leading-none">بدون قسمت</p>
                              ) : (
                                season.episodes.map((ep: any) => (
                                  <div key={ep.id} className="flex items-center justify-between p-1.5 hover:bg-gray-50 dark:hover:bg-slate-900 border-b border-gray-100 dark:border-gray-850 text-[10px] pr-2">
                                    <div className="min-w-0 flex-1 pl-4">
                                      <p className="font-bold text-gray-700 dark:text-gray-200">
                                        قسمت {toPersianNums(ep.number)} : {ep.name || 'بدون نام'}
                                      </p>
                                      <span className="text-[8.5px] text-gray-400 truncate block font-mono" dir="ltr">{ep.file || 'بدون الحاق فایل ویدئو'}</span>
                                    </div>
                                    <span className="text-[9px] text-gray-400 font-medium bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-gray-850 px-2 py-0.5 rounded">
                                      آماده بروزرسانی دیتابیس
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
