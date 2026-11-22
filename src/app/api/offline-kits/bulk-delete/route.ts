
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, ADMIN_SECRET, revokeKitUserAccess } from '@/lib/firebase-admin';

// ---------------------------------------------------------------------------
// POST /api/offline-kits/bulk-delete  { docIds: string[], force?: boolean }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { docIds, force } = await req.json() as { docIds: string[]; force?: boolean };

    if (!Array.isArray(docIds) || docIds.length === 0) {
      return NextResponse.json({ error: 'docIds array required' }, { status: 400 });
    }
    if (docIds.length > 200) {
      return NextResponse.json({ error: 'Max 200 kits per bulk operation' }, { status: 400 });
    }

    const db = await getAdminDb();
    const deleted: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    // Firestore deletes in batches of 500 (well within limit here)
    const batch = db.batch();

    for (const docId of docIds) {
      try {
        const ref = db.collection('offline_kits').doc(docId);
        const snap = await ref.get();
        if (!snap.exists) { errors.push(docId); continue; }

        const kitData = snap.data();
        const status = kitData?.status;
        if (status === 'activated' && !force) {
          skipped.push(docId);
          continue;
        }

        // Revoke customer tutorial & IDE access if kit is activated or linked to a customer
        if (status === 'activated' || kitData?.activatedBy || kitData?.customerEmail) {
          await revokeKitUserAccess(db, kitData || {}, 'kit_deleted');
        }

        batch.delete(ref);
        deleted.push(docId);
      } catch {
        errors.push(docId);
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true, deleted: deleted.length, skipped: skipped.length, errors: errors.length });
  } catch (err: any) {
    console.error('Error in bulk-delete API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
