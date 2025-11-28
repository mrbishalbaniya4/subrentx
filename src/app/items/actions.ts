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
  Timestamp,
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
): Promise<Item> {
  const itemsCollection = collection(db, 'users', userId, 'items');

  const dataToSave = {
    ...itemData,
    userId: userId,
    status: 'Active', // New items are always active
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const newItemRef = await addDoc(itemsCollection, dataToSave);
  revalidatePath('/');
  
  // Return a complete Item object with placeholder Timestamps for optimistic updates
  const now = Timestamp.now();
  return { 
    ...dataToSave,
    id: newItemRef.id,
    createdAt: now,
    updatedAt: now,
  } as Item;
}

export async function editItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemData: Omit<Item, 'createdAt' | 'updatedAt' | 'userId'>
): Promise<Item> {
  const itemRef = doc(db, 'users', userId, 'items', itemData.id);
  
  const dataToSave = {
    ...itemData,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(itemRef, dataToSave);
  revalidatePath('/');

  // Return a complete item with a new updated timestamp for optimistic updates
  return { 
    ...dataToSave, 
    userId,
    createdAt: new Timestamp(itemData.createdAt.seconds, itemData.createdAt.nanoseconds), // Preserve original creation date
    updatedAt: Timestamp.now()
  };
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
