'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import type { Item, Category } from '@/lib/types';
import { KanbanWrapper } from '@/components/kanban/kanban-wrapper';


export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const isLoading = isUserLoading;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header 
          searchQuery={''} 
          onSearchChange={() => {}}
          filterCategory={'all'}
          onFilterCategoryChange={() => {}}
          filterUrgency={'all'}
          onFilterUrgencyChange={() => {}}
          sortBy={'createdAt'}
          onSortByChange={() => {}}
          isClient={false}
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
      <Suspense fallback={<div>Loading...</div>}>
        <KanbanWrapper user={user} />
      </Suspense>
  );
}
