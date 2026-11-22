/**
 * Shared Firebase Admin SDK initialiser.
 * Uses the individual env vars already in .env.local:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Falls back to Application Default Credentials (ADC) for Firebase App Hosting.
 */

async function initAdmin() {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app');
  if (getApps().length) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey    = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Strip accidental leading/trailing quotes from environment variables
    privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
  }

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    // App Hosting / GCP: use ADC
    initializeApp();
  }
}

let cachedDb: FirebaseFirestore.Firestore | null = null;
let cachedAuth: any = null;

export async function getAdminDb() {
  if (cachedDb) return cachedDb;
  await initAdmin();
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Settings may already be locked if already initialized
  }
  cachedDb = db;
  return cachedDb;
}

export async function getAdminAuth() {
  if (cachedAuth) return cachedAuth;
  await initAdmin();
  const { getAuth } = await import('firebase-admin/auth');
  cachedAuth = getAuth();
  return cachedAuth;
}

export const ADMIN_SECRET =
  process.env.ADMIN_API_SECRET || 'ezcirkit-admin-2024';

/**
 * Revokes tutorial and IDE access for a customer linked to an offline kit.
 * Clears hasTutorialAccess and unlinks kitId.
 */
export async function revokeKitUserAccess(
  db: FirebaseFirestore.Firestore,
  kitData: {
    activatedBy?: string | null;
    customerEmail?: string | null;
    kitId?: string | null;
  },
  reason: 'kit_deleted' | 'kit_deactivated' = 'kit_deleted'
) {
  const uid = kitData?.activatedBy;
  const email = kitData?.customerEmail;
  const kitId = kitData?.kitId;
  const now = new Date().toISOString();

  const updatePayload = {
    hasTutorialAccess: false,
    kitId: null,
    kitAccessRevokedAt: now,
    revocationReason: reason,
  };

  // 1. Direct UID update
  if (uid) {
    try {
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        await userRef.update(updatePayload);
        return;
      }
    } catch (e) {
      console.warn(`[revokeKitUserAccess] failed to update user ${uid}:`, e);
    }
  }

  // 2. Fallback: Search by customerEmail
  if (email) {
    try {
      const usersSnap = await db.collection('users').where('email', '==', email.toLowerCase().trim()).get();
      for (const doc of usersSnap.docs) {
        await doc.ref.update(updatePayload);
      }
    } catch (e) {
      console.warn(`[revokeKitUserAccess] failed to update email ${email}:`, e);
    }
  }

  // 3. Fallback: Search by kitId
  if (kitId) {
    try {
      const kitUsersSnap = await db.collection('users').where('kitId', '==', kitId).get();
      for (const doc of kitUsersSnap.docs) {
        await doc.ref.update(updatePayload);
      }
    } catch (e) {
      console.warn(`[revokeKitUserAccess] failed to update kitId ${kitId}:`, e);
    }
  }
}
