import { CartItem } from '../types';

/**
 * Generates a stunning retro cinema-ticket-style invoice as a Base64 PNG image using HTML5 Canvas.
 * Incorporates film-strip sprocket side borders, a clapperboard slate header, customized item prices,
 * a pseudo-barcode, and a vintage red circular PAID stamp.
 */
export function generateCinemaInvoiceImage(
  customerName: string,
  cart: CartItem[],
  discount: number,
  totalPrice: number,
  shopName: string,
  shopPhone: string,
  shopAddress: string
): string {
  if (typeof document === 'undefined') return '';
  
  const canvas = document.createElement('canvas');
  const itemHeight = 45;
  const headerHeight = 180;
  const footerHeight = 220;
  const width = 600;
  const height = headerHeight + cart.length * itemHeight + footerHeight;
  
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Helper to convert to Persian digits
  const toFa = (str: string | number): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(str).replace(/[0-9]/g, (w) => persianDigits[parseInt(w)]);
  };

  const formatMoney = (val: number) => {
    return toFa(val.toLocaleString()) + ' تومان';
  };

  // 1. Draw Background: Warm vintage cream paper ticket
  ctx.fillStyle = '#FFFDF6';
  ctx.fillRect(0, 0, width, height);
  
  // Draw ticket borders (fine double border)
  ctx.strokeStyle = '#2B231D';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, width - 10, height - 10);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // 2. Draw Film Strip Sprocket Holes along the left and right margins
  ctx.fillStyle = '#111111';
  const sprocketSize = 12;
  const sprocketGap = 18;
  for (let y = 15; y < height - 15; y += sprocketSize + sprocketGap) {
    // Left sprocket
    ctx.fillRect(16, y, sprocketSize, sprocketSize);
    // Right sprocket
    ctx.fillRect(width - 28, y, sprocketSize, sprocketSize);
  }

  // 3. Draw Movie Slate / Clapperboard Header Graphic
  // Draw Slate Body
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(40, 25, width - 80, 50);
  
  // Draw the clapper slanted stripes
  ctx.fillStyle = '#FFFFFF';
  ctx.save();
  // Clip to the slate body area for slanted stripes
  ctx.beginPath();
  ctx.rect(40, 25, width - 80, 50);
  ctx.clip();
  ctx.fillStyle = '#FFFFFF';
  for (let sx = 20; sx < width; sx += 40) {
    ctx.beginPath();
    ctx.moveTo(sx, 25);
    ctx.lineTo(sx + 20, 25);
    ctx.lineTo(sx + 5, 75);
    ctx.lineTo(sx - 15, 75);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Draw clapper hinge/screws
  ctx.fillStyle = '#888888';
  ctx.beginPath();
  ctx.arc(45, 50, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width - 45, 50, 4, 0, Math.PI * 2);
  ctx.fill();

  // Draw header text on a nice board
  ctx.fillStyle = '#2B231D';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎬 فاکتور رسمی کلوب فیلم و سریال 🎬', width / 2, 105);
  
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#5C4A3C';
  ctx.fillText(`${shopName} | تلفن: ${toFa(shopPhone)}`, width / 2, 125);
  
  // Separator line (Dashed film cut line)
  ctx.strokeStyle = '#8C7A6B';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(40, 140);
  ctx.lineTo(width - 40, 140);
  ctx.stroke();
  ctx.setLineDash([]); // Reset line dash

  // 4. Metadata Block (Customer & Date)
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#2B231D';
  ctx.fillText(`خریدار محترم: ${customerName}`, width - 50, 160);
  
  const todayFa = toFa(new Date().toLocaleDateString('fa-IR'));
  const timeFa = toFa(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
  ctx.textAlign = 'left';
  ctx.fillText(`تاریخ صدور: ${todayFa} - ساعت ${timeFa}`, 50, 160);

  // Draw columns header
  let curY = 190;
  ctx.strokeStyle = '#2B231D';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, curY);
  ctx.lineTo(width - 40, curY);
  ctx.stroke();
  
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#1A1A1A';
  
  // Headers text alignment
  ctx.textAlign = 'right';
  ctx.fillText('ردیف  |  عنوان و مشخصات رسانه', width - 50, curY - 6);
  ctx.textAlign = 'left';
  ctx.fillText('مبلغ فروش (تومان)', 50, curY - 6);

  // 5. Draw cart items
  ctx.font = '11px sans-serif';
  cart.forEach((item, index) => {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2B231D';
    
    // Aligned row numbers and titles
    const rowNum = toFa(index + 1) + '.  ';
    // Truncate title if it is too long to prevent canvas overflow
    let titleStr = item.mediaTitle;
    if (titleStr.length > 35) {
      titleStr = titleStr.substring(0, 32) + '...';
    }
    const detailStr = ` (${item.details})`;
    
    // Row text
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(rowNum, width - 42, curY + 24);
    
    const numWidth = ctx.measureText(rowNum).width;
    ctx.fillText(titleStr, width - 42 - numWidth, curY + 24);
    
    // Draw subtitle details
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#7C6A5C';
    const titleWidth = ctx.measureText(titleStr).width;
    ctx.fillText(detailStr, width - 42 - numWidth - titleWidth, curY + 24);
    
    // Price
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(formatMoney(item.salePrice), 50, curY + 24);
    
    curY += itemHeight;
    
    // Light dash line between rows
    ctx.strokeStyle = '#D9D2C9';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(40, curY);
    ctx.lineTo(width - 40, curY);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // 6. Calculations Block (Summary)
  curY += 10;
  ctx.strokeStyle = '#2B231D';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, curY);
  ctx.lineTo(width - 40, curY);
  ctx.stroke();
  
  const subtotal = cart.reduce((sum, item) => sum + item.salePrice, 0);
  
  // Gross Subtotal
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#5C4A3C';
  ctx.textAlign = 'right';
  ctx.fillText('جمع کل اقلام:', width - 50, curY + 24);
  ctx.textAlign = 'left';
  ctx.fillText(formatMoney(subtotal), 50, curY + 24);
  
  // Discount
  let summaryOffset = 24;
  if (discount > 0) {
    summaryOffset += 24;
    ctx.fillStyle = '#D9383A';
    ctx.textAlign = 'right';
    ctx.fillText('تخفیف فاکتور:', width - 50, curY + summaryOffset);
    ctx.textAlign = 'left';
    ctx.fillText('- ' + formatMoney(discount), 50, curY + summaryOffset);
  }
  
  // Net Payable
  summaryOffset += 30;
  ctx.strokeStyle = '#8C7A6B';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(40, curY + summaryOffset - 12);
  ctx.lineTo(width - 40, curY + summaryOffset - 12);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#0F5132'; // Deep Green for payable amount
  ctx.textAlign = 'right';
  ctx.fillText('مبلغ نهایی تسویه شده:', width - 50, curY + summaryOffset);
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(formatMoney(totalPrice), 50, curY + summaryOffset);
  
  // 7. Footer: Vintage "PAID" stamp, Barcode & Cinema ticket notch cutouts
  curY += summaryOffset + 20;
  
  // Draw Ticket notches (semicircles cut out of left and right margins)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(0, curY, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width, curY, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  // Draw dotted perforation line between cutouts
  ctx.strokeStyle = '#8C7A6B';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(15, curY);
  ctx.lineTo(width - 15, curY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Barcode below perforation
  ctx.fillStyle = '#111111';
  const barcodeY = curY + 25;
  const barcodeHeight = 30;
  ctx.save();
  // Draw pseudo-random barcode lines
  let bx = width / 2 - 100;
  const barPattern = [1, 2, 4, 1, 3, 1, 2, 4, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1];
  for (let i = 0; i < barPattern.length; i++) {
    const barWidth = barPattern[i];
    if (i % 2 === 0) {
      ctx.fillRect(bx, barcodeY, barWidth * 2, barcodeHeight);
    }
    bx += barWidth * 3;
  }
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SERIAL-90218-MC', width / 2, barcodeY + barcodeHeight + 10);
  ctx.restore();

  // Draw Vintage Stamp "PAID / تسویه شد" in Red on the right
  ctx.save();
  ctx.translate(width - 120, curY + 45);
  ctx.rotate(-15 * Math.PI / 180); // Slanted stamp
  
  ctx.strokeStyle = 'rgba(186, 30, 30, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 35, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(186, 30, 30, 0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.fillStyle = 'rgba(186, 30, 30, 0.85)';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('کلوپ رسانه', 0, -10);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('تسویه شد', 0, 6);
  ctx.font = 'bold 8px monospace';
  ctx.fillText('PAID', 0, 20);
  
  ctx.restore();

  // Shop info & thank you
  ctx.fillStyle = '#7C6A5C';
  ctx.font = 'italic 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('با تشکر از حسن خرید شما - تماشای خوشی را برایتان آرزومندیم! 🍿', width / 2, curY + 100);
  ctx.font = '9px sans-serif';
  ctx.fillText(shopAddress, width / 2, curY + 115);

  return canvas.toDataURL('image/png');
}
