'use client';

import React, { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { KanbanWrapper } from '@/components/kanban/kanban-wrapper';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { doc } from 'firebase/firestore';


export default function RentalPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{status: string}>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    } else if (userProfile && userProfile.status.trim() === 'pending') {
      router.replace('/awaiting-approval');
    }
  }, [isUserLoading, user, userProfile, router]);

  if (isUserLoading || !user || isProfileLoading || !userProfile || userProfile.status.trim() !== 'active') {
      return (
        <div className="flex min-h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  return (
    <AppLayout pageTitle="Rentals" itemType="assigned">
      {(props) => <KanbanWrapper user={user} itemType="assigned" {...props} />}
    </AppLayout>
  );
}
