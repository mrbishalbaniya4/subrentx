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
import { PlusCircle } from 'lucide-react';

export function AddItemButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="icon" className="h-12 w-12 rounded-full shadow-lg md:h-auto md:w-auto md:rounded-md md:shadow-none md:size-auto">
        <PlusCircle className="h-6 w-6 md:h-4 md:w-4" />
        <span className="sr-only md:not-sr-only md:ml-2">Add Item</span>
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Fill in the details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <ItemForm setDialogOpen={setIsOpen} />
        </DialogContent>
      </Dialog>
    </>
  );
}
