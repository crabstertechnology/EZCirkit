import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

    // Try to initialize Admin manually here to catch the exact error
    if (!getApps().length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
        checks.initStatus = 'success';
      } else {
        checks.initStatus = 'failed_missing_vars';
      }
    } else {
      checks.initStatus = 'already_initialized';
    }

    // Try to perform a Firestore read test
    const db = getFirestore();
    const snap = await db.collection('offline_kits').limit(1).get();
    checks.firestoreRead = 'success';
    checks.firestoreEmpty = snap.empty;

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
