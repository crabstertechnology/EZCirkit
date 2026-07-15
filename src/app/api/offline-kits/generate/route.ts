
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, ADMIN_SECRET } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

function parseKitNumber(kitId?: string): number {
  if (!kitId) return 0;
  const match = kitId.match(/EZC-(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
}

async function getNextKitCounter(db: FirebaseFirestore.Firestore, count: number): Promise<number> {
  // Query actual highest kitId to heal counter in case of deletions
  const kitsSnap = await db.collection('offline_kits')
    .orderBy('kitId', 'desc')
    .limit(1)
    .get();

  let maxExisting = 0;
  if (!kitsSnap.empty) {
    const highestKitId = kitsSnap.docs[0].data().kitId;
    maxExisting = parseKitNumber(highestKitId);
  }

  const counterRef = db.collection('_counters').doc('offline_kits');
  let startFrom = 0;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const storedValue = snap.exists ? (snap.data()!.value as number) : 0;
    
    // Auto-heal counter: do not let it exceed the actual highest kit number + 1.
    // If all kits were deleted, maxExisting is 0, so counter resets to 0.
    const current = Math.min(storedValue, maxExisting);
    
    startFrom = current + 1;
    tx.set(counterRef, { value: current + count }, { merge: true });
  });
  return startFrom;
}

function makeToken() { return randomBytes(24).toString('base64url'); }
function makeKitId(n: number) { return `EZC-${String(n).padStart(6, '0')}`; }

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { batchName, shopName, quantity } = await req.json() as {
      batchName: string; shopName?: string; quantity: number;
    };

    if (!batchName || !quantity || quantity < 1 || quantity > 500) {
      return NextResponse.json(
        { error: 'batchName and quantity (1-500) are required.' },
        { status: 400 }
      );
    }

    const db = await getAdminDb();
    const batchId = randomBytes(8).toString('hex');
    const startCounter = await getNextKitCounter(db, quantity);

    const batch = db.batch();
    const kits: Array<{ kitId: string; activationToken: string }> = [];

    for (let i = 0; i < quantity; i++) {
      const kitId = makeKitId(startCounter + i);
      const activationToken = makeToken();
      const docRef = db.collection('offline_kits').doc();
      batch.set(docRef, {
        kitId, activationToken, batchId, batchName,
        shopName: shopName || '',
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        activatedAt: null, activatedBy: null,
        customerName: null, customerEmail: null, customerPhone: null,
      });
      kits.push({ kitId, activationToken });
    }

    await batch.commit();
    return NextResponse.json({ success: true, batchId, batchName, shopName: shopName || '', quantity, kits });
  } catch (err: any) {
    console.error('[offline-kits/generate]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
