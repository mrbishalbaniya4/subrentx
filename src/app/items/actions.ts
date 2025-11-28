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
type ItemFormData = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & {
  startDate?: string;
  endDate?: string;
};


export async function createItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemData: ItemFormData
): Promise<Item> {
  const itemsCollection = collection(db, 'users', userId, 'items');

  // Construct the object to save to Firestore.
  // New items are always 'Active'.
  const dataToSave = {
    ...itemData,
    userId: userId,
    status: 'Active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const newItemRef = await addDoc(itemsCollection, dataToSave);
  revalidatePath('/');
  
  // Return a complete Item object with placeholder Timestamps for optimistic updates
  const now = Timestamp.now();
  return { 
    ...itemData, // The original form data
    id: newItemRef.id,
    userId: userId,
    status: 'Active',
    createdAt: now,
    updatedAt: now,
  } as Item;
}

export async function editItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemData: Omit<Item, 'createdAt' | 'updatedAt' | 'userId'>
): Promise<Item> {
  const { id: itemId, ...dataToUpdate } = itemData;
  const itemRef = doc(db, 'users', userId, 'items', itemId);
  
  const dataToSave = {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(itemRef, dataToSave);
  revalidatePath('/');

  // Re-fetch the original item to get the correct createdAt timestamp
  // This is a simplified approach; in a real app, you might pass createdAt from the client
  // but this ensures consistency.
  const now = Timestamp.now();
  const created = (itemData as Item).createdAt || now;

  return { 
    id: itemId,
    ...dataToSave, 
    userId,
    createdAt: created,
    updatedAt: now,
  } as Item;
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
