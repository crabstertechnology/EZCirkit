import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { InventoryTransaction } from '@/types/billing';

export async function POST(req: NextRequest) {
  try {
    const { productId, newStock, adminUser = 'Admin' } = await req.json();

    if (!productId || newStock === undefined) {
      return NextResponse.json({ error: 'productId and newStock are required' }, { status: 400 });
    }

    const db = await getAdminDb();
    const productRef = db.collection('products').doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const currentData = productSnap.data() || {};
    const prevStock = Number(currentData.stock || 0);
    const targetStock = Number(newStock);
    const delta = targetStock - prevStock;

    const batch = db.batch();
    batch.update(productRef, { stock: targetStock });

    if (delta !== 0) {
      const invTxRef = db.collection('inventory_transactions').doc();
      const invTx: InventoryTransaction = {
        id: invTxRef.id,
        productId,
        productName: currentData.name || productId,
        sku: currentData.sku || 'N/A',
        quantity: delta,
        type: 'manual_adjustment',
        date: new Date().toISOString(),
        user: adminUser,
        referenceId: 'manual_admin',
        notes: `Manual stock level adjustment from ${prevStock} to ${targetStock}`,
      };
      batch.set(invTxRef, invTx);
    }

    await batch.commit();

    return NextResponse.json({ success: true, newStock: targetStock, delta });
  } catch (err: any) {
    console.error('Failed to adjust stock:', err);
    return NextResponse.json({ error: err.message || 'Failed to adjust stock' }, { status: 500 });
  }
}
