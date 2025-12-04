'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ActivityLogList } from '@/components/activity-log/activity-log-list';
import type { ActivityLog } from '@/lib/types';
import { AppLayout } from '@/components/app-layout';
import { ActivityLogControls, type DateRange } from '@/components/activity-log/activity-log-controls';
import { startOfDay, subDays } from 'date-fns';

const ITEMS_PER_PAGE = 10;

function ActivityLogContent({ logs }: { logs: ActivityLog[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const filteredLogs = useMemo(() => {
    if (dateRange === 'all') return logs;
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'last7days':
        startDate = startOfDay(subDays(now, 7));
        break;
      case 'last30days':
        startDate = startOfDay(subDays(now, 30));
        break;
      case 'last365days':
        startDate = startOfDay(subDays(now, 365));
        break;
    }
    
    return logs.filter(log => log.timestamp.toDate() >= startDate);
  }, [logs, dateRange]);


  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange]);


  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
       <ActivityLogControls
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalPages={totalPages}
        itemCount={filteredLogs.length}
      />
      <ActivityLogList logs={paginatedLogs} />
    </main>
  );
}

export default function ActivityLogPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const activityLogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'activity-logs'),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  const { data: activityLogs, isLoading: areLogsLoading } = useCollection<ActivityLog>(activityLogQuery);

  if (isUserLoading || !user || (!activityLogs && areLogsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout pageTitle="Activity Log" itemType="summary" hideControls>
      {() => <ActivityLogContent logs={activityLogs || []} />}
    </AppLayout>
  );
}
