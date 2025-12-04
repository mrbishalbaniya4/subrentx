'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type DateRange = 'today' | 'last7days' | 'last30days' | 'last365days' | 'all';

interface ActivityLogControlsProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  itemCount: number;
}

export function ActivityLogControls({
  dateRange,
  onDateRangeChange,
  currentPage,
  onPageChange,
  totalPages,
  itemCount,
}: ActivityLogControlsProps) {

  const dateRanges: { label: string; value: DateRange }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: 'last7days' },
    { label: 'Last 30 Days', value: 'last30days' },
    { label: 'Last Year', value: 'last365days' },
    { label: 'All Time', value: 'all' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {dateRanges.map(range => (
          <Button
            key={range.value}
            variant={dateRange === range.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDateRangeChange(range.value)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({itemCount} items)
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
