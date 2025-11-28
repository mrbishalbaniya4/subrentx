'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Item } from '@/lib/types';
import { subDays } from 'date-fns';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    
    // Prune items that have been archived for more than 30 days
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    return query(
      collection(firestore, 'users', user.uid, 'items'),
      where('archivedAt', '<', thirtyDaysAgo)
    );
  }, [firestore, user]);

  const { data: items, isLoading: areItemsLoading } = useCollection<Item>(itemsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const isLoading = isUserLoading || areItemsLoading;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
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
      <Header />
      <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
        <KanbanBoard initialItems={items || []} />
      </main>
    </div>
  );
}
