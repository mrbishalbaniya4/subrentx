'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Item, Category } from '@/lib/types';
import { subDays, isPast, isWithinInterval, addDays } from 'date-fns';

export type FilterCategory = 'all' | Category;
export type FilterUrgency = 'all' | 'soon-to-expire' | 'expired';
export type SortByType = 'alphabetical' | 'endDate' | 'createdAt';


export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterUrgency, setFilterUrgency] = useState<FilterUrgency>('all');
  const [sortBy, setSortBy] = useState<SortByType>('createdAt');


  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'items'));
  }, [firestore, user]);

  const { data: allItems, isLoading: areItemsLoading } = useCollection<Item>(itemsQuery);

  const processedItems = useMemo(() => {
    if (!allItems) return [];
    
    let items = [...allItems];

    // 1. Filter by Search Query
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(lowercasedQuery) ||
          item.username?.toLowerCase().includes(lowercasedQuery) ||
          item.notes?.toLowerCase().includes(lowercasedQuery)
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
  }, [allItems, searchQuery, filterCategory, filterUrgency, sortBy]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const isLoading = isUserLoading || areItemsLoading;

  if (isLoading || !user) {
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
        />
        <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
          <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col gap-4">
                <Skeleton className="h-8 w-1/2" />
                <div className="flex flex-col gap-4 rounded-lg border bg-card p-2">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

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
      />
      <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
        <KanbanBoard initialItems={processedItems || []} />
      </main>
    </div>
  );
}
