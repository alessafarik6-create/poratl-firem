'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";

/**
 * Initializes the Firebase Client SDKs.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;

    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  // 🔥 KRITICKÉ PRO MOBIL LOGIN
  if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("Firebase persistence error:", err);
    });
  }

  // 🔧 emulátory pouze v developmentu
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    try {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    } catch {}

    try {
      connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    } catch {}
  }

  return {
    firebaseApp,
    auth,
    firestore,
  };
}
