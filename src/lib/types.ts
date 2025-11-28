import type { Timestamp } from 'firebase/firestore';

export type Status = 'Active' | 'Sold Out' | 'Expired' | 'Archived';
export type Category = 'Work' | 'Personal' | 'Finance' | 'Shopping' | 'Social' | 'Travel' | 'Other';

export interface Item {
  id: string;
  userId: string;
  name: string;
  username?: string;
  password?: string;
  pin?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  status: Status;
  category?: Category;
  contactName?: string;
  contactValue?: string;
  archivedAt?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
