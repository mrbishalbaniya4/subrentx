'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ItemForm } from './item-form';
import { PlusCircle, Plus } from 'lucide-react';
import { Item } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AddItemButtonProps {
  itemType?: 'master' | 'assigned';
}

export function AddItemButton({ itemType = 'assigned' }: AddItemButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="sm" className="rounded-xl px-3 py-2">
        <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
        Add
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Fill in the details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <ItemForm setDialogOpen={setIsOpen} itemType={itemType} />
        </DialogContent>
      </Dialog>
    </>
  );
}
