'use client';

import type { Item, Category, Status } from '@/lib/types';
import { useState, useTransition, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast, formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
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
import { ItemForm } from '@/components/kanban/item-form';
import {
  MoreVertical,
  Trash2,
  FilePenLine,
  Loader2,
  CopyPlus,
  Archive,
  ArrowRight,
  ArchiveRestore,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { archiveItem, duplicateItem, updateItemStatus, deleteItem } from '@/firebase/firestore/mutations';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';

interface ListItemProps {
  item: Item;
}

const categoryColors: Record<Category, string> = {
    Apeuni: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Netflix: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    Amazon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    Spotify: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Hulu: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    Other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  Expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};


export function ListItem({ item }: ListItemProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const lastUpdated = item.updatedAt
    ? formatDistanceToNow(item.updatedAt.toDate(), { addSuffix: true })
    : 'a few moments ago';

  const handleArchive = () => {
    if (!user || !firestore) return;
    startTransition(async () => {
      try {
        await archiveItem(firestore, user.uid, item.id);
        toast({
          title: 'Success',
          description: 'Item moved to Archived.',
        });
        setIsArchiveDialogOpen(false);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to archive item.',
        });
      }
    });
  };

  const handleDelete = () => {
    if (!user || !firestore) return;
    startTransition(async () => {
      try {
        await deleteItem(firestore, user.uid, item.id);
        toast({
          title: 'Success',
          description: 'Item permanently deleted.',
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
  }

  const handleDuplicate = () => {
    if (!user || !firestore) return;
    startTransition(async () => {
      try {
        await duplicateItem(firestore, user.uid, item.id);
        toast({
          title: 'Success',
          description: 'Item duplicated successfully.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to duplicate item.',
        });
      }
    });
  };

  const handleStatusChange = (newStatus: Status) => {
    if (!user || !firestore || item.status === newStatus) return;
    startTransition(async () => {
      try {
        await updateItemStatus(firestore, user.uid, item.id, newStatus);
        toast({
          title: 'Item Moved',
          description: `Item moved to ${newStatus}.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to move item.',
        });
      }
    });
  };

  const getUrgencyInfo = () => {
    if (!item.endDate) return { text: 'N/A', className: '' };

    const endDate = new Date(item.endDate);
    const now = new Date();
    const daysUntilEnd = differenceInDays(endDate, now);
    const isExpired = isPast(endDate);
    const distanceText = formatDistanceToNow(endDate, { addSuffix: true });

    if (isExpired) {
      return {
        text: `Expired ${distanceText}`,
        className: 'text-red-600 dark:text-red-500 font-medium',
      };
    }
    if (daysUntilEnd <= 2) {
      return {
        text: distanceText,
        className: 'text-yellow-600 dark:text-yellow-500 font-medium',
      };
    }
    return { text: distanceText, className: 'text-green-600 dark:text-green-500' };
  };

  const profitLoss = useMemo(() => {
    if (typeof item.masterPrice !== 'number' || typeof item.purchasePrice !== 'number') {
      return { text: 'N/A', className: '', Icon: Minus };
    }
  
    const profit = item.purchasePrice - item.masterPrice;
    const isProfit = profit > 0;
    const isLoss = profit < 0;
    
    let className = 'text-gray-500 dark:text-gray-400';
    let Icon = Minus;

    if (isProfit) {
        className = 'text-green-600 dark:text-green-500';
        Icon = TrendingUp;
    } else if (isLoss) {
        className = 'text-red-600 dark:text-red-500';
        Icon = TrendingDown;
    }
    
    return {
      text: `$${profit.toFixed(2)}`,
      className,
      Icon
    };
  }, [item.masterPrice, item.purchasePrice])

  const urgency = getUrgencyInfo();
  const itemType = item.parentId ? 'assigned' : 'master';

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span>{item.name}</span>
            {item.contactName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{item.contactName}</span>
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          {item.category && (
            <Badge variant="outline" className={cn("border", categoryColors[item.category])}>
              {item.category}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={cn(statusColors[item.status] || 'bg-gray-100')}>
            {item.status}
          </Badge>
        </TableCell>
        <TableCell className={cn(urgency.className)}>
            {urgency.text}
        </TableCell>
         <TableCell className={cn("font-medium", profitLoss.className)}>
            <div className="flex items-center gap-1.5">
              <profitLoss.Icon className="h-4 w-4" />
              <span>{profitLoss.text}</span>
            </div>
        </TableCell>
        <TableCell className="text-muted-foreground">{lastUpdated}</TableCell>
        <TableCell className="text-right">
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
              <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
                <CopyPlus className="mr-2 h-4 w-4" />
                <span>Duplicate</span>
              </DropdownMenuItem>
               <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  <span>Move to</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                     {(['Active', 'Archived'] as Status[]).map((status) => (
                       <DropdownMenuItem
                        key={status}
                        disabled={item.status === status || isPending}
                        onClick={() => handleStatusChange(status)}
                      >
                         {status === 'Archived' && item.status === 'Archived' ? (
                          <>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            <span>Unarchive</span>
                          </>
                        ) : (
                          status
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              {item.status === 'Archived' ? (
                 <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Permanently</span>
                  </DropdownMenuItem>
              ) : (
                 <DropdownMenuItem
                    onClick={() => setIsArchiveDialogOpen(true)}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    <span>Archive</span>
                  </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <ItemForm item={item} setDialogOpen={setIsDialogOpen} itemType={itemType} />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
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
              onClick={handleArchive}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item and all of its associated data.
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
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
