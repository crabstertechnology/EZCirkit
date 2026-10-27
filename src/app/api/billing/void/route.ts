import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { BillingSale, InventoryTransaction } from '@/types/billing';

export async function POST(req: NextRequest) {
  try {
    const { saleId, adminUser = 'Admin', voidReason = 'Cancelled by administrator' } = await req.json();

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

    // Mark sale cancelled
    batch.update(saleDocRef, {
      status: 'cancelled',
      cancelledAt: now,
      cancelledBy: adminUser,
      cancelReason: voidReason,
    });

    // Rollback stocks
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
          notes: `Stock rollback from voided bill ${sale.billNumber}: ${voidReason}`,
        };
        batch.set(invTxRef, invTx);
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: `Bill ${sale.billNumber} voided and restocked.` });
  } catch (err: any) {
    console.error('Failed to void sale:', err);
    return NextResponse.json({ error: err.message || 'Failed to void sale.' }, { status: 500 });
  }
}
