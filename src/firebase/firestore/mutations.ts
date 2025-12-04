

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
  deleteDoc as fbDeleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import type { Item, ItemDetails, Status } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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
    addDoc(logCollection, {
      userId,
      itemId,
      itemName,
      action,
      details,
      timestamp: serverTimestamp(),
    }).catch(error => {
        console.warn("Failed to log activity:", error);
    });
  } catch (error) {
    console.error('Error initiating activity log:', error);
  }
}

export async function createItem(
  firestore: Firestore,
  userId: string,
  summaryData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  detailsData: ItemDetails,
  allItems: Item[]
): Promise<string> {
    const batch = writeBatch(firestore);
    const newItemRef = doc(collection(firestore, `users/${userId}/items`));
    const detailsRef = doc(firestore, newItemRef.path, 'details', 'data');
    
    let masterPrice = null;
    if (summaryData.parentId && summaryData.parentId !== 'none') {
        // When creating, allItems might not be fully updated yet.
        // It's better to fetch the master product directly if needed.
        const masterRef = doc(firestore, `users/${userId}/items/${summaryData.parentId}`);
        const masterSnap = await getDoc(masterRef);
        if (masterSnap.exists()) {
            const masterProduct = masterSnap.data() as Item;
            masterPrice = masterProduct.purchasePrice || 0;
        }
    }
    
    const summaryToSave = {
      ...summaryData,
      userId: userId,
      status: 'Active' as const,
      masterPrice: masterPrice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (detailsData.password) {
        summaryToSave.lastPasswordChange = new Date().toISOString();
    }

    batch.set(newItemRef, summaryToSave);
    batch.set(detailsRef, detailsData);

    try {
        await batch.commit();
        await logActivity(firestore, userId, newItemRef.id, summaryData.name!, 'created', 'Item created');
        return newItemRef.id;
    } catch (error) {
        console.error('Error creating item:', error);
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: `users/${userId}/items`, // Path of the collection
                operation: 'create',
                requestResourceData: summaryToSave,
            })
        );
        throw error;
    }
}


export async function editItem(
  firestore: Firestore,
  userId: string,
  summaryData: Partial<Item> & { id: string },
  detailsData: ItemDetails,
): Promise<void> {
  const { id: itemId, ...dataToUpdate } = summaryData;
  const itemRef = doc(firestore, `users/${userId}/items/${itemId}`);
  const detailsRef = doc(firestore, itemRef.path, 'details', 'data');
  const batch = writeBatch(firestore);

  try {
    const docSnap = await getDoc(itemRef);
    if (!docSnap.exists()) {
      throw new Error('Item not found');
    }
    const originalData = docSnap.data() as Item;

    const summaryToSave: Partial<Item> & {updatedAt: FieldValue} = {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    };
    
    const passwordChanged = detailsData.password !== undefined;
    
    if (passwordChanged) {
        summaryToSave.lastPasswordChange = new Date().toISOString();
    }
    
    batch.update(itemRef, summaryToSave);
    batch.set(detailsRef, detailsData, { merge: true });

    await batch.commit();

    let activityAction = 'updated';
    let activityDetails = 'Item details updated';
    const isMasterProduct = !originalData.parentId;

    if (passwordChanged) {
        activityAction = 'password_changed';
        activityDetails = 'Password was changed';
        if (isMasterProduct) {
            activityDetails += ' on master product.';
        }
    } else if ('status' in dataToUpdate && dataToUpdate.status !== originalData.status) {
        activityAction = 'updated';
        activityDetails = `Status changed to ${dataToUpdate.status}`;
    }

    await logActivity(
        firestore,
        userId,
        itemId,
        dataToUpdate.name || originalData.name,
        activityAction,
        activityDetails
    );

  } catch(error) {
      console.error('Error updating item:', error);
      const dataToSaveForError = {
        ...summaryData,
        ...detailsData,
        updatedAt: new Date().toISOString(),
      }

      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
            path: itemRef.path,
            operation: 'update',
            requestResourceData: dataToSaveForError,
        })
    );
    throw error;
  }
}

