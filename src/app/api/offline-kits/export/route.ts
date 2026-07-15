
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, ADMIN_SECRET } from '@/lib/firebase-admin';

function esc(val: unknown): string {
  const s = val == null ? '' : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const batchId = sp.get('batchId');
  const status  = sp.get('status');

  const db = getAdminDb();
  let q: FirebaseFirestore.Query = db.collection('offline_kits').orderBy('createdAt', 'desc');
  if (batchId) q = q.where('batchId', '==', batchId);
  if (status)  q = q.where('status', '==', status);

  const snap = await q.limit(5000).get();
  const toStr = (ts: any) => ts?.toDate ? ts.toDate().toISOString() : ts ? String(ts) : '';

  const headers = ['Kit ID','Status','Batch Name','Shop Name','Customer Name','Customer Email','Customer Phone','Country','State','Created At','Activated At'];
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return [d.kitId, d.status, d.batchName, d.shopName, d.customerName, d.customerEmail,
      d.customerPhone, d.activationCountry, d.activationState, toStr(d.createdAt), toStr(d.activatedAt)]
      .map(esc).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ezcirkit-kits-${Date.now()}.csv"`,
    },
  });
}
