import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const db = await getAdminDb();
    const adminAuth = await getAdminAuth();

    const body = await req.json().catch(() => ({}));
    const {
      token,
      kitId,
      name,
      email,
      phone,
      password,
      country,
      state,
      college,
      profession,
    } = body as {
      token?: string;
      kitId?: string;
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      country?: string;
      state?: string;
      college?: string;
      profession?: string;
    };

    const cleanToken = (token || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();

    if (!cleanToken) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
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
    let uid: string;
    let isExistingUser = false;

    try {
      const userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: password || undefined,
        displayName: cleanName,
        ...(cleanPhone.startsWith('+') ? { phoneNumber: cleanPhone } : {}),
      });
      uid = userRecord.uid;
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        // User already has an account — link the kit to their existing account!
        const existingUser = await adminAuth.getUserByEmail(cleanEmail);
        uid = existingUser.uid;
        isExistingUser = true;

        // Optionally update display name if not set
        if (cleanName && (!existingUser.displayName || existingUser.displayName === '')) {
          try {
            await adminAuth.updateUser(uid, { displayName: cleanName });
          } catch (e) {
            console.warn('[offline-kits/activate] could not update display name:', e);
          }
        }
      } else if (
        authError.code === 'auth/phone-number-already-exists' ||
        authError.code === 'auth/invalid-phone-number'
      ) {
        // Retry creating user without the phone number in Firebase Auth
        const fallbackRecord = await adminAuth.createUser({
          email: cleanEmail,
          password: password || undefined,
          displayName: cleanName,
        });
        uid = fallbackRecord.uid;
      } else {
        throw authError;
      }
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
      ...(isExistingUser ? {} : { createdAt: now, isAdmin: false }),
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

    // 5. Create custom login token so the user can be logged in automatically
    const customToken = await adminAuth.createCustomToken(uid);

    return NextResponse.json({
      success: true,
      customToken,
      uid,
      kitId: kitData.kitId,
      isExistingUser,
    });
  } catch (err: any) {
    console.error('[offline-kits/activate] error:', err);
    // Use status 400 instead of 500 to prevent Netlify proxy from stripping JSON error response
    return NextResponse.json(
      {
        error: err.message || 'Activation failed. Please try again.',
        code: err.code || 'activation_error',
      },
      { status: 400 }
    );
  }
}