export async function updateItemStatus(
  firestore: Firestore,
  userId: string,
  itemId: string,
  newStatus: Status
): Promise<void> {
  const itemRef = doc(firestore, `users/${userId}/items/${itemId}`);
  
  const updateData: { status: Status; archivedAt?: string | null; updatedAt: FieldValue } = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (newStatus === 'Archived') {
    updateData.archivedAt = new Date().toISOString();
  } else if (newStatus !== 'Archived') {
    updateData.archivedAt = null;
  }

  try {
    await updateDoc(itemRef, updateData);

    const itemName = (await getDoc(itemRef)).data()?.name || 'Item';
    if(newStatus === 'Archived') {
        await logActivity(firestore, userId, itemId, itemName, 'archived', `Item was archived`);
    } else {
        await logActivity(firestore, userId, itemId, itemName, 'updated', `Status changed to ${newStatus}`);
    }

  } catch (error) {
    console.error('Error updating item status:', error);
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: itemRef.path,
        operation: 'update',
        requestResourceData: { status: newStatus, updatedAt: new Date().toISOString() },
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
    const detailsRef = doc(firestore, itemRef.path, 'details', 'data');
    
    try {
        const itemSnap = await getDoc(itemRef);
        const detailsSnap = await getDoc(detailsRef);
    
        if (!itemSnap.exists()) {
          throw new Error('Item not found');
        }
    
        const originalItem = itemSnap.data() as Omit<Item, 'id'>;
        const originalDetails = detailsSnap.data() as ItemDetails;
    
        const duplicatedSummary = {
          ...originalItem,
          name: `${originalItem.name} (Copy)`,
          status: 'Active' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Create the new item using the createItem function to handle batching
        await createItem(firestore, userId, duplicatedSummary, originalDetails, []);

        return "new-item-id"; // We don't get the ID back directly here, but the operation succeeds.

    } catch(error) {
        console.error('Error duplicating item:', error);
        const itemSnap = await getDoc(itemRef);
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: `users/${userId}/items`,
                operation: 'create',
                requestResourceData: { name: `${itemSnap.data()?.name} (Copy)`},
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

export async function deleteItem(firestore: Firestore, userId: string, itemId: string): Promise<void> {
    const itemRef = doc(firestore, `users/${userId}/items/${itemId}`);
    try {
        const docSnap = await getDoc(itemRef);
        if (!docSnap.exists()) {
            throw new Error('Item not found');
        }
        const item = docSnap.data() as Item;
        
        const batch = writeBatch(firestore);

        // If it's a master product (no parentId), delete its children
        if (!item.parentId) {
            const itemsCollection = collection(firestore, `users/${userId}/items`);
            const childrenQuery = query(itemsCollection, where('parentId', '==', itemId));
            const childrenSnapshot = await getDocs(childrenQuery);
            
            childrenSnapshot.forEach(childDoc => {
                batch.delete(childDoc.ref);
                const childDetailsRef = doc(firestore, childDoc.ref.path, 'details', 'data');
                batch.delete(childDetailsRef);
            });
        }

        // Delete the item's details subcollection doc
        const detailsRef = doc(firestore, itemRef.path, 'details', 'data');
        batch.delete(detailsRef);

        // Delete the item itself
        batch.delete(itemRef);

        await batch.commit();

        await logActivity(firestore, userId, itemId, item.name, 'deleted', 'Item was permanently deleted');

    } catch (error) {
        console.error('Error deleting item:', error);
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: itemRef.path,
                operation: 'delete',
            })
        );
        throw error;
    }
}

export async function saveUserProfile(
  firestore: Firestore,
  userId: string,
  profileData: { firstName: string; lastName: string }
): Promise<void> {
  const userRef = doc(firestore, 'users', userId);

  const dataToSave = {
    ...profileData,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(userRef, dataToSave, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: dataToSave,
      })
    );
    throw error;
  }
}

export function updateUserStatus(
  firestore: Firestore,
  userId: string,
  newStatus: 'pending' | 'active' | 'suspended'
) {
  const userRef = doc(firestore, 'users', userId);
  const dataToSave = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  updateDoc(userRef, dataToSave).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
      path: userRef.path,
      operation: 'update',
      requestResourceData: {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      },
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
