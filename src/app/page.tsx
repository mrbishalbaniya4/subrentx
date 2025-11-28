'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { getItems } from '@/app/items/actions';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  // For now, we use the in-memory store.
  // In a future step, we will replace this with Firestore.
  const [items, setItems] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (user) {
      getItems().then((data) => {
        setItems(data);
        setIsLoading(false);
      });
    }
  }, [user]);

  if (isUserLoading || !user || isLoading) {
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
        <KanbanBoard initialItems={items} />
      </main>
    </div>
  );
}
