'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { Item, Category } from '@/lib/types';
import { useState, useTransition, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import {
  CalendarClock,
  GripVertical,
  MoreVertical,
  Trash2,
  FilePenLine,
  Loader2,
  Copy,
  CopyCheck,
  Archive,
  CopyPlus,
  RefreshCcw,
} from 'lucide-react';
import { archiveItem, duplicateItem } from '@/firebase/firestore/mutations';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';

interface KanbanCardProps {
  item: Item;
  isOverlay?: boolean;
}

const categoryColors: Record<Category, string> = {
    Work: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Personal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Finance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    Shopping: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    Social: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    Travel: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    Other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};


export function KanbanCard({ item, isOverlay }: KanbanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);

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

  const endDateDistance = item.endDate
    ? formatDistanceToNow(new Date(item.endDate), { addSuffix: true })
    : null;
    
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

  const handleCopyPassword = () => {
    if (!item.password) return;
    navigator.clipboard.writeText(item.password);
    setIsPasswordRevealed(true);
    setIsCopied(true);
    toast({ title: 'Password Copied' });

    setTimeout(() => {
      setIsPasswordRevealed(false);
    }, 5000);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
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
        <CardHeader className="relative flex-row items-start gap-4 space-y-0 p-4 pb-2">
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
              <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
                <CopyPlus className="mr-2 h-4 w-4" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Archive className="mr-2 h-4 w-4" />
                <span>Archive</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent
          className="space-y-3 p-4 pt-0"
          onClick={() => setIsDialogOpen(true)}
          role="button"
        >
          {item.username && (
            <p className="truncate text-sm text-muted-foreground">{item.username}</p>
          )}

          {item.password && (
            <div className="flex items-center gap-2">
              <input
                type={isPasswordRevealed ? 'text' : 'password'}
                readOnly
                value={item.password}
                className="pointer-events-none w-full flex-1 truncate border-none bg-transparent p-0 text-sm font-mono text-muted-foreground focus:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="z-10 h-7 w-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPassword();
                }}
              >
                {isCopied ? (
                  <CopyCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">Copy Password</span>
              </Button>
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-2">
            {item.category && (
                <Badge variant="outline" className={cn("border", categoryColors[item.category])}>
                    {item.category}
                </Badge>
            )}

            {formattedEndDate && (
                <Badge variant={isExpired ? "destructive" : "outline"} className="flex items-center gap-1.5">
                    <CalendarClock className="h-3 w-3" />
                    <span className={cn(isExpired && 'font-bold')} title={formattedEndDate}>
                       {endDateDistance}
                    </span>
                </Badge>
            )}
           </div>

            <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
              <RefreshCcw className="h-3 w-3" />
              <span>Last updated {lastUpdated}</span>
            </div>
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
              onClick={handleArchive}
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
