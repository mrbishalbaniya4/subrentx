'use server';

import { suggestExpirationDate } from '@/ai/flows/suggest-expiration-date';
import { generatePassword } from '@/ai/flows/generate-password-flow';
import type { Item } from '@/lib/types';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth } from 'firebase-admin';
import {getApp, getApps, initializeApp} from 'firebase-admin/app';

// This is a new type that represents the data coming from the form,
// where dates are still strings.
type ItemFormData = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'> & {
  startDate?: string;
  endDate?: string;
};

// Initialize Firebase Admin SDK
const app = getApps().length
  ? getApp()
  : initializeApp();

const db = getFirestore(app);

async function getCurrentUserId(): Promise<string> {
  // This is a placeholder for getting the current user's ID
  // In a real app, you'd get this from the session or auth state.
  // For now, we'll assume a hardcoded user for demonstration.
  // In a real Next.js app with auth, you might use:
  // const session = await getSession();
  // if (!session?.user?.id) throw new Error('Not authenticated');
  // return session.user.id;
  
  // This part needs a proper implementation based on your auth setup
  // For now, let's throw an error if no user is found.
  // We'll modify the client to provide the userId.
  const user = await auth().verifyIdToken(
    // A placeholder token is used here, this would be the user's actual ID token in a real app
    'placeholder-token'
  ).catch(() => null);

  //This is a temporary solution and will be replaced with a proper auth check
  return 'anonymous-user';
}

async function logActivity(
  userId: string,
  itemId: string,
  itemName: string,
  action: string,
  details?: string
) {
  try {
    const logCollection = collection(db, 'users', userId, 'activity-logs');
    await addDoc(logCollection, {
      userId,
      itemId,
      itemName,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Decide if you want to throw the error or just log it
  }
}

export async function createItem(userId: string, itemData: ItemFormData): Promise<Item> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const itemsCollection = collection(db, 'users', userId, 'items');

  const dataToSave = {
    ...itemData,
    userId: userId,
    status: 'Active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const newItemRef = await addDoc(itemsCollection, dataToSave);
  
  await logActivity(userId, newItemRef.id, itemData.name, 'created', 'Item created');

  const now = Timestamp.now();
  return { 
    ...(itemData as any),
    id: newItemRef.id,
    userId: userId,
    status: 'Active',
    createdAt: now,
    updatedAt: now,
  } as Item;
}

export async function editItem(
  userId: string,
  itemData: Omit<Item, 'createdAt' | 'updatedAt'> & { createdAt?: Timestamp | Date }
): Promise<Item> {
   if (!userId) {
    throw new Error('User not authenticated');
  }
  const { id: itemId, ...dataToUpdate } = itemData;
  const itemRef = doc(db, 'users', userId, 'items', itemId);

  const originalDoc = await getDoc(itemRef);
  const originalItem = originalDoc.data() as Item | undefined;
  
  const dataToSave = {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(itemRef, dataToSave as any);

  if (originalItem && originalItem.password !== itemData.password) {
    await logActivity(userId, itemId, itemData.name, 'password_changed', 'Password was changed');
  } else {
    await logActivity(userId, itemId, itemData.name, 'updated', 'Item details updated');
  }

  const now = Timestamp.now();
  
  let finalCreatedAt: Timestamp;
  if (itemData.createdAt instanceof Timestamp) {
    finalCreatedAt = itemData.createdAt;
  } else if (itemData.createdAt instanceof Date) {
    finalCreatedAt = Timestamp.fromDate(itemData.createdAt);
  } else {
    finalCreatedAt = now;
  }

  return {
    ...itemData,
    createdAt: finalCreatedAt,
    updatedAt: now,
  } as Item;
}

export async function duplicateItem(userId: string, itemId: string): Promise<Item> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const itemRef = doc(db, 'users', userId, 'items', itemId);
  const docSnap = await getDoc(itemRef);

  if (!docSnap.exists()) {
    throw new Error('Item not found');
  }

  const originalItem = docSnap.data() as Omit<Item, 'id'>;

  const duplicatedItemData = {
    ...originalItem,
    name: `${originalItem.name} (Copy)`,
    status: 'Active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const itemsCollection = collection(db, 'users', userId, 'items');
  const newItemRef = await addDoc(itemsCollection, duplicatedItemData);

  const now = Timestamp.now();
  return {
    id: newItemRef.id,
    ...(duplicatedItemData as any),
    createdAt: now,
    updatedAt: now,
  };
}

export async function archiveItem(userId: string, itemId: string) {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const itemRef = doc(db, 'users', userId, 'items', itemId);
  const docSnap = await getDoc(itemRef);

  if (!docSnap.exists()) {
    throw new Error('Item not found');
  }
  const item = docSnap.data() as Item;

  await updateDoc(itemRef, {
    status: 'Archived',
    archivedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  
  await logActivity(userId, itemId, item.name, 'archived', 'Item was archived');

  return { success: true };
}


export async function suggestDateAction(itemDescription: string): Promise<{
  suggestedDate?: string;
  error?: string;
}> {
  if (!itemDescription) {
    return { error: 'Item description is required.' };
  }
  try {
    const result = await suggestExpirationDate({ itemDescription });
    return { suggestedDate: result.suggestedExpirationDate };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to suggest a date. Please try again.' };
  }
}

export async function generatePasswordAction(): Promise<{
  password?: string;
  error?: string;
}> {
  try {
    const result = await generatePassword({
      length: 6,
      includeNumbers: true,
      includeSymbols: false,
    });
    return { password: result.password };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to generate a password. Please try again.' };
  }
}