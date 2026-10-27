import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const db = await getAdminDb();
    const snap = await db.collection('customers').limit(300).get();
    
    const customers = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ customers });
  } catch (err: any) {
    console.error('Failed to fetch customers from Admin DB:', err);
    return NextResponse.json({ customers: [] });
  }
}
