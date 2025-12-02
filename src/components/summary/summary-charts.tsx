
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Item } from '@/lib/types';
import { ChartTooltipContent, ChartContainer, type ChartConfig } from '@/components/ui/chart';

interface SummaryChartsProps {
  items: Item[];
}

const chartConfig = {
  profit: {
    label: 'Profit',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function SummaryCharts({ items }: SummaryChartsProps) {
  const monthlyProfitData = React.useMemo(() => {
    const profitByMonth: { [key: string]: number } = {};

     // Subtract costs of all master products
    items.forEach(item => {
      if (!item.parentId && item.createdAt) {
        const month = format(item.createdAt.toDate(), 'yyyy-MM');
        const cost = item.purchasePrice || 0;
        if (profitByMonth[month]) {
          profitByMonth[month] -= cost;
        } else {
          profitByMonth[month] = -cost;
        }
      }
    });

    // Add revenue from all assigned items
    items.forEach(item => {
      if (item.parentId && item.createdAt) {
        const month = format(item.createdAt.toDate(), 'yyyy-MM');
        const revenue = item.purchasePrice || 0;
        if (profitByMonth[month]) {
          profitByMonth[month] += revenue;
        } else {
          profitByMonth[month] = revenue;
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
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart accessibilityLayer data={monthlyProfitData}>
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
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
