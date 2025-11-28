'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

type ToastFunction = (options: {
  variant?: 'default' | 'destructive';
  title: string;
  description: string;
}) => void;

const createUserProfile = async (userCredential: UserCredential) => {
  const { user } = userCredential;
  const { firestore } = initializeFirebase();
  const userRef = doc(firestore, 'users', user.uid);
  const userData = {
    id: user.uid,
    email: user.email,
    firstName: user.displayName?.split(' ')[0] || '',
    lastName: user.displayName?.split(' ')[1] || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    googleId: user.providerData.find(p => p.providerId === 'google.com')?.uid,
  };
  await setDoc(userRef, userData, { merge: true });
};

export const handleGoogleSignIn = async (auth: Auth, toast: ToastFunction) => {
  const provider = new GoogleAuthProvider();
  try {
    const userCredential = await signInWithPopup(auth, provider);
    await createUserProfile(userCredential);
  } catch (error: any) {
    toast({
      variant: 'destructive',
      title: 'Google Sign-In Error',
      description: error.message,
    });
  }
};

export const handleEmailSignUp = async (auth: Auth, email: string, password: string, toast: ToastFunction) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(userCredential);
  } catch (error: any) {
    toast({
      variant: 'destructive',
      title: 'Sign-Up Error',
      description: error.message,
    });
  }
};

export const handleEmailSignIn = async (auth: Auth, email: string, password: string, toast: ToastFunction) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any)
    {
    toast({
      variant: 'destructive',
      title: 'Sign-In Error',
      description: error.message,
    });
  }
};
