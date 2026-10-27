import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const db = await getAdminDb();
    const snap = await db.collection('inventory_transactions').orderBy('date', 'desc').limit(200).get();
    
    const transactions = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ transactions });
  } catch (err: any) {
    console.error('Failed to fetch ledger from Admin DB:', err);
    return NextResponse.json({ transactions: [] });
  }
}
