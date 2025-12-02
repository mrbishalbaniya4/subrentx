
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Item } from '@/lib/types';
import { ChartTooltipContent } from '@/components/ui/chart';

interface SummaryChartsProps {
  items: Item[];
}

export function SummaryCharts({ items }: SummaryChartsProps) {
  const monthlyProfitData = React.useMemo(() => {
    const profitByMonth: { [key: string]: number } = {};

    items.forEach(item => {
      if (item.parentId && (item.status === 'Expired' || item.status === 'Archived') && item.updatedAt) {
        const month = format(item.updatedAt.toDate(), 'yyyy-MM');
        const salePrice = item.purchasePrice || 0;
        const cost = item.masterPrice || 0;
        const profit = salePrice - cost;

        if (profitByMonth[month]) {
          profitByMonth[month] += profit;
        } else {
          profitByMonth[month] = profit;
        }
      }
    });

    return Object.entries(profitByMonth)
      .map(([month, profit]) => ({
        month: format(parseISO(`${month}-01`), 'MMM yyyy'),
        profit,
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Profit</CardTitle>
        <CardDescription>A summary of profit generated from completed rentals each month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyProfitData}>
                 <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rs ${value}`}
                />
                 <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent 
                        formatter={(value) => `Rs ${Number(value).toFixed(2)}`}
                        labelClassName="font-bold"
                    />}
                 />
                 <Legend />
                <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
