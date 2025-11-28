'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { ItemForm } from './item-form';
import type { Item } from '@/lib/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { CalendarClock, GripVertical } from 'lucide-react';

interface KanbanCardProps {
  item: Item;
  isOverlay?: boolean;
  isDragDisabled?: boolean;
}

export function KanbanCard({ item, isOverlay, isDragDisabled }: KanbanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: 'item',
      item,
    },
    disabled: isDragDisabled,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const isExpired = item.expirationDate && isPast(new Date(item.expirationDate));

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'touch-none',
          isDragging && 'opacity-50',
          isOverlay && 'shadow-2xl'
        )}
      >
        <CardHeader className="relative flex-row items-start gap-4 space-y-0 p-4">
          <div className="flex-1 space-y-1" onClick={() => setIsDialogOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setIsDialogOpen(true)}>
            <CardTitle className="text-lg font-headline">{item.name}</CardTitle>
          </div>
          <div {...attributes} {...listeners} className={cn("cursor-grab p-2", isDragDisabled && "cursor-not-allowed")}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0" onClick={() => setIsDialogOpen(true)} role="button">
          {item.username && (
            <p className="text-sm text-muted-foreground">
              {item.username}
            </p>
          )}
          {item.expirationDate && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" />
              <span className={cn(
                'font-medium',
                isExpired ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {format(new Date(item.expirationDate), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <ItemForm item={item} setDialogOpen={setIsDialogOpen} />
        </DialogContent>
      </Dialog>
    </>
  );
}
