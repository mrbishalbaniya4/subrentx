'use server';

import { suggestExpirationDate } from '@/ai/flows/suggest-expiration-date';
import type { Item } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// NOTE: These functions are now designed to be called from client components
// that have access to Firestore and the user's ID.

export async function createItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'>
) {
  const itemsCollection = collection(db, 'users', userId, 'items');
  const newItem = await addDoc(itemsCollection, {
    ...item,
    userId: userId,
    status: 'Active', // New items are always active
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  revalidatePath('/');
  return { ...item, id: newItem.id, userId, status: 'Active' };
}

export async function editItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  item: Omit<Item, 'createdAt' | 'updatedAt' | 'userId'>
) {
  const itemRef = doc(db, 'users', userId, 'items', item.id);
  await updateDoc(itemRef, {
    ...item,
    updatedAt: serverTimestamp(),
  });
  revalidatePath('/');
  return { ...item, userId };
}

export async function archiveItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemId: string
) {
  const itemRef = doc(db, 'users', userId, 'items', itemId);
  await updateDoc(itemRef, {
    status: 'Archived',
    archivedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  revalidatePath('/');
  return { success: true };
}

// This action can remain a server action as it doesn't depend on user context directly.
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
