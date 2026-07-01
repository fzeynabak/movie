export interface InvoiceWidgetVisibility {
  showLogo: boolean;
  showInvoiceBarcode: boolean;
  showPaymentStatusBadge: boolean;
  showSellerDetails: boolean;
  showBuyerDetails: boolean;
  showItemIndexNumber: boolean;
  showBarcodeColumn: boolean;
  showUnitColumn: boolean;
  showItemDiscountField: boolean;
  showTaxAndAdditions: boolean;
  showTermsAndFooterText: boolean;
  showSignatureBoxes: boolean;
}

export interface InvoiceTemplateDesign {
  layoutName: 'standard-v1' | 'minimal-modern' | 'compact-bento' | 'thermal-receipt';
  primaryColor: string; // Accent color hex
  secondaryColor: string; // Table header background
  borderColor: string; // Line element color
  borderStyle: 'solid' | 'dashed' | 'double' | 'zinc';
  fontFamily: 'Inter' | 'Vazirmatn' | 'JetBrains Mono' | 'Segoe UI';
  fontSizeScale: 'sm' | 'base' | 'lg' | 'xl';
  layoutPadding: number; // in pixels (e.g., 12, 16, 24)
  lineWidth: number; // border thickness px (1, 2, 3)
  customInvoiceTitle: string;
  customTermsNote: string;
  customSellerStampLabel: string;
  customBuyerSignatureLabel: string;
  
  // Custom Section Order (Dynamic rendering according to sequence - Elementor style!)
  sectionsOrder: string[]; // ['header', 'entities_info', 'items_table', 'financial_receipt', 'signatures']
  
  widgets: InvoiceWidgetVisibility;
  shapeStyle?: 'none' | 'modern-diagonal' | 'minimal-geometric' | 'abstract-wave';
}

export const DEFAULT_DESIGN: InvoiceTemplateDesign = {
  layoutName: 'standard-v1',
  primaryColor: '#059669', // Emerald 600
  secondaryColor: '#f1f5f9', // slate 100
  borderColor: '#0f172a', // Slate 900
  borderStyle: 'solid',
  fontFamily: 'Vazirmatn',
  fontSizeScale: 'base',
  layoutPadding: 24,
  lineWidth: 2,
  customInvoiceTitle: 'صورتحساب رسمی فروش کالا و ارائه خدمات',
  customTermsNote: 'کالاها طبق قوانین تجارت کاتالوگ فروش صادر شده و به تایید و ثبات کامل متعاملین معامله رسیده است. با امضای این سند، صحت کالا و انجام تعهدات طرفین گواهی می‌شود.',
  customSellerStampLabel: 'محل مهر و امضای صادرکننده فاکتور (فروشگاه)',
  customBuyerSignatureLabel: 'محل امضا و اثرانگشت خریدار (طرف حساب تجاری)',
  shapeStyle: 'modern-diagonal',
  
  sectionsOrder: ['header', 'entities_info', 'items_table', 'financial_receipt', 'signatures'],
  
  widgets: {
    showLogo: true,
    showInvoiceBarcode: true,
    showPaymentStatusBadge: true,
    showSellerDetails: true,
    showBuyerDetails: true,
    showItemIndexNumber: true,
    showBarcodeColumn: true,
    showUnitColumn: true,
    showItemDiscountField: true,
    showTaxAndAdditions: true,
    showTermsAndFooterText: true,
    showSignatureBoxes: true,
  }
};

export class InvoiceDesignerService {
  private static KEY = 'cofeclick_invoice_designer_v1';

  static get(): InvoiceTemplateDesign {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) {
      return { ...DEFAULT_DESIGN };
    }
    try {
      const parsed = JSON.parse(raw);
      // Ensure section orders are maintained from parsed structure
      return { 
        ...DEFAULT_DESIGN, 
        ...parsed,
        widgets: { ...DEFAULT_DESIGN.widgets, ...parsed.widgets },
        sectionsOrder: parsed.sectionsOrder && parsed.sectionsOrder.length > 0 ? parsed.sectionsOrder : [...DEFAULT_DESIGN.sectionsOrder]
      };
    } catch {
      return { ...DEFAULT_DESIGN };
    }
  }

  static save(design: InvoiceTemplateDesign): void {
    localStorage.setItem(this.KEY, JSON.stringify(design));
    window.dispatchEvent(new Event('cofeclick_designer_updated'));
  }
}
