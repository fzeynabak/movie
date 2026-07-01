import React, { useState, useEffect } from 'react';
import { 
  InvoiceDesignerService, 
  InvoiceTemplateDesign, 
  DEFAULT_DESIGN 
} from '../utils/invoiceDesignerSettings';
import InvoiceShapes from './InvoiceShapes';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Save, 
  Check, 
  Layout, 
  Palette, 
  Sliders, 
  Type, 
  Grid, 
  Printer, 
  SlidersHorizontal,
  PlusSquare,
  Sparkles,
  Info
} from 'lucide-react';

export default function InvoiceDesignerSubTab() {
  const [design, setDesign] = useState<InvoiceTemplateDesign>(DEFAULT_DESIGN);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeSectionSettings, setActiveSectionSettings] = useState<string | null>('header');

  useEffect(() => {
    setDesign(InvoiceDesignerService.get());
  }, []);

  const handleSave = () => {
    InvoiceDesignerService.save(design);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('آیا مایلید تمام الگوهای ساختار چاپی فاکتور به حالت استاندارد کارخانه بازنشانی شوند؟')) {
      setDesign({ ...DEFAULT_DESIGN });
      InvoiceDesignerService.save(DEFAULT_DESIGN);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // جابجایی ترتیبی سکشن‌ها (سیستم تعاملی چیدمان المنتور)
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...design.sectionsOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    
    // Swap elements
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    
    setDesign({
      ...design,
      sectionsOrder: newOrder
    });
  };

  // الگوهای آماده سریع (Skins Preset Selector)
  const applyPreset = (preset: 'standard' | 'minimal' | 'bento' | 'thermal') => {
    let updated: InvoiceTemplateDesign = { ...design };
    switch (preset) {
      case 'standard':
        updated = {
          ...DEFAULT_DESIGN,
          layoutName: 'standard-v1',
          primaryColor: '#059669', // Emerald
          secondaryColor: '#f1f5f9',
          borderStyle: 'solid',
          lineWidth: 2,
        };
        break;
      case 'minimal':
        updated = {
          ...design,
          layoutName: 'minimal-modern',
          primaryColor: '#2563eb', // Blue
          secondaryColor: '#f8fafc',
          borderStyle: 'dashed',
          lineWidth: 1,
          borderColor: '#475569',
          layoutPadding: 16,
        };
        break;
      case 'bento':
        updated = {
          ...design,
          layoutName: 'compact-bento',
          primaryColor: '#d97706', // Yellow
          secondaryColor: '#fef3c7',
          borderStyle: 'solid',
          lineWidth: 1,
          borderColor: '#d97706',
          layoutPadding: 20,
        };
        break;
      case 'thermal':
        updated = {
          ...design,
          layoutName: 'thermal-receipt',
          primaryColor: '#1e293b', // Dark Slate
          secondaryColor: '#f3f4f6',
          borderStyle: 'dashed',
          lineWidth: 1,
          borderColor: '#1e293b',
          layoutPadding: 12,
        };
        break;
    }
    setDesign(updated);
  };

  const sectionTranslates: { [key: string]: string } = {
    header: 'سربرگ و عنوان فاکتور',
    entities_info: 'مشخصات خریدار و فروشنده',
    items_table: 'جدول اقلام کالا و خدمات',
    financial_receipt: 'ترازو و خلاصه صورتحساب مالی',
    signatures: 'مُهر، امضائات و قوانین حقوقی ملحق'
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-1 text-right" dir="rtl" id="invoice-designer-container">
      
      {/* پیام بازخورد ذخیره‌سازی */}
      {saveSuccess && (
        <div className="xl:col-span-12 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-3.5 text-xs font-black flex items-center justify-between shadow-sm animate-fade-in" id="designer-save-banner">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 animate-bounce" />
            <span>تنظیمات قالب چاپی و طرح‌بندی زنده فاکتور (سازنده المنتور) با موفقیت در سیستم محلی ذخیره شد.</span>
          </div>
          <span className="text-[10px] bg-emerald-100 px-2 py-1 rounded">در فاکتورهای بعدی شما به صورت خودکار اعمال خواهد شد.</span>
        </div>
      )}

      {/* ستون راست: پنل ابزارها و کنترل‌های المنتوری فاکتور (Elementor Control Rails) */}
      <div className="xl:col-span-5 space-y-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="designer-controls-sidebar">
        
        {/* هدر پنل المنتوری */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              سازنده و بهینه‌ساز فاکتور آریا (طرح المنتور)
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-1">ساختار، ترتیب قرارگیری بخش‌ها، رنگ‌ها، مهر و امضا و خطوط حاشیه را سفارشی‌سازی کنید.</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={handleReset}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 transition hover:text-red-600"
              title="بازنشانی قالب پیش‌فرض"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-emerald-600/10"
            >
              <Save className="w-3.8 h-3.8" />
              ذخیره الگو
            </button>
          </div>
        </div>

        {/* بخش انتخاب سریع کالبدهای مادر (Skins & Presets) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/80 space-y-2">
          <span className="text-[10.5px] font-bold text-slate-500 block">انتخاب پوسته چاپی پیش‌فرض (سریع):</span>
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
            <button
              onClick={() => applyPreset('standard')}
              className={`p-2 rounded-lg border transition font-bold ${design.layoutName === 'standard-v1' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`}
            >
              استاندارد رسمی
            </button>
            <button
              onClick={() => applyPreset('minimal')}
              className={`p-2 rounded-lg border transition font-bold ${design.layoutName === 'minimal-modern' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`}
            >
              مدرن کم‌رنگ
            </button>
            <button
              onClick={() => applyPreset('bento')}
              className={`p-2 rounded-lg border transition font-bold ${design.layoutName === 'compact-bento' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`}
            >
              بنتو فشرده
            </button>
            <button
              onClick={() => applyPreset('thermal')}
              className={`p-2 rounded-lg border transition font-bold ${design.layoutName === 'thermal-receipt' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`}
            >
              ۸۰م‌م حرارتی (POS)
            </button>
          </div>
        </div>

        {/* سیستم مرتب‌سازی درگ اند رایدر چیدمان‌ها (Drag-Reorder Emulated Section Rails) */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              ترتیب قرارگیری بلوک‌های فاکتور (الگو بردار المنتور)
            </span>
            <span className="text-[9.5px] text-slate-400">جابجایی با دکمه‌های فلش</span>
          </div>
          
          <div className="space-y-1.5" id="sections-ordered-list">
            {design.sectionsOrder.map((sectionId, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === design.sectionsOrder.length - 1;
              const isSettingsOpen = activeSectionSettings === sectionId;
              const titleTranslation = sectionTranslates[sectionId] || sectionId;

              return (
                <div 
                  key={sectionId} 
                  className={`border rounded-xl transition ${isSettingsOpen ? 'border-emerald-600 shadow-sm bg-emerald-50/5' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'}`}
                >
                  {/* ردیف هدر کنترل سکشن */}
                  <div className="flex items-center justify-between p-2.5 select-none text-xs">
                    <span 
                      onClick={() => setActiveSectionSettings(isSettingsOpen ? null : sectionId)}
                      className="font-bold text-slate-700 cursor-pointer flex-1 flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded bg-slate-200/80 text-[10px] text-slate-600 flex items-center justify-center font-mono">{idx + 1}</span>
                      {titleTranslation}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {/* دکمه‌های جابجایی عمودی */}
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveSection(idx, 'up')}
                        className={`p-1 rounded hover:bg-slate-200 transition ${isFirst ? 'text-slate-300 pointer-events-none' : 'text-slate-500'}`}
                        title="انتقال به بالا"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveSection(idx, 'down')}
                        className={`p-1 rounded hover:bg-slate-200 transition ${isLast ? 'text-slate-300 pointer-events-none' : 'text-slate-500'}`}
                        title="انتقال به پایین"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* دکمه تنظیمات جزئیات */}
                      <button
                        type="button"
                        onClick={() => setActiveSectionSettings(isSettingsOpen ? null : sectionId)}
                        className={`py-1 px-2.5 rounded font-bold text-[10px] transition ${isSettingsOpen ? 'bg-emerald-600 text-white' : 'bg-slate-250 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {isSettingsOpen ? 'بستن' : 'پیکربندی'}
                      </button>
                    </div>
                  </div>

                  {/* بدنه الحاقی پیکربندی در صورت فعال بودن (Accordion Dynamic Form) */}
                  {isSettingsOpen && (
                    <div className="p-3.5 border-t border-slate-100 bg-white rounded-b-xl space-y-4 text-xs text-slate-600 animate-slide-down">
                      
                      {/* کانفیگ سربرگ */}
                      {sectionId === 'header' && (
                        <div className="space-y-3.5">
                          <div className="space-y-1">
                            <label className="block text-[10.5px] font-bold text-slate-700">عنوان چاپی اصلی فاکتور:</label>
                            <input 
                              type="text" 
                              value={design.customInvoiceTitle}
                              onChange={e => setDesign({ ...design, customInvoiceTitle: e.target.value })}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[9.5px] text-slate-400">مثال: فاکتور فروش رسمی، پیش فاکتور، صورتحساب خدمات</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                checked={design.widgets.showLogo}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showLogo: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span className="text-[10.5px]">نمایش لوگوی فروشگاه</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                checked={design.widgets.showInvoiceBarcode}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showInvoiceBarcode: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span className="text-[10.5px]">نمایش بارکد اختصاصی فاکتور</span>
                            </label>
                          </div>

                          <div className="pt-1">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                checked={design.widgets.showPaymentStatusBadge}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showPaymentStatusBadge: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span className="text-[10.5px]">نمایش نشان وضعیت تسویه (نقدی/نسیه/مختلط)</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* کانفیگ اطلاعات متعاملین */}
                      {sectionId === 'entities_info' && (
                        <div className="space-y-3">
                          <span className="text-[10px] text-slate-400 block leading-relaxed">این بلوک وظیفه سازماندهی اطلاعات پایه صادرکننده فاکتور (کسب و کار) و خریدار (طرف حساب) را داراست.</span>
                          
                          <div className="grid grid-cols-1 gap-2.5">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                checked={design.widgets.showSellerDetails}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showSellerDetails: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <div>
                                <span className="text-[10.5px] font-bold text-slate-700 block">نمایش اطلاعات شناسه‌ای فروشگاه:</span>
                                <span className="text-[9.5px] text-slate-400">آدرس، کد پستی، کداقتصادی، تلفن</span>
                              </div>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                checked={design.widgets.showBuyerDetails}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showBuyerDetails: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <div>
                                <span className="text-[10.5px] font-bold text-slate-700 block">نمایش مشخصات تفصیلی طرف حساب (خریدار):</span>
                                <span className="text-[9.5px] text-slate-400">کدملی حقیقی، کداقتصادی حقوقی، آدرس، معین خریدار</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* کانفیگ جدول اقلام */}
                      {sectionId === 'items_table' && (
                        <div className="space-y-3">
                          <span className="text-[10.5px] font-bold text-slate-700 block">ستون‌های فعال در جدول کالاها و خدمات فاکتور:</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                // Standard rule: cannot fully turn off index usually but let user toggle
                                checked={design.widgets.showItemIndexNumber}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showItemIndexNumber: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span className="text-[10px]">نمایش ردیف شماره</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                checked={design.widgets.showBarcodeColumn}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showBarcodeColumn: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span className="text-[10px]">نمایش ستون بارکد کالا</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                checked={design.widgets.showUnitColumn}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showUnitColumn: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span className="text-[10px]">نمایش واحد شمارش کالا</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <input 
                                type="checkbox"
                                checked={design.widgets.showItemDiscountField}
                                onChange={e => setDesign({
                                  ...design,
                                  widgets: { ...design.widgets, showItemDiscountField: e.target.checked }
                                })}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span className="text-[10px]">نمایش ستون تخفیف هر سطر</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* خلاصه مالی */}
                      {sectionId === 'financial_receipt' && (
                        <div className="space-y-3.5">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 text-slate-700 font-bold rounded-lg border border-slate-100">
                            <input 
                              type="checkbox"
                              checked={design.widgets.showTaxAndAdditions}
                              onChange={e => setDesign({
                                ...design,
                                widgets: { ...design.widgets, showTaxAndAdditions: e.target.checked }
                              })}
                              className="w-4 h-4 accent-emerald-600"
                            />
                            <div>
                              <span>اصابت مالیات و اضافات قانونی:</span>
                              <span className="text-[9px] text-slate-400 block font-normal">نمایش ردیف مالیات بر ارزش افزوده در فاکتور نهایی چاپی</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 text-slate-700 font-bold rounded-lg border border-slate-100">
                            <input 
                              type="checkbox"
                              checked={design.widgets.showTermsAndFooterText}
                              onChange={e => setDesign({
                                ...design,
                                widgets: { ...design.widgets, showTermsAndFooterText: e.target.checked }
                              })}
                              className="w-4 h-4 accent-emerald-600"
                            />
                            <div>
                              <span>نمایش شرایط و قوانین معامله (Notes):</span>
                              <span className="text-[9px] text-slate-400 block font-normal">نمایش متن شرایط فروش و واگذاری کالا در کادر توضیحات فاکتور</span>
                            </div>
                          </label>

                          <div className="space-y-1">
                            <span className="block text-[10.5px] font-bold text-slate-755">ویرایش متن شرایط و توضیحات پایین فاکتور:</span>
                            <textarea 
                              rows={2}
                              value={design.customTermsNote}
                              onChange={e => setDesign({ ...design, customTermsNote: e.target.value })}
                              className="w-full text-[10.5px] p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                              placeholder="ماده‌ها و قوانین مربوط به مرجوعی یا شرایط نسیه..."
                            />
                          </div>
                        </div>
                      )}

                      {/* مهروامضا */}
                      {sectionId === 'signatures' && (
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-2">
                            <input 
                              type="checkbox"
                              checked={design.widgets.showSignatureBoxes}
                              onChange={e => setDesign({
                                ...design,
                                widgets: { ...design.widgets, showSignatureBoxes: e.target.checked }
                              })}
                              className="w-4 h-4 accent-emerald-600"
                            />
                            <div>
                              <span className="font-bold text-slate-750">نمایش کادرهای تایید امضا و کپی دفتری</span>
                            </div>
                          </label>

                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-500">برچسب کادر صادرکننده (راست):</label>
                              <input 
                                type="text"
                                value={design.customSellerStampLabel}
                                onChange={e => setDesign({ ...design, customSellerStampLabel: e.target.value })}
                                className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-500">برچسب کادر خریدار (چپ):</label>
                              <input 
                                type="text"
                                value={design.customBuyerSignatureLabel}
                                onChange={e => setDesign({ ...design, customBuyerSignatureLabel: e.target.value })}
                                className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* بخش طراحی ثانویه: رنگ‌های برندینگ، خط حاشیه، فواصل و رادیوس‌ها (Designer Settings Options) */}
        <div className="space-y-3.5 border-t border-slate-100 pt-4 text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Palette className="w-4 h-4 text-emerald-600" />
            تایپوگرافی، حاشیه‌ها و رنگ‌بندی‌های اختصاصی (برندینگ)
          </span>

          <div className="grid grid-cols-2 gap-4">
            
            {/* طراح خطوط حاشیه */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500">نوع خطوط کادربندی:</label>
              <select
                value={design.borderStyle}
                onChange={e => setDesign({ ...design, borderStyle: e.target.value as any })}
                className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none h-8.5 text-[11px]"
              >
                <option value="solid">خط صاف (مستحکم)</option>
                <option value="dashed">بریده بریده (دش)</option>
                <option value="double">دولا دولا (دوبل رسمی)</option>
              </select>
            </div>

            {/* ضخامت فواصل کادرها */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500">ضخامت خطوط (lineWidth):</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="1" 
                  max="4" 
                  value={design.lineWidth}
                  onChange={e => setDesign({ ...design, lineWidth: Number(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                />
                <span className="font-mono text-[10px] text-slate-600 w-4 block text-center font-bold">{design.lineWidth}px</span>
              </div>
            </div>

            {/* پدینگ درونی حاشیه کاغذ */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500">پدینگ و فضای تنفس دور کاغذ:</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="8" 
                  max="32" 
                  value={design.layoutPadding}
                  onChange={e => setDesign({ ...design, layoutPadding: Number(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                />
                <span className="font-mono text-[10px] text-slate-600 w-8 block text-center font-bold">{design.layoutPadding}px</span>
              </div>
            </div>

            {/* اندازه قلم متون فاکتور */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500">مقیاس فونت فاکتور:</label>
              <select
                value={design.fontSizeScale}
                onChange={e => setDesign({ ...design, fontSizeScale: e.target.value as any })}
                className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none h-8.5 text-[11px]"
              >
                <option value="sm">بسیار ریز و متراکم (sm)</option>
                <option value="base">پیش‌فرض سیستم (base)</option>
                <option value="lg">درشت و خوانا (lg)</option>
                <option value="xl">برجسته ویژه ضعیف چشم (xl)</option>
              </select>
            </div>

            {/* برچسب رنگ سازمانی */}
            <div className="space-y-1.5 col-span-2">
              <label className="block text-[10.5px] text-slate-700 font-bold mb-1">رنگ شاخص فاکتور (رنگ سازمانی و امضا):</label>
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                  {[
                    { hex: '#059669', name: 'سبز زمرد' },
                    { hex: '#2563eb', name: 'آبی کبالت' },
                    { hex: '#d97706', name: 'کهربایی' },
                    { hex: '#ef4444', name: 'قرمز مرجانی' },
                  ].map(clr => (
                    <button
                      key={clr.hex}
                      type="button"
                      onClick={() => setDesign({ ...design, primaryColor: clr.hex })}
                      className={`py-1.5 px-2 text-[10px] rounded-lg border transition ${design.primaryColor === clr.hex ? 'border-indigo-600 bg-slate-55' : 'border-slate-100 bg-slate-50'}`}
                      style={{ color: clr.hex, fontWeight: 'bold' }}
                    >
                      ● {clr.name}
                    </button>
                  ))}
                </div>
                <input 
                  type="color" 
                  value={design.primaryColor}
                  onChange={e => setDesign({ ...design, primaryColor: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer p-0"
                />
              </div>
            </div>

            {/* طرح تزئینی و اشکال هندسی پس‌زمینه (Mockup matching) */}
            <div className="space-y-1.5 col-span-2 border-t border-slate-100 pt-3">
              <label className="block text-[10.5px] font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                طرح هندسی و اشکال هنری پس‌زمینه فاکتور:
              </label>
              <select
                value={design.shapeStyle || 'none'}
                onChange={e => setDesign({ ...design, shapeStyle: e.target.value as any })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none h-9 text-[11px] font-bold text-slate-700"
              >
                <option value="none">ساده شرکتی (بدون اشکال پس‌زمینه)</option>
                <option value="modern-diagonal">طرح اشکال اریب رنگارنگ سه‌بعدی (مشابه تصویر الگو)</option>
                <option value="minimal-geometric">طرح حلقه‌ها و نقاط شبکه‌ای مدرن در گوشه‌ها</option>
                <option value="abstract-wave">طرح امواج برداری مواج و سیال سازمانی</option>
              </select>
              <p className="text-[9.5px] text-slate-400">این اشکال برداری (SVG) به عنوان Letterhead عمل کرده و کارهای چاپی شما را منحصربه‌فرد، حرفه‌ای و لوکس جلوه می‌دهند.</p>
            </div>

          </div>
        </div>

      </div>

      {/* ستون چپ: پیش‌نمایش کامپوزیت برگه فاکتور در لحظه (Elementor Realtime Canvas Preview Container) */}
      <div className="xl:col-span-7 space-y-4" id="designer-preview-canvas">
        
        {/* نوار بالایی ابزار پیش‌نمایش */}
        <div className="bg-slate-800 text-white p-3 rounded-2xl flex justify-between items-center text-xs shadow-md">
          <span className="font-bold flex items-center gap-1 text-[11px]">
            <Printer className="w-4 h-4 text-emerald-400" />
            بستر پیش‌نمایش زنده چاپی فاکتور (Wysiwyg Elementor Preview)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-emerald-300 font-bold">بستر شبیه‌سازی ۱۰۰٪ دقیق</span>
            <span className="text-[9px] text-slate-400">بدون تغییر ساختار در چاپ سایزهای مختلف</span>
          </div>
        </div>

        {/* کانتینر مادر کاغذ با قابلیت هماهنگی با هر تغییر رزولوشن یا مانیتور */}
        <div className="bg-slate-200 p-6 rounded-2xl border border-slate-350 shadow-inner flex justify-center items-start overflow-x-auto min-h-[640px]" id="invoice-physical-page-container">
          
          {/* برگه شبیه‌سازی فیزیکی فاکتور */}
          <div 
            className="bg-white text-slate-950 shadow-2xl transition-all duration-300 relative select-none w-full max-w-[595px]"
            style={{ 
              fontFamily: design.fontFamily === 'Vazirmatn' ? 'Vazirmatn, sans-serif' : 'sans-serif',
              fontSize: design.fontSizeScale === 'sm' ? '11px' : design.fontSizeScale === 'lg' ? '14px' : design.fontSizeScale === 'xl' ? '16px' : '12px',
              borderWidth: `${design.lineWidth}px`,
              borderColor: design.borderColor,
              borderStyle: design.borderStyle,
              padding: `${design.layoutPadding}px`,
              lineHeight: '1.7'
            }}
            id="faked-printable-invoice"
          >
            {/* طرح هندسی و اشکال هنری پس‌زمینه (Letterhead Art) */}
            <InvoiceShapes primaryColor={design.primaryColor} styleName={design.shapeStyle} />

            <div className="relative z-10 space-y-4">
              {/* در اینجا سیستم ترتیبی سکشن‌ها (sections_order) به صورت کاملاً داینامیک رونویسی و رندر می‌شود */}
              {design.sectionsOrder.map((secId) => {
              
              // ۱. سربرگ
              if (secId === 'header') {
                return (
                  <div key="header" className="border-b border-slate-300 pb-3 h-auto mb-4" id="prev-sec-header">
                    <div className="flex justify-between items-start md:items-center">
                      
                      {/* لوگوی مجازی */}
                      {design.widgets.showLogo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-extrabold text-sm shadow">
                            آریا
                          </div>
                          <div>
                            <h4 className="font-black text-xs text-slate-800">حسابداری آریا</h4>
                            <span className="text-[9px] text-slate-400 font-mono block leading-none">Aria Store ERP v1</span>
                          </div>
                        </div>
                      ) : (
                        <h4 className="font-extrabold text-xs text-slate-800">سامانه حسابداری بومی</h4>
                      )}

                      {/* عنوان فاکتور */}
                      <div className="text-center">
                        <h1 className="font-extrabold text-xs md:text-sm tracking-tight px-3 py-1 rounded" style={{ color: design.primaryColor }}>
                          {design.customInvoiceTitle || 'صورتحساب خرید/فروش اقلام'}
                        </h1>
                        {design.widgets.showPaymentStatusBadge && (
                          <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm border border-emerald-200">
                             تسویه شده (کارتخوان نقدی)
                          </span>
                        )}
                      </div>

                      {/* بارکد مجازی و اطلاعات شماره فاکتور */}
                      <div className="text-left text-[9.5px] text-slate-500 font-mono space-y-0.5 leading-tight">
                        <div>شماره فاکتور: <strong className="text-slate-900 font-bold font-sans">INV-98201</strong></div>
                        <div>تاریخ صدور: <span className="font-medium">۱۴۰۵/۰۳/۲۲</span></div>
                        
                        {design.widgets.showInvoiceBarcode && (
                          <div className="pt-2 flex flex-col items-end">
                            <div className="w-20 h-4 bg-slate-950 flex items-center justify-between px-1 rounded-sm gap-0.5">
                              {[1,3,2,1,4,2,3,1,2,3,4,1,2,3,4,2,3,1].map((w, i) => (
                                <div key={i} className="bg-white h-3.5" style={{ width: `${w * 0.9}px` }} />
                              ))}
                            </div>
                            <span className="text-[7.5px] text-slate-400 select-none block text-center w-20">98201-9002</span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              }

              // ۲. متعاملین
              if (secId === 'entities_info') {
                return (
                  <div key="entities_info" className="space-y-3 mb-4 text-[11px]" id="prev-sec-entities">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* اطلاعات فروشگاه */}
                      {design.widgets.showSellerDetails && (
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5">
                          <h4 className="font-black text-[11px] border-b border-slate-200 pb-1 flex items-center gap-1 text-slate-800">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: design.primaryColor }}></span>
                            مشخصات صادرکننده سند چاپی (فروشگاه)
                          </h4>
                          <div className="space-y-0.8 leading-relaxed">
                            <div><strong>نام فروشگاه:</strong> حسابداری فروشگاهی آریا (توسعه کلیک)</div>
                            <div><strong>کد اقتصادی:</strong> <span className="font-mono">411122233344</span></div>
                            <div><strong>تلفن رسمی تماس:</strong> <span className="font-mono">02188889900</span></div>
                            <div><strong>نشانی مرکز:</strong> تهران، خیابان ولیعصر، پلاک ۱۲</div>
                          </div>
                        </div>
                      )}

                      {/* اطلاعات خریدار */}
                      {design.widgets.showBuyerDetails && (
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5">
                          <h4 className="font-black text-[11px] border-b border-slate-200 pb-1 flex items-center gap-1 text-slate-800">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: design.primaryColor }}></span>
                            مشخصات طرف حساب تجاری (خریدار)
                          </h4>
                          <div className="space-y-0.8 leading-relaxed">
                            <div><strong>خریدار حقیقی:</strong> علی‌رضا محمدی کاشانی</div>
                            <div><strong>تلفن همراه:</strong> <span className="font-mono">09121112233</span></div>
                            <div><strong>کد ملی حقیقی:</strong> <span className="font-mono">0011223344</span></div>
                            <div><strong>کد پستی ده رقمی:</strong> <span className="font-mono">1432198765</span></div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              }

              // ۳. جدول اقلام رسمی
              if (secId === 'items_table') {
                return (
                  <div key="items_table" className="border border-slate-350 rounded-xl overflow-hidden mb-4" id="prev-sec-table">
                    <table className="w-full text-right border-collapse text-[10.5px]">
                      <thead>
                        <tr className="border-b border-slate-350" style={{ backgroundColor: design.secondaryColor }}>
                          {design.widgets.showItemIndexNumber && (
                            <th className="p-2 border-l border-slate-200 text-center w-8">ردیف</th>
                          )}
                          {design.widgets.showBarcodeColumn && (
                            <th className="p-2 border-l border-slate-200 text-center w-16">بارکد</th>
                          )}
                          <th className="p-2 border-l border-slate-200">شرح کالا یا خدمات پیوستی</th>
                          {design.widgets.showUnitColumn && (
                            <th className="p-2 border-l border-slate-200 text-center w-12">واحد</th>
                          )}
                          <th className="p-2 border-l border-slate-200 text-left w-12">تعداد</th>
                          <th className="p-2 border-l border-slate-200 text-left w-20">واحد (ت)</th>
                          {design.widgets.showItemDiscountField && (
                            <th className="p-2 border-l border-slate-200 text-left w-16">تخفیف (ت)</th>
                          )}
                          <th className="p-2 text-left w-24">مبلغ نهایی (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="h-8">
                          {design.widgets.showItemIndexNumber && <td className="p-2 border-l border-slate-200 text-center font-mono">1</td>}
                          {design.widgets.showBarcodeColumn && <td className="p-2 border-l border-slate-200 text-center font-mono text-[9px] text-slate-400">100342</td>}
                          <td className="p-2 border-l border-slate-200 font-bold text-slate-800">کابل شارژ فست تایپ‌سی شیائومی اورجینال</td>
                          {design.widgets.showUnitColumn && <td className="p-2 border-l border-slate-200 text-center">عدد</td>}
                          <td className="p-2 border-l border-slate-200 text-left font-mono">۲</td>
                          <td className="p-2 border-l border-slate-200 text-left font-mono">۱۲۰,۰۰۰</td>
                          {design.widgets.showItemDiscountField && <td className="p-2 border-l border-slate-200 text-left font-mono">۱۰,۰۰۰</td>}
                          <td className="p-2 text-left font-bold font-mono">۲۳۰,۰۰۰</td>
                        </tr>
                        <tr className="h-8">
                          {design.widgets.showItemIndexNumber && <td className="p-2 border-l border-slate-200 text-center font-mono">2</td>}
                          {design.widgets.showBarcodeColumn && <td className="p-2 border-l border-slate-200 text-center font-mono text-[9px] text-slate-400">200981</td>}
                          <td className="p-2 border-l border-slate-200 font-bold text-slate-800">نصب سیستم‌عامل و ویندوز ۱۰ روی لپ تاپ مشتری</td>
                          {design.widgets.showUnitColumn && <td className="p-2 border-l border-slate-200 text-center">خدمت</td>}
                          <td className="p-2 border-l border-slate-200 text-left font-mono">۱</td>
                          <td className="p-2 border-l border-slate-200 text-left font-mono">۳۰۰,۰۰۰</td>
                          {design.widgets.showItemDiscountField && <td className="p-2 border-l border-slate-200 text-left font-mono">۰</td>}
                          <td className="p-2 text-left font-bold font-mono">۳۰۰,۰۰۰</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              }

              // ۴. محاسبات مالی نهایی
              if (secId === 'financial_receipt') {
                return (
                  <div key="financial_receipt" className="space-y-3 mb-4 text-[10.5px]" id="prev-sec-financial">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      
                      {/* توضیحات و متن شرایط فروش */}
                      <div className="md:col-span-7 border border-slate-200 p-3 rounded-xl bg-slate-50/50 space-y-1">
                        <span className="font-bold text-slate-700 block text-[11px]">قوانین چاپی و پی‌نویس شرایط معامله:</span>
                        {design.widgets.showTermsAndFooterText ? (
                          <p className="text-slate-500 text-[10px] leading-relaxed text-justify italic">
                            {design.customTermsNote || 'ثبت این سند حاکی از پذیرش کامل تمامی شرایط و تحویل اقلام فوق به صورت سالم می‌باشد.'}
                          </p>
                        ) : (
                          <p className="text-slate-400 text-[9.5px] italic">توضیحات و شرایط فروش در فاکتور چاپی نهایی توسط شما مخفی یا غیرفعال شده است.</p>
                        )}
                      </div>

                      {/* جزئیات قیمت نهایی فاکتور */}
                      <div className="md:col-span-5 border border-slate-205 py-2 px-3.5 rounded-xl bg-slate-100/50 space-y-1.5 divide-y divide-slate-250">
                        <div className="flex justify-between items-center pb-1 text-slate-600">
                          <span>جمع ردیف‌های خام صادر شده:</span>
                          <span className="font-mono font-bold">۵۴۰,۰۰۰ تومان</span>
                        </div>
                        {design.widgets.showItemDiscountField && (
                          <div className="flex justify-between items-center py-1 text-red-650 h-6">
                            <span>کاهش تخفیفات معامله:</span>
                            <span className="font-mono font-bold">-۱۰,۰۰۰ تومان</span>
                          </div>
                        )}
                        {design.widgets.showTaxAndAdditions && (
                          <div className="flex justify-between items-center py-1 text-slate-600 h-6">
                            <span>مالیات ارزش افزوده (۱۰٪):</span>
                            <span className="font-mono font-bold">۵۳,۰۰۰ تومان</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 font-black text-xs" style={{ color: design.primaryColor }}>
                          <span>مبلغ نهایی قابل تسویه:</span>
                          <span className="font-mono text-xs font-black">۵۸۳,۰۰۰ تومان</span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              }

              // ۵. مهر و امضائات پایین فاکتور
              if (secId === 'signatures') {
                return (
                  <div key="signatures" className="h-auto pb-4 pt-1" id="prev-sec-signatures">
                    {design.widgets.showSignatureBoxes ? (
                      <div className="grid grid-cols-2 gap-4 text-center text-[10.5px]">
                        <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/20 shadow-xs h-24 flex flex-col justify-between">
                          <strong className="text-slate-500 font-bold">{design.customSellerStampLabel || 'مهر و امضای فروشنده'}</strong>
                          <span className="text-[9px] text-slate-400 font-mono italic">مُهر فیزیکی حسابداری آریا</span>
                        </div>
                        <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/20 shadow-xs h-24 flex flex-col justify-between">
                          <strong className="text-slate-500 font-bold">{design.customBuyerSignatureLabel || 'اثر انگشت و امضای خریدار'}</strong>
                          <span className="text-[9px] text-slate-400 italic">گواهی صحت و دریافت فیزیکی کالا</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 border border-dashed border-slate-200 text-slate-400 rounded-xl text-center text-[10px]">
                        کادر امضا و گواهی حقوقی فاکتور غیرفعال گردیده است.
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
            </div>

          </div>
        </div>

        {/* جعبه راهنما درخصوص چاپ دقیق */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-[11px] text-slate-600 space-y-1">
          <span className="font-bold text-slate-705 flex items-center gap-1">
            <Info className="w-4.5 h-4.5 text-blue-500 shrink-0" />
            راهنمای بهینه‌سازی چاپ سیستم آریا (Precision Layout Rule):
          </span>
          <p className="leading-relaxed">
            سازنده با استفاده از رویکرد فاکس‌سایزینگ متراکم پی ریزی شده است. اگر در محیط کاربری ابعاد برگه چاپی را به کوچکی A5 یا فیش‌پرینتر حرارتی (80mm) تغییر دهید، کادرهای فیزیکی، فونت‌ها و خطوط کنتراست فاکتور با مکانیزم **Auto-Scaling Fluid Ratio** بدون برهم خوردن ترازبندی یا ایجاد پدینگ‌های اضافی بلافاصله فشرده شده تا مانع از خروج متون از کادر کاغذ چاپی گردد.
          </p>
        </div>

      </div>

    </div>
  );
}
