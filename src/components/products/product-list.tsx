'use client';

import type { Item } from '@/lib/types';
import { ProductListItem } from './product-list-item';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from '@/components/ui/table';

interface ProductListProps {
  items: Item[];
}

export function ProductList({ items }: ProductListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed py-24">
        <div className="text-center">
            <h3 className="text-2xl font-bold tracking-tight">No products found</h3>
            <p className="text-sm text-muted-foreground">
                You can start by adding a new item.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Username/Email</TableHead>
            <TableHead>Password</TableHead>
            <TableHead>Purchase Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead className="w-[50px] text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <ProductListItem key={item.id} item={item} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
