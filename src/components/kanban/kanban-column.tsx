'use client';

import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { KanbanCard } from './kanban-card';
import type { Item, Status } from '@/lib/types';
import { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { FixedSizeList as List } from 'react-window';

interface KanbanColumnProps {
  id: Status;
  title: string;
  items: Item[];
  isDropDisabled?: boolean;
}

function KanbanColumn({ id, title, items, isDropDisabled = false }: KanbanColumnProps) {
  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  const { setNodeRef } = useSortable({
    id,
    data: {
      type: 'column',
    },
    disabled: isDropDisabled,
  });

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <div className="px-1 py-2">
         <KanbanCard item={items[index]} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full md:min-w-[320px] md:max-w-[350px]">
      <h2 className="mb-4 text-base font-semibold md:text-lg">
        {title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
      </h2>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl border bg-card min-h-[10rem]',
           isDropDisabled && 'bg-muted/50'
        )}
      >
          <SortableContext items={itemIds}>
            {items.length > 0 ? (
                <List
                  height={Math.min(window.innerHeight - 250, items.length * 270)}
                  itemCount={items.length}
                  itemSize={270}
                  width="100%"
                  className="p-2"
                >
                  {Row}
                </List>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed m-4">
                <p className="text-sm text-muted-foreground">
                  {isDropDisabled ? 'Auto-managed' : 'Drop items here'}
                </p>
              </div>
            )}
          </SortableContext>
      </div>
    </div>
  );
}

const MemoizedKanbanColumn = memo(KanbanColumn);
export { MemoizedKanbanColumn as KanbanColumn };
