'use client';

import type { Item } from '@/lib/types';
import { KanbanCard } from '@/components/kanban/kanban-card';
import { FixedSizeGrid as Grid } from 'react-window';
import { useMemo, useState, useEffect } from 'react';

interface GridViewProps {
  items: Item[];
}

export function GridView({ items }: GridViewProps) {
  const [columnWidth, setColumnWidth] = useState(300);
  const [columnCount, setColumnCount] = useState(3);
  const rowHeight = 280; // Approximate height of a KanbanCard + padding

  useEffect(() => {
    function handleResize() {
      const containerWidth = window.innerWidth > 768 ? window.innerWidth - 80 : window.innerWidth - 32;
      let newColumnCount = 1;
      if (containerWidth >= 1280) { // lg
        newColumnCount = 4;
      } else if (containerWidth >= 1024) { // md
        newColumnCount = 3;
      } else if (containerWidth >= 640) { // sm
        newColumnCount = 2;
      }
      
      setColumnCount(newColumnCount);
      setColumnWidth(containerWidth / newColumnCount);
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rowCount = Math.ceil(items.length / columnCount);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">No items to display.</p>
      </div>
    );
  }

  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= items.length) {
      return null;
    }
    const item = items[index];

    return (
      <div style={style}>
        <div className="h-full w-full p-2">
            <KanbanCard key={item.id} item={item} />
        </div>
      </div>
    );
  };

  return (
     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => <KanbanCard key={item.id} item={item} />)}
     </div>
  );
}
