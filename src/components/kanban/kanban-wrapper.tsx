
'use client';

import React, { useMemo, useEffect } from 'react';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { GridView } from '@/components/grid-view/grid-view';
import { ListView } from '@/components/list-view/list-view';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Item, FilterCategory, FilterUrgency, SortByType, ViewMode } from '@/lib/types';
import { isPast, isWithinInterval, addDays } from 'date-fns';
import type { User } from 'firebase/auth';
import { updateItemStatus } from '@/firebase/firestore/mutations';

interface KanbanWrapperProps {
    user: User;
    itemType: 'master' | 'assigned';
    searchQuery?: string;
    filterCategory?: FilterCategory;
    filterUrgency?: FilterUrgency;
    sortBy?: SortByType;
    viewMode?: ViewMode;
}

export function KanbanWrapper({ 
    user, 
    itemType,
    searchQuery = '',
    filterCategory = 'all',
    filterUrgency = 'all',
    sortBy = 'createdAt',
    viewMode = 'kanban'
}: KanbanWrapperProps) {
  const firestore = useFirestore();

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Main query is now limited and ordered by creation date for general performance
    return query(
        collection(firestore, 'users', user.uid, 'items'),
        orderBy('createdAt', 'desc'),
        limit(200) 
    );
  }, [firestore, user]);

  const { data: allItems } = useCollection<Item>(itemsQuery);

  // This effect runs once on mount and periodically to check for expired items.
  useEffect(() => {
    const checkAndMoveExpiredItems = async () => {
      if (!allItems || !firestore || !user) return;

      const activeItems = allItems.filter(item => item.status === 'Active' && item.endDate && isPast(new Date(item.endDate)));
      
      for (const item of activeItems) {
        await updateItemStatus(firestore, user.uid, item.id, 'Expired');
      }

      // Logic for master products: check if they should be 'Sold Out' or 'Active'
      const masterProducts = allItems.filter(item => !item.parentId);
      for (const master of masterProducts) {
        const childrenQuery = query(collection(firestore, 'users', user.uid, 'items'), where('parentId', '==', master.id), limit(1));
        const childrenSnapshot = await getDocs(childrenQuery);
        const hasActiveChild = !childrenSnapshot.empty && childrenSnapshot.docs.some(doc => doc.data().status === 'Active');

        if (hasActiveChild && master.status !== 'Sold Out') {
           if (master.status !== 'Archived' && master.status !== 'Expired') {
             await updateItemStatus(firestore, user.uid, master.id, 'Sold Out');
           }
        } else if (!hasActiveChild && master.status === 'Sold Out') {
           if (master.status !== 'Archived' && master.status !== 'Expired') {
            await updateItemStatus(firestore, user.uid, master.id, 'Active');
           }
        }
      }
    };
    
    checkAndMoveExpiredItems();
    const intervalId = setInterval(checkAndMoveExpiredItems, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [allItems, firestore, user]);

  const itemsForCurrentView = useMemo(() => {
    if (!allItems) return [];

    let relevantItems;

    if (itemType === 'master') {
      relevantItems = allItems.filter(item => !item.parentId);
    } else {
      relevantItems = allItems.filter(item => !!item.parentId).map(item => {
        const master = allItems.find(p => p.id === item.parentId);
        return {
          ...item,
          masterPrice: master?.purchasePrice ?? 0,
          masterEndDate: master?.endDate,
        };
      });
    }
    return relevantItems;
  }, [allItems, itemType]);


  const processedItems = useMemo(() => {
    if (!itemsForCurrentView) return [];
    
    let items = [...itemsForCurrentView];

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(lowercasedQuery) ||
          item.username?.toLowerCase().includes(lowercasedQuery) ||
          item.notes?.toLowerCase().includes(lowercasedQuery) ||
          item.contactName?.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    if (filterCategory !== 'all') {
      items = items.filter(item => item.category === filterCategory);
    }

    if (filterUrgency === 'soon-to-expire') {
      const now = new Date();
      const nextWeek = addDays(now, 7);
      items = items.filter(item => {
        if (!item.endDate) return false;
        const endDate = new Date(item.endDate);
        return isWithinInterval(endDate, { start: now, end: nextWeek });
      });
    } else if (filterUrgency === 'expired') {
      items = items.filter(item => item.endDate && isPast(new Date(item.endDate)));
    }
    
    // Note: Sorting is now performed client-side on the limited dataset.
    // For larger datasets, sorting should be done via Firestore queries with proper indexes.
    if (sortBy === 'alphabetical') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'endDate') {
      items.sort((a, b) => {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    } else if (sortBy === 'createdAt') {
       items.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.seconds ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
    }

    return items;
  }, [itemsForCurrentView, searchQuery, filterCategory, filterUrgency, sortBy]);
  
  const renderView = () => {
    const activeItems = processedItems.filter(item => item.status !== 'Archived');
    
    switch (viewMode) {
      case 'kanban':
        return <KanbanBoard initialItems={processedItems || []} itemType={itemType} />;
      case 'grid':
        return <GridView items={activeItems || []} />;
      case 'list':
          return <ListView items={activeItems || []} />;
      default:
        return <KanbanBoard initialItems={processedItems || []} itemType={itemType} />;
    }
  };

  return (
      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>
  );
}
