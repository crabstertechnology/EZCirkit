
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ valid: false, reason: 'missing_param' }, { status: 400 });
  }

  const db = await getAdminDb();
  let snap = await db.collection('offline_kits')
    .where('activationToken', '==', token).limit(1).get();

  if (snap.empty && token.includes(' ')) {
    const plusToken = token.replace(/ /g, '+');
    snap = await db.collection('offline_kits')
      .where('activationToken', '==', plusToken).limit(1).get();
  }

  if (snap.empty) return NextResponse.json({ valid: false, reason: 'not_found' });

  const data = snap.docs[0].data();
  if (data.status === 'activated') {
    return NextResponse.json({ valid: false, reason: 'already_activated', kitId: data.kitId });
  }

  return NextResponse.json({ valid: true, kitId: data.kitId, token: data.activationToken });
}
