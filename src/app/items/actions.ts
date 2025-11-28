'use server';

import { suggestExpirationDate } from '@/ai/flows/suggest-expiration-date';
import { generatePassword } from '@/ai/flows/generate-password-flow';
import type { Item } from '@/lib/types';
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';
import { auth } from 'firebase-admin';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';

// This is a new type that represents the data coming from the form,
// where dates are still strings.
type ItemFormData = Omit<
  Item,
  'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'
> & {
  startDate?: string;
  endDate?: string;
};

// Initialize Firebase Admin SDK
const app = getApps().length ? getApp() : initializeApp();
const db = getFirestore(app);

// In a real app, you would get the user's ID from an auth session.
// For this prototype, we'll need to pass it from the client.
// A more robust solution would use NextAuth.js or similar to manage sessions.

async function logActivity(
  userId: string,
  itemId: string,
  itemName: string,
  action: string,
  details?: string
) {
  if (!userId) return;
  try {
    const logCollection = db.collection(`users/${userId}/activity-logs`);
    await logCollection.add({
      userId,
      itemId,
      itemName,
      action,
      details,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Decide if you want to throw the error or just log it
  }
}

export async function createItem(
  userId: string,
  itemData: ItemFormData
): Promise<Item> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const itemsCollection = db.collection(`users/${userId}/items`);

  const dataToSave = {
    ...itemData,
    userId: userId,
    status: 'Active' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const newItemRef = await itemsCollection.add(dataToSave);

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
  itemData: Omit<Item, 'createdAt' | 'updatedAt'> & {
    createdAt?: Timestamp;
  }
): Promise<Item> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const { id: itemId, ...dataToUpdate } = itemData;
  const itemRef = db.doc(`users/${userId}/items/${itemId}`);

  const originalDoc = await itemRef.get();
  const originalItem = originalDoc.data() as Item | undefined;

  const dataToSave = {
    ...dataToUpdate,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await itemRef.update(dataToSave);

  if (originalItem && originalItem.password !== itemData.password) {
    await logActivity(
      userId,
      itemId,
      itemData.name,
      'password_changed',
      'Password was changed'
    );
  } else {
    await logActivity(
      userId,
      itemId,
      itemData.name,
      'updated',
      'Item details updated'
    );
  }

  const now = Timestamp.now();
  
  let finalCreatedAt: Timestamp;
  if (itemData.createdAt instanceof Timestamp) {
    finalCreatedAt = itemData.createdAt;
  } else {
    finalCreatedAt = now; // Fallback, should ideally not happen
  }


  return {
    ...itemData,
    createdAt: finalCreatedAt,
    updatedAt: now,
  } as Item;
}

export async function duplicateItem(
  userId: string,
  itemId: string
): Promise<Item> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const itemRef = db.doc(`users/${userId}/items/${itemId}`);
  const docSnap = await itemRef.get();

  if (!docSnap.exists) {
    throw new Error('Item not found');
  }

  const originalItem = docSnap.data() as Omit<Item, 'id'>;

  const duplicatedItemData = {
    ...originalItem,
    name: `${originalItem.name} (Copy)`,
    status: 'Active' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const itemsCollection = db.collection(`users/${userId}/items`);
  const newItemRef = await itemsCollection.add(duplicatedItemData);

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
  const itemRef = db.doc(`users/${userId}/items/${itemId}`);
  const docSnap = await itemRef.get();

  if (!docSnap.exists) {
    throw new Error('Item not found');
  }
  const item = docSnap.data() as Item;

  await itemRef.update({
    status: 'Archived',
    archivedAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
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
