
'use client';

import {
  Auth,
  User,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';


const { firestore } = initializeFirebase();

export const upsertUser = async (user: User) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    const isAdminEmail = user.email === 'crabstertechnology@gmail.com';

    if (!userDoc.exists()) {
        await setDoc(userRef, {
            id: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0],
            photoURL: user.photoURL || '',
            createdAt: new Date().toISOString(),
            isAdmin: isAdminEmail, // Primary admin email gets admin access
        }, { merge: true });
    } else {
        const userData = userDoc.data();
        if (isAdminEmail && !userData?.isAdmin) {
            await setDoc(userRef, { isAdmin: true }, { merge: true });
        }
    }
};

export const handleSignUp = async (auth: Auth, email: string, password: string): Promise<void> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // After creating the user, immediately send the verification email.
    await sendEmailVerification(userCredential.user);
    // Crucially, sign the user out right away. This prevents onAuthStateChanged
    // from seeing an authenticated user and causing a redirect.
    await signOut(auth);
  } catch (error) {
    console.error("Sign up error:", error);
    // Re-throw the error to be caught by the calling component
    throw error;
  }
};

export const handleLogin = async (auth: Auth, email: string, password: string): Promise<void> => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const handleLogout = async (auth: Auth): Promise<void> => {
  await signOut(auth);
};
