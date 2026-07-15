
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, ADMIN_SECRET } from '@/lib/firebase-admin';

// ---------------------------------------------------------------------------
// DELETE /api/offline-kits/delete  { docId }
// Permanently removes a kit document. Only works for pending kits (not activated).
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { docId, force } = await req.json() as { docId: string; force?: boolean };
    if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });

    const db = await getAdminDb();
    const ref = db.collection('offline_kits').doc(docId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    const status = snap.data()?.status;

    // Safety: block deleting activated kits unless force flag is passed
    if (status === 'activated' && !force) {
      return NextResponse.json(
        { error: 'cannot_delete_activated', message: 'This kit is linked to a customer. Pass force=true to delete anyway.' },
        { status: 409 }
      );
    }

    await ref.delete();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in delete API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
