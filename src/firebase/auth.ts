'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
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
  
  const googleId = user.providerData.find(p => p.providerId === 'google.com')?.uid;

  // Check if the user is the admin and set status accordingly.
  const isAdmin = user.email === 'mrbishalbaniya4@gmail.com';
  const userStatus = isAdmin ? 'active' : 'pending';

  const userData: any = {
    id: user.uid,
    email: user.email,
    firstName: user.displayName?.split(' ')[0] || '',
    lastName: user.displayName?.split(' ')[1] || '',
    status: userStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (googleId) {
    userData.googleId = googleId;
  }

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

export const handleChangePassword = async (
    auth: Auth,
    currentPassword_ext: string,
    newPassword_ext: string,
    toast: ToastFunction
  ) => {
    const user = auth.currentUser;
  
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'No user is currently signed in.',
      });
      return;
    }
  
    const credential = EmailAuthProvider.credential(user.email, currentPassword_ext);
  
    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword_ext);
      toast({
        title: 'Success',
        description: 'Your password has been changed successfully.',
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/wrong-password') {
        description = 'The current password you entered is incorrect.';
      } else if (error.code === 'auth/weak-password') {
        description = 'The new password is too weak. Please choose a stronger one.';
      }
      toast({
        variant: 'destructive',
        title: 'Password Change Failed',
        description: description,
      });
    }
};
