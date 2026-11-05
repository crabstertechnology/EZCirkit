import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const db = await getAdminDb();

    // Fetch all orders across all users via collectionGroup
    const snap = await db.collectionGroup('orders').get();

    // Also fetch users to map names/emails
    const usersSnap = await db.collection('users').get();
    const userMap = new Map<string, any>();
    usersSnap.forEach((uDoc) => {
      userMap.set(uDoc.id, uDoc.data());
    });

    const ordersPromises = snap.docs.map(async (doc) => {
      const data = doc.data();
      const userId = data.userId || doc.ref.parent?.parent?.id || '';
      const user = userMap.get(userId) || {};

      // Fetch items subcollection
      let items: any[] = [];
      try {
        const itemsSnap = await doc.ref.collection('items').get();
        items = itemsSnap.docs.map((i) => ({
          id: i.id,
          ...i.data(),
        }));
      } catch (e) {
        console.error('Failed to fetch items for order', doc.id, e);
      }

      // Safe date conversion
      let createdAtIso = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === 'function') {
          createdAtIso = data.createdAt.toDate().toISOString();
        } else if (data.createdAt._seconds) {
          createdAtIso = new Date(data.createdAt._seconds * 1000).toISOString();
        } else if (data.createdAt.seconds) {
          createdAtIso = new Date(data.createdAt.seconds * 1000).toISOString();
        } else {
          createdAtIso = new Date(data.createdAt).toISOString();
        }
      }

      return {
        id: doc.id,
        userId,
        total: Number(data.total) || 0,
        status: data.status || 'paid',
        createdAt: createdAtIso,
        paymentId: data.paymentId || '',
        shippingAddress: data.shippingAddress || null,
        isOfflineOrder: !!data.isOfflineOrder,
        customerName: data.shippingAddress?.name || user.displayName || user.name || 'Customer',
        customerEmail: user.email || data.userEmail || '',
        customerPhone: data.shippingAddress?.phone || user.phone || '',
        items,
        itemsCount: items.length || 1,
        shiprocket: data.shiprocket || null,
        shippingCharge: data.shippingCharge || 0,
      };
    });

    const orders = await Promise.all(ordersPromises);
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error('Failed to fetch admin orders:', err);
    return NextResponse.json({ orders: [] }, { status: 500 });
  }
}

