import { BillingSale } from '@/types/billing';
import { CRABSTER_LOGO_BASE64 } from './logo-base64';

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
 * Converts a number to Indian Currency words (e.g., Seventy Two Rupees Only)
 */
function numberToWordsINR(amount: number): string {
  const num = Math.round(Math.abs(amount));
  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const t = tens[Math.floor(n / 10)];
    const o = ones[n % 10];
    return o ? `${t} ${o}` : t;
  }

  function convertGroup(n: number): string {
    let res = '';
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (hundred > 0) {
      res += `${ones[hundred]} Hundred`;
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res.trim();
  }

  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const words: string[] = [];
  if (crore > 0) words.push(`${convertGroup(crore)} Crore`);
  if (lakh > 0) words.push(`${convertGroup(lakh)} Lakh`);
  if (thousand > 0) words.push(`${convertGroup(thousand)} Thousand`);
  if (rem > 0) words.push(convertGroup(rem));

  return `${words.join(' ')} Rupees Only`;
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
 * Generates a clean, classic Black & White A4 Tax Invoice / PDF.
 * Designed with full tabular column layout, clear vertical grid lines,
 * standard page margins, and full page coverage with zero colored ink.
 */
export function printA4Invoice(sale: BillingSale, storeInfo: StoreInfo = {}) {
  if (typeof window === 'undefined' || !sale) return;

  const storeName = storeInfo.storeName || 'CRABSTER TECHNOLOGY';
  const storeAddress =
    storeInfo.storeAddress ||
    '12/1 Brindhavan Garden, No.4 Veerapandi, Coimbatore - 641019, Tamil Nadu';
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

  const items = sale.items || [];
  const itemsRows = items
    .map((item, index) => {
      const isRet = item.isReturn;
      const unitPriceFormatted = `₹${item.unitPrice.toFixed(2)}`;
      const totalFormatted =
        item.total < 0
          ? `-₹${Math.abs(item.total).toFixed(2)}`
          : `₹${item.total.toFixed(2)}`;
      const discountFormatted =
        item.discount && item.discount > 0 ? `₹${item.discount.toFixed(2)}` : '—';

      return `
        <tr style="border-bottom: 1px solid #000000;">
          <td style="border-right: 1px solid #000000; padding: 7px 4px; text-align: center; vertical-align: top;">${index + 1}</td>
          <td style="border-right: 1px solid #000000; padding: 7px 8px; text-align: left; vertical-align: top;">
            <div style="font-weight: 800; font-size: 12px; color: #000000;">
              ${escapeHtml(item.name)}
              ${isRet ? '<span style="font-size: 9px; border: 1px solid #000000; padding: 0 4px; font-weight: 800; margin-left: 4px;">[RETURN]</span>' : ''}
            </div>
          </td>
          <td style="border-right: 1.5px solid #000000; padding: 7px 6px; text-align: center; font-family: monospace; font-size: 11px; vertical-align: top;">
            ${item.sku && item.sku !== 'N/A' ? escapeHtml(item.sku) : '—'}
          </td>
          <td style="border-right: 1px solid #000000; padding: 7px 4px; text-align: center; font-weight: 800; vertical-align: top;">${item.quantity}</td>
          <td style="border-right: 1px solid #000000; padding: 7px 6px; text-align: right; white-space: nowrap; vertical-align: top;">${unitPriceFormatted}</td>
          <td style="border-right: 1px solid #000000; padding: 7px 6px; text-align: right; white-space: nowrap; vertical-align: top;">${discountFormatted}</td>
          <td style="padding: 7px 6px; text-align: right; font-weight: 800; white-space: nowrap; vertical-align: top;">${totalFormatted}</td>
        </tr>
      `;
    })
    .join('');

  // Dynamically pad empty rows with vertical borders to maintain a full-page structured tabular layout
  const fillerHeight = Math.max(40, 320 - items.length * 35);
  const fillerRow = `
    <tr>
      <td style="height: ${fillerHeight}px; border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1.5px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-bottom: 1.5px solid #000000;"></td>
    </tr>
  `;

  const amountInWords = numberToWordsINR(sale.grandTotal);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #000000 !important;
      background: #ffffff !important;
      font-size: 11.5px;
      line-height: 1.35;
      margin: 0;
      padding: 12mm 15mm;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-box {
      width: 100%;
      border: 1.5px solid #000000;
      background: #ffffff;
      box-sizing: border-box;
    }
    .header-section {
      padding: 10px 14px;
      border-bottom: 1.5px solid #000000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 72%;
    }
    .store-logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .brand-sub {
      font-size: 11px;
      color: #222222;
      margin-bottom: 2px;
      line-height: 1.3;
    }
    .brand-contact {
      font-size: 10.5px;
      color: #333333;
    }
    .invoice-num-box {
      text-align: center;
      border: 1.5px solid #000000;
      padding: 6px 14px;
      background: #fafafa;
      min-width: 135px;
    }
    .main-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .main-table th {
      background: #f2f2f2;
      border-right: 1px solid #000000;
      border-bottom: 1.5px solid #000000;
      padding: 6px 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #000000;
    }
    .main-table th:last-child {
      border-right: none;
    }
    .totals-inner-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    .totals-inner-table td {
      padding: 5px 10px;
      border-bottom: 1px solid #000000;
    }
    .totals-inner-table tr.grand-total-row {
      background: #f2f2f2;
      border-top: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
    }
    .totals-inner-table tr.grand-total-row td {
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <!-- Store Header with Left Corner Logo -->
    <div class="header-section">
      <div class="header-left">
        <img src="${CRABSTER_LOGO_BASE64}" alt="Logo" class="store-logo" />
        <div>
          <div class="brand-name">${escapeHtml(storeName)}</div>
          <div class="brand-sub">${escapeHtml(storeAddress)}</div>
          <div class="brand-contact">
            <span>Ph: <strong>${escapeHtml(storePhone)}</strong></span>
            ${storeEmail ? ` &bull; <span>Email: <strong>${escapeHtml(storeEmail)}</strong></span>` : ''}
            ${storeGstin ? ` &bull; <span>GSTIN: <strong>${escapeHtml(storeGstin)}</strong></span>` : ''}
          </div>
        </div>
      </div>
      <div class="invoice-num-box">
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #000000; padding-bottom: 3px; margin-bottom: 3px;">${isRefund ? 'REFUND NOTE' : 'TAX INVOICE'}</div>
        <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #444444; letter-spacing: 0.5px;">BILL NUMBER</div>
        <div style="font-size: 15px; font-weight: 900; font-family: monospace;">${escapeHtml(sale.billNumber)}</div>
      </div>
    </div>

    <!-- Unified Master Table (Collinear Vertical Dividers) -->
    <table class="main-table">
      <colgroup>
        <col style="width: 6%;" />
        <col style="width: 44%;" />
        <col style="width: 14%;" />
        <col style="width: 8%;" />
        <col style="width: 9%;" />
        <col style="width: 9%;" />
        <col style="width: 10%;" />
      </colgroup>

      <!-- Customer & Metadata Details Row (Cols 1-3 = 64%, Cols 4-7 = 36%) -->
      <tbody>
        <tr style="border-bottom: 1.5px solid #000000;">
          <td colspan="3" style="border-right: 1.5px solid #000000; padding: 8px 12px; vertical-align: top;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 3px; color: #444444;">BILLED TO (CUSTOMER DETAILS)</div>
            <div style="font-size: 13px; font-weight: 800; margin-bottom: 2px;">${escapeHtml(sale.customerName)}</div>
            ${sale.customerPhone && sale.customerPhone !== 'Walk-in' ? `<div style="font-size: 11px;">Phone: <strong>${escapeHtml(sale.customerPhone)}</strong></div>` : '<div style="font-size: 11px; color: #444444;">Walk-in Store Customer</div>'}
          </td>
          <td colspan="4" style="padding: 6px 12px; vertical-align: top;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
              <tr>
                <td style="padding: 2px 0; color: #444444; width: 44%;">Date &amp; Time:</td>
                <td style="padding: 2px 0; font-weight: 700;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 2px 0; color: #444444;">Payment Mode:</td>
                <td style="padding: 2px 0; font-weight: 800; text-transform: uppercase;">${escapeHtml(sale.paymentMethod)}</td>
              </tr>
              <tr>
                <td style="padding: 2px 0; color: #444444;">Billed By:</td>
                <td style="padding: 2px 0; font-weight: 700;">${escapeHtml(sale.cashierName)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Table Columns Header -->
        <tr>
          <th style="text-align: center;">S.NO</th>
          <th style="text-align: left; padding-left: 8px;">ITEM DESCRIPTION</th>
          <th style="text-align: center; border-right: 1.5px solid #000000;">SKU / CODE</th>
          <th style="text-align: center;">QTY</th>
          <th style="text-align: right; padding-right: 6px;">RATE (₹)</th>
          <th style="text-align: right; padding-right: 6px;">DISC (₹)</th>
          <th style="text-align: right; padding-right: 8px;">AMOUNT (₹)</th>
        </tr>

        <!-- Items Rows -->
        ${itemsRows}

        <!-- Filler Row for Clean Full-Page Layout -->
        ${fillerRow}

        <!-- Summary & Totals Row (Divided exactly at 64% column line) -->
        <tr style="border-bottom: 1.5px solid #000000;">
          <td colspan="3" style="border-right: 1.5px solid #000000; padding: 10px 12px; vertical-align: top;">
            <div style="font-size: 11px; margin-bottom: 8px;">
              <span style="color: #444444; font-weight: 700;">Amount Chargeable (in words):</span><br />
              <strong style="font-size: 12px;">${amountInWords}</strong>
            </div>
            <div style="border-top: 1px dashed #000000; padding-top: 8px; margin-top: 6px; font-size: 10.5px; line-height: 1.5;">
              <div style="font-weight: 800; text-transform: uppercase; margin-bottom: 4px; font-size: 10.5px;">Terms &amp; Conditions:</div>
              <div style="font-weight: 800; font-size: 11px; margin-bottom: 2px;">
                1. No Return, No Exchange, No Warranty.
              </div>
              <div style="font-size: 10.5px; color: #333333;">
                2. Thank you for choosing Crabster Technology!
              </div>
            </div>
          </td>
          <td colspan="4" style="padding: 0; vertical-align: top;">
            <table class="totals-inner-table">
              <tr>
                <td style="color: #333333;">Gross Subtotal:</td>
                <td style="text-align: right; font-weight: 700;">₹${sale.amount.toFixed(2)}</td>
              </tr>
              ${sale.discount > 0 ? `
              <tr>
                <td style="color: #333333;">Total Discount:</td>
                <td style="text-align: right; font-weight: 700;">-₹${sale.discount.toFixed(2)}</td>
              </tr>` : ''}
              ${sale.tax > 0 ? `
              <tr>
                <td style="color: #333333;">Tax / GST:</td>
                <td style="text-align: right; font-weight: 700;">₹${sale.tax.toFixed(2)}</td>
              </tr>` : ''}
              <tr class="grand-total-row">
                <td style="text-transform: uppercase;">${isRefund ? 'NET REFUND PAID:' : 'GRAND TOTAL:'}</td>
                <td style="text-align: right; font-size: 14px;">₹${Math.abs(sale.grandTotal).toFixed(2)}</td>
              </tr>
              ${sale.paymentMethod === 'cash' && typeof sale.cashReceived === 'number' && sale.cashReceived > 0 ? `
              <tr>
                <td style="color: #444444; font-size: 11px;">Cash Tendered:</td>
                <td style="text-align: right; font-size: 11px; font-weight: 700;">₹${sale.cashReceived.toFixed(2)}</td>
              </tr>
              ${sale.changeReturned !== undefined && sale.changeReturned > 0 ? `
              <tr>
                <td style="font-size: 11px; font-weight: 700;">Change Returned:</td>
                <td style="text-align: right; font-size: 11px; font-weight: 800;">₹${sale.changeReturned.toFixed(2)}</td>
              </tr>` : ''}
              ` : ''}
            </table>
          </td>
        </tr>

        <!-- Signatory Row -->
        <tr>
          <td colspan="7" style="padding: 16px 18px; text-align: right; vertical-align: bottom;">
            <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; margin-bottom: 42px;">
              For ${escapeHtml(storeName)}
            </div>
            <div style="display: inline-block; border-top: 1px dashed #000000; min-width: 160px; text-align: center; font-size: 10px; font-weight: 700; padding-top: 4px;">
              Authorized Signatory
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

  printHtmlInIframe(html, 'a4-invoice-print-frame');
}

/**
 * Generates a clean, modern, high-contrast 80mm thermal receipt.
 * Strictly black and white with clean tabular structure and solid divider rules.
 */
export function printThermalReceipt(sale: BillingSale, storeInfo: StoreInfo = {}) {
  if (typeof window === 'undefined' || !sale) return;

  const storeName = storeInfo.storeName || 'CRABSTER TECHNOLOGY';
  const storeAddress =
    storeInfo.storeAddress ||
    '12/1 Brindhavan Garden, No.4 Veerapandi, Coimbatore - 641019, Tamil Nadu';
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
          <div style="font-weight: 700; color: #000000; font-size: 11px; line-height: 1.25;">
            ${escapeHtml(item.name)} ${isRet ? '<span style="font-size: 8px; border: 1px solid #000000; padding: 0 3px; font-weight: bold; margin-left: 2px;">[RETURN]</span>' : ''}
          </div>
          ${item.sku && item.sku !== 'N/A' ? `<div style="font-size: 9px; color: #444; font-family: monospace;">SKU: ${escapeHtml(item.sku)}</div>` : ''}
          ${item.discount > 0 ? `<div style="font-size: 9px; color: #000000; font-weight: 600;">Disc: -₹${item.discount.toFixed(2)}</div>` : ''}
        </td>
        <td style="padding: 4px 0; text-align: center; vertical-align: top; font-weight: 700; width: 12%; font-size: 11px;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right; vertical-align: top; width: 22%; font-size: 11px; white-space: nowrap;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 4px 0; text-align: right; vertical-align: top; font-weight: 800; color: #000000; width: 22%; font-size: 11px; white-space: nowrap;">
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
  <title></title>
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
    <div class="flex-row font-bold">
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
    <div class="flex-row font-bold">
      <span>Change Returned:</span>
      <span>₹${sale.changeReturned.toFixed(2)}</span>
    </div>` : ''}
    ` : ''}
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div class="font-bold" style="margin-bottom: 2px;">*** NO RETURN &bull; NO EXCHANGE &bull; NO WARRANTY ***</div>
    <div style="font-size: 9.5px; color: #444; margin-top: 3px;">THANK YOU FOR SHOPPING!</div>
  </div>
</body>
</html>`;

  printHtmlInIframe(html, 'thermal-print-frame');
}
