'use client';

import type { Item } from '@/lib/types';
import { KanbanCard } from '@/components/kanban/kanban-card';

interface GridViewProps {
  items: Item[];
}

export function GridView({ items }: GridViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">No items to display.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <KanbanCard key={item.id} item={item} />
      ))}
    </div>
  );
}
