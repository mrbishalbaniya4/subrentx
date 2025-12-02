import type { Timestamp } from 'firebase/firestore';

export type Status = 'Active' | 'Expired' | 'Archived';
export type Category = 'Work' | 'Personal' | 'Finance' | 'Shopping' | 'Social' | 'Travel' | 'Other';
export type FilterCategory = 'all' | Category;
export type FilterUrgency = 'all' | 'soon-to-expire' | 'expired';
export type SortByType = 'alphabetical' | 'endDate' | 'createdAt';
export type ViewMode = 'kanban' | 'grid' | 'list';


export interface Item {
  id: string;
  userId: string;
  parentId?: string | null;
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
  purchasePrice?: number;
  masterPrice?: number;
  lastPasswordChange?: string;
  archivedAt?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ActivityLogAction = 'created' | 'updated' | 'password_changed' | 'archived' | 'unarchived' | 'deleted';

export interface ActivityLog {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  action: ActivityLogAction;
  details?: string;
  timestamp: Timestamp;
}
