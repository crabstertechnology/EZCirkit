import crypto from 'crypto';

interface ServiceAccountConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function getServiceAccountConfig(): ServiceAccountConfig {
  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  if (privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY)');
  }

  return { projectId, clientEmail, privateKey };
}

let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

/**
 * Generates an OAuth2 access token for Google Identity Toolkit APIs
 * using the Service Account RSA private key assertion.
 */
async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && tokenExpiry > now + 60) {
    return cachedAccessToken;
  }

  const { clientEmail, privateKey } = getServiceAccountConfig();

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(dataToSign);
  const signature = signer.sign(privateKey, 'base64url');
  const assertion = `${dataToSign}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Failed to obtain Google access token: ${data.error_description || data.error || res.status}`);
  }

  cachedAccessToken = data.access_token as string;
  tokenExpiry = now + ((data.expires_in as number) || 3600);
  return cachedAccessToken;
}

/**
 * Creates a valid Firebase Custom Token (JWT) directly signed with RSA-SHA256.
 * Zero external dependencies. Works on all serverless environments.
 */
export function createCustomToken(uid: string): string {
  const { clientEmail, privateKey } = getServiceAccountConfig();

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    exp: now + 3600,
    iat: now,
    iss: clientEmail,
    sub: clientEmail,
    uid,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(dataToSign);
  const signature = signer.sign(privateKey, 'base64url');

  return `${dataToSign}.${signature}`;
}

export interface IdentityUser {
  localId: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
}

/**
 * Look up an existing user by email using the Google Identity Toolkit REST API.
 */
export async function findUserByEmail(email: string): Promise<IdentityUser | null> {
  const token = await getGoogleAccessToken();
  const { projectId } = getServiceAccountConfig();

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: [email.toLowerCase().trim()] }),
  });

  const data = await res.json();
  if (data.users && data.users.length > 0) {
    const u = data.users[0];
    return {
      localId: u.localId,
      email: u.email,
      displayName: u.displayName,
      phoneNumber: u.phoneNumber,
    };
  }

  return null;
}

/**
 * Create a new user in Firebase Auth using Google Identity Toolkit REST API.
 */
export async function createAuthUser(params: {
  email: string;
  password?: string;
  displayName?: string;
  phoneNumber?: string;
}): Promise<{ localId: string; isNew: boolean }> {
  const token = await getGoogleAccessToken();
  const { projectId } = getServiceAccountConfig();

  const reqBody: Record<string, any> = {
    email: params.email.toLowerCase().trim(),
    displayName: params.displayName || '',
  };
  if (params.password) reqBody.password = params.password;
  if (params.phoneNumber && params.phoneNumber.startsWith('+')) {
    reqBody.phoneNumber = params.phoneNumber;
  }

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reqBody),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg = data.error?.message || '';

    // If email already exists, retrieve existing user's localId
    if (errorMsg === 'EMAIL_EXISTS') {
      const existing = await findUserByEmail(params.email);
      if (existing) {
        return { localId: existing.localId, isNew: false };
      }
      throw new Error('EMAIL_EXISTS');
    }

    // If phone number conflicts or is invalid, retry without phone number
    if (
      (errorMsg === 'PHONE_NUMBER_EXISTS' || errorMsg === 'INVALID_PHONE_NUMBER') &&
      reqBody.phoneNumber
    ) {
      delete reqBody.phoneNumber;
      const retryRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqBody),
      });
      const retryData = await retryRes.json();
      if (!retryRes.ok) {
        throw new Error(retryData.error?.message || 'Failed to create user account');
      }
      return { localId: retryData.localId, isNew: true };
    }

    throw new Error(errorMsg || 'Failed to create user account');
  }

  return { localId: data.localId, isNew: true };
}
