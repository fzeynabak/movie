/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, Search, ArrowUpDown, Film, HardDrive, Info, CheckCircle, HelpCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ScannedMediaItem } from '../utils/MediaScanner';
import { ImportService } from '../utils/ImportService';
import { toPersianNums } from '../pages/Dashboard';
import { showToast } from '../utils/toast';

interface ScanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ScannedMediaItem[];
  title?: string;
  defaultCategory?: string;
  onImportComplete?: () => void;
}

type SortField = 'title' | 'year' | 'size' | 'extension' | 'type';
type SortDirection = 'asc' | 'desc';

export const ScanPreviewModal: React.FC<ScanPreviewModalProps> = ({
  isOpen,
  onClose,
  items,
  title = 'پیش‌نمایش رسانه‌های اسکن شده',
  defaultCategory = 'خارجی',
  onImportComplete
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => {
    // Select all by default
    return new Set(items.map(item => item.file.fullPath));
  });

  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isImporting, setIsImporting] = useState(false);

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${toPersianNums(val.toString())} ${sizes[i]}`;
  };

  // Filter and Sort files
  const filteredAndSortedItems = useMemo(() => {
    // Filter
    let result = items.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const tmdbTitle = item.tmdb?.title || '';
      const tmdbOrigTitle = item.tmdb?.originalTitle || '';
      const parsedTitle = item.parsed.isSeries ? item.parsed.seriesName : item.parsed.title;
      const filename = item.file.filename;
      const folder = item.file.folder;

      return (
        tmdbTitle.toLowerCase().includes(searchLower) ||
        tmdbOrigTitle.toLowerCase().includes(searchLower) ||
        parsedTitle.toLowerCase().includes(searchLower) ||
        filename.toLowerCase().includes(searchLower) ||
        folder.toLowerCase().includes(searchLower)
      );
    });

    // Sort
    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'title') {
        valA = a.tmdb?.title || (a.parsed.isSeries ? a.parsed.seriesName : a.parsed.title);
        valB = b.tmdb?.title || (b.parsed.isSeries ? b.parsed.seriesName : b.parsed.title);
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, 'fa')
          : valB.localeCompare(valA, 'fa');
      }

      if (sortField === 'year') {
        valA = a.tmdb?.releaseDate?.substring(0, 4) || a.parsed.year || '0000';
        valB = b.tmdb?.releaseDate?.substring(0, 4) || b.parsed.year || '0000';
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (sortField === 'size') {
        valA = a.file.size;
        valB = b.file.size;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'extension') {
        valA = a.file.extension;
        valB = b.file.extension;
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (sortField === 'type') {
        valA = a.parsed.isSeries ? 'tv' : 'movie';
        valB = b.parsed.isSeries ? 'tv' : 'movie';
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return 0;
    });

    return result;
  }, [items, searchQuery, sortField, sortDirection]);

  // Handle Sort Change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle Select All
  const handleSelectAll = () => {
    const allPaths = filteredAndSortedItems.map(item => item.file.fullPath);
    setSelectedPaths(new Set(allPaths));
  };

  // Handle Deselect All
  const handleDeselectAll = () => {
    setSelectedPaths(new Set());
  };

  // Handle Single Checkbox Change
  const handleToggleSelect = (path: string) => {
    const updated = new Set(selectedPaths);
    if (updated.has(path)) {
      updated.delete(path);
    } else {
      updated.add(path);
    }
    setSelectedPaths(updated);
  };

  // Calculate stats for selected files
  const { totalSelectedSize, selectedCount } = useMemo(() => {
    let size = 0;
    let count = 0;
    items.forEach(item => {
      if (selectedPaths.has(item.file.fullPath)) {
        size += item.file.size;
        count++;
      }
    });
    return { totalSelectedSize: size, selectedCount: count };
  }, [items, selectedPaths]);

  const isAllSelected = filteredAndSortedItems.length > 0 && 
    filteredAndSortedItems.every(item => selectedPaths.has(item.file.fullPath));

  const handleToggleAllCheckbox = () => {
    if (isAllSelected) {
      // Deselect all that are in the filtered list
      const updated = new Set(selectedPaths);
      filteredAndSortedItems.forEach(item => updated.delete(item.file.fullPath));
      setSelectedPaths(updated);
    } else {
      // Select all that are in the filtered list
      const updated = new Set(selectedPaths);
      filteredAndSortedItems.forEach(item => updated.add(item.file.fullPath));
      setSelectedPaths(updated);
    }
  };

  // Handle Import Action
  const handleImport = async () => {
    if (selectedPaths.size === 0) {
      showToast('لطفاً حداقل یک فایل را جهت ورود انتخاب کنید.', 'warning');
      return;
    }

    setIsImporting(true);
    showToast('در حال درون‌ریزی فایل‌های انتخاب شده به دیتابیس...', 'info');

    try {
      const selectedItems = items.filter(item => selectedPaths.has(item.file.fullPath));
      const { successCount, failedCount } = await ImportService.importItems(selectedItems, defaultCategory);

      if (successCount > 0) {
        showToast(`ورود فایل‌ها تکمیل شد: ${toPersianNums(successCount.toString())} مورد با موفقیت اضافه شد.`, 'success');
        if (failedCount > 0) {
          showToast(`${toPersianNums(failedCount.toString())} مورد با خطا مواجه شد.`, 'error');
        }
        if (onImportComplete) {
          onImportComplete();
        }
        onClose();
      } else {
        showToast('هیچ فایلی وارد دیتابیس نشد.', 'error');
      }
    } catch (err: any) {
      console.error('Import process crash:', err);
      showToast(`خطای جدی در ورود اطلاعات: ${err.message || err}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-6">
        {/* Modal panel */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-950 text-right shadow-2xl transition-all w-full max-w-6xl flex flex-col h-[85vh] border border-slate-100 dark:border-slate-800">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-500" />
                <span>{title}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تعداد {toPersianNums(items.length.toString())} فایل شناسایی و با TMDb مطابقت داده شد.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isImporting}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="جستجو در نام فیلم، نام فایل یا پوشه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                style={{ direction: 'rtl' }}
              />
            </div>

            {/* Quick Bulk Select Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors cursor-pointer"
              >
                انتخاب همه فایل‌ها ({toPersianNums(items.length.toString())})
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              >
                لغو انتخاب همه
              </button>
            </div>
          </div>

          {/* Table Area (Scrollable) */}
          <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/10">
            {filteredAndSortedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <Info className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm">هیچ فایلی مطابق جستجوی شما پیدا نشد.</p>
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 sticky top-0 z-10 backdrop-blur-sm">
                    <th className="px-4 py-3 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleAllCheckbox}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 w-16 text-center">پوستر</th>
                    <th 
                      onClick={() => handleSort('title')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>عنوان (TMDb / پارس شده)</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('year')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors select-none text-center w-20"
                    >
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>سال</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('type')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors select-none text-center w-28"
                    >
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>نوع رسانه</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold text-center w-36">وضعیت تطابق</th>
                    <th className="px-4 py-3 font-semibold">پوشه و فایل اصلی</th>
                    <th 
                      onClick={() => handleSort('size')}
                      className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors select-none text-left w-28"
                    >
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>حجم</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredAndSortedItems.map((item, idx) => {
                    const isSelected = selectedPaths.has(item.file.fullPath);
                    const matched = item.matchStatus === 'matched' && item.tmdb;
                    const poster = matched ? item.tmdb?.posterPath : null;
                    const isTV = item.parsed.isSeries;

                    const displayTitle = matched 
                      ? item.tmdb?.title 
                      : (isTV ? item.parsed.seriesName : item.parsed.title);
                    
                    const displayOrigTitle = matched
                      ? item.tmdb?.originalTitle
                      : '';

                    const displayYear = matched
                      ? item.tmdb?.releaseDate?.substring(0, 4)
                      : item.parsed.year || 'Unknown';

                    return (
                      <tr 
                        key={item.file.fullPath}
                        className={`hover:bg-indigo-50/10 dark:hover:bg-indigo-950/5 transition-colors ${
                          isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.file.fullPath)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                          />
                        </td>

                        {/* Poster */}
                        <td className="px-4 py-3 text-center">
                          {poster ? (
                            <img 
                              src={poster} 
                              alt="Poster" 
                              className="w-10 h-14 object-cover rounded shadow-md border border-slate-200 dark:border-slate-800 mx-auto"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-14 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 mx-auto">
                              <Film className="w-5 h-5" />
                            </div>
                          )}
                        </td>

                        {/* Title & original title */}
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-xs">
                          <div className="truncate" title={displayTitle}>
                            {displayTitle}
                          </div>
                          {displayOrigTitle && (
                            <div className="text-xs text-slate-400 font-mono truncate mt-0.5" style={{ direction: 'ltr', textAlign: 'right' }}>
                              {displayOrigTitle}
                            </div>
                          )}
                        </td>

                        {/* Year */}
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 font-mono">
                          {displayYear !== 'Unknown' ? toPersianNums(displayYear) : 'Unknown'}
                        </td>

                        {/* Type (Movie / TV) */}
                        <td className="px-4 py-3 text-center">
                          {isTV ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30">
                              سریال تلویزیونی
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
                              فیلم سینمایی
                            </span>
                          )}
                        </td>

                        {/* Match Status */}
                        <td className="px-4 py-3 text-center">
                          {item.matchStatus === 'matched' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>شناسایی شد</span>
                            </span>
                          ) : item.matchStatus === 'failed' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>خطای سرور</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>Unknown</span>
                            </span>
                          )}
                        </td>

                        {/* File details (original filename & folder) */}
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                          <div className="truncate text-slate-700 dark:text-slate-300 font-mono" style={{ direction: 'ltr', textAlign: 'right' }} title={item.file.filename}>
                            {item.file.filename}
                          </div>
                          <div className="truncate text-slate-400 mt-1 font-mono" style={{ direction: 'ltr', textAlign: 'right' }} title={item.file.folder}>
                            {item.file.folder}
                          </div>
                        </td>

                        {/* Size */}
                        <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 text-left">
                          {formatBytes(item.file.size)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Selected stats with disk icon */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span>
                تعداد{' '}
                <strong className="text-slate-900 dark:text-slate-200">
                  {toPersianNums(selectedCount.toString())}
                </strong>{' '}
                فایل انتخاب شده به حجم{' '}
                <strong className="text-slate-900 dark:text-slate-200">
                  {formatBytes(totalSelectedSize)}
                </strong>
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                بستن
              </button>
              
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || selectedPaths.size === 0}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ورود اطلاعات...</span>
                  </>
                ) : (
                  <span>وارد کردن به دیتابیس ({toPersianNums(selectedPaths.size.toString())} مورد)</span>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
