import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { BillingCartItem, BillingSale, BillingSaleItem, InventoryTransaction, BillingCustomer } from '@/types/billing';
import {
  calculateGrossSubtotal,
  calculateTotalDiscount,
  calculateTotalTax,
  calculateGrandTotal,
} from '@/lib/billing-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      items,
      customer,
      billNumber,
      paymentMethod = 'cash',
      cashReceived = 0,
      changeReturned = 0,
      orderDiscount = 0,
      cashierName = 'Admin',
      cashierEmail = '',
      notes = '',
    } = body as {
      items: BillingCartItem[];
      customer: {
        id?: string | null;
        name: string;
        phone: string;
        address?: string;
        email?: string;
      };
      billNumber: string;
      paymentMethod: 'cash' | 'upi' | 'online' | 'card' | 'split';
      cashReceived?: number;
      changeReturned?: number;
      orderDiscount?: number;
      cashierName?: string;
      cashierEmail?: string;
      notes?: string;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cannot checkout with an empty cart.' }, { status: 400 });
    }

    const db = await getAdminDb();
    const batch = db.batch();
    const now = new Date().toISOString();

    // Financial calculations
    const amount = calculateGrossSubtotal(items);
    const discount = calculateTotalDiscount(items, orderDiscount);
    const tax = calculateTotalTax(items);
    const grandTotal = calculateGrandTotal(items, orderDiscount);
    const isRefundMode = grandTotal < 0;

    // Create Sale Ref
    const saleRef = db.collection('sales').doc();
    const saleId = saleRef.id;

    const saleItems: BillingSaleItem[] = [];

    for (const item of items) {
      const saleItemRef = db.collection('sales').doc(saleId).collection('items').doc();
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
        isReturn: Boolean(item.isReturn),
        returnReason: item.returnReason || '',
      };

      saleItems.push(saleItem);

      // Save subcollection item
      batch.set(saleItemRef, saleItem);

      // Save global sale_items record
      const globalItemRef = db.collection('sale_items').doc(saleItem.id);
      batch.set(globalItemRef, saleItem);

      // Adjust live catalog stock (skip virtual custom items)
      if (!isCustom) {
        const productRef = db.collection('products').doc(item.product.id);
        const stockDelta = item.isReturn ? item.quantity : -item.quantity;
        
        batch.update(productRef, {
          stock: FieldValue.increment(stockDelta),
        });

        // Write Signed Inventory Audit Ledger Record
        const invTxRef = db.collection('inventory_transactions').doc();
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

    // Customer Auto-Registration (Section 7)
    const cleanPhone = customer?.phone ? customer.phone.replace(/\D/g, '') : '';
    let customerId = customer?.id || null;

    if (cleanPhone && customer?.name && customer.name.toLowerCase() !== 'walk-in customer') {
      if (!customerId) {
        customerId = `cust-${cleanPhone}`;
        const customerRef = db.collection('customers').doc(customerId);
        const newCustomer: BillingCustomer = {
          id: customerId,
          name: customer.name.trim(),
          phone: cleanPhone,
          email: customer.email?.trim() || '',
          address: customer.address?.trim() || '',
          createdDate: now,
        };
        batch.set(customerRef, newCustomer, { merge: true });
      }
    }

    // Assemble Sale Record
    const saleRecord: BillingSale = {
      id: saleId,
      billNumber,
      customerId,
      customerName: customer?.name || 'Walk-in Customer',
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
      cashierName,
      cashierEmail,
      itemsCount: items.length,
      items: saleItems,
      notes,
    };

    batch.set(saleRef, saleRecord);

    await batch.commit();

    return NextResponse.json({ success: true, sale: saleRecord });
  } catch (err: any) {
    console.error('Server billing checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal billing checkout failure' },
      { status: 500 }
    );
  }
}
