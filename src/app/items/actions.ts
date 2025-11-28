'use server';

import { suggestExpirationDate } from '@/ai/flows/suggest-expiration-date';
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
  itemData: ItemFormData
): Promise<Item> {
  const itemsCollection = collection(db, 'users', userId, 'items');

  const dataToSave = {
    ...itemData,
    userId: userId,
    status: 'Active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const newItemRef = await addDoc(itemsCollection, dataToSave);
  
  const now = Timestamp.now();
  return { 
    ...itemData,
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

  const docSnap = await getDoc(itemRef);
  const existingData = docSnap.data();

  // Create a serializable Item object for the client.
  // The key is to convert Timestamps to something the client can handle, like ISO strings,
  // but since we are re-fetching with onSnapshot, we can just return a consistent object.
  return {
    id: itemId,
    userId: userId,
    ...dataToUpdate,
    createdAt: existingData?.createdAt || Timestamp.now(), // Ensure createdAt is a Timestamp
    updatedAt: Timestamp.now(), // Optimistic update with a new Timestamp
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
