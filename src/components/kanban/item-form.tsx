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
import type { Item } from '@/lib/types';
import { createItem, editItem } from '@/firebase/firestore/mutations';
import { suggestDateAction, generatePasswordAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, WandSparkles, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { format, addDays, differenceInDays, isWithinInterval, parseISO, isValid, isPast } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { collection } from 'firebase/firestore';


const itemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  parentId: z.string().optional().nullable(),
  username: z.string().optional(),
  password: z.string().optional(),
  pin: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['Active', 'Expired', 'Archived']),
  category: z.enum(['Work', 'Personal', 'Finance', 'Shopping', 'Social', 'Travel', 'Other']).optional(),
  contactName: z.string().optional(),
  contactValue: z.string().optional(),
  purchasePrice: z.coerce.number().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  item?: Item;
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
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [masterCountdown, setMasterCountdown] = useState<string | null>(null);
  const [assignmentCountdown, setAssignmentCountdown] = useState<string | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'items');
  }, [firestore, user]);

  const { data: allItems } = useCollection<Item>(itemsQuery);

  const availableMasterProducts = useMemo(() => {
    if (!allItems) return [];
    
    // Find all master products that are themselves active and not expired.
    const activeMasters = allItems.filter(p => 
        !p.parentId && 
        p.status === 'Active' && 
        p.endDate && !isPast(new Date(p.endDate))
    );

    // Find all assignments that are still active (not expired).
    const activeAssignments = allItems.filter(a => 
      a.parentId && a.endDate && !isPast(new Date(a.endDate))
    );

    // Get the IDs of the master products that are tied to active assignments.
    const assignedMasterIds = new Set(activeAssignments.map(a => a.parentId));

    // A master product is available if it's active AND it's not in the set of actively assigned masters.
    // If we are editing an existing item, we should also include its own master product in the list.
    return activeMasters.filter(p => 
      !assignedMasterIds.has(p.id) || (item && p.id === item.parentId)
    );
  }, [allItems, item]);


  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          ...item,
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
          category: 'Personal',
          contactName: '',
          contactValue: '',
          purchasePrice: 0,
        },
  });
  
  const parentId = form.watch('parentId');
  const assignmentEndDate = form.watch('endDate');

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
            form.setValue('username', master.username);
            form.setValue('password', master.password || ''); 
            form.setValue('category', master.category);
            form.setValue('purchasePrice', master.purchasePrice);
            if (master.startDate) form.setValue('startDate', format(new Date(master.startDate), "yyyy-MM-dd'T'HH:mm"));
            if (master.endDate) form.setValue('endDate', format(new Date(master.endDate), "yyyy-MM-dd'T'HH:mm"));
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
        const itemData: Partial<Item> = {
            ...values,
            parentId: isMasterProductForm ? null : values.parentId,
            startDate: values.startDate && isValid(new Date(values.startDate)) ? new Date(values.startDate).toISOString() : undefined,
            endDate: values.endDate && isValid(new Date(values.endDate)) ? new Date(values.endDate).toISOString() : undefined,
        };

        if (passwordChanged) {
            itemData.lastPasswordChange = new Date().toISOString();
        }

        if (item) {
          await editItem(firestore, user.uid, { ...item, ...itemData });
          toast({ title: 'Success', description: 'Item updated successfully.' });
        } else {
          await createItem(firestore, user.uid, itemData as Item, allItems || []);
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

  const handleSuggestDate = () => {
    const itemName = form.getValues('name');
    if (!itemName) {
      form.setError('name', { message: 'Please enter a name first.' });
      return;
    }
    setIsSuggesting(true);
    startTransition(async () => {
      const result = await suggestDateAction(itemName);
      if (result.suggestedDate) {
        const currentDate = form.getValues('endDate') ? new Date(form.getValues('endDate')!) : new Date();
        const time = format(currentDate, 'HH:mm');
        const suggestedDateTime = `${result.suggestedDate}T${time}`;
        form.setValue('endDate', suggestedDateTime, {
          shouldValidate: true,
        });
        toast({
          title: 'Date Suggested',
          description: `End date set to ${format(new Date(suggestedDateTime), 'MMM d, yyyy HH:mm')}`,
        });
      } else if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Suggestion Failed',
          description: result.error,
        });
      }
      setIsSuggesting(false);
    });
  };
  
  const handleGeneratePassword = () => {
    setIsGenerating(true);
    startTransition(async () => {
      const result = await generatePasswordAction();
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
    const newEndDate = addDays(new Date(), days);
    form.setValue('endDate', format(newEndDate, "yyyy-MM-dd'T'HH:mm"), {
      shouldValidate: true,
    });
  };

  // Master product countdown timer
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

  // Assignment countdown timer
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


  const masterProductDuration = useMemo(() => {
    if (!selectedMaster || !selectedMaster.startDate || !selectedMaster.endDate) return null;
    const start = new Date(selectedMaster.startDate);
    const end = new Date(selectedMaster.endDate);
    if (!isValid(start) || !isValid(end)) return null;
    return differenceInDays(end, start);
  }, [selectedMaster]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {isCreatingAssignment && (
          <div className="space-y-4 rounded-lg border bg-card p-4">
            <h3 className="text-lg font-medium">Assignment Setup</h3>
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
            <Separator />
          </div>
        )}

        <div className="space-y-4">
             <h3 className="text-lg font-medium">{isMasterProductForm ? "Master Product Details" : "Item Details"}</h3>
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
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                      <SelectItem value="Social">Social</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
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
            <h3 className="text-lg font-medium">Credentials</h3>
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
          <h3 className="text-lg font-medium">Financials & Notes</h3>
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
                    {isMasterProductForm ? "The default cost for this master product." : "The price for this specific assignment."}
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
            <h3 className="text-lg font-medium">Dates</h3>
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
               <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    {masterProductDuration !== null && (
                      <FormDescription>
                        Master product is valid for {masterProductDuration} days.
                      </FormDescription>
                    )}
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
                      <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-accent" onClick={handleSuggestDate} disabled={isSuggesting}>
                        {isSuggesting ? <Loader2 className="animate-spin" /> : <WandSparkles />}
                      </Button>
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
        
        <div className="flex items-center justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {item ? 'Save Changes' : (isMasterProductForm ? 'Save Master Product' : 'Save Assignment')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
