/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { dbService } from '../db/databaseService';
import { Database, Terminal, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function DBLogger() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = () => {
    setLogs(dbService.getLogs());
  };

  useEffect(() => {
    fetchLogs();
    // Poll logs every second to show live changes as users insert/delete items
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    dbService.clearLogs();
    setLogs([]);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-end" id="db-logger-container">
      {/* Logs Popover Panel above the circle indicator */}
      {isOpen && (
        <div className="mb-2.5 w-80 max-w-[calc(100vw-32px)] border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a] shadow-2xl rounded-2xl overflow-hidden transition-all duration-200">
          {/* Popover Header */}
          <div className="h-9 px-3 flex items-center justify-between text-[11px] font-bold bg-gray-50 dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 border-b border-gray-150 dark:border-gray-800">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>کنسول هماهنگی دیتابیس</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleClear}
                title="پاک کردن لاگ‌ها"
                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors focus:outline-none cursor-pointer"
                id="btn-clear-db-logs"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 rounded focus:outline-none cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Log list list */}
          <div className="h-48 overflow-y-auto p-2.5 font-mono text-[9px] space-y-2 bg-gray-950 text-[#38bdf8] leading-relaxed select-all" dir="ltr" id="db-logger-logs">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8 italic font-sans text-[10px]">هیچ ردی کدی صادر نشده است.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="border-b border-gray-900 pb-1.5 last:border-0">
                  <div className="flex items-center justify-between text-gray-400 text-[8px] mb-0.5">
                    <span className="flex items-center gap-1 font-bold">
                      <Terminal className="w-2.5 h-2.5 text-emerald-400" />
                      <span className={
                        log.type === 'SQLITE' ? 'text-amber-400' :
                        log.type === 'INDEXEDDB' ? 'text-[#38bdf8]' : 'text-gray-300'
                      }>
                        [{log.type}]
                      </span>
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="text-gray-200 select-all whitespace-pre-wrap font-mono font-medium leading-normal">
                    {log.query}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tiny Circle Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-white dark:bg-[#1e293b] border border-emerald-500/30 text-emerald-500 hover:text-emerald-400 flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all relative group outline-none"
        title="کنسول هماهنگی دیتابیس (فنی)"
        id="btn-toggle-logger"
      >
        <Database className="w-4.5 h-4.5 text-emerald-500" />
        {logs.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-900">
            {logs.length > 99 ? '99+' : logs.length}
          </span>
        )}
        <span className="absolute left-12 bg-slate-900 text-white text-[9px] px-2 py-1 rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none font-bold">
          مشاهده کنسول دیتابیس
        </span>
      </button>
    </div>
  );
}
