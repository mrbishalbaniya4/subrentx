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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Item } from '@/lib/types';
import { addItem, updateItem, suggestDateAction } from '@/app/items/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, WandSparkles } from 'lucide-react';
import { useState, useTransition } from 'react';

const itemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  username: z.string().optional(),
  password: z.string().optional(),
  pin: z.string().optional(),
  notes: z.string().optional(),
  expirationDate: z.string().optional(),
  reminderDate: z.string().optional(),
  status: z.enum(['Active', 'Sold Out', 'Expired']),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  item?: Item;
  setDialogOpen: (open: boolean) => void;
}

export function ItemForm({ item, setDialogOpen }: ItemFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item || {
      name: '',
      username: '',
      password: '',
      pin: '',
      notes: '',
      expirationDate: '',
      reminderDate: '',
      status: 'Active',
    },
  });

  const onSubmit = (values: ItemFormValues) => {
    startTransition(async () => {
      try {
        if (item) {
          await updateItem({ ...values, id: item.id });
          toast({ title: 'Success', description: 'Item updated successfully.' });
        } else {
          await addItem(values);
          toast({ title: 'Success', description: 'Item added successfully.' });
        }
        setDialogOpen(false);
      } catch (error) {
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
        form.setValue('expirationDate', result.suggestedDate, {
          shouldValidate: true,
        });
        toast({
          title: 'Date Suggested',
          description: `Expiration date set to ${result.suggestedDate}`,
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
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
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
            name="expirationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiration Date</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-accent"
                    onClick={handleSuggestDate}
                    disabled={isSuggesting}
                    aria-label="Suggest Expiration Date"
                  >
                    {isSuggesting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <WandSparkles />
                    )}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reminderDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reminder Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {item ? 'Save Changes' : 'Save Item'}
        </Button>
      </form>
    </Form>
  );
}
