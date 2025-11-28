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
} from 'firebase/firestore';

// This is a new type that represents the data coming from the form,
// where dates are still strings.
type ItemFormData = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'> & {
  startDate?: string;
  endDate?: string;
};

async function logActivity(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemId: string,
  itemName: string,
  action: string,
  details?: string
) {
  const logCollection = collection(db, 'users', userId, 'activity-logs');
  await addDoc(logCollection, {
    userId,
    itemId,
    itemName,
    action,
    details,
    timestamp: serverTimestamp(),
  });
}

export async function createItem(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemData: ItemFormData
): Promise<Item> {
  const itemsCollection = collection(db, 'users', userId, 'items');

  const dataToSave = {
    ...itemData,
    userId: userId,
    status: 'Active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const newItemRef = await addDoc(itemsCollection, dataToSave);
  
  await logActivity(db, userId, newItemRef.id, itemData.name, 'created', 'Item created');

  const now = Timestamp.now();
  // We can't just spread dataToSave because createdAt/updatedAt are server values.
  // We return an optimistic response with client-generated timestamps.
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
  db: ReturnType<typeof getFirestore>,
  userId: string,
  itemData: Omit<Item, 'createdAt' | 'updatedAt'> & { createdAt?: Timestamp | Date }
): Promise<Item> {
  const { id: itemId, ...dataToUpdate } = itemData;
  const itemRef = doc(db, 'users', userId, 'items', itemId);

  // Fetch the original item to compare password
  const originalDoc = await getDoc(itemRef);
  const originalItem = originalDoc.data() as Item | undefined;
  
  // Ensure we don't try to write the id field back to the document
  const dataToSave = {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(itemRef, dataToSave as any);

  if (originalItem && originalItem.password !== itemData.password) {
    await logActivity(db, userId, itemId, itemData.name, 'password_changed', 'Password was changed');
  } else {
    await logActivity(db, userId, itemId, itemData.name, 'updated', 'Item details updated');
  }

  const now = Timestamp.now();
  
  let finalCreatedAt: Timestamp;

  if (itemData.createdAt instanceof Timestamp) {
    finalCreatedAt = itemData.createdAt;
  } else if (itemData.createdAt instanceof Date) {
    finalCreatedAt = Timestamp.fromDate(itemData.createdAt);
  } else {
    // This case should ideally not happen if data is consistent
    finalCreatedAt = now;
  }

  return {
    ...itemData,
    createdAt: finalCreatedAt,
    updatedAt: now,
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
  
  await logActivity(db, userId, itemId, item.name, 'archived', 'Item was archived');

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
      length: 16,
      includeNumbers: true,
      includeSymbols: true,
    });
    return { password: result.password };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to generate a password. Please try again.' };
  }
}
