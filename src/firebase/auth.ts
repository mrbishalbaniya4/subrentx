'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

type ToastFunction = (options: {
  variant?: 'default' | 'destructive';
  title: string;
  description: string;
}) => void;

export const handleGoogleSignIn = async (auth: Auth, toast: ToastFunction) => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
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
    await createUserWithEmailAndPassword(auth, email, password);
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
  } catch (error: any) {
    toast({
      variant: 'destructive',
      title: 'Sign-In Error',
      description: error.message,
    });
  }
};
