'use client';

import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { KanbanCard } from './kanban-card';
import type { Item, Status } from '@/lib/types';
import { useMemo, memo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FixedSizeList as List } from 'react-window';

interface KanbanColumnProps {
  id: Status;
  title: string;
  items: Item[];
  isDropDisabled?: boolean;
}

function KanbanColumn({ id, title, items, isDropDisabled = false }: KanbanColumnProps) {
  const [listHeight, setListHeight] = useState(0);
  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  const { setNodeRef } = useSortable({
    id,
    data: {
      type: 'column',
    },
    disabled: isDropDisabled,
  });

  useEffect(() => {
    // This effect runs on the client after mount, where `window` is available.
    // It calculates the height based on window size and number of items.
    const calculatedHeight = Math.min(window.innerHeight - 250, items.length * 270);
    setListHeight(calculatedHeight);
  }, [items.length]); // Recalculate only when the number of items changes


  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <div className="px-1 py-2">
         <KanbanCard item={items[index]} />
      </div>
    </div>
  );

  return (
    <div className="flex w-full flex-col md:min-w-[320px] md:max-w-[350px]">
      <h2 className="mb-4 text-base font-semibold md:text-lg">
        {title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
      </h2>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[10rem] flex-1 rounded-xl border bg-card',
           isDropDisabled && 'bg-muted/50'
        )}
      >
          <SortableContext items={itemIds}>
            {items.length > 0 ? (
                <List
                  height={listHeight}
                  itemCount={items.length}
                  itemSize={270}
                  width="100%"
                  className="p-2"
                >
                  {Row}
                </List>
            ) : (
             <div className="m-4 flex h-24 items-center justify-center rounded-lg">
                {isDropDisabled && <p className="text-sm text-muted-foreground">Auto-managed</p>}
              </div>
            )}
          </SortableContext>
      </div>
    </div>
  );
}

const MemoizedKanbanColumn = memo(KanbanColumn);
export { MemoizedKanbanColumn as KanbanColumn };
