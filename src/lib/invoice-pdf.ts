import { CRABSTER_LOGO_BASE64 } from './logo-base64';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface OnlineInvoiceItem {
  id?: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  total?: number;
  sku?: string;
}

export interface OnlineInvoiceData {
  billNumber: string;
  orderId: string;
  date: string;
  status: string;
  paymentMethod: string;
  paymentId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  items: OnlineInvoiceItem[];
  subtotal: number;
  shippingCharge: number;
  discount?: number;
  tax?: number;
  grandTotal: number;
  storeInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
}

/**
 * Escapes HTML characters for safe template string rendering
 */
function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts a number to Indian Currency words (e.g., Five Hundred Ninety Nine Rupees Only)
 */
export function numberToWordsINR(amount: number): string {
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
 * Generate standard A4 Tax Invoice HTML
 */
export function generateA4InvoiceHtml(invoice: OnlineInvoiceData): string {
  const storeName = invoice.storeInfo?.name || 'CRABSTER TECHNOLOGY';
  const storeAddress =
    invoice.storeInfo?.address ||
    '12/1 Brindhavan Garden, No.4 Veerapandi, Coimbatore - 641019, Tamil Nadu, India';
  const storePhone = invoice.storeInfo?.phone || '+91 7010396642';
  const storeEmail = invoice.storeInfo?.email || 'crabstertechnology@gmail.com';
  const storeGstin = invoice.storeInfo?.gstin || '';

  const formattedDate = new Date(invoice.date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const address = invoice.shippingAddress;
  const addressLines = [
    address?.addressLine1,
    address?.addressLine2,
    [address?.city, address?.state, address?.postalCode].filter(Boolean).join(' - '),
    address?.country,
  ].filter(Boolean);

  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    { name: 'Online Order Item', price: invoice.subtotal || invoice.grandTotal, quantity: 1, total: invoice.subtotal || invoice.grandTotal }
  ];

  const itemsRows = items
    .map((item, index) => {
      const lineTotal = item.total !== undefined ? item.total : item.price * item.quantity;
      return `
        <tr style="border-bottom: 1px solid #000000;">
          <td style="border-right: 1px solid #000000; padding: 7px 4px; text-align: center; vertical-align: top;">${index + 1}</td>
          <td style="border-right: 1px solid #000000; padding: 7px 8px; text-align: left; vertical-align: top;">
            <div style="font-weight: 800; font-size: 12px; color: #000000;">${escapeHtml(item.name)}</div>
          </td>
          <td style="border-right: 1.5px solid #000000; padding: 7px 6px; text-align: center; font-family: monospace; font-size: 11px; vertical-align: top;">
            ${item.sku && item.sku !== 'N/A' ? escapeHtml(item.sku) : '—'}
          </td>
          <td style="border-right: 1px solid #000000; padding: 7px 4px; text-align: center; font-weight: 800; vertical-align: top;">${item.quantity}</td>
          <td style="border-right: 1px solid #000000; padding: 7px 6px; text-align: right; white-space: nowrap; vertical-align: top;">₹${item.price.toFixed(2)}</td>
          <td style="padding: 7px 6px; text-align: right; font-weight: 800; white-space: nowrap; vertical-align: top;">₹${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  // Dynamically pad empty rows with vertical borders to maintain full-page tabular layout
  const fillerHeight = Math.max(40, 260 - items.length * 35);
  const fillerRow = `
    <tr>
      <td style="height: ${fillerHeight}px; border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1.5px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-right: 1px solid #000000; border-bottom: 1.5px solid #000000;"></td>
      <td style="border-bottom: 1.5px solid #000000;"></td>
    </tr>
  `;

  const amountInWords = numberToWordsINR(invoice.grandTotal);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice - ${escapeHtml(invoice.billNumber)}</title>
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
      max-width: 70%;
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
      min-width: 150px;
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
  <div class="invoice-box" id="tax-invoice-printable">
    <!-- Store Header with Left Corner Logo -->
    <div class="header-section">
      <div class="header-left">
        <img src="${CRABSTER_LOGO_BASE64}" alt="Crabster Logo" class="store-logo" />
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
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #000000; padding-bottom: 3px; margin-bottom: 3px;">TAX INVOICE</div>
        <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #444444; letter-spacing: 0.5px;">INVOICE / BILL NO.</div>
        <div style="font-size: 14px; font-weight: 900; font-family: monospace;">${escapeHtml(invoice.billNumber)}</div>
      </div>
    </div>

    <!-- Unified Master Table -->
    <table class="main-table">
      <colgroup>
        <col style="width: 6%;" />
        <col style="width: 50%;" />
        <col style="width: 14%;" />
        <col style="width: 8%;" />
        <col style="width: 11%;" />
        <col style="width: 11%;" />
      </colgroup>

      <!-- Customer & Metadata Details Row -->
      <tbody>
        <tr style="border-bottom: 1.5px solid #000000;">
          <td colspan="3" style="border-right: 1.5px solid #000000; padding: 8px 12px; vertical-align: top;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 3px; color: #444444;">BILLED &amp; SHIPPED TO</div>
            <div style="font-size: 13px; font-weight: 800; margin-bottom: 2px;">${escapeHtml(invoice.customerName)}</div>
            ${invoice.customerPhone ? `<div style="font-size: 11px; margin-bottom: 1px;">Mobile: <strong>${escapeHtml(invoice.customerPhone)}</strong></div>` : ''}
            ${invoice.customerEmail ? `<div style="font-size: 11px; margin-bottom: 1px;">Email: <strong>${escapeHtml(invoice.customerEmail)}</strong></div>` : ''}
            ${addressLines.length > 0 ? `<div style="font-size: 10.5px; color: #333333; margin-top: 3px; line-height: 1.3;">Address: ${escapeHtml(addressLines.join(', '))}</div>` : ''}
          </td>
          <td colspan="3" style="padding: 8px 12px; vertical-align: top;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 3px; color: #444444;">ORDER DETAILS</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Order ID:</span>
              <strong style="font-family: monospace; font-size: 11px;">#${escapeHtml(invoice.orderId.substring(0, 10))}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Date &amp; Time:</span>
              <strong>${formattedDate}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Payment Mode:</span>
              <strong style="text-transform: uppercase;">${escapeHtml(invoice.paymentMethod || 'Online')}</strong>
            </div>
            ${invoice.paymentId ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Payment Ref:</span>
              <span style="font-family: monospace; font-size: 10px;">${escapeHtml(invoice.paymentId.substring(0, 16))}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between;">
              <span>Payment Status:</span>
              <strong style="text-transform: uppercase; color: #15803d;">${escapeHtml(invoice.status || 'PAID')}</strong>
            </div>
          </td>
        </tr>

        <!-- Table Column Headers -->
        <tr>
          <th style="text-align: center;">#</th>
          <th style="text-align: left; padding-left: 8px;">Description of Goods / Products</th>
          <th style="text-align: center;">SKU / Code</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right; padding-right: 6px;">Unit Rate</th>
          <th style="text-align: right; padding-right: 6px;">Total</th>
        </tr>

        <!-- Line Item Rows -->
        ${itemsRows}

        <!-- Dynamic Empty Row to Maintain Structured Grid -->
        ${fillerRow}

        <!-- Footer / Summary Section -->
        <tr style="border-top: 1.5px solid #000000;">
          <!-- Left Bottom Box: Amount in Words, Bank/UPI Info, T&C -->
          <td colspan="3" style="border-right: 1.5px solid #000000; padding: 10px 12px; vertical-align: top; background: #ffffff;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #444444; margin-bottom: 2px;">AMOUNT IN WORDS</div>
            <div style="font-size: 12px; font-weight: 900; color: #000000; margin-bottom: 12px; font-style: italic;">
              ${escapeHtml(amountInWords)}
            </div>

            <div style="border-top: 1px dashed #777777; padding-top: 8px; margin-top: 8px;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">Terms &amp; Conditions:</div>
              <ul style="padding-left: 14px; font-size: 9.5px; color: #333333; line-height: 1.4;">
                <li>Goods once sold will be accepted for return or replacement strictly as per Crabster Technology return policy.</li>
                <li>STEM learning kits and components come with official testing &amp; quality guarantee.</li>
                <li>This is an officially certified Computer-Generated Tax Invoice.</li>
              </ul>
            </div>
          </td>

          <!-- Right Bottom Box: Totals Table -->
          <td colspan="3" style="padding: 0; vertical-align: top;">
            <table class="totals-inner-table">
              <tr>
                <td style="color: #444444;">Gross Subtotal</td>
                <td style="text-align: right; font-weight: 800;">₹${(invoice.subtotal || invoice.grandTotal).toFixed(2)}</td>
              </tr>
              ${invoice.shippingCharge ? `
              <tr>
                <td style="color: #444444;">Shipping &amp; Delivery</td>
                <td style="text-align: right; font-weight: 800;">₹${invoice.shippingCharge.toFixed(2)}</td>
              </tr>` : `
              <tr>
                <td style="color: #444444;">Shipping &amp; Delivery</td>
                <td style="text-align: right; font-weight: 800; color: #15803d;">FREE</td>
              </tr>`}
              ${invoice.discount && invoice.discount > 0 ? `
              <tr>
                <td style="color: #444444;">Discounts Applied</td>
                <td style="text-align: right; font-weight: 800; color: #dc2626;">-₹${invoice.discount.toFixed(2)}</td>
              </tr>` : ''}
              ${invoice.tax && invoice.tax > 0 ? `
              <tr>
                <td style="color: #444444;">GST / Taxes Included</td>
                <td style="text-align: right; font-weight: 800;">₹${invoice.tax.toFixed(2)}</td>
              </tr>` : ''}
              <tr class="grand-total-row">
                <td style="font-weight: 900; text-transform: uppercase;">Total Amount</td>
                <td style="text-align: right; font-weight: 900; font-size: 14px;">₹${invoice.grandTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 14px 10px 8px 10px; text-align: center; border-bottom: none;">
                  <div style="font-size: 9px; text-transform: uppercase; color: #555555;">For ${escapeHtml(storeName)}</div>
                  <div style="margin-top: 18px; font-weight: 800; font-size: 11px; border-top: 1px solid #000000; padding-top: 4px; display: inline-block; min-width: 140px;">
                    Authorized Signatory
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Print A4 Invoice using hidden iframe
 */
export function printA4Invoice(invoice: OnlineInvoiceData) {
  if (typeof window === 'undefined') return;

  const html = generateA4InvoiceHtml(invoice);
  const iframeId = 'crabster-a4-online-invoice-print-frame';

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
  }, 300);
}

/**
 * Download standard A4 Tax Invoice as a PDF file
 */
export async function downloadInvoicePdf(invoice: OnlineInvoiceData): Promise<void> {
  if (typeof window === 'undefined') return;

  // Create temporary container off-screen to render standard A4 layout
  const container = document.createElement('div');
  container.id = 'invoice-render-temp-container';
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.background = '#ffffff';
  container.style.zIndex = '-99999';

  // Inject invoice HTML content directly
  const html = generateA4InvoiceHtml(invoice);
  
  // Extract body content
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const invoiceElement = doc.querySelector('.invoice-box');

  if (!invoiceElement) {
    // Fallback: trigger print
    printA4Invoice(invoice);
    return;
  }

  container.appendChild(invoiceElement);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // High resolution retina capture
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice-${invoice.billNumber}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // If html2canvas fails, fallback smoothly to iframe print
    printA4Invoice(invoice);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

