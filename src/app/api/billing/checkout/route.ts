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
    const cleanOrderDiscount = Number(orderDiscount) || 0;
    const amount = calculateGrossSubtotal(items);
    const discount = calculateTotalDiscount(items, cleanOrderDiscount);
    const tax = calculateTotalTax(items);
    const rawGrandTotal = calculateGrandTotal(items, cleanOrderDiscount);
    const grandTotal = Number.isFinite(rawGrandTotal) ? rawGrandTotal : 0;
    const isRefundMode = grandTotal < 0;

    // Create Sale Ref
    const saleRef = db.collection('sales').doc();
    const saleId = saleRef.id;

    const saleItems: BillingSaleItem[] = [];

    for (const item of items) {
      const saleItemRef = db.collection('sales').doc(saleId).collection('items').doc();
      const isCustom = item.product?.id ? item.product.id.startsWith('custom-') : false;
      const unitPrice = Number(item.customUnitPrice ?? (item as any).price ?? item.product?.price ?? 0);
      const qty = Number(item.quantity ?? 1);
      const discountAmt = Number(item.discountAmount || 0);
      const signedQty = item.isReturn ? -qty : qty;
      const lineTotal = item.isReturn
        ? -(unitPrice * qty)
        : (unitPrice * qty) - discountAmt;

      const saleItem: BillingSaleItem = {
        id: saleItemRef.id,
        saleId,
        productId: item.product?.id || 'item',
        sku: item.product?.sku || (isCustom ? `CUSTOM-${item.id}` : 'N/A'),
        name: item.isReturn ? `[RETURN] ${item.product?.name || 'Item'}` : (item.product?.name || 'Item'),
        unit: item.product?.unit || 'Piece',
        quantity: signedQty,
        unitPrice,
        discount: item.isReturn ? 0 : discountAmt,
        taxRate: Number(item.product?.tax || 0),
        taxAmount: item.isReturn ? 0 : (unitPrice * qty * ((item.product?.tax || 0) / 100)),
        total: Number((Number.isFinite(lineTotal) ? lineTotal : 0).toFixed(2)),
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
        
        batch.set(
          productRef,
          {
            stock: FieldValue.increment(stockDelta),
          },
          { merge: true }
        );

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

    // Customer Auto-Registration / Update (Name, Mobile, Mail ID)
    const cleanPhone = customer?.phone ? customer.phone.replace(/\D/g, '') : '';
    const cleanEmail = customer?.email ? customer.email.trim().toLowerCase() : '';
    const cleanName = customer?.name?.trim() || '';
    let customerId = customer?.id || null;

    const isNamedCustomer = cleanName && cleanName.toLowerCase() !== 'walk-in customer';

    if (isNamedCustomer || cleanPhone || cleanEmail) {
      if (!customerId) {
        if (cleanPhone) {
          customerId = `cust-${cleanPhone}`;
        } else if (cleanEmail) {
          customerId = `cust-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
        } else {
          customerId = `cust-${Date.now()}`;
        }
      }

      const customerRef = db.collection('customers').doc(customerId);
      const customerDoc = await customerRef.get();

      if (!customerDoc.exists) {
        // New Customer
        const newCustomer: BillingCustomer = {
          id: customerId,
          name: cleanName || 'Customer',
          phone: cleanPhone,
          email: cleanEmail,
          address: customer?.address?.trim() || '',
          createdDate: now,
          updatedDate: now,
          totalOrders: 1,
          totalSpent: Number(grandTotal.toFixed(2)),
          lastPurchaseDate: now,
        };
        batch.set(customerRef, newCustomer);
      } else {
        // Existing Customer: Update details & increment spend/orders
        const existingData = customerDoc.data() || {};
        batch.update(customerRef, {
          name: cleanName || existingData.name || 'Customer',
          phone: cleanPhone || existingData.phone || '',
          email: cleanEmail || existingData.email || '',
          address: customer?.address?.trim() || existingData.address || '',
          updatedDate: now,
          lastPurchaseDate: now,
          totalOrders: FieldValue.increment(1),
          totalSpent: FieldValue.increment(Number(grandTotal.toFixed(2))),
        });
      }
    }

    // Assemble Sale Record
    const saleRecord: BillingSale = {
      id: saleId,
      billNumber,
      customerId,
      customerName: cleanName || 'Walk-in Customer',
      customerPhone: cleanPhone || 'Walk-in',
      customerEmail: cleanEmail,
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
