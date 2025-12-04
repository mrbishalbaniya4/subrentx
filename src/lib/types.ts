
import type { Timestamp } from 'firebase/firestore';

export type Status = 'Active' | 'Sold Out' | 'Expired' | 'Archived';
export type Category = 'Apeuni' | 'Netflix' | 'Amazon' | 'Spotify' | 'Hulu' | 'Other';
export type FilterCategory = 'all' | Category;
export type FilterUrgency = 'all' | 'soon-to-expire' | 'expired';
export type SortByType = 'alphabetical' | 'endDate' | 'createdAt';
export type ViewMode = 'kanban' | 'grid' | 'list';

// Represents the sensitive data stored in a subcollection
export interface ItemDetails {
  password?: string;
  pin?: string;
  notes?: string;
}

// Represents the main summary document for an item
export interface Item {
  id: string;
  userId: string;
  parentId?: string | null;
  name: string;
  username?: string;
  startDate?: string;
  endDate?: string;
  status: Status;
  category?: Category;
  contactName?: string;
  contactValue?: string;
  purchasePrice?: number;
  masterPrice?: number;
  masterEndDate?: string;
  lastPasswordChange?: string;
  archivedAt?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Represents the combined object used in forms
export type ItemWithDetails = Item & ItemDetails;


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
