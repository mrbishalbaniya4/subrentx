'use client';

import React, { Suspense } from 'react';
import { useUser } from '@/firebase';
import { KanbanWrapper } from '@/components/kanban/kanban-wrapper';


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  
  if (isUserLoading || !user) {
      // The layout already handles the main loading state.
      // This is a fallback.
      return null;
  }

  return (
      <Suspense fallback={<div className="flex-1 p-6">Loading...</div>}>
        <KanbanWrapper user={user} />
      </Suspense>
  );
}
