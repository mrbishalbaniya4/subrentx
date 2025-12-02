
'use client';

import React, { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Package, HandCoins, TrendingUp, PackageMinus, CalendarClock, List, TrendingDown, Minus } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import type { Item } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { SummaryCharts } from '@/components/summary/summary-charts';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';


function UnassignedItemsList({ items, allItems }: { items: Item[]; allItems: Item[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5" />
          Available for Rent
        </CardTitle>
        <CardDescription>
          These master products are active and not currently assigned to a rental.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {items.map(item => {
            const cost = item.purchasePrice || 0;
            const children = allItems.filter(child => child.parentId === item.id);
            const revenue = children.reduce((acc, child) => acc + (child.purchasePrice || 0), 0);
            const profit = revenue - cost;
            const recoveryPercentage = cost > 0 ? (revenue / cost) * 100 : 100;
            
            const isProfit = profit > 0;
            const isLoss = profit < 0;

            let profitClassName = 'text-muted-foreground';
            let ProfitIcon = Minus;
            if (isProfit) {
                profitClassName = 'text-green-600 dark:text-green-500';
                ProfitIcon = TrendingUp;
            } else if (isLoss) {
                profitClassName = 'text-red-600 dark:text-red-500';
                ProfitIcon = TrendingDown;
            }

            const distanceText = item.endDate
              ? formatDistanceToNow(new Date(item.endDate), { addSuffix: true })
              : 'N/A';
            const fullDate = item.endDate
              ? format(new Date(item.endDate), 'PPp')
              : '';

            return (
              <div key={item.id} className="flex flex-col gap-3 rounded-md border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Cost: Rs {cost.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground" title={fullDate}>
                    <CalendarClock className="h-4 w-4" />
                    <span>Expires {distanceText}</span>
                  </div>
                </div>

                <div className="space-y-2">
                    <Progress value={recoveryPercentage} />
                    <div className="flex justify-between text-xs">
                        <span className={cn("font-medium flex items-center gap-1", profitClassName)}>
                            <ProfitIcon className="h-4 w-4" />
                            Profit/Loss: Rs {profit.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">{Math.min(100, recoveryPercentage).toFixed(0)}% Cost Recovered</span>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


function SummaryContent({ items }: { items: Item[] }) {
  const { totalProfit, totalMasters, activeRentals, unassignedMasters, unassignedMasterItems } = useMemo(() => {
    const masterProducts = items.filter(item => !item.parentId);
    const assignedItems = items.filter(item => !!item.parentId);

    const totalCost = masterProducts.reduce((acc, item) => acc + (item.purchasePrice || 0), 0);
    const totalRevenue = assignedItems.reduce((acc, item) => acc + (item.purchasePrice || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    
    const totalMasters = masterProducts.length;
    
    const activeAssignedItems = assignedItems.filter(item => item.status === 'Active');
    const activeRentals = activeAssignedItems.length;
    
    const activelyAssignedMasterIds = new Set(activeAssignedItems.map(item => item.parentId));
    const unassignedMasterItems = masterProducts.filter(p => !activelyAssignedMasterIds.has(p.id) && p.status === 'Active');
    const unassignedMasters = unassignedMasterItems.length;


    return { totalProfit, totalMasters, activeRentals, unassignedMasters, unassignedMasterItems };
  }, [items]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
                "text-2xl font-bold",
                totalProfit > 0 && "text-green-600",
                totalProfit < 0 && "text-red-600"
            )}>Rs {totalProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Calculated from all rentals vs all costs
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
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned Products</CardTitle>
            <PackageMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedMasters}</div>
            <p className="text-xs text-muted-foreground">Master products not in use</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SummaryCharts items={items} />
        <UnassignedItemsList items={unassignedMasterItems} allItems={items} />
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
