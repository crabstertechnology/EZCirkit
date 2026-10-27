import { BillingSale } from '@/types/billing';

interface StoreInfo {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeGstin?: string;
}

/**
 * Escapes HTML characters for safe template string rendering
 */
function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates stand-alone HTML for an 80mm thermal receipt and sends it directly
 * to the print engine using an isolated hidden iframe.
 * Avoids any collisions with React portal, Radix Dialog, Tailwind styles, or dark-mode CSS.
 */
export function printThermalReceipt(sale: BillingSale, storeInfo: StoreInfo = {}) {
  if (typeof window === 'undefined' || !sale) return;

  const storeName = storeInfo.storeName || 'Crabster Technology';
  const storeAddress = storeInfo.storeAddress || 'Making Electronics Easy, Affordable, and Understandable.';
  const storePhone = storeInfo.storePhone || '+91 98765 43210';
  const storeGstin = storeInfo.storeGstin || '33ABCDE1234F1Z5';

  const isRefund = sale.grandTotal < 0 || sale.status === 'refunded';
  const formattedDate = new Date(sale.date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const itemsRows = (sale.items || [])
    .map((item) => {
      const isRet = item.isReturn;
      const totalFormatted =
        item.total < 0
          ? `-Rs. ${Math.abs(item.total).toFixed(2)}`
          : `Rs. ${item.total.toFixed(2)}`;
      return `
      <tr>
        <td style="padding: 3px 0; vertical-align: top; text-align: left; width: 46%;">
          <div style="font-weight: 700; color: ${isRet ? '#b91c1c' : '#000000'};">
            ${escapeHtml(item.name)} ${isRet ? '<span style="font-size:8px; border:1px solid #b91c1c; padding:0 3px; font-weight:bold; margin-left:3px;">RETURN</span>' : ''}
          </div>
          ${item.sku && item.sku !== 'N/A' ? `<div style="font-size: 9px; color: #555;">SKU: ${escapeHtml(item.sku)}</div>` : ''}
          ${item.discount > 0 ? `<div style="font-size: 9px; color: #15803d;">Disc: -Rs. ${item.discount.toFixed(2)}</div>` : ''}
        </td>
        <td style="padding: 3px 0; text-align: center; vertical-align: top; font-weight: 600; width: 14%;">${item.quantity}</td>
        <td style="padding: 3px 0; text-align: right; vertical-align: top; width: 18%;">Rs. ${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 3px 0; text-align: right; vertical-align: top; font-weight: 700; color: ${isRet ? '#b91c1c' : '#000000'}; width: 22%;">
          ${totalFormatted}
        </td>
      </tr>
    `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${escapeHtml(sale.billNumber)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace, monospace;
    }
    html, body {
      width: 76mm;
      margin: 0 auto;
      padding: 3mm 2mm;
      background: #ffffff !important;
      color: #000000 !important;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body {
        width: 76mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
      }
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .dashed-divider {
      border-bottom: 1px dashed #000000;
      margin: 5px 0;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 10.5px;
    }
    .header {
      text-align: center;
      padding-bottom: 4px;
    }
    .store-name {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .store-sub {
      font-size: 10px;
      color: #222;
      margin-bottom: 1px;
    }
    .invoice-title {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-top: 4px;
      padding: 2px 0;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      text-transform: uppercase;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: 10.5px;
    }
    .items-table th {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 3px 0;
      border-bottom: 1px solid #000;
    }
    .grand-total-box {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 900;
      border-top: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
      padding: 4px 0;
      margin: 4px 0;
    }
    .footer {
      text-align: center;
      font-size: 9.5px;
      padding-top: 6px;
      color: #222;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${escapeHtml(storeName)}</div>
    <div class="store-sub">${escapeHtml(storeAddress)}</div>
    <div class="store-sub">Phone: ${escapeHtml(storePhone)}</div>
    ${storeGstin ? `<div class="store-sub">GSTIN: ${escapeHtml(storeGstin)}</div>` : ''}
    <div class="invoice-title">${isRefund ? 'REFUND CREDIT NOTE' : 'RETAIL TAX INVOICE'}</div>
  </div>

  <div style="padding: 2px 0;">
    <div class="flex-row">
      <span>Bill No:</span>
      <span class="font-bold">${escapeHtml(sale.billNumber)}</span>
    </div>
    <div class="flex-row">
      <span>Date:</span>
      <span>${formattedDate}</span>
    </div>
    <div class="flex-row">
      <span>Customer:</span>
      <span class="font-bold">${escapeHtml(sale.customerName)}</span>
    </div>
    ${sale.customerPhone && sale.customerPhone !== 'Walk-in' ? `
    <div class="flex-row">
      <span>Phone:</span>
      <span>${escapeHtml(sale.customerPhone)}</span>
    </div>` : ''}
    <div class="flex-row">
      <span>Cashier:</span>
      <span>${escapeHtml(sale.cashierName)}</span>
    </div>
  </div>

  <div class="dashed-divider"></div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align: left; width: 46%;">ITEM</th>
        <th style="text-align: center; width: 14%;">QTY</th>
        <th style="text-align: right; width: 18%;">RATE</th>
        <th style="text-align: right; width: 22%;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="dashed-divider"></div>

  <div style="padding: 2px 0;">
    <div class="flex-row">
      <span>Gross Subtotal:</span>
      <span>Rs. ${sale.amount.toFixed(2)}</span>
    </div>
    ${sale.discount > 0 ? `
    <div class="flex-row font-bold" style="color: #15803d;">
      <span>Total Discount:</span>
      <span>-Rs. ${sale.discount.toFixed(2)}</span>
    </div>` : ''}
    ${sale.tax > 0 ? `
    <div class="flex-row">
      <span>Tax (GST):</span>
      <span>Rs. ${sale.tax.toFixed(2)}</span>
    </div>` : ''}
    <div class="grand-total-box">
      <span>${isRefund ? 'NET REFUND PAID:' : 'GRAND TOTAL:'}</span>
      <span>Rs. ${Math.abs(sale.grandTotal).toFixed(2)}</span>
    </div>
    <div class="flex-row">
      <span>Payment Mode:</span>
      <span class="font-bold" style="text-transform: uppercase;">${escapeHtml(sale.paymentMethod)}</span>
    </div>
    ${sale.paymentMethod === 'cash' && typeof sale.cashReceived === 'number' && sale.cashReceived > 0 ? `
    <div class="flex-row">
      <span>Cash Tendered:</span>
      <span>Rs. ${sale.cashReceived.toFixed(2)}</span>
    </div>
    ${sale.changeReturned !== undefined && sale.changeReturned > 0 ? `
    <div class="flex-row font-bold" style="color: #15803d;">
      <span>Change Returned:</span>
      <span>Rs. ${sale.changeReturned.toFixed(2)}</span>
    </div>` : ''}
    ` : ''}
  </div>

  <div class="dashed-divider"></div>

  <div class="footer">
    <div class="font-bold" style="margin-bottom: 3px;">THANK YOU FOR SHOPPING!</div>
    <div class="font-bold" style="font-size: 11px; margin: 4px 0; letter-spacing: 0.5px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0;">*** NO RETURN • NO REFUND ***</div>
    <div style="font-size: 8.5px; color: #222; margin-top: 2px;">Goods once sold will not be taken back or refunded.</div>
    <div style="margin-top: 6px; font-size: 8px; color: #666;">*** END OF RECEIPT ***</div>
  </div>
</body>
</html>`;

  // Check or create isolated print iframe
  let iframe = document.getElementById('thermal-print-frame') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('Cannot access iframe document, falling back to window.open');
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Allow browser layout engine to render before triggering print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Iframe print error:', e);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }
  }, 200);
}
