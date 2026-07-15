import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const checks: Record<string, any> = {};

  try {
    checks.projectIdExists = !!process.env.FIREBASE_PROJECT_ID;
    checks.projectIdValue = process.env.FIREBASE_PROJECT_ID || null;

    checks.clientEmailExists = !!process.env.FIREBASE_CLIENT_EMAIL;
    checks.clientEmailValue = process.env.FIREBASE_CLIENT_EMAIL || null;

    checks.privateKeyExists = !!process.env.FIREBASE_PRIVATE_KEY;
    if (process.env.FIREBASE_PRIVATE_KEY) {
      checks.privateKeyLength = process.env.FIREBASE_PRIVATE_KEY.length;
      checks.privateKeyStartsWith = process.env.FIREBASE_PRIVATE_KEY.substring(0, 30);
      checks.privateKeyEndsWith = process.env.FIREBASE_PRIVATE_KEY.substring(process.env.FIREBASE_PRIVATE_KEY.length - 30);
      checks.privateKeyHasNewlines = process.env.FIREBASE_PRIVATE_KEY.includes('\n');
      checks.privateKeyHasEscapedNewlines = process.env.FIREBASE_PRIVATE_KEY.includes('\\n');
    }

    // Call the shared getAdminDb helper
    const db = getAdminDb();
    checks.initStatus = 'success_shared';

    // Try to perform a Firestore read test
    const snap = await db.collection('offline_kits').limit(1).get();
    checks.firestoreRead = 'success';
    checks.firestoreEmpty = snap.empty;

    // Try to perform a Firestore write test
    const testDoc = db.collection('offline_kits_test').doc('ping');
    await testDoc.set({ timestamp: new Date().toISOString(), message: "Hello from test-admin!" });
    checks.firestoreWrite = 'success';

    return NextResponse.json({ success: true, checks });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Unknown error',
      stack: err.stack,
      checks
    }, { status: 500 });
  }
}
