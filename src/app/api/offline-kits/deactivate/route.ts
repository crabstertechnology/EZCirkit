
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, ADMIN_SECRET, revokeKitUserAccess } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { docId } = await req.json() as { docId: string };
    if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });

    const db = await getAdminDb();
    const kitRef = db.collection('offline_kits').doc(docId);
    const snap = await kitRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    const kitData = snap.data();
    await revokeKitUserAccess(db, kitData || {}, 'kit_deactivated');

    await kitRef.update({
      status: 'deactivated',
      deactivatedAt: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in deactivate API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
