import { Firestore, doc, collection, writeBatch, increment, getDoc, setDoc } from 'firebase/firestore';
import { BillingCartItem, BillingSale, BillingSaleItem, InventoryTransaction, BillingCustomer } from '@/types/billing';
import { calculateGrossSubtotal, calculateTotalDiscount, calculateTotalTax, calculateGrandTotal } from './billing-engine';

export interface CheckoutOptions {
  items: BillingCartItem[];
  customer: {
    id?: string | null;
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  billNumber: string;
  paymentMethod: 'cash' | 'upi' | 'online' | 'card' | 'split';
  cashReceived?: number;
  changeReturned?: number;
  orderDiscount?: number;
  cashierName: string;
  cashierEmail: string;
  notes?: string;
}

/**
 * Commits the entire billing checkout as an atomic Firestore batch transaction.
 * 1. Creates `sales` document
 * 2. Creates `sales/${saleId}/items` subcollection records (and mirrors into `sale_items`)
 * 3. Updates product stock in `products` collection (synchronizing live e-commerce stock)
 * 4. Records signed `inventory_transactions` audit logs
 * 5. Auto-registers new customer in `customers` collection if new phone provided
 */
export async function commitBillingCheckout(
  firestore: Firestore,
  options: CheckoutOptions
): Promise<BillingSale> {
  const {
    items,
    customer,
    billNumber,
    paymentMethod,
    cashReceived = 0,
    changeReturned = 0,
    orderDiscount = 0,
    cashierName,
    cashierEmail,
    notes = '',
  } = options;

  if (items.length === 0) {
    throw new Error('Cannot checkout with an empty cart.');
  }

  const batch = writeBatch(firestore);
  const now = new Date().toISOString();

  // 1. Calculate Financials
  const amount = calculateGrossSubtotal(items);
  const discount = calculateTotalDiscount(items, orderDiscount);
  const tax = calculateTotalTax(items);
  const grandTotal = calculateGrandTotal(items, orderDiscount);
  const isRefundMode = grandTotal < 0;

  // 2. Prepare Sale Document Ref
  const saleRef = doc(collection(firestore, 'sales'));
  const saleId = saleRef.id;

  // 3. Prepare Sale Items and Stock/Ledger updates
  const saleItems: BillingSaleItem[] = [];

  for (const item of items) {
    const saleItemRef = doc(collection(firestore, 'sales', saleId, 'items'));
    const isCustom = item.product.id.startsWith('custom-');
    const signedQty = item.isReturn ? -item.quantity : item.quantity;
    const lineTotal = item.isReturn
      ? -(item.customUnitPrice * item.quantity)
      : (item.customUnitPrice * item.quantity) - (item.discountAmount || 0);

    const saleItem: BillingSaleItem = {
      id: saleItemRef.id,
      saleId,
      productId: item.product.id,
      sku: item.product.sku || (isCustom ? `CUSTOM-${item.id}` : 'N/A'),
      name: item.isReturn ? `[RETURN] ${item.product.name}` : item.product.name,
      unit: item.product.unit || 'Piece',
      quantity: signedQty,
      unitPrice: item.customUnitPrice,
      discount: item.isReturn ? 0 : (item.discountAmount || 0),
      taxRate: Number(item.product.tax || 0),
      taxAmount: item.isReturn ? 0 : (item.customUnitPrice * item.quantity * ((item.product.tax || 0) / 100)),
      total: Number(lineTotal.toFixed(2)),
      isReturn: item.isReturn,
      returnReason: item.returnReason,
    };

    saleItems.push(saleItem);

    // Save subcollection item
    batch.set(saleItemRef, saleItem);

    // Also mirror to global sale_items collection for quick querying
    const globalSaleItemRef = doc(firestore, 'sale_items', saleItem.id);
    batch.set(globalSaleItemRef, saleItem);

    // 4. Adjust live catalog stock (skip virtual custom items)
    if (!isCustom) {
      const productRef = doc(firestore, 'products', item.product.id);
      // Sale: deduct stock (-Q). Return: restock inventory (+Q).
      const stockDelta = item.isReturn ? item.quantity : -item.quantity;
      batch.update(productRef, {
        stock: increment(stockDelta),
      });

      // 5. Write Signed Inventory Audit Ledger Record
      const invTxRef = doc(collection(firestore, 'inventory_transactions'));
      const invTx: InventoryTransaction = {
        id: invTxRef.id,
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku || 'N/A',
        quantity: stockDelta,
        type: item.isReturn ? 'return' : 'sale',
        date: now,
        user: cashierName || cashierEmail || 'Admin',
        referenceId: saleId,
        notes: item.isReturn
          ? `Returned item in bill ${billNumber} (${item.returnReason || 'Exchange/Return'})`
          : `Sold in bill ${billNumber}`,
      };
      batch.set(invTxRef, invTx);
    }
  }

  // 6. Customer Auto-Registration (Section 7)
  const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
  let customerId = customer.id || null;

  if (cleanPhone && customer.name && customer.name.toLowerCase() !== 'walk-in customer') {
    if (!customerId) {
      customerId = `cust-${cleanPhone}`;
      const customerRef = doc(firestore, 'customers', customerId);
      const newCustomer: BillingCustomer = {
        id: customerId,
        name: customer.name.trim(),
        phone: cleanPhone,
        email: customer.email?.trim() || '',
        address: customer.address?.trim() || '',
        createdDate: now,
      };
      // Merge in case customer was created simultaneously
      batch.set(customerRef, newCustomer, { merge: true });
    }
  }

  // 7. Assemble Complete Sale Record
  const saleRecord: BillingSale = {
    id: saleId,
    billNumber,
    customerId,
    customerName: customer.name || 'Walk-in Customer',
    customerPhone: cleanPhone || 'Walk-in',
    amount: Number(amount.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    orderDiscount: Number(orderDiscount.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    grandTotal,
    paymentMethod,
    cashReceived: paymentMethod === 'cash' ? cashReceived : grandTotal,
    changeReturned: paymentMethod === 'cash' ? changeReturned : 0,
    status: isRefundMode ? 'refunded' : 'paid',
    date: now,
    cashierName: cashierName || 'Admin',
    cashierEmail: cashierEmail || '',
    itemsCount: items.length,
    items: saleItems,
    notes,
  };

  batch.set(saleRef, saleRecord);

  // Commit all database mutations atomically
  await batch.commit();

  return saleRecord;
}

/**
 * Section 9: Order Void & Stock Rollback Logic
 * Reverses the exact inventory movements committed in the original sale
 */
export async function voidBillingSale(
  firestore: Firestore,
  sale: BillingSale,
  adminUser: string,
  voidReason: string = 'Cancelled by administrator'
): Promise<void> {
  const batch = writeBatch(firestore);
  const now = new Date().toISOString();

  // 1. Mark Sale as cancelled
  const saleRef = doc(firestore, 'sales', sale.id);
  batch.update(saleRef, {
    status: 'cancelled',
    cancelledAt: now,
    cancelledBy: adminUser,
    cancelReason: voidReason,
  });

  // 2. Rollback stocks and log reversal in inventory audit ledger
  for (const item of sale.items) {
    const isCustom = item.productId.startsWith('custom-');
    if (!isCustom) {
      const productRef = doc(firestore, 'products', item.productId);
      
      // If original item was sold (signed quantity was > 0), restore stock by (+quantity)
      // If original item was returned (signed quantity was < 0), deduct back (-abs(quantity))
      const rollbackDelta = item.quantity;

      batch.update(productRef, {
        stock: increment(rollbackDelta),
      });

      // Write signed correction audit log entry
      const invTxRef = doc(collection(firestore, 'inventory_transactions'));
      const invTx: InventoryTransaction = {
        id: invTxRef.id,
        productId: item.productId,
        productName: item.name,
        sku: item.sku || 'N/A',
        quantity: rollbackDelta,
        type: 'correction',
        date: now,
        user: adminUser,
        referenceId: sale.id,
        notes: `Stock rollback from voided bill ${sale.billNumber}: ${voidReason}`,
      };
      batch.set(invTxRef, invTx);
    }
  }

  await batch.commit();
}
