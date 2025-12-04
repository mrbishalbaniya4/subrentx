'use client';

import type { Item } from '@/lib/types';
import { ListItem } from './list-item';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from '@/components/ui/table';
import { FixedSizeList as List } from 'react-window';
import React from 'react';

interface ListViewProps {
  items: Item[];
}

export function ListView({ items }: ListViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">No items to display.</p>
      </div>
    );
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ListItem item={items[index]} />
    </div>
  );

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Profit/Loss</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-[50px] text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <List
            height={600}
            itemCount={items.length}
            itemSize={73}
            width="100%"
          >
            {Row}
          </List>
        </TableBody>
      </Table>
    </div>
  );
}
