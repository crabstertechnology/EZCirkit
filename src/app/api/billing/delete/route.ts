import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { BillingSale, InventoryTransaction } from '@/types/billing';

export async function POST(req: NextRequest) {
  try {
    const { saleId, rollbackStock = true, adminUser = 'Admin' } = await req.json();

    if (!saleId) {
      return NextResponse.json({ error: 'saleId is required' }, { status: 400 });
    }

    const db = await getAdminDb();
    const saleDocRef = db.collection('sales').doc(saleId);
    const saleSnap = await saleDocRef.get();

    if (!saleSnap.exists) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
    }

    const sale = saleSnap.data() as BillingSale;
    const batch = db.batch();
    const now = new Date().toISOString();

    // 1. Rollback stock if requested and bill was not already cancelled
    if (rollbackStock && sale.status !== 'cancelled') {
      for (const item of (sale.items || [])) {
        const isCustom = item.productId.startsWith('custom-');
        if (!isCustom) {
          const productRef = db.collection('products').doc(item.productId);
          // For sales, item.quantity > 0, so adding +quantity restores the sold units to stock
          // For returns, item.quantity < 0, so adding -quantity removes the returned units from stock
          const rollbackDelta = item.quantity;

          batch.update(productRef, {
            stock: FieldValue.increment(rollbackDelta),
          });

          // Write correction audit log
          const invTxRef = db.collection('inventory_transactions').doc();
          const invTx: InventoryTransaction = {
            id: invTxRef.id,
            productId: item.productId,
            productName: item.name,
            sku: item.sku || 'N/A',
            quantity: rollbackDelta,
            type: 'correction',
            date: now,
            user: adminUser,
            referenceId: saleId,
            notes: `Stock rollback from permanently deleted bill ${sale.billNumber}`,
          };
          batch.set(invTxRef, invTx);
        }
      }
    }

    // 2. Delete subcollection items
    const subItemsSnap = await saleDocRef.collection('items').get();
    subItemsSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    // 3. Delete matching sale_items
    const globalItemsSnap = await db.collection('sale_items').where('saleId', '==', saleId).get();
    globalItemsSnap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    // 4. Delete the sale document itself
    batch.delete(saleDocRef);

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Invoice ${sale.billNumber} permanently deleted.`,
    });
  } catch (err: any) {
    console.error('Failed to delete sale:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete sale.' }, { status: 500 });
  }
}
