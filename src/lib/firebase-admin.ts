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
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
