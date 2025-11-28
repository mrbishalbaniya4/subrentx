import type { Timestamp } from 'firebase/firestore';

export type Status = 'Active' | 'Sold Out' | 'Expired' | 'Archived';

export interface Item {
  id: string;
  userId: string;
  name: string;
  username?: string;
  password?: string;
  pin?: string;
  notes?: string;
  expirationDate?: string;
  reminderDate?: string;
  status: Status;
  archivedAt?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
