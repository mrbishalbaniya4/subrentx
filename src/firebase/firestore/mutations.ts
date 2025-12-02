
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
import type { Item, Status } from '@/lib/types';
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
  itemData: Partial<Item>,
  availableMasterProducts: Item[]
): Promise<string> {
    const itemsCollection = collection(firestore, `users/${userId}/items`);
    
    let masterPrice = null;
    // If creating an assignment, fetch the master product's price
    if (itemData.parentId && itemData.parentId !== 'none') {
        const masterProduct = availableMasterProducts.find(p => p.id === itemData.parentId);
        if (masterProduct) {
            masterPrice = masterProduct.purchasePrice || 0;
        }
    }
    
    const dataToSave: any = {
      ...itemData,
      userId: userId,
      status: 'Active' as const,
      masterPrice: masterPrice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!dataToSave.startDate) delete dataToSave.startDate;
    if (!dataToSave.endDate) delete dataToSave.endDate;


    if (itemData.password) {
        dataToSave.lastPasswordChange = new Date().toISOString();
    }


    try {
        const newItemRef = await addDoc(itemsCollection, dataToSave);
        await logActivity(firestore, userId, newItemRef.id, itemData.name!, 'created', 'Item created');
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
  itemData: Partial<Item> & { id: string }
): Promise<void> {
  const { id: itemId, ...dataToUpdate } = itemData;
  const itemRef = doc(firestore, `users/${userId}/items/${itemId}`);

  try {
    const docSnap = await getDoc(itemRef);
    if (!docSnap.exists()) {
      throw new Error('Item not found');
    }
    const originalData = docSnap.data() as Item;

    const dataToSave: Partial<Item> & {updatedAt: FieldValue} = {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    };

    if (!dataToSave.startDate) delete dataToSave.startDate;
    if (!dataToSave.endDate) delete dataToSave.endDate;

    
    const isMasterProduct = !originalData.parentId;
    const passwordChanged = 'password' in dataToUpdate && dataToUpdate.password !== originalData.password;
    
    if (passwordChanged) {
        dataToSave.lastPasswordChange = new Date().toISOString();
    }

    // If it's a master product and the password changed, update all children
    if (isMasterProduct && passwordChanged) {
        const batch = writeBatch(firestore);
        
        // 1. Update the master product
        batch.update(itemRef, dataToSave);

        // 2. Find and update all children
        const itemsCollection = collection(firestore, `users/${userId}/items`);
        const childrenQuery = query(itemsCollection, where('parentId', '==', itemId));
        const childrenSnapshot = await getDocs(childrenQuery);
        
        childrenSnapshot.forEach(childDoc => {
            const childRef = doc(firestore, `users/${userId}/items`, childDoc.id);
            const childUpdate: Partial<Item> & {updatedAt: FieldValue, lastPasswordChange?: string} = { 
                password: dataToUpdate.password,
                lastPasswordChange: dataToSave.lastPasswordChange,
                updatedAt: serverTimestamp() 
            }
            batch.update(childRef, childUpdate);
        });

        // 3. Commit the batch
        await batch.commit();

    } else {
        // Standard update for a single item (or master product without password change)
        await updateDoc(itemRef, dataToSave);
    }

    // Log activity
    let activityAction = 'updated';
    let activityDetails = 'Item details updated';
    if (passwordChanged) {
        activityAction = 'password_changed';
        activityDetails = 'Password was changed';
        if (isMasterProduct) {
            activityDetails += ' and propagated to assigned items.';
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
        ...dataToUpdate,
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
    // If we are un-archiving, we can set it to null
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

export async function deleteItem(firestore: Firestore, userId: string, itemId: string): Promise<void> {
    const itemRef = doc(firestore, `users/${userId}/items/${itemId}`);
    try {
        const docSnap = await getDoc(itemRef);
        if (!docSnap.exists()) {
            throw new Error('Item not found');
        }
        const item = docSnap.data() as Item;

        // If it's a master product (no parentId), delete its children
        if (!item.parentId) {
            const itemsCollection = collection(firestore, `users/${userId}/items`);
            const childrenQuery = query(itemsCollection, where('parentId', '==', itemId));
            const childrenSnapshot = await getDocs(childrenQuery);
            
            if (!childrenSnapshot.empty) {
                const batch = writeBatch(firestore);
                childrenSnapshot.forEach(childDoc => {
                    batch.delete(childDoc.ref);
                });
                await batch.commit();
            }
        }

        // Delete the item itself
        await fbDeleteDoc(itemRef);

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
    // Using setDoc with merge: true is like an "upsert"
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

    
