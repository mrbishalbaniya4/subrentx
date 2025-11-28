'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ItemForm } from './item-form';
import type { Item } from '@/lib/types';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import {
  CalendarClock,
  GripVertical,
  MoreVertical,
  Trash2,
  FilePenLine,
  Loader2,
} from 'lucide-react';
import { deleteItem } from '@/app/items/actions';
import { useToast } from '@/hooks/use-toast';

interface KanbanCardProps {
  item: Item;
  isOverlay?: boolean;
  isDragDisabled?: boolean;
}

export function KanbanCard({
  item,
  isOverlay,
  isDragDisabled,
}: KanbanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

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

  const isExpired =
    item.expirationDate && isPast(new Date(item.expirationDate));

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteItem(item.id);
        toast({
          title: 'Success',
          description: 'Item deleted successfully.',
        });
        setIsDeleteDialogOpen(false);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete item.',
        });
      }
    });
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'group touch-none',
          isDragging && 'opacity-50',
          isOverlay && 'shadow-2xl'
        )}
        {...attributes}
      >
        <CardHeader className="relative flex-row items-start gap-4 space-y-0 p-4">
          <div
            className="flex-1 space-y-1"
            onClick={() => setIsDialogOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setIsDialogOpen(true)}
          >
            <CardTitle className="text-lg font-headline">{item.name}</CardTitle>
          </div>
          <div
            {...listeners}
            className={cn(
              'cursor-grab p-1 text-muted-foreground transition-opacity hover:opacity-80 group-hover:opacity-100 md:opacity-0',
              isDragDisabled && 'cursor-not-allowed'
            )}
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                <FilePenLine className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent
          className="p-4 pt-0"
          onClick={() => setIsDialogOpen(true)}
          role="button"
        >
          {item.username && (
            <p className="text-sm text-muted-foreground">{item.username}</p>
          )}
          {item.expirationDate && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" />
              <span
                className={cn(
                  'font-medium',
                  isExpired ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              item "{item.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
