'use client';

import React, { useMemo, useEffect } from 'react';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { GridView } from '@/components/grid-view/grid-view';
import { ListView } from '@/components/list-view/list-view';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
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
    return query(collection(firestore, 'users', user.uid, 'items'));
  }, [firestore, user]);

  const { data: allItems } = useCollection<Item>(itemsQuery);

  const itemsForCurrentView = useMemo(() => {
    if (!allItems) return [];
    if (itemType === 'master') {
      return allItems.filter(item => !item.parentId);
    } else {
      // For assigned items, augment with master data for profit calculation and expiration
      return allItems.filter(item => !!item.parentId).map(item => {
        const master = allItems.find(p => p.id === item.parentId);
        return {
          ...item,
          masterPrice: master?.purchasePrice ?? 0,
          masterEndDate: master?.endDate,
        };
      });
    }
  }, [allItems, itemType]);

  // This effect runs once on mount and periodically to check for expired items.
  useEffect(() => {
    const checkAndMoveExpiredItems = () => {
      if (!itemsForCurrentView || !firestore || !user) return;

      itemsForCurrentView.forEach(item => {
        if (item.endDate && item.status === 'Active') {
          if (isPast(new Date(item.endDate))) {
            updateItemStatus(firestore, user.uid, item.id, 'Expired');
          }
        }
      });
    };
    
    checkAndMoveExpiredItems(); // Run on initial load
    const intervalId = setInterval(checkAndMoveExpiredItems, 60000); // Check every minute

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [itemsForCurrentView, firestore, user]);

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
        return <KanbanBoard initialItems={processedItems || []} />;
      case 'grid':
        return <GridView items={activeItems || []} />;
      case 'list':
          return <ListView items={activeItems || []} />;
      default:
        return <KanbanBoard initialItems={processedItems || []} />;
    }
  };

  return (
      <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
        {renderView()}
      </main>
  );
}
