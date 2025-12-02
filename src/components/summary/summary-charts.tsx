
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

    // Process all items to calculate instant profit/loss in the month of creation
    items.forEach(item => {
      if (!item.createdAt) return;
      const month = format(item.createdAt.toDate(), 'yyyy-MM');

      if (!profitByMonth[month]) {
        profitByMonth[month] = 0;
      }

      // If it's a master product, it's a cost
      if (!item.parentId) {
        profitByMonth[month] -= item.purchasePrice || 0;
      } 
      // If it's an assigned item, it's revenue
      else {
        profitByMonth[month] += item.purchasePrice || 0;
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
        <CardDescription>A summary of revenue minus costs for each month.</CardDescription>
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
