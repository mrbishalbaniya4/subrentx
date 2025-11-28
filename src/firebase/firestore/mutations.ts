'use client';

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Firestore,
  getDoc,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import type { Item } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// This is a new type that represents the data coming from the form,
// where dates are still strings.
type ItemFormData = Omit<
  Item,
  'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'
> & {
  startDate?: string;
  endDate?: string;
};


async function logActivity(
  firestore: Firestore,
  userId: string,
  itemId: string,
  itemName: string,
  action: string,
  details?: string
) {
  if (!userId) return;
  try {
    const logCollection = collection(firestore, `users/${userId}/activity-logs`);
    // Not awaiting this so it doesn't block
    addDoc(logCollection, {
      userId,
      itemId,
      itemName,
      action,
      details,
      timestamp: serverTimestamp(),
    }).catch(error => {
        // We can choose to silently fail here or emit a non-critical error
        console.warn("Failed to log activity:", error);
    });
  } catch (error) {
    console.error('Error initiating activity log:', error);
  }
}

export async function createItem(
  firestore: Firestore,
  userId: string,
  itemData: ItemFormData
): Promise<string> {
    const itemsCollection = collection(firestore, `users/${userId}/items`);
    const dataToSave = {
      ...itemData,
      userId: userId,
      status: 'Active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
        const newItemRef = await addDoc(itemsCollection, dataToSave);
        await logActivity(firestore, userId, newItemRef.id, itemData.name, 'created', 'Item created');
        return newItemRef.id;
    } catch (error) {
        console.error('Error creating item:', error);
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: itemsCollection.path,
                operation: 'create',
                requestResourceData: dataToSave,
            })
        );
        throw error;
    }
}


export async function editItem(
  firestore: Firestore,
  userId: string,
  itemData: Omit<Item, 'createdAt' | 'updatedAt'> & {
    createdAt?: Timestamp | FieldValue;
  }
): Promise<void> {
  const { id: itemId, ...dataToUpdate } = itemData;
  const itemRef = doc(firestore, `users/${userId}/items/${itemId}`);

  const originalDocSnap = await getDoc(itemRef);
    if (!originalDocSnap.exists()) {
        throw new Error("Document not found");
    }
  const originalItem = originalDocSnap.data() as Item;

  // Explicitly preserve the original `createdAt` timestamp.
  // Merge the incoming data with a payload that ensures immutable fields are respected.
  const dataToSave = {
    ...dataToUpdate,
    userId: originalItem.userId, // Enforce immutability from original doc
    createdAt: originalItem.createdAt, // Enforce immutability from original doc
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(itemRef, dataToSave);

    if (originalItem && originalItem.password !== itemData.password) {
        await logActivity(
          firestore,
          userId,
          itemId,
          itemData.name,
          'password_changed',
          'Password was changed'
        );
      } else {
        await logActivity(
          firestore,
          userId,
          itemId,
          itemData.name,
          'updated',
          'Item details updated'
        );
      }

  } catch(error) {
      console.error('Error updating item:', error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
            path: itemRef.path,
            operation: 'update',
            requestResourceData: dataToSave,
        })
    );
    throw error;
  }
}

export async function duplicateItem(
    firestore: Firestore,
    userId: string,
    itemId: string
  ): Promise<string> {

    const itemRef = doc(firestore, `users/${userId}/items/${itemId}`);
    
    try {
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
    
        const itemsCollection = collection(firestore, `users/${userId}/items`);
        const newItemRef = await addDoc(itemsCollection, duplicatedItemData);
        return newItemRef.id;

    } catch(error) {
        console.error('Error duplicating item:', error);
        // We can't know the new path, so we emit error on the collection
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: `users/${userId}/items`,
                operation: 'create',
                requestResourceData: { name: `${(await getDoc(itemRef)).data()?.name} (Copy)`},
            })
        );
        throw error;
    }
}


export async function archiveItem(firestore: Firestore, userId: string, itemId: string): Promise<void> {
    const itemRef = doc(firestore, `users/${userId}/items/${itemId}`);
    
    try {
        const docSnap = await getDoc(itemRef);
        if (!docSnap.exists()) {
            throw new Error('Item not found');
        }
        const item = docSnap.data() as Item;
        
        const updateData = {
            status: 'Archived',
            archivedAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
        };

        await updateDoc(itemRef, updateData);

        await logActivity(firestore, userId, itemId, item.name, 'archived', 'Item was archived');

    } catch(error) {
        console.error('Error archiving item:', error);
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: itemRef.path,
                operation: 'update',
                requestResourceData: { status: 'Archived' },
            })
        );
        throw error;
    }
}