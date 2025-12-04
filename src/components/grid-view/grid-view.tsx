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
  const rowHeight = 270; // Approximate height of a KanbanCard

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      let newColumnCount = 1;
      if (width >= 1280) { // xl
        newColumnCount = 5;
      } else if (width >= 1024) { // lg
        newColumnCount = 4;
      } else if (width >= 768) { // md
        newColumnCount = 3;
      } else if (width >= 640) { // sm
        newColumnCount = 2;
      }
      
      setColumnCount(newColumnCount);
      setColumnWidth(window.innerWidth / newColumnCount);
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
        <div className="p-2 h-full w-full">
            <KanbanCard key={item.id} item={item} />
        </div>
      </div>
    );
  };

  return (
    <Grid
      className="grid-container"
      columnCount={columnCount}
      columnWidth={columnWidth}
      height={window.innerHeight - 150} // Adjust as needed
      rowCount={rowCount}
      rowHeight={rowHeight}
      width={window.innerWidth - 80} // Adjust for sidebar/padding
    >
      {Cell}
    </Grid>
  );
}
