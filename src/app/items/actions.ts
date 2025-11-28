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

// This is a new type that represents the data coming from the form,
// where dates are still strings.
type ItemFormData = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'> & {
  startDate?: string;
  endDate?: string;
};


export async function createItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemData: Omit<ItemFormData, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'>
) {
  const itemsCollection = collection(db, 'users', userId, 'items');

  // Convert date strings to ISO strings only if they exist
  const dataToSave = {
    ...itemData,
    startDate: itemData.startDate ? new Date(itemData.startDate).toISOString() : '',
    endDate: itemData.endDate ? new Date(itemData.endDate).toISOString() : '',
    userId: userId,
    status: 'Active', // New items are always active
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const newItemRef = await addDoc(itemsCollection, dataToSave);
  revalidatePath('/');
  
  // We don't have the final Timestamps here, but can return the string versions for optimistic updates
  return { ...dataToSave, id: newItemRef.id };
}

export async function editItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemData: Omit<Item, 'createdAt' | 'updatedAt' | 'userId'>
) {
  const itemRef = doc(db, 'users', userId, 'items', itemData.id);
  
  // Convert date strings to ISO strings only if they exist
  const dataToSave = {
    ...itemData,
    startDate: itemData.startDate ? new Date(itemData.startDate).toISOString() : '',
    endDate: itemData.endDate ? new Date(itemData.endDate).toISOString() : '',
    updatedAt: serverTimestamp(),
  };

  await updateDoc(itemRef, dataToSave);
  revalidatePath('/');
  return { ...dataToSave, userId };
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
