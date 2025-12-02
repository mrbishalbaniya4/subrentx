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
          {items.map((item) => (
            <ListItem key={item.id} item={item} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
