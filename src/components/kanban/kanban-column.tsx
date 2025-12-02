
'use client';

import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { KanbanCard } from './kanban-card';
import type { Item, Status } from '@/lib/types';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  id: Status;
  title: string;
  items: Item[];
  isDropDisabled?: boolean;
}

export function KanbanColumn({ id, title, items, isDropDisabled = false }: KanbanColumnProps) {
  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  const { setNodeRef } = useSortable({
    id,
    data: {
      type: 'column',
    },
    disabled: isDropDisabled,
  });

  return (
    <div className="flex flex-col">
      <h2 className="mb-4 text-xl font-bold font-headline tracking-tight">
        {title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
      </h2>
      <ScrollArea
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-lg border bg-card p-2',
           isDropDisabled && 'bg-muted/50'
        )}
      >
        <div className="flex flex-col gap-4">
          <SortableContext items={itemIds}>
            {items.length > 0 ? (
              items.map(item => <KanbanCard key={item.id} item={item} />)
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-sm text-muted-foreground">
                  {isDropDisabled ? 'Auto-managed' : 'Drop items here'}
                </p>
              </div>
            )}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}

    