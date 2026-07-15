
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  const db = getAdminDb();
  const adminAuth = getAdminAuth();

  try {
    const { token, name, email, phone, password, country, state, college, profession } =
      await req.json() as {
        token: string; name: string; email: string; phone: string;
        password: string; country: string; state: string;
        college?: string; profession?: string;
      };

    // 1. Find kit by token
    const snap = await db.collection('offline_kits')
      .where('activationToken', '==', token).limit(1).get();

    if (snap.empty) return NextResponse.json({ error: 'invalid_token' }, { status: 404 });

    const kitDoc = snap.docs[0];
    const kitData = kitDoc.data();

    if (kitData.status === 'activated') {
      return NextResponse.json({ error: 'already_activated' }, { status: 409 });
    }

    // 2. Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email, password, displayName: name,
        ...(phone.startsWith('+') ? { phoneNumber: phone } : {}),
      });
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'email_in_use' }, { status: 409 });
      }
      throw authError;
    }

    const uid = userRecord.uid;
    const now = FieldValue.serverTimestamp();

    // 3. Save user profile
    await db.collection('users').doc(uid).set({
      displayName: name, email, phone, country, state,
      college: college || '', profession: profession || '',
      hasTutorialAccess: true, kitId: kitData.kitId,
      activationToken: token, createdAt: now,
      isAdmin: false, activationSource: 'offline_kit',
    });

    // 4. Mark kit activated
    await kitDoc.ref.update({
      status: 'activated', activatedAt: now, activatedBy: uid,
      customerName: name, customerEmail: email, customerPhone: phone,
      activationCountry: country, activationState: state,
    });

    // 5. Create custom login token
    const customToken = await adminAuth.createCustomToken(uid);

    return NextResponse.json({ success: true, customToken, uid, kitId: kitData.kitId });
  } catch (err: any) {
    console.error('[offline-kits/activate]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
