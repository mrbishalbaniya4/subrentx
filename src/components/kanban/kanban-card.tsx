
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
import { useState, useTransition, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast, formatDistanceToNow, differenceInDays } from 'date-fns';
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
  ArrowRight,
  ArchiveRestore,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ShieldCheck,
  DollarSign,
  Bell,
} from 'lucide-react';
import { archiveItem, duplicateItem, updateItemStatus, deleteItem } from '@/firebase/firestore/mutations';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';


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


export function KanbanCard({ item, isOverlay }: KanbanCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);
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

  const handleCopyAccountDetails = () => {
    if (!item.password) return;
    
    const expiryDate = item.endDate ? format(new Date(item.endDate), 'PPP') : 'N/A';
    
    const accountDetails = `Here are your rental account details:\nEmail: ${item.username || 'N/A'}\nPassword: ${item.password}\nExpiry Date: ${expiryDate}\nNote: Please don’t share these credentials with anyone.`;
    
    navigator.clipboard.writeText(accountDetails);
    setIsPasswordRevealed(true);
    setIsCopied(true);
    toast({ title: 'Account details copied' });

    setTimeout(() => {
      setIsPasswordRevealed(false);
    }, 5000);

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

  const childrenQuery = useMemoFirebase(() => {
    if (!firestore || !user || !item.id) return null;
    const masterId = itemType === 'master' ? item.id : item.parentId;
    if (!masterId) return null;
    
    return query(
      collection(firestore, `users/${user.uid}/items`),
      where('parentId', '==', masterId)
    );
  }, [firestore, user, item.id, item.parentId, itemType]);

  const { data: childItems } = useCollection<Item>(childrenQuery);
  
  const assignmentCount = childItems?.length || 0;

  const totalProfit = useMemo(() => {
    if (itemType !== 'master' || !childItems) return 0;

    return childItems.reduce((acc, child) => {
        const salePrice = child.purchasePrice || 0;
        const cost = child.masterPrice || 0;
        return acc + (salePrice - cost);
    }, 0);
  }, [childItems, itemType]);

  const hasExpiredChild = useMemo(() => {
    if (itemType !== 'master' || !childItems) return false;
    return childItems.some(child => child.status === 'Expired');
  }, [childItems, itemType]);


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


  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group/card touch-none relative perspective-1000',
          isDragging && 'opacity-50 z-50',
          isOverlay && 'shadow-2xl'
        )}
        {...attributes}
      >
        <div
            className={cn(
            'w-full h-full relative transform-style-3d transition-transform duration-500',
            isFlipped && 'rotate-y-180'
            )}
        >
            {/* Front of the Card */}
            <Card className="w-full h-full backface-hidden">
                <CardHeader className="relative flex-row items-start gap-4 space-y-0 p-4 pb-2">
                  <div
                    className="flex-1 space-y-1"
                    onClick={() => setIsDialogOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setIsDialogOpen(true)}
                  >
                    <CardTitle className="text-lg font-headline">{item.name}</CardTitle>
                    {item.contactName && (
                         <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{item.contactName}</span>
                        </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div
                        {...listeners}
                        className="cursor-grab p-1 text-muted-foreground transition-opacity hover:opacity-80"
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
                                  disabled={item.status === status || isPending || status === 'Expired'}
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
                  </div>
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
                          handleCopyAccountDetails();
                        }}
                      >
                        {isCopied ? (
                          <CopyCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span className="sr-only">Copy account details</span>
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2">
                     {item.category && (
                        <Badge variant="outline" className={cn(categoryColors[item.category])}>
                            {item.category}
                        </Badge>
                    )}
                    {getUrgencyBadge()}
                     {hasExpiredChild && (
                        <Badge variant="outline" className="flex items-center gap-1.5 border-orange-200 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                            <Bell className="h-3 w-3" />
                            <span>Rental Expired</span>
                        </Badge>
                     )}
                   </div>
                   
                   {masterExpirationInfo()}

                    <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                      <RefreshCcw className="h-3 w-3" />
                      <span>Last updated {lastUpdated}</span>
                    </div>
                </CardContent>
                 <CardFooter className="p-2 pt-0">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsFlipped(true)}>
                        <Info className="mr-2 h-4 w-4"/>
                        Details
                    </Button>
                </CardFooter>
            </Card>

            {/* Back of the Card */}
            <Card className="absolute top-0 left-0 w-full h-full backface-hidden rotate-y-180 flex flex-col">
                <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
                    <CardTitle className="text-lg font-headline">Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center items-center p-4 text-center">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 text-center">
                            <p className="text-sm text-muted-foreground">Assignments</p>
                            <p className="text-3xl font-bold">{assignmentCount}</p>
                        </div>
                         {itemType === 'master' && (
                            <div className="space-y-1 text-center">
                                <p className="text-sm text-muted-foreground">Total Profit</p>
                                <p className={cn(
                                    "text-3xl font-bold flex items-center justify-center gap-1",
                                    totalProfit > 0 && "text-green-600",
                                    totalProfit < 0 && "text-red-600"
                                )}>
                                    <span className="text-2xl">Rs</span>
                                    {totalProfit.toFixed(2)}
                                </p>
                            </div>
                         )}
                    </div>
                </CardContent>
                <CardFooter className="p-2 pt-0">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsFlipped(false)}>
                        <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
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
