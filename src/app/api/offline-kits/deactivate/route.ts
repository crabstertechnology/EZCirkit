
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, ADMIN_SECRET } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { docId } = await req.json() as { docId: string };
  if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });

  const db = getAdminDb();
  await db.collection('offline_kits').doc(docId).update({
    status: 'deactivated', deactivatedAt: new Date(),
  });
  return NextResponse.json({ success: true });
}
