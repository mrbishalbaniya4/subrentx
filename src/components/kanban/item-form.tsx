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
import { format, addDays, differenceInDays } from 'date-fns';
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
  status: z.enum(['Active', 'Sold Out', 'Expired', 'Archived']),
  category: z.enum(['Work', 'Personal', 'Finance', 'Shopping', 'Social', 'Travel', 'Other']).optional(),
  contactName: z.string().optional(),
  contactValue: z.string().optional(),
  purchasePrice: z.coerce.number().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  item?: Item;
  setDialogOpen: (open: boolean) => void;
  itemType?: 'master' | 'assigned';
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

export function ItemForm({ item, setDialogOpen, itemType = 'assigned' }: ItemFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'items');
  }, [firestore, user]);

  const { data: allItems } = useCollection<Item>(itemsQuery);

  const availableMasterProducts = useMemo(() => {
    if (!allItems) return [];
    const masterProducts = allItems.filter(item => !item.parentId);
    const activeAssignmentParentIds = new Set(
      allItems
        .filter(i => i.parentId && i.status === 'Active')
        .map(i => i.parentId)
    );

    const currentItemParentId = item?.parentId;

    return masterProducts.filter(p => {
        if (p.id === currentItemParentId) {
            return true;
        }
        return !activeAssignmentParentIds.has(p.id);
    });
  }, [allItems, item]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          ...item,
          parentId: item.parentId || 'none',
          startDate: item.startDate
            ? format(new Date(item.startDate), "yyyy-MM-dd'T'HH:mm")
            : '',
          endDate: item.endDate
            ? format(new Date(item.endDate), "yyyy-MM-dd'T'HH:mm")
            : '',
        }
      : {
          name: '',
          parentId: itemType === 'master' ? 'none' : undefined,
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

  useEffect(() => {
    if (parentId && parentId !== 'none' && !item) {
        const selectedMaster = availableMasterProducts.find(p => p.id === parentId);
        if (selectedMaster) {
            form.setValue('name', selectedMaster.name);
            form.setValue('username', selectedMaster.username);
            form.setValue('password', ''); 
            form.setValue('notes', '');
            form.setValue('category', selectedMaster.category);
        }
    }
  }, [parentId, availableMasterProducts, form, item]);

  const password = form.watch('password') || '';
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  
  const isCreatingMaster = itemType === 'master' && !item;
  const isEditingMaster = !!(item && !item.parentId);
  const isMasterProductForm = isCreatingMaster || isEditingMaster;
  const isAssignmentForm = !isMasterProductForm;

  const isMasterProductSelection = !parentId || parentId === 'none';
  const finalIsMasterProduct = (item && !item.parentId) || (!item && isMasterProductSelection);
  
  const isEditingAssignment = !!(item && item.parentId);


  const onSubmit = (values: ItemFormValues) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to save items.',
      });
      return;
    }

    startTransition(async () => {
      try {
        const itemData = {
            ...values,
            parentId: values.parentId === 'none' ? null : values.parentId,
            startDate: values.startDate ? new Date(values.startDate).toISOString() : '',
            endDate: values.endDate ? new Date(values.endDate).toISOString() : '',
        };
        if (item) {
          await editItem(firestore, user.uid, { ...item, ...itemData });
          toast({ title: 'Success', description: 'Item updated successfully.' });
        } else {
          await createItem(firestore, user.uid, itemData);
          toast({ title: 'Success', description: 'Item added successfully.' });
        }
        setDialogOpen(false);
      } catch (error) {
        console.error("Form submission error:", error);
        toast({
          variant: 'destructive',
          title: 'Error Saving Item',
          description: 'Failed to save item. Please check permissions and try again.',
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {isAssignmentForm && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assignment</h3>
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign from Master Product</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'} disabled={!!item}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a master product to assign..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (Create a one-off item)</SelectItem>
                      {availableMasterProducts.map(p => {
                          const remainingDays = p.endDate ? differenceInDays(new Date(p.endDate), new Date()) : null;
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
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isMasterProductSelection && (
              <>
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., John Doe" {...field} disabled={isEditingAssignment} />
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
                          <Input placeholder="+1234567890 or https://..." {...field} disabled={isEditingAssignment} />
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
             <h3 className="text-lg font-medium">{finalIsMasterProduct ? "Product Details" : "Assignment Details"}</h3>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Netflix Subscription" {...field} disabled={!finalIsMasterProduct || isEditingAssignment} />
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={!finalIsMasterProduct || isEditingAssignment}>
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
                      <Input placeholder="user@example.com" {...field} disabled={(!finalIsMasterProduct && !item) || isEditingAssignment}/>
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
                          <Input type={isPasswordVisible ? 'text' : 'password'} placeholder="••••••••" {...field} />
                        </FormControl>
                        <div className="absolute right-1 top-1/2 flex -translate-y-1/2">
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => setIsPasswordVisible(prev => !prev)}
                                aria-label="Toggle password visibility"
                            >
                                {isPasswordVisible ? <EyeOff /> : <Eye />}
                            </Button>
                             <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-accent"
                                onClick={handleGeneratePassword}
                                disabled={isGenerating}
                                aria-label="Generate Password"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-1 pt-1">
                        <Progress value={passwordStrength * 20} className="h-2" />
                        <p className="text-xs font-medium text-muted-foreground">
                            {strengthLabels[passwordStrength]}
                        </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
        </div>
        
        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Financials</h3>
          <FormField
            control={form.control}
            name="purchasePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{finalIsMasterProduct ? "Default Price" : "Sale Price"}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} disabled={isEditingAssignment} />
                </FormControl>
                 <FormDescription>
                    {finalIsMasterProduct ? "The default price for this master product." : "The price for this specific assignment."}
                 </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Notes</h3>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any relevant comments here." {...field} />
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
                      <Input type="datetime-local" {...field} disabled={isEditingAssignment} />
                    </FormControl>
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
                        <Input type="datetime-local" {...field} disabled={isEditingAssignment} />
                      </FormControl>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-accent"
                        onClick={handleSuggestDate}
                        disabled={isSuggesting || isEditingAssignment}
                        aria-label="Suggest End Date"
                      >
                        {isSuggesting ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <WandSparkles />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                     <div className="flex flex-wrap gap-2 pt-2">
                      {[3, 5, 7, 10, 15, 20, 30, 90].map((days) => (
                        <Button
                          key={days}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEndDateInDays(days)}
                          className="text-xs"
                          disabled={isEditingAssignment}
                        >
                          {days}d
                        </Button>
                      ))}
                    </div>
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
                {item ? 'Save Changes' : (finalIsMasterProduct ? 'Save Master Product' : 'Save Assignment')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
