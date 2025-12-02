'use client';

import React, { Suspense, useEffect } from 'react';
import { useUser } from '@/firebase';
import { KanbanWrapper } from '@/components/kanban/kanban-wrapper';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';


export default function RentalPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <AppLayout pageTitle="Rentals" itemType="assigned">
      <Suspense fallback={<div className="flex-1 p-6">Loading...</div>}>
        <KanbanWrapper user={user} itemType="assigned" />
      </Suspense>
    </AppLayout>
  );
}
