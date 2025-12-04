
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ItemForm } from './item-form';
import type { Item, Category, Status } from '@/lib/types';
import { useState, useTransition, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast, formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  CalendarClock,
  MoreHorizontal,
  Trash2,
  FilePenLine,
  Loader2,
  Copy,
  CopyCheck,
  Archive,
  CopyPlus,
  RefreshCcw,
  ArrowRight,
  ArchiveRestore,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ShieldCheck,
  DollarSign,
  ArrowLeft,
} from 'lucide-react';
import { archiveItem, duplicateItem, updateItemStatus, deleteItem } from '@/firebase/firestore/mutations';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { getDoc, doc } from 'firebase/firestore';


interface KanbanCardProps {
  item: Item;
  isOverlay?: boolean;
}

const categoryColors: Record<Category, string> = {
    Apeuni: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Netflix: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    Amazon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    Spotify: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Hulu: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    Other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};


function KanbanCard({ item, isOverlay }: KanbanCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

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
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const formattedEndDate = item.endDate
    ? format(new Date(item.endDate), 'MMM d, yyyy HH:mm')
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

  const handleCopyAccountDetails = async () => {
    if (!firestore || !user) return;

    const detailsRef = doc(firestore, `users/${user.uid}/items/${item.id}/details/data`);
    const detailsSnap = await getDoc(detailsRef);
    const details = detailsSnap.data();

    if (!details?.password) {
        toast({ variant: 'destructive', title: 'No password set for this item.'});
        return;
    }

    const rentalDuration =
      item.startDate && item.endDate
        ? differenceInDays(new Date(item.endDate), new Date(item.startDate))
        : 0;

    const expiryDate = item.endDate
      ? format(new Date(item.endDate), 'PPP')
      : 'N/A';

    const accountDetails = `Here are your rental account details for ${rentalDuration} days:\nEmail: ${
      item.username || 'N/A'
    }\nPassword: ${
      details.password
    }\nExpiry Date: ${expiryDate}\nNote: Please don’t share these credentials with anyone.`;

    navigator.clipboard.writeText(accountDetails);
    setIsCopied(true);
    toast({ title: 'Account details copied' });

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
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

  const getUrgencyBadge = () => {
    if (!item.endDate) return null;

    const endDate = new Date(item.endDate);
    const now = new Date();
    const daysUntilEnd = differenceInDays(endDate, now);
    const isExpired = isPast(endDate);
    const distanceText = formatDistanceToNow(endDate, { addSuffix: true });

    let badgeClass = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300';
    let text = distanceText;

    if (isExpired) {
      badgeClass = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300';
      text = `Expired ${distanceText}`;
    } else if (daysUntilEnd <= 2) {
      badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300';
    }

    return (
      <Badge variant="outline" className={cn('flex items-center gap-1.5', badgeClass)}>
        <CalendarClock className="h-3 w-3" />
        <span title={formattedEndDate}>{text}</span>
      </Badge>
    );
  };
  
  const itemType = item.parentId ? 'assigned' : 'master';

  const masterExpirationInfo = () => {
    if (itemType !== 'assigned' || !item.masterEndDate) return null;

    const masterEndDate = new Date(item.masterEndDate);
    const distanceText = formatDistanceToNow(masterEndDate, { addSuffix: true });
    
    return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <ShieldCheck className="h-3 w-3 text-blue-500" />
            <span>Master expires {distanceText}</span>
        </div>
    );
  };

  const profitLoss = useMemo(() => {
    const isMaster = !item.parentId;
    const price = item.purchasePrice || 0;

    let Icon = DollarSign;
    let className = 'text-muted-foreground';
    let text = `Rs ${price.toFixed(2)}`;
    let label = isMaster ? 'Cost' : 'Price';

    if (isMaster) {
       Icon = Minus;
       text = `Rs ${price.toFixed(2)}`;
       label = 'Cost';
    }
    
    return { Icon, className, text, label };
  }, [item]);


  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group/card perspective-1000',
          isDragging && 'z-50',
          isOverlay && 'shadow-2xl'
        )}
      >
        <div
            className={cn(
                'relative w-full h-full transform-style-3d transition-transform duration-700',
                isFlipped && 'rotate-y-180'
            )}
        >
            {/* Front of the Card */}
            <Card className="w-full h-full backface-hidden">
                 <CardHeader className="relative flex-row items-start gap-4 space-y-0 p-4 pb-2">
                    <div className="flex-1 space-y-1" {...listeners}>
                        <CardTitle className="text-lg font-headline cursor-grab">{item.name}</CardTitle>
                        {item.contactName && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>{item.contactName}</span>
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsDialogOpen(true)}>
                        <FilePenLine className="h-4 w-4" />
                        <span className="sr-only">Edit Item</span>
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                    {item.username && (
                        <p className="truncate text-sm text-muted-foreground">{item.username}</p>
                    )}
                    <div className="flex items-center gap-2">
                        <p className="flex-1 truncate text-sm font-mono text-muted-foreground">••••••••</p>
                        <Button type="button" variant="ghost" size="icon" className="z-10 h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); handleCopyAccountDetails(); }}>
                            {isCopied ? <CopyCheck className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                            <span className="sr-only">Copy account details</span>
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {item.category && <Badge variant="outline" className={cn(categoryColors[item.category])}>{item.category}</Badge>}
                        {getUrgencyBadge()}
                    </div>
                    {masterExpirationInfo()}
                    <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                        <RefreshCcw className="h-3 w-3" />
                        <span>Last updated {lastUpdated}</span>
                    </div>
                </CardContent>
                <CardFooter className="grid grid-cols-1 gap-2 p-2 pt-0">
                    <Button variant="outline" size="sm" onClick={() => setIsFlipped(true)}>
                        <Info className="mr-2 h-4 w-4" />
                        Details
                    </Button>
                </CardFooter>
            </Card>

            {/* Back of the Card */}
            <Card className="absolute top-0 left-0 w-full h-full backface-hidden rotate-y-180 flex flex-col">
                <CardHeader className="relative flex-row items-start gap-4 space-y-0 p-4 pb-2">
                     <div className="flex-1 space-y-1">
                        <CardTitle className="text-base font-headline">{item.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Details & Actions</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => setIsDialogOpen(true)} disabled={isPending}>
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
                              {(['Active', 'Sold Out', 'Archived'] as Status[]).map((status) => (
                                  <DropdownMenuItem key={status} disabled={item.status === status || isPending || status === 'Expired'} onClick={() => handleStatusChange(status)}>
                                    {status === 'Archived' && item.status === 'Archived' ? <><ArchiveRestore className="mr-2 h-4 w-4" /><span>Unarchive</span></> : status}
                                  </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        {item.status === 'Archived' ? (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Permanently</span>
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => setIsArchiveDialogOpen(true)}>
                              <Archive className="mr-2 h-4 w-4" />
                              <span>Archive</span>
                            </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 p-4 pt-0">
                   <div className="flex items-center gap-2 text-sm">
                        <profitLoss.Icon className={cn("h-4 w-4", profitLoss.className)} />
                        <span className="text-muted-foreground">{profitLoss.label}:</span>
                        <span className={cn("font-semibold", profitLoss.className)}>{profitLoss.text}</span>
                    </div>
                </CardContent>
                <CardFooter className="grid grid-cols-1 gap-2 p-2 pt-0">
                     <Button variant="outline" size="sm" onClick={() => setIsFlipped(false)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>

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

const MemoizedKanbanCard = memo(KanbanCard);
export { MemoizedKanbanCard as KanbanCard };
