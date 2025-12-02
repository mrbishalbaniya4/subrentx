'use client';

import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ActivityLogList } from '@/components/activity-log/activity-log-list';
import type { ActivityLog } from '@/lib/types';
import { AppLayout } from '@/components/app-layout';

function ActivityLogContent({ logs }: { logs: ActivityLog[] }) {
  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <ActivityLogList logs={logs} />
    </main>
  );
}


export default function ActivityLogPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const activityLogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'activity-logs'),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  const { data: activityLogs, isLoading: areLogsLoading } = useCollection<ActivityLog>(activityLogQuery);

  if (isUserLoading || (!activityLogs && areLogsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <AppLayout pageTitle="Activity Log" itemType="assigned" hideControls>
       <ActivityLogContent logs={activityLogs || []} />
    </AppLayout>
  );
}
