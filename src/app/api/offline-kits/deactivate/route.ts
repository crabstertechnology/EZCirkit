
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, ADMIN_SECRET } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { docId } = await req.json() as { docId: string };
    if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });

    const db = await getAdminDb();
    await db.collection('offline_kits').doc(docId).update({
      status: 'deactivated', deactivatedAt: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in deactivate API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
