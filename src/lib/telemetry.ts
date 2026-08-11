'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore, auth } = initializeFirebase();

export const logTelemetryEvent = async (collectionName: string, data: any) => {
  if (!firestore) return;
  const user = auth?.currentUser;
  try {
    await addDoc(collection(firestore, collectionName), {
      ...data,
      userId: user ? user.uid : null,
      userName: user ? user.displayName : null,
      userEmail: user ? user.email : null,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Server',
    });
  } catch (err) {
    console.error("Telemetry event failed to log:", err);
  }
};
