'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { createItem, editItem, suggestDateAction, generatePasswordAction } from '@/app/items/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, WandSparkles, RefreshCw } from 'lucide-react';
import { useState, useTransition, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { format, addDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const itemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  username: z.string().optional(),
  password: z.string().optional(),
  pin: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['Active', 'Sold Out', 'Expired', 'Archived']),
  category: z.enum(['Website', 'WhatsApp', 'Messenger', 'Other']).optional(),
  contactName: z.string().optional(),
  contactValue: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  item?: Item;
  setDialogOpen: (open: boolean) => void;
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


export function ItemForm({ item, setDialogOpen }: ItemFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          ...item,
          startDate: item.startDate
            ? format(new Date(item.startDate), "yyyy-MM-dd'T'HH:mm")
            : '',
          endDate: item.endDate
            ? format(new Date(item.endDate), "yyyy-MM-dd'T'HH:mm")
            : '',
        }
      : {
          name: '',
          username: '',
          password: '',
          pin: '',
          notes: '',
          startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          endDate: '',
          status: 'Active',
          category: 'Website',
          contactName: '',
          contactValue: '',
        },
  });

  const category = form.watch('category');
  const password = form.watch('password') || '';
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const strengthColors = [
    'bg-gray-200', // 0
    'bg-red-500',   // 1
    'bg-orange-500',// 2
    'bg-yellow-500',// 3
    'bg-green-400', // 4
    'bg-green-600', // 5
  ];

  const strengthLabels = [
    'Empty',
    'Very Weak',
    'Weak',
    'Fair',
    'Good',
    'Strong',
  ];

  const getContactValuePlaceholder = () => {
    switch (category) {
      case 'WhatsApp':
      case 'Messenger':
        return 'Enter phone number';
      case 'Website':
        return 'Enter website URL';
      default:
        return 'Enter contact value';
    }
  };


  const onSubmit = (values: ItemFormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to save items.',
      });
      return;
    }

    startTransition(async () => {
      try {
        if (item) {
          // When editing, we need to handle the potential difference in date formats.
          // The form uses string dates, but the `item` object might have Timestamps.
          const itemDataToUpdate = {
            ...item, // This includes original createdAt, id, etc.
            ...values, // This overwrites with form values
            startDate: values.startDate ? new Date(values.startDate).toISOString() : '',
            endDate: values.endDate ? new Date(values.endDate).toISOString() : '',
          };
          await editItem(firestore, user.uid, itemDataToUpdate);
          toast({ title: 'Success', description: 'Item updated successfully.' });
        } else {
          // When creating, we convert dates to ISO strings before sending.
           const itemDataToCreate = {
            ...values,
            startDate: values.startDate ? new Date(values.startDate).toISOString() : '',
            endDate: values.endDate ? new Date(values.endDate).toISOString() : '',
          };
          await createItem(firestore, user.uid, itemDataToCreate);
          toast({ title: 'Success', description: 'Item added successfully.' });
        }
        setDialogOpen(false);
      } catch (error) {
        console.error("Form submission error:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Something went wrong.',
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
        // The suggested date is YYYY-MM-DD, we'll keep the current time or default to 00:00
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Netflix Subscription" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                     <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-accent"
                        onClick={handleGeneratePassword}
                        disabled={isGenerating}
                        aria-label="Generate Password"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    </Button>
                </div>
                 <div className="space-y-1">
                    <Progress value={passwordStrength * 20} className="h-2" />
                    <p className="text-xs text-muted-foreground" style={{ color: strengthColors[passwordStrength].replace('bg-', '').replace('-500', '') }}>
                        {strengthLabels[passwordStrength]}
                    </p>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Add any relevant notes here." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-accent"
                    onClick={handleSuggestDate}
                    disabled={isSuggesting}
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
                    >
                      {days}d
                    </Button>
                  ))}
                </div>
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-4 rounded-md border p-4">
          <h3 className="text-sm font-medium">Contact Details</h3>
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Messenger">Messenger</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
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
                  <FormLabel>Number / URL</FormLabel>
                  <FormControl>
                    <Input placeholder={getContactValuePlaceholder()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>


        <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {item ? 'Save Changes' : 'Save Item'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
