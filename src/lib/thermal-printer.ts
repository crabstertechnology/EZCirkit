import { BillingSale } from '@/types/billing';

export interface StoreInfo {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeGstin?: string;
  storeEmail?: string;
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
 * Shared helper to print an HTML string using an isolated hidden iframe
 */
function printHtmlInIframe(html: string, iframeId: string) {
  if (typeof window === 'undefined') return;

  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
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
  }, 250);
}

/**
 * Generates an ultra-professional, corporate A4 Tax Invoice / PDF.
 * Formatted with modern clean typography, structured tables, header branding,
 * itemized taxes, and signature/terms blocks.
 */
export function printA4Invoice(sale: BillingSale, storeInfo: StoreInfo = {}) {
  if (typeof window === 'undefined' || !sale) return;

  const storeName = storeInfo.storeName || 'CRABSTER TECHNOLOGY';
  const storeAddress = storeInfo.storeAddress || 'Making Electronics Easy, Affordable, and Understandable.';
  const storePhone = storeInfo.storePhone || '+91 7010396642';
  const storeEmail = storeInfo.storeEmail || 'crabstertechnology@gmail.com';
  const storeGstin = storeInfo.storeGstin || '';

  const isRefund = sale.grandTotal < 0 || sale.status === 'refunded';
  const formattedDate = new Date(sale.date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const itemsRows = (sale.items || [])
    .map((item, index) => {
      const isRet = item.isReturn;
      const unitPriceFormatted = `₹${item.unitPrice.toFixed(2)}`;
      const totalFormatted =
        item.total < 0
          ? `-₹${Math.abs(item.total).toFixed(2)}`
          : `₹${item.total.toFixed(2)}`;
      const discountFormatted =
        item.discount && item.discount > 0 ? `-₹${item.discount.toFixed(2)}` : '—';

      return `
        <tr style="border-bottom: 1px solid #e4e4e7;">
          <td style="padding: 10px 12px; text-align: center; color: #71717a; font-size: 12px;">${index + 1}</td>
          <td style="padding: 10px 12px; text-align: left;">
            <div style="font-weight: 700; color: ${isRet ? '#dc2626' : '#18181b'}; font-size: 13px;">
              ${escapeHtml(item.name)}
              ${isRet ? '<span style="font-size: 10px; background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-weight: 800; margin-left: 6px;">RETURN</span>' : ''}
            </div>
            ${item.sku && item.sku !== 'N/A' ? `<div style="font-size: 11px; color: #71717a; font-family: monospace; margin-top: 2px;">SKU: ${escapeHtml(item.sku)}</div>` : ''}
          </td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #18181b; font-size: 13px;">${item.quantity}</td>
          <td style="padding: 10px 12px; text-align: right; color: #27272a; font-size: 13px; white-space: nowrap;">${unitPriceFormatted}</td>
          <td style="padding: 10px 12px; text-align: right; color: ${item.discount > 0 ? '#16a34a' : '#71717a'}; font-size: 12px; white-space: nowrap;">${discountFormatted}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: ${isRet ? '#dc2626' : '#18181b'}; font-size: 13px; white-space: nowrap;">${totalFormatted}</td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice - ${escapeHtml(sale.billNumber)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #18181b;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-container {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f97316;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #f97316;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .brand-sub {
      font-size: 12px;
      color: #52525b;
      max-width: 380px;
      margin-bottom: 2px;
    }
    .brand-contact {
      font-size: 11px;
      color: #71717a;
      margin-top: 4px;
    }
    .invoice-badge-block {
      text-align: right;
    }
    .invoice-type {
      font-size: 20px;
      font-weight: 900;
      color: ${isRefund ? '#dc2626' : '#18181b'};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .badge-pill {
      display: inline-block;
      background: ${isRefund ? '#fee2e2' : '#ffedd5'};
      color: ${isRefund ? '#dc2626' : '#ea580c'};
      font-weight: 800;
      font-size: 13px;
      padding: 4px 10px;
      border-radius: 6px;
      font-family: monospace;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 22px;
    }
    .info-col {
      flex: 1;
    }
    .info-col-title {
      font-size: 10px;
      font-weight: 800;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
    }
    .info-line {
      margin-bottom: 3px;
      font-size: 12.5px;
    }
    .info-line strong {
      color: #18181b;
      font-weight: 700;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table thead tr {
      background: #18181b;
      color: #ffffff;
    }
    .items-table th {
      padding: 9px 12px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 15px;
      gap: 30px;
    }
    .notes-box {
      flex: 1.2;
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 11.5px;
      color: #52525b;
    }
    .notes-box h4 {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #18181b;
      margin-bottom: 6px;
    }
    .totals-box {
      flex: 1;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 14px;
      border-bottom: 1px solid #f4f4f5;
      font-size: 12.5px;
    }
    .totals-row.grand-total {
      background: #18181b;
      color: #ffffff;
      font-size: 15px;
      font-weight: 900;
      padding: 10px 14px;
      border-bottom: none;
    }
    .grand-total-amount {
      color: #f97316;
      font-size: 16px;
      font-weight: 900;
    }
    .signatory-box {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 10px;
      border-top: 1px solid #e4e4e7;
    }
    .signatory-line {
      text-align: right;
    }
    .signatory-line p {
      font-size: 11px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header Row -->
    <div class="header-row">
      <div>
        <div class="brand-title">${escapeHtml(storeName)}</div>
        <div class="brand-sub">${escapeHtml(storeAddress)}</div>
        <div class="brand-contact">
          <span>Phone: <strong>${escapeHtml(storePhone)}</strong></span>
          ${storeEmail ? ` &bull; <span>Email: <strong>${escapeHtml(storeEmail)}</strong></span>` : ''}
          ${storeGstin ? ` &bull; <span>GSTIN: <strong>${escapeHtml(storeGstin)}</strong></span>` : ''}
        </div>
      </div>

      <div class="invoice-badge-block">
        <div class="invoice-type">${isRefund ? 'REFUND NOTE' : 'TAX INVOICE'}</div>
        <div class="badge-pill">${escapeHtml(sale.billNumber)}</div>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="info-grid">
      <div class="info-col">
        <div class="info-col-title">Billed To (Customer)</div>
        <div class="info-line"><strong>${escapeHtml(sale.customerName)}</strong></div>
        ${sale.customerPhone && sale.customerPhone !== 'Walk-in' ? `<div class="info-line">Phone: ${escapeHtml(sale.customerPhone)}</div>` : '<div class="info-line" style="color: #71717a;">Walk-in Store Customer</div>'}
      </div>

      <div class="info-col" style="text-align: right;">
        <div class="info-col-title">Invoice Details</div>
        <div class="info-line">Date: <strong>${formattedDate}</strong></div>
        <div class="info-line">Payment Mode: <strong style="text-transform: uppercase;">${escapeHtml(sale.paymentMethod)}</strong></div>
        <div class="info-line">Billed By: <strong>${escapeHtml(sale.cashierName)}</strong></div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 6%; text-align: center;">#</th>
          <th style="width: 48%; text-align: left;">Item Description</th>
          <th style="width: 10%; text-align: center;">Qty</th>
          <th style="width: 12%; text-align: right;">Unit Price</th>
          <th style="width: 10%; text-align: right;">Disc</th>
          <th style="width: 14%; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- Bottom Totals & Notes -->
    <div class="bottom-section">
      <div class="notes-box">
        <h4>Terms &amp; Conditions</h4>
        <p style="margin-bottom: 4px;">1. Goods once sold can be exchanged within 7 days against original invoice and intact packaging.</p>
        <p style="margin-bottom: 4px;">2. Warranty claims are subject to manufacturer terms and inspection.</p>
        <p>3. Thank you for choosing Crabster Technology for your electronics and robotics projects!</p>
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span style="color: #71717a;">Gross Subtotal:</span>
          <strong>₹${sale.amount.toFixed(2)}</strong>
        </div>
        ${sale.discount > 0 ? `
        <div class="totals-row" style="color: #16a34a;">
          <span>Total Discount:</span>
          <strong>-₹${sale.discount.toFixed(2)}</strong>
        </div>` : ''}
        ${sale.tax > 0 ? `
        <div class="totals-row">
          <span style="color: #71717a;">Tax:</span>
          <strong>₹${sale.tax.toFixed(2)}</strong>
        </div>` : ''}
        <div class="totals-row grand-total">
          <span>${isRefund ? 'NET REFUND PAID:' : 'GRAND TOTAL:'}</span>
          <span class="grand-total-amount">₹${Math.abs(sale.grandTotal).toFixed(2)}</span>
        </div>
        ${sale.paymentMethod === 'cash' && typeof sale.cashReceived === 'number' && sale.cashReceived > 0 ? `
        <div class="totals-row" style="font-size: 11.5px; color: #52525b;">
          <span>Cash Tendered:</span>
          <span>₹${sale.cashReceived.toFixed(2)}</span>
        </div>
        ${sale.changeReturned !== undefined && sale.changeReturned > 0 ? `
        <div class="totals-row" style="font-size: 11.5px; color: #16a34a; font-weight: 700;">
          <span>Change Returned:</span>
          <span>₹${sale.changeReturned.toFixed(2)}</span>
        </div>` : ''}
        ` : ''}
      </div>
    </div>

    <!-- Signatory Footer -->
    <div class="signatory-box">
      <div>
        <p style="font-size: 11px; color: #71717a;">This is a computer generated invoice.</p>
      </div>
      <div class="signatory-line">
        <p style="font-weight: 700; color: #18181b; margin-bottom: 30px;">For ${escapeHtml(storeName)}</p>
        <p style="border-top: 1px dashed #a1a1aa; padding-top: 4px; display: inline-block; min-width: 140px;">Authorized Signatory</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  printHtmlInIframe(html, 'a4-invoice-print-frame');
}

/**
 * Generates a clean, modern, high-contrast 80mm thermal receipt.
 * Uses clean sans-serif typography, solid divider rules, and single-line rates
 * to prevent the awkward wrapping and overlapping monospace bugs.
 */
export function printThermalReceipt(sale: BillingSale, storeInfo: StoreInfo = {}) {
  if (typeof window === 'undefined' || !sale) return;

  const storeName = storeInfo.storeName || 'CRABSTER TECHNOLOGY';
  const storeAddress = storeInfo.storeAddress || 'Making Electronics Easy, Affordable, and Understandable.';
  const storePhone = storeInfo.storePhone || '7010396642';

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
          ? `-₹${Math.abs(item.total).toFixed(2)}`
          : `₹${item.total.toFixed(2)}`;
      return `
      <tr>
        <td style="padding: 4px 0; vertical-align: top; text-align: left; width: 44%;">
          <div style="font-weight: 700; color: ${isRet ? '#dc2626' : '#000000'}; font-size: 11px; line-height: 1.25;">
            ${escapeHtml(item.name)} ${isRet ? '<span style="font-size: 8px; border: 1px solid #dc2626; padding: 0 3px; font-weight: bold; margin-left: 2px;">RETURN</span>' : ''}
          </div>
          ${item.sku && item.sku !== 'N/A' ? `<div style="font-size: 9px; color: #666; font-family: monospace;">SKU: ${escapeHtml(item.sku)}</div>` : ''}
          ${item.discount > 0 ? `<div style="font-size: 9px; color: #16a34a; font-weight: 600;">Disc: -₹${item.discount.toFixed(2)}</div>` : ''}
        </td>
        <td style="padding: 4px 0; text-align: center; vertical-align: top; font-weight: 700; width: 12%; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right; vertical-align: top; width: 22%; font-size: 11px; white-space: nowrap;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 4px 0; text-align: right; vertical-align: top; font-weight: 800; color: ${isRet ? '#dc2626' : '#000000'}; width: 22%; font-size: 11px; white-space: nowrap;">
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
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 76mm;
      margin: 0 auto;
      padding: 4mm 2mm;
      background: #ffffff !important;
      color: #000000 !important;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .divider {
      border-bottom: 1px solid #222222;
      margin: 6px 0;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2.5px;
      font-size: 11px;
    }
    .header {
      text-align: center;
      padding-bottom: 6px;
    }
    .store-name {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .store-sub {
      font-size: 10px;
      color: #333;
      margin-bottom: 1px;
    }
    .invoice-title {
      font-size: 11.5px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-top: 6px;
      padding: 3px 0;
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      text-transform: uppercase;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
    }
    .items-table th {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 4px 0;
      border-bottom: 1.5px solid #000;
    }
    .grand-total-box {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 900;
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      padding: 5px 0;
      margin: 6px 0;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      padding-top: 8px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${escapeHtml(storeName)}</div>
    <div class="store-sub">${escapeHtml(storeAddress)}</div>
    <div class="store-sub">Ph: ${escapeHtml(storePhone)}</div>
    <div class="invoice-title">${isRefund ? 'REFUND NOTE' : 'RETAIL TAX INVOICE'}</div>
  </div>

  <div style="padding: 2px 0;">
    <div class="flex-row">
      <span style="color: #444;">Bill No:</span>
      <span class="font-bold" style="font-family: monospace;">${escapeHtml(sale.billNumber)}</span>
    </div>
    <div class="flex-row">
      <span style="color: #444;">Date:</span>
      <span>${formattedDate}</span>
    </div>
    <div class="flex-row">
      <span style="color: #444;">Customer:</span>
      <span class="font-bold">${escapeHtml(sale.customerName)}</span>
    </div>
    ${sale.customerPhone && sale.customerPhone !== 'Walk-in' ? `
    <div class="flex-row">
      <span style="color: #444;">Phone:</span>
      <span>${escapeHtml(sale.customerPhone)}</span>
    </div>` : ''}
    <div class="flex-row">
      <span style="color: #444;">Cashier:</span>
      <span>${escapeHtml(sale.cashierName)}</span>
    </div>
  </div>

  <div class="divider"></div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align: left; width: 44%;">ITEM</th>
        <th style="text-align: center; width: 12%;">QTY</th>
        <th style="text-align: right; width: 22%;">RATE</th>
        <th style="text-align: right; width: 22%;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div style="padding: 2px 0;">
    <div class="flex-row">
      <span>Gross Subtotal:</span>
      <span>₹${sale.amount.toFixed(2)}</span>
    </div>
    ${sale.discount > 0 ? `
    <div class="flex-row font-bold" style="color: #16a34a;">
      <span>Discount:</span>
      <span>-₹${sale.discount.toFixed(2)}</span>
    </div>` : ''}
    ${sale.tax > 0 ? `
    <div class="flex-row">
      <span>Tax:</span>
      <span>₹${sale.tax.toFixed(2)}</span>
    </div>` : ''}
    <div class="grand-total-box">
      <span>${isRefund ? 'NET REFUND:' : 'GRAND TOTAL:'}</span>
      <span>₹${Math.abs(sale.grandTotal).toFixed(2)}</span>
    </div>
    <div class="flex-row">
      <span style="color: #444;">Payment Mode:</span>
      <span class="font-bold" style="text-transform: uppercase;">${escapeHtml(sale.paymentMethod)}</span>
    </div>
    ${sale.paymentMethod === 'cash' && typeof sale.cashReceived === 'number' && sale.cashReceived > 0 ? `
    <div class="flex-row">
      <span style="color: #444;">Cash Tendered:</span>
      <span>₹${sale.cashReceived.toFixed(2)}</span>
    </div>
    ${sale.changeReturned !== undefined && sale.changeReturned > 0 ? `
    <div class="flex-row font-bold" style="color: #16a34a;">
      <span>Change Returned:</span>
      <span>₹${sale.changeReturned.toFixed(2)}</span>
    </div>` : ''}
    ` : ''}
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div class="font-bold" style="margin-bottom: 2px;">THANK YOU FOR SHOPPING!</div>
    <div style="font-size: 9.5px; color: #444; margin-top: 3px;">Electronics &bull; Arduino &bull; Robotics &bull; Kits</div>
  </div>
</body>
</html>`;

  printHtmlInIframe(html, 'thermal-print-frame');
}
