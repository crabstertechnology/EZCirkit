import { BillingCartItem, BillingProduct, BillingSale } from '@/types/billing';

/**
 * 1. Line Item Total Formula
 * Sale: (P_i * Q_i) - D_i
 * Return: -(P_i * Q_i)
 */
export function calculateLineTotal(item: BillingCartItem): number {
  if (item.isReturn) {
    return -(item.customUnitPrice * item.quantity);
  }
  return Math.max(0, (item.customUnitPrice * item.quantity) - (item.discountAmount || 0));
}

/**
 * 2. Gross Subtotal
 * Sum(Sales: P_i * Q_i) - Sum(Returns: P_i * Q_i)
 */
export function calculateGrossSubtotal(items: BillingCartItem[]): number {
  return items.reduce((acc, item) => {
    const rawTotal = item.customUnitPrice * item.quantity;
    return item.isReturn ? acc - rawTotal : acc + rawTotal;
  }, 0);
}

/**
 * 3. Total Order Discount
 * Sum of line item discounts (for sales only) + additional order-level discount
 */
export function calculateTotalDiscount(items: BillingCartItem[], orderDiscount: number = 0): number {
  const lineDiscounts = items
    .filter(item => !item.isReturn)
    .reduce((acc, item) => acc + (item.discountAmount || 0), 0);
  return lineDiscounts + Math.max(0, orderDiscount || 0);
}

/**
 * 4. Tax Calculation
 * Line-by-line tax for sale items based on item.product.tax rate
 */
export function calculateTotalTax(items: BillingCartItem[]): number {
  return items
    .filter(item => !item.isReturn)
    .reduce((acc, item) => {
      const taxRate = Number(item.product.tax || 0);
      const lineBase = item.customUnitPrice * item.quantity;
      return acc + (lineBase * (taxRate / 100));
    }, 0);
}

/**
 * 5. Grand Total
 * (Subtotal - TotalDiscount) + Tax
 */
export function calculateGrandTotal(items: BillingCartItem[], orderDiscount: number = 0): number {
  const subtotal = calculateGrossSubtotal(items);
  const discount = calculateTotalDiscount(items, orderDiscount);
  const tax = calculateTotalTax(items);
  return Number(((subtotal - discount) + tax).toFixed(2));
}

/**
 * 6. Cash Tender & Change Balance Calculation
 */
export type CashTenderStatus = 'CHANGE_TO_RETURN' | 'EXACT' | 'CUSTOMER_OWES';

export interface CashTenderResult {
  balance: number;
  status: CashTenderStatus;
  label: string;
}

export function calculateCashBalance(grandTotal: number, cashReceived: number): CashTenderResult {
  const roundedTotal = Math.max(0, grandTotal);
  const balance = Number((cashReceived - roundedTotal).toFixed(2));

  if (balance > 0) {
    return {
      balance,
      status: 'CHANGE_TO_RETURN',
      label: `Change to Return: ₹${balance.toFixed(2)}`,
    };
  } else if (balance === 0) {
    return {
      balance: 0,
      status: 'EXACT',
      label: 'Exact Payment Received',
    };
  } else {
    return {
      balance: Math.abs(balance),
      status: 'CUSTOMER_OWES',
      label: `Customer Still Owes: ₹${Math.abs(balance).toFixed(2)}`,
    };
  }
}

/**
 * 7. Sequential Bill / Invoice Numbering Algorithm
 * Formula: Prefix + "-" + padLeft(N_start + C_sales, 6, '0')
 */
export function generateSequentialBillNumber(
  existingSalesCount: number,
  prefix: string = 'INV',
  startBase: number = 1
): string {
  const nextNum = startBase + existingSalesCount;
  return `${prefix}-${String(nextNum).padStart(6, '0')}`;
}

/**
 * 8. SKU & Text Search Resolution
 * name.toLowerCase().includes(q) || sku.toLowerCase().includes(q)
 */
export function matchProductSearch(product: BillingProduct, query: string): boolean {
  if (!query || !query.trim()) return true;
  const clean = query.trim().toLowerCase();
  const nameMatch = product.name?.toLowerCase().includes(clean);
  const skuMatch = product.sku?.toLowerCase().includes(clean);
  const idMatch = product.id?.toLowerCase().includes(clean);
  const catMatch = product.category?.toLowerCase().includes(clean);
  return Boolean(nameMatch || skuMatch || idMatch || catMatch);
}

/**
 * 9. Stock Filter helper
 */
export type StockFilterType = 'All' | 'Low' | 'Out';

export function matchesStockFilter(product: BillingProduct, filter: StockFilterType): boolean {
  const stock = Number(product.stock ?? product.currentStock ?? 0);
  const minStock = Number(product.minStockLevel ?? 5);

  if (filter === 'Low') {
    return stock > 0 && stock <= minStock;
  }
  if (filter === 'Out') {
    return stock <= 0;
  }
  return true;
}

/**
 * 10. Digital WhatsApp Plain Text Invoice Formatter (Section 10.1)
 */
export function formatWhatsAppInvoice(sale: BillingSale, storeName: string = 'Crabster Technology'): string {
  const formattedDate = new Date(sale.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const lines = [
    `🧾 *[${storeName.toUpperCase()}] - TAX INVOICE*`,
    '━━━━━━━━━━━━━━━━━━━━',
    `📄 *Bill No:* ${sale.billNumber}`,
    `📅 *Date:* ${formattedDate}`,
    `👤 *Customer:* ${sale.customerName} (${sale.customerPhone})`,
    '━━━━━━━━━━━━━━━━━━━━',
    '*ITEMS LIST:*',
  ];

  sale.items.forEach((item, index) => {
    const isRet = item.isReturn ? '[RETURN] ' : '';
    const unitLabel = item.unit ? ` ${item.unit}` : ' Piece';
    const linePrice = item.total < 0 ? `-₹${Math.abs(item.total).toFixed(2)}` : `₹${item.total.toFixed(2)}`;
    lines.push(`${index + 1}. ${isRet}${item.name} (${item.quantity}${unitLabel} @ ₹${item.unitPrice}) = ${linePrice}`);
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`🏷️ *Subtotal:* ₹${sale.amount.toFixed(2)}`);
  if (sale.discount > 0) {
    lines.push(`🎁 *Discount:* -₹${sale.discount.toFixed(2)}`);
  }
  if (sale.tax > 0) {
    lines.push(`🏛️ *Tax (GST):* ₹${sale.tax.toFixed(2)}`);
  }

  const grandLabel = sale.grandTotal < 0 ? 'NET REFUND ISSUED' : 'GRAND TOTAL';
  lines.push(`💰 *${grandLabel}:* ₹${Math.abs(sale.grandTotal).toFixed(2)}`);
  lines.push(`💳 *Payment Method:* ${sale.paymentMethod.toUpperCase()}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('⛔ *NOTE: Strictly NO RETURN • NO REFUND*');
  lines.push('Thank you for shopping with Crabster Technology!');

  return lines.join('\n');
}

/**
 * 11. Generate WhatsApp URL
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  // Default to 91 country code if standard 10 digit Indian number
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}
