import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { createAuthUser, createCustomToken } from '@/lib/firebase-auth-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const db = await getAdminDb();

    const body = await req.json().catch(() => ({}));
    const {
      token,
      kitId,
      uid: clientUid,
      name,
      email,
      phone,
      password,
      country,
      state,
      college,
      profession,
      authProvider,
    } = body as {
      token?: string;
      kitId?: string;
      uid?: string;
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      country?: string;
      state?: string;
      college?: string;
      profession?: string;
      authProvider?: string;
    };

    const cleanToken = (token || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();

    if (!cleanToken) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Find kit by token
    let snap = await db.collection('offline_kits')
      .where('activationToken', '==', cleanToken)
      .limit(1)
      .get();

    // Check with spaces replaced with '+'
    if (snap.empty && cleanToken.includes(' ')) {
      const plusToken = cleanToken.replace(/ /g, '+');
      snap = await db.collection('offline_kits')
        .where('activationToken', '==', plusToken)
        .limit(1)
        .get();
    }

    // Fallback: If kitId was provided from previous validate step, match by kitId
    if (snap.empty && kitId) {
      const kitSnap = await db.collection('offline_kits')
        .where('kitId', '==', kitId.trim())
        .limit(1)
        .get();
      if (!kitSnap.empty) {
        const d = kitSnap.docs[0].data();
        if (d.activationToken && d.activationToken.toLowerCase() === cleanToken.toLowerCase()) {
          snap = kitSnap;
        }
      }
    }

    if (snap.empty) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }

    const kitDoc = snap.docs[0];
    const kitData = kitDoc.data();

    if (kitData.status === 'activated') {
      return NextResponse.json({ error: 'already_activated', kitId: kitData.kitId }, { status: 400 });
    }

    // 2. Create or link Firebase Auth user
    let uid = clientUid || '';
    let isNew = false;

    if (!uid) {
      const authResult = await createAuthUser({
        email: cleanEmail,
        password: password || undefined,
        displayName: cleanName,
        phoneNumber: cleanPhone.startsWith('+') ? cleanPhone : undefined,
      });
      uid = authResult.localId;
      isNew = authResult.isNew;
    }

    const now = FieldValue.serverTimestamp();

    // 3. Save / update user profile in Firestore (merge so we don't overwrite existing user data)
    await db.collection('users').doc(uid).set({
      displayName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      country: country || 'India',
      state: state || '',
      college: college || '',
      profession: profession || '',
      hasTutorialAccess: true,
      kitId: kitData.kitId,
      activationToken: cleanToken,
      activationSource: 'offline_kit',
      updatedAt: now,
      ...(isNew ? { createdAt: now, isAdmin: false } : {}),
    }, { merge: true });

    // 4. Mark kit as activated
    await kitDoc.ref.update({
      status: 'activated',
      activatedAt: now,
      activatedBy: uid,
      customerName: cleanName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      activationCountry: country || 'India',
      activationState: state || '',
    });

    // 5. Create custom login token so the user is logged in automatically
    const customToken = createCustomToken(uid);

    return NextResponse.json({
      success: true,
      customToken,
      uid,
      kitId: kitData.kitId,
      isExistingUser: !isNew,
    });
  } catch (err: any) {
    console.error('[offline-kits/activate] error:', err);
    // Use status 400 instead of 500 to prevent Netlify reverse proxy from stripping JSON error response
    return NextResponse.json(
      {
        error: err.message || 'Activation failed. Please try again.',
        code: err.code || 'activation_error',
      },
      { status: 400 }
    );
  }
}
