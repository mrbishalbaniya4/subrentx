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
import { useState, useTransition, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import {
  CalendarClock,
  GripVertical,
  MoreVertical,
  Trash2,
  FilePenLine,
  Loader2,
  User,
  Link as LinkIcon,
  MessageSquare,
} from 'lucide-react';
import { archiveItem } from '@/app/items/actions';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';

interface KanbanCardProps {
  item: Item;
  isOverlay?: boolean;
}

export function KanbanCard({ item, isOverlay }: KanbanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    disabled: !isClient,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const isExpired =
    item.endDate && isPast(new Date(item.endDate));
  
  const formattedEndDate = item.endDate
    ? format(new Date(item.endDate), 'MMM d, yyyy HH:mm')
    : null;


  const handleDelete = () => {
    if (!firestore || !user) return;
    startTransition(async () => {
      try {
        await archiveItem(firestore, user.uid, item.id);
        toast({
          title: 'Success',
          description: 'Item moved to Archived.',
        });
        setIsDeleteDialogOpen(false);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to archive item.',
        });
      }
    });
  };

  const getCategoryIcon = (category: string | undefined) => {
    switch (category) {
      case 'Website':
        return <LinkIcon className="h-4 w-4" />;
      case 'WhatsApp':
        return <MessageSquare className="h-4 w-4" />; // Using generic message icon
      case 'Messenger':
        return <MessageSquare className="h-4 w-4" />; // Using generic message icon
      default:
        return <User className="h-4 w-4" />;
    }
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
        {...(isClient ? attributes : {})}
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
          {isClient && (
            <div
              {...listeners}
              className={cn(
                'cursor-grab p-1 text-muted-foreground transition-opacity hover:opacity-80 group-hover:opacity-100 md:opacity-0',
                !isClient && 'cursor-not-allowed'
              )}
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}
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
          className="space-y-2 p-4 pt-0"
          onClick={() => setIsDialogOpen(true)}
          role="button"
        >
          {item.username && (
            <p className="truncate text-sm text-muted-foreground">{item.username}</p>
          )}

          {item.contactName && (
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getCategoryIcon(item.category)}
              <span className="truncate font-medium">{item.contactName}</span>
            </div>
          )}

          {formattedEndDate && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" />
              <span
                className={cn(
                  'font-medium',
                  isExpired ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {formattedEndDate}
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
              This will move the item "{item.name}" to the Archived column. You can restore it from there.
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
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
