'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/header';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { GridView } from '@/components/grid-view/grid-view';
import { ListView } from '@/components/list-view/list-view';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Item, FilterCategory, FilterUrgency, SortByType, ViewMode } from '@/lib/types';
import { isPast, isWithinInterval, addDays } from 'date-fns';
import type { User } from 'firebase/auth';
import { updateItemStatus } from '@/firebase/firestore/mutations';

export function KanbanWrapper({ user }: { user: User }) {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterUrgency, setFilterUrgency] = useState<FilterUrgency>('all');
  const [sortBy, setSortBy] = useState<SortByType>('createdAt');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'items'));
  }, [firestore, user]);

  const { data: allItems } = useCollection<Item>(itemsQuery);

  const assignedItems = useMemo(() => {
    return allItems?.filter(item => !!item.parentId) || [];
  }, [allItems]);

  useEffect(() => {
    if (!assignedItems || !firestore || !user) return;

    const now = new Date();
    assignedItems.forEach(item => {
      if (item.endDate && item.status !== 'Expired' && item.status !== 'Archived') {
        const endDate = new Date(item.endDate);
        if (isPast(endDate)) {
          // Fire-and-forget update. The real-time listener will handle the UI change.
          updateItemStatus(firestore, user.uid, item.id, 'Expired');
        }
      }
    });
    // This effect should only run when the items from the server change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedItems]);

  const processedItems = useMemo(() => {
    if (!assignedItems) return [];
    
    let items = [...assignedItems];

    // 1. Filter by Search Query
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
    
    // 2. Filter by Category
    if (filterCategory !== 'all') {
      items = items.filter(item => item.category === filterCategory);
    }

    // 3. Filter by Urgency
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
    
    // 4. Sort
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
        return timeB - timeA; // Most recent first
      });
    }

    return items;
  }, [assignedItems, searchQuery, filterCategory, filterUrgency, sortBy]);
  
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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
        filterCategory={filterCategory}
        onFilterCategoryChange={setFilterCategory}
        filterUrgency={filterUrgency}
        onFilterUrgencyChange={setFilterUrgency}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isClient={isClient}
      />
      <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
        {renderView()}
      </main>
    </div>
  );
}
