'use client';

import { getStorage } from 'firebase/storage';
import { initializeFirebase } from './init';

const { firebaseApp } = initializeFirebase();

// Storage uses the same app configured with storageBucket in firebaseConfig.
// Emulator is not connected by default; configure it separately if needed.
export const storage = getStorage(firebaseApp);

