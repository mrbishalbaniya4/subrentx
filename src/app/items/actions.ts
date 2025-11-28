'use server';

import { suggestExpirationDate } from '@/ai/flows/suggest-expiration-date';
import { initialData } from '@/lib/data';
import type { Item } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// In-memory store for demonstration purposes.
let items: Item[] = [...initialData];

// Simulate database latency
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getItems(): Promise<Item[]> {
  await sleep(500);
  return JSON.parse(JSON.stringify(items));
}

export async function addItem(item: Omit<Item, 'id'>): Promise<Item> {
  await sleep(500);
  const newItem = { ...item, id: crypto.randomUUID() };
  items.push(newItem);
  revalidatePath('/');
  return newItem;
}

export async function updateItem(updatedItem: Item): Promise<Item> {
  await sleep(500);
  const index = items.findIndex(item => item.id === updatedItem.id);
  if (index === -1) {
    throw new Error('Item not found');
  }
  items[index] = updatedItem;
  revalidatePath('/');
  return updatedItem;
}

export async function deleteItem(id: string): Promise<{ success: boolean }> {
  await sleep(500);
  items = items.filter(item => item.id !== id);
  revalidatePath('/');
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
