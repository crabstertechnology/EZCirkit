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

export async function getAdminDb() {
  await initAdmin();
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore();
}

export async function getAdminAuth() {
  await initAdmin();
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth();
}

export const ADMIN_SECRET =
  process.env.ADMIN_API_SECRET || 'ezcirkit-admin-2024';
