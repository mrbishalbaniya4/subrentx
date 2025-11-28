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

  // Remove id if it exists, as it's not needed for creation
  const { id, ...dataToSave } = {
    ...itemData,
    userId: userId,
    status: 'Active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const newItemRef = await addDoc(itemsCollection, dataToSave);
  
  const now = Timestamp.now();
  // We can't just spread dataToSave because createdAt/updatedAt are server values.
  // We return an optimistic response with client-generated timestamps.
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
  itemData: Omit<Item, 'createdAt' | 'updatedAt'> & { createdAt?: Timestamp }
): Promise<Item> {
  const { id: itemId, ...dataToUpdate } = itemData;
  const itemRef = doc(db, 'users', userId, 'items', itemId);
  
  const dataToSave = {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(itemRef, dataToSave);

  const now = Timestamp.now();
  // Ensure createdAt is carried over correctly, falling back to a new timestamp if it's missing.
  // The client-side state will be updated by the real-time listener anyway.
  return {
    ...itemData,
    createdAt: itemData.createdAt || now, // Preserve original createdAt
    updatedAt: now, // Optimistic update
  } as Item;
}

export async function duplicateItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemId: string
): Promise<Item> {
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
