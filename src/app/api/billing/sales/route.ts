import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const db = await getAdminDb();
    const snap = await db.collection('sales').orderBy('date', 'desc').limit(100).get();
    
    const sales = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ sales });
  } catch (err: any) {
    console.error('Failed to fetch sales from Admin DB:', err);
    return NextResponse.json({ sales: [] });
  }
}
