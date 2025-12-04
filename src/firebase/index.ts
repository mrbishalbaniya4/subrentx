'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  enableIndexedDbPersistence, 
  Firestore,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore'

let firebaseApp: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

// Explicitly set a cache size. For example, 100MB.
// const CACHE_SIZE_BYTES = 100 * 1024 * 1024; 

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!firebaseApp) {
    if (getApps().length) {
      firebaseApp = getApp();
    } else {
      try {
        firebaseApp = initializeApp();
      } catch (e) {
        if (process.env.NODE_ENV === "production") {
          console.warn('Automatic initialization failed. Falling back to firebaseConfig object.', e);
        }
        firebaseApp = initializeApp(firebaseConfig);
      }
    }
  }

  if (!firestoreInstance) {
    // Initialize Firestore with cache settings
    firestoreInstance = initializeFirestore(firebaseApp, {
        // Explicitly set the cache size. 
        // CACHE_SIZE_UNLIMITED is the default, but setting it here makes it intentional.
        // You can replace it with a specific byte value, like CACHE_SIZE_BYTES.
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });

    try {
      enableIndexedDbPersistence(firestoreInstance)
        .catch((err) => {
          if (err.code == 'failed-precondition') {
            console.warn('Firestore offline persistence failed: multiple tabs open.');
          } else if (err.code == 'unimplemented') {
            console.warn('Firestore offline persistence failed: browser does not support it.');
          }
        });
    } catch (err) {
      console.error("Error enabling offline persistence", err);
    }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestoreInstance
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
