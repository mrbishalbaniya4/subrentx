
'use client';

import React, { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Package, HandCoins, TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import type { Item } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SummaryCharts } from '@/components/summary/summary-charts';

function SummaryContent({ items }: { items: Item[] }) {
  const { totalProfit, totalMasters, activeRentals } = useMemo(() => {
    let totalProfit = 0;
    const totalMasters = items.filter(item => !item.parentId).length;
    const activeRentals = items.filter(
      item => !!item.parentId && item.status === 'Active'
    ).length;

    items.forEach(item => {
      if (item.parentId && (item.status === 'Expired' || item.status === 'Archived')) {
        const salePrice = item.purchasePrice || 0;
        const cost = item.masterPrice || 0;
        totalProfit += salePrice - cost;
      }
    });

    return { totalProfit, totalMasters, activeRentals };
  }, [items]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {totalProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Calculated from all completed rentals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Master Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMasters}</div>
            <p className="text-xs text-muted-foreground">Total unique master products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRentals}</div>
            <p className="text-xs text-muted-foreground">Currently active assignments</p>
          </CardContent>
        </Card>
      </div>
      <div>
        <SummaryCharts items={items} />
      </div>
    </main>
  );
}

export default function SummaryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'items'));
  }, [firestore, user]);

  const { data: allItems, isLoading: areItemsLoading } = useCollection<Item>(itemsQuery);

  if (isUserLoading || !user || (!allItems && areItemsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout pageTitle="Summary" itemType="summary" hideControls>
      <SummaryContent items={allItems || []} />
    </AppLayout>
  );
}
