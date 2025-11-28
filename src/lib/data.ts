import type { Item } from './types';
import { subDays, addDays, formatISO } from 'date-fns';

const today = new Date();

export const initialData: Item[] = [
  {
    id: '1',
    name: 'Netflix Subscription',
    username: 'user@example.com',
    status: 'Active',
    expirationDate: formatISO(addDays(today, 30), { representation: 'date' }),
  },
  {
    id: '2',
    name: 'Spotify Premium',
    username: 'musiclover@email.com',
    status: 'Active',
    expirationDate: formatISO(addDays(today, 15), { representation: 'date' }),
  },
  {
    id: '3',
    name: 'Gym Membership',
    notes: 'Gold Tier',
    status: 'Active',
    expirationDate: formatISO(addDays(today, 90), { representation: 'date' }),
  },
  {
    id: '4',
    name: 'Old Domain Name',
    notes: 'Did not renew.',
    status: 'Sold Out',
    expirationDate: formatISO(subDays(today, 60), { representation: 'date' }),
  },
  {
    id: '5',
    name: 'Expired Trial',
    notes: 'Software trial for Sketch',
    status: 'Expired',
    expirationDate: formatISO(subDays(today, 5), { representation: 'date' }),
  },
  {
    id: '6',
    name: 'Amazon Prime',
    username: 'shopper@example.com',
    status: 'Active',
    expirationDate: formatISO(addDays(today, 50), { representation: 'date' }),
  },
    {
    id: '7',
    name: 'Adobe Creative Cloud',
    username: 'designer@example.com',
    status: 'Expired',
    expirationDate: formatISO(subDays(today, 2), { representation: 'date' }),
  },
];
