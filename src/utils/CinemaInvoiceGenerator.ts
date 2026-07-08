import { CartItem } from '../types';
import { toPersianNums, formatCurrency } from '../pages/Dashboard';

export function generateCinemaInvoiceImage(
  customerName: string,
  items: CartItem[],
  discount: number,
  total: number,
  shopName: string,
  shopPhone: string,
  shopAddress: string
): string {
  // Create virtual canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const itemHeight = 60;
  const padding = 50;
  const headerHeight = 320;
  const footerHeight = 320;
  const contentHeight = Math.max(200, items.length * itemHeight);
  
  canvas.width = 700;
  canvas.height = headerHeight + contentHeight + footerHeight;

  // Background - Dark slate vintage cinema theme
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Retro golden borders
  ctx.strokeStyle = '#e2e8f0'; // slate-200
  ctx.lineWidth = 2;
  ctx.strokeRect(padding / 2, padding / 2, canvas.width - padding, canvas.height - padding);

  ctx.strokeStyle = '#fbbf24'; // amber-400 (golden ticket border)
  ctx.lineWidth = 4;
  ctx.strokeRect(padding - 10, padding - 10, canvas.width - 2 * padding + 20, canvas.height - 2 * padding + 20);

  // Filmstrip design along the top and bottom
  const drawFilmstrip = (y: number) => {
    ctx.fillStyle = '#1e293b'; // slate-800 ribbon
    ctx.fillRect(padding, y, canvas.width - 2 * padding, 40);
    
    ctx.fillStyle = '#f8fafc'; // slate-50 holes
    const holeWidth = 15;
    const holeHeight = 22;
    const spacing = 25;
    for (let x = padding + 15; x < canvas.width - padding - 15; x += spacing) {
      ctx.fillRect(x, y + 9, holeWidth, holeHeight);
    }
  };

  drawFilmstrip(padding + 10);
  drawFilmstrip(canvas.height - padding - 50);

  // Header Title
  ctx.fillStyle = '#fbbf24'; // amber-400
  ctx.font = 'bold 36px Tahoma, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('بـلـیـط رسـانـه (فـاکـتـور خـریـد)', canvas.width / 2, padding + 100);

  // Shop Name & Details
  ctx.fillStyle = '#f8fafc';
  ctx.font = '20px Tahoma, Arial, sans-serif';
  ctx.fillText(shopName, canvas.width / 2, padding + 145);

  // Divider line
  ctx.strokeStyle = '#475569'; // slate-600
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(padding + 20, padding + 180);
  ctx.lineTo(canvas.width - padding - 20, padding + 180);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // Customer & Date Info (RTL alignment)
  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = 'bold 16px Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('مشتری محترم:', canvas.width - padding - 30, padding + 215);

  ctx.fillStyle = '#f1f5f9'; // slate-100
  ctx.font = 'bold 18px Tahoma, Arial, sans-serif';
  ctx.fillText(customerName || 'مشتری عمومی', canvas.width - padding - 150, padding + 215);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px Tahoma, Arial, sans-serif';
  ctx.fillText('تاریخ صدور:', canvas.width - padding - 30, padding + 250);

  const jalaliDate = new Date().toLocaleDateString('fa-IR');
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 16px Tahoma, Arial, sans-serif';
  ctx.fillText(jalaliDate, canvas.width - padding - 150, padding + 250);

  // Column Headers
  ctx.fillStyle = '#334155'; // slate-700 header background
  ctx.fillRect(padding + 20, padding + 280, canvas.width - 2 * padding - 40, 45);

  ctx.fillStyle = '#fbbf24'; // amber text for column headers
  ctx.font = 'bold 15px Tahoma, Arial, sans-serif';
  
  // Columns X coordinates (RTL: Item, Details, Price)
  const xItemName = canvas.width - padding - 60;
  const xDetails = canvas.width - padding - 340;
  const xPrice = padding + 60;

  ctx.fillText('عنوان فیلم / سریال', xItemName, padding + 302);
  ctx.fillText('جزییات', xDetails, padding + 302);
  ctx.textAlign = 'left';
  ctx.fillText('قیمت (تومان)', xPrice, padding + 302);

  // Draw Items List
  let currentY = padding + 345;
  ctx.font = '14px Tahoma, Arial, sans-serif';
  
  items.forEach((item, index) => {
    // Alternating background row highlight
    if (index % 2 === 0) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.fillRect(padding + 20, currentY - 10, canvas.width - 2 * padding - 40, itemHeight);
    }

    ctx.textAlign = 'right';
    // Number and Title Fa
    ctx.fillStyle = '#ffffff';
    const numFa = toPersianNums((index + 1).toString());
    const titleTruncated = item.mediaTitle.length > 30 ? item.mediaTitle.substring(0, 28) + '...' : item.mediaTitle;
    ctx.fillText(`${numFa}. ${titleTruncated}`, xItemName, currentY + 20);

    // Details description
    ctx.fillStyle = '#cbd5e1'; // slate-300
    ctx.fillText(item.details, xDetails, currentY + 20);

    // Price
    ctx.fillStyle = '#34d399'; // emerald-400
    ctx.textAlign = 'left';
    ctx.fillText(toPersianNums(formatCurrency(item.salePrice)), xPrice, currentY + 20);

    currentY += itemHeight;
  });

  // Divider before summary
  ctx.strokeStyle = '#475569';
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(padding + 20, currentY + 10);
  ctx.lineTo(canvas.width - padding - 20, currentY + 10);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  currentY += 40;

  // Invoice Summary Block
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(padding + 40, currentY, canvas.width - 2 * padding - 80, 140);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding + 40, currentY, canvas.width - 2 * padding - 80, 140);

  // Subtotal
  const subtotal = items.reduce((sum, item) => sum + item.salePrice, 0);
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px Tahoma, Arial, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('جمع کل بلیط‌ها:', canvas.width - padding - 80, currentY + 35);
  ctx.textAlign = 'left';
  ctx.fillText(`${toPersianNums(formatCurrency(subtotal))} تومان`, padding + 80, currentY + 35);

  // Discount
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f87171'; // red-400
  ctx.fillText('تخفیف ویژه:', canvas.width - padding - 80, currentY + 70);
  ctx.textAlign = 'left';
  ctx.fillText(`- ${toPersianNums(formatCurrency(discount))} تومان`, padding + 80, currentY + 70);

  // Total Payable
  ctx.textAlign = 'right';
  ctx.fillStyle = '#34d399'; // emerald-400
  ctx.font = 'bold 18px Tahoma, Arial, sans-serif';
  ctx.fillText('مبلغ قابل پرداخت:', canvas.width - padding - 80, currentY + 110);
  ctx.textAlign = 'left';
  ctx.fillText(`${toPersianNums(formatCurrency(total))} تومان`, padding + 80, currentY + 110);

  // Footer / Shop Details
  const footerY = canvas.height - padding - 180;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px Tahoma, Arial, sans-serif';
  
  if (shopPhone) {
    ctx.fillText(`تلفن تماس: ${toPersianNums(shopPhone)}`, canvas.width / 2, footerY);
  }
  if (shopAddress) {
    ctx.fillText(`آدرس: ${shopAddress}`, canvas.width / 2, footerY + 30);
  }

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'italic bold 15px Tahoma, Arial, sans-serif';
  ctx.fillText('از تماشای این آثار سینمایی لذت ببرید!', canvas.width / 2, footerY + 75);

  return canvas.toDataURL('image/png');
}
