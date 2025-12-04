
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Item, ItemWithDetails } from '@/lib/types';
import { createItem, editItem } from '@/firebase/firestore/mutations';
import { generatePasswordAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { format, addDays, differenceInDays, isWithinInterval, parseISO, isValid, isPast, isAfter } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';


const itemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  parentId: z.string().optional().nullable(),
  username: z.string().optional(),
  password: z.string().optional(),
  pin: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['Active', 'Sold Out', 'Expired', 'Archived']),
  category: z.enum(['Apeuni', 'Netflix', 'Amazon', 'Spotify', 'Hulu', 'Other']).optional(),
  contactName: z.string().optional(),
  contactValue: z.string().optional(),
  purchasePrice: z.coerce.number().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  item?: Item; // The summary item
  setDialogOpen: (open: boolean) => void;
  itemType: 'master' | 'assigned';
}

const getPasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 5); // Max score of 5
};

const strengthLabels = [
    'Empty',
    'Very Weak',
    'Weak',
    'Fair',
    'Good',
    'Strong',
];

const formatCountdown = (endDate: string | undefined): string | null => {
    if (!endDate || !isValid(new Date(endDate))) return null;

    const now = new Date();
    const end = new Date(endDate);
    const distance = end.getTime() - now.getTime();

    if (distance < 0) {
        return "Expired";
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};


export function ItemForm({ item, setDialogOpen, itemType }: ItemFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [masterCountdown, setMasterCountdown] = useState<string | null>(null);
  const [assignmentCountdown, setAssignmentCountdown] = useState<string | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();
  
  // Fetch details only when editing an item
  const itemDetailsRef = useMemoFirebase(() => {
    if (!firestore || !user || !item) return null;
    return doc(firestore, `users/${user.uid}/items/${item.id}/details/data`);
  }, [firestore, user, item]);

  const { data: itemDetails, isLoading: areDetailsLoading } = useDoc(itemDetailsRef);

  const allItemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(200) // Limit fetching all items
    );
  }, [firestore, user]);
  
  const { data: allItems } = useCollection<Item>(allItemsQuery);

  const availableMasterProducts = useMemo(() => {
    if (!allItems) return [];
    
    const activeAssignments = allItems.filter(a => 
      a.parentId && a.status === 'Active' && a.endDate && !isPast(new Date(a.endDate))
    );

    const assignedMasterIds = new Set(activeAssignments.map(a => a.parentId));

    return allItems.filter(p => 
        !p.parentId && 
        p.status === 'Active' && 
        p.endDate && !isPast(new Date(p.endDate)) &&
        (!assignedMasterIds.has(p.id) || (item && p.id === item.parentId))
    ).slice(0, 100); // Limit dropdown options client-side
  }, [allItems, item]);


  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          ...item,
          username: item.username ?? '',
          password: item.password ?? '',
          pin: item.pin ?? '',
          notes: item.notes ?? '',
          contactName: item.contactName ?? '',
          contactValue: item.contactValue ?? '',
          parentId: item.parentId || null,
          startDate: item.startDate && isValid(new Date(item.startDate))
            ? format(new Date(item.startDate), "yyyy-MM-dd'T'HH:mm")
            : '',
          endDate: item.endDate && isValid(new Date(item.endDate))
            ? format(new Date(item.endDate), "yyyy-MM-dd'T'HH:mm")
            : '',
        }
      : {
          name: '',
          parentId: null,
          username: '',
          password: '',
          pin: '',
          notes: '',
          startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          endDate: '',
          status: 'Active',
          category: 'Other',
          contactName: '',
          contactValue: '',
          purchasePrice: 0,
        },
  });
  
  // Populate form with details once they are loaded
  useEffect(() => {
    if (item && itemDetails) {
      form.reset({
        ...item,
        ...itemDetails,
        username: item.username ?? '',
        password: itemDetails.password ?? '',
        pin: itemDetails.pin ?? '',
        notes: itemDetails.notes ?? '',
        contactName: item.contactName ?? '',
        contactValue: item.contactValue ?? '',
        parentId: item.parentId || null,
        startDate: item.startDate && isValid(new Date(item.startDate)) ? format(new Date(item.startDate), "yyyy-MM-dd'T'HH:mm") : '',
        endDate: item.endDate && isValid(new Date(item.endDate)) ? format(new Date(item.endDate), "yyyy-MM-dd'T'HH:mm") : '',
      });
    }
  }, [item, itemDetails]);


  const parentId = form.watch('parentId');
  const assignmentEndDate = form.watch('endDate');
  const startDateValue = form.watch('startDate');

  const selectedMaster = useMemo(() => {
      if (!parentId || !allItems) return null;
      return allItems.find(p => p.id === parentId);
  }, [parentId, allItems]);


  // Effect to auto-fill form when a master product is selected for a new assignment
  useEffect(() => {
    if (itemType === 'assigned' && !item && parentId) { // Creating new assignment
        const master = availableMasterProducts.find(p => p.id === parentId);
        if (master) {
            form.setValue('name', master.name);
            form.setValue('username', master.username || '');
            // Don't auto-fill password from master. That's now in details.
            // form.setValue('password', master.password || ''); 
            form.setValue('category', master.category);
            form.setValue('purchasePrice', 0); // Reset sale price
            
            form.setValue('startDate', format(new Date(), "yyyy-MM-dd'T'HH:mm"));
            form.setValue('endDate', '');
        }
    }
  }, [parentId, availableMasterProducts, form, item, itemType]);

  const password = form.watch('password') || '';
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  
  const isMasterProductForm = itemType === 'master';
  const isCreatingAssignment = itemType === 'assigned' && !item;

  const onSubmit = (values: ItemFormValues) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    if (values.parentId && values.startDate && values.endDate) {
      const master = allItems?.find(p => p.id === values.parentId);
      if (master && master.startDate && master.endDate) {
        const masterStart = parseISO(master.startDate);
        const masterEnd = parseISO(master.endDate);
        const subStart = parseISO(values.startDate);
        const subEnd = parseISO(values.endDate);

        if (!isWithinInterval(subStart, { start: masterStart, end: masterEnd }) || !isWithinInterval(subEnd, { start: masterStart, end: masterEnd })) {
          form.setError('endDate', { message: 'Assignment date range must be within the master product\'s duration.' });
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        const { notes, password, pin, ...summaryValues } = values;

        const summaryData: Partial<Item> = {
            ...summaryValues,
            parentId: isMasterProductForm ? null : values.parentId,
            startDate: values.startDate && isValid(new Date(values.startDate)) ? new Date(values.startDate).toISOString() : undefined,
            endDate: values.endDate && isValid(new Date(values.endDate)) ? new Date(values.endDate).toISOString() : undefined,
        };
        
        if (!summaryData.startDate) delete summaryData.startDate;
        if (!summaryData.endDate) delete summaryData.endDate;

        const detailsData = { notes, password, pin };

        if (passwordChanged) {
            summaryData.lastPasswordChange = new Date().toISOString();
        }

        if (item) {
          // Pass both summary and details to the edit function
          await editItem(firestore, user.uid, { ...item, ...summaryData }, detailsData);
          toast({ title: 'Success', description: 'Item updated successfully.' });
        } else {
          // Pass both summary and details to the create function
          await createItem(firestore, user.uid, summaryData as Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>, detailsData, allItems || []);
          toast({ title: 'Success', description: `${isMasterProductForm ? 'Master product' : 'Assigned item'} added successfully.` });
        }
        setDialogOpen(false);
      } catch (error) {
        console.error("Form submission error:", error);
        toast({
          variant: 'destructive',
          title: 'Error Saving Item',
          description: (error as Error).message || 'An unexpected error occurred.',
        });
      }
    });
  };

  const handleGeneratePassword = () => {
    setIsGenerating(true);
    startTransition(async () => {
      const result = await generatePasswordAction({ length: 16, includeNumbers: true, includeSymbols: true });
      if (result.password) {
        form.setValue('password', result.password, { shouldValidate: true });
        setPasswordChanged(true);
        toast({
          title: 'Password Generated',
          description: 'A new strong password has been set.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Generation Failed',
          description: result.error,
        });
      }
      setIsGenerating(false);
    });
  };

  const setEndDateInDays = (days: number) => {
    const start = startDateValue && isValid(new Date(startDateValue)) 
      ? new Date(startDateValue) 
      : new Date();
      
    let newEndDate = addDays(start, days);

    if (selectedMaster && selectedMaster.endDate && isValid(new Date(selectedMaster.endDate))) {
        const masterEndDate = new Date(selectedMaster.endDate);
        if (isAfter(newEndDate, masterEndDate)) {
            newEndDate = masterEndDate;
            toast({
                variant: 'default',
                title: 'End Date Adjusted',
                description: "The end date was adjusted to match the master product's expiration.",
            });
        }
    }

    form.setValue('endDate', format(newEndDate, "yyyy-MM-dd'T'HH:mm"), {
      shouldValidate: true,
    });
  };

  useEffect(() => {
    if (!selectedMaster) {
      setMasterCountdown(null);
      return;
    }
    const intervalId = setInterval(() => {
      const countdownStr = formatCountdown(selectedMaster.endDate);
      setMasterCountdown(countdownStr);
      if (countdownStr === "Expired") {
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [selectedMaster]);

  useEffect(() => {
    if (!assignmentEndDate) {
      setAssignmentCountdown(null);
      return;
    }
    const intervalId = setInterval(() => {
        const countdownStr = formatCountdown(assignmentEndDate);
        setAssignmentCountdown(countdownStr);
        if (countdownStr === "Expired") {
            clearInterval(intervalId);
        }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [assignmentEndDate]);

  if (item && areDetailsLoading) {
    return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex-1 space-y-4 overflow-y-auto p-1">
        
          {isCreatingAssignment && (
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <h3 className="text-base font-semibold">Assignment Setup</h3>
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign from Master Product</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a master product..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableMasterProducts.map(p => {
                            const remainingDays = p.endDate && isValid(new Date(p.endDate)) ? differenceInDays(new Date(p.endDate), new Date()) : null;
                            const daysText = remainingDays !== null 
                                ? (remainingDays >= 0 ? `(${remainingDays} days remaining)` : '(Expired)')
                                : '';
                            return (
                              <SelectItem key={p.id} value={p.id}>
                                  {p.name} {daysText}
                              </SelectItem>
                            )
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>Select the master product this item belongs to.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {parentId && (
                <>
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignee Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      <FormField
                      control={form.control}
                      name="contactValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignee Contact (Phone/URL)</FormLabel>
                          <FormControl>
                            <Input placeholder="+1234567890 or https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </>
              )}
            </div>
          )}

          <div className="space-y-4">
              <h3 className="text-base font-semibold">{isMasterProductForm ? "Master Product Details" : "Item Details"}</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Netflix Subscription" {...field} disabled={!!parentId && !isMasterProductForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!parentId && !isMasterProductForm}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Apeuni">Apeuni</SelectItem>
                        <SelectItem value="Netflix">Netflix</SelectItem>
                        <SelectItem value="Amazon">Amazon</SelectItem>
                        <SelectItem value="Spotify">Spotify</SelectItem>
                        <SelectItem value="Hulu">Hulu</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>
          
          <Separator />

          <div className="space-y-4">
              <h3 className="text-base font-semibold">Credentials</h3>
              <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username/Email</FormLabel>
                      <FormControl>
                        <Input placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="relative">
                          <FormControl>
                            <Input 
                              type={isPasswordVisible ? 'text' : 'password'} 
                              placeholder="••••••••" 
                              {...field}
                              onChange={(e) => {
                                  field.onChange(e);
                                  setPasswordChanged(true);
                              }}
                            />
                          </FormControl>
                          <div className="absolute right-1 top-1/2 flex -translate-y-1/2">
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setIsPasswordVisible(prev => !prev)} aria-label="Toggle password visibility">
                                  {isPasswordVisible ? <EyeOff /> : <Eye />}
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-accent" onClick={handleGeneratePassword} disabled={isGenerating} aria-label="Generate Password">
                                  {isGenerating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                              </Button>
                          </div>
                      </div>
                      <div className="space-y-1 pt-1">
                          <Progress value={passwordStrength * 20} className="h-2" />
                          <p className="text-xs font-medium text-muted-foreground">
                              {strengthLabels[passwordStrength]}
                          </p>
                          {item?.lastPasswordChange && (
                              <p className="text-xs text-muted-foreground">
                                  Last changed: {format(new Date(item.lastPasswordChange), 'PPp')}
                              </p>
                          )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
          </div>
          
          <Separator />

          <div className="space-y-4">
            <h3 className="text-base font-semibold">Financials & Notes</h3>
            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isMasterProductForm ? "Default Price" : "Sale Price"}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>
                      {isMasterProductForm ? "The default cost for this master product (in Rs)." : "The price for this specific assignment (in Rs)."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={isMasterProductForm ? "Add notes for this master product..." : "Add notes for this assignment..."}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>

          <Separator />
          
          <div className="space-y-4">
              <h3 className="text-base font-semibold">Dates</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      {masterCountdown && (
                        <FormDescription>
                          Master expires in: {masterCountdown}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {[3, 5, 7, 10, 15, 20, 30, 90].map((days) => (
                          <Button key={days} type="button" variant="outline" size="sm" onClick={() => setEndDateInDays(days)} className="text-xs">
                            {days}d
                          </Button>
                        ))}
                      </div>
                      {assignmentCountdown && (
                          <FormDescription>
                              Assignment ends in: {assignmentCountdown}
                          </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 md:static md:border-none md:p-0 md:flex md:items-center md:justify-end md:gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="hidden md:inline-flex">
                Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full md:w-auto" size="lg">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {item ? 'Save Changes' : (isMasterProductForm ? 'Save Master Product' : 'Save Assignment')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
