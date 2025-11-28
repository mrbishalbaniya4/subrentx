'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import type { Item, Status } from '@/lib/types';
import { editItem } from '@/app/items/actions';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';

const columns: { id: Status; title: string }[] = [
  { id: 'Active', title: 'Active' },
  { id: 'Sold Out', title: 'Sold Out' },
  { id: 'Expired', title: 'Expired' },
  { id: 'Archived', title: 'Archived' },
];

export function KanbanBoard({ initialItems }: { initialItems: Item[] }) {
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = items.find(i => i.id === active.id);
    setActiveItem(item || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
  
    const activeId = active.id;
    const overId = over.id;
  
    if (activeId === overId) return;
  
    const isActiveAnItem = items.some(i => i.id === activeId);
    const isOverAnItem = items.some(i => i.id === overId);
  
    if (!isActiveAnItem) return;
  
    setItems(currentItems => {
      const activeItem = currentItems.find(i => i.id === activeId);
      if (!activeItem) return currentItems;
  
      let newStatus: Status;
      
      // Dropping over a column
      if (columns.some(c => c.id === overId)) {
        newStatus = overId as Status;
      } 
      // Dropping over an item
      else if (isOverAnItem) {
        const overItem = currentItems.find(i => i.id === overId);
        if (!overItem) return currentItems;
        newStatus = overItem.status;
      } else {
        return currentItems;
      }
  
      if (activeItem.status !== newStatus) {
        const activeIndex = currentItems.findIndex(i => i.id === activeId);
        currentItems[activeIndex].status = newStatus;
        if(newStatus === 'Archived' && !currentItems[activeIndex].archivedAt){
          currentItems[activeIndex].archivedAt = new Date().toISOString();
        }
        return [...currentItems];
      }
  
      return currentItems;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || !firestore || !user) {
      // If the drag is cancelled, revert to the initial server state
      setItems(initialItems);
      return;
    };
    const activeId = String(active.id);
    const overId = String(over.id);

    const activeItem = items.find(i => i.id === activeId);
    if (!activeItem) return;
    
    let targetStatus: Status | undefined;
    
    // Find target status
    if (columns.some(c => c.id === overId)) {
      targetStatus = overId as Status;
    } else {
      const overItem = items.find(i => i.id === overId);
      if(overItem) {
        targetStatus = overItem.status;
      }
    }

    if (!targetStatus || activeItem.status === targetStatus) {
       // No status change, but maybe order changed. We'll let Firestore handle the final state.
      setItems(initialItems);
      return;
    }

    // Optimistic update has already happened in handleDragOver.
    // Now, persist the change to the backend.
    try {
        const updatedItem = { ...activeItem, status: targetStatus };
        if (targetStatus === 'Archived' && !activeItem.archivedAt) {
          updatedItem.archivedAt = new Date().toISOString();
        }
        // We don't need to await this if revalidatePath is called
        // as the useCollection hook will update the UI.
        editItem(firestore, user.uid, updatedItem);
    } catch (error) {
        // Revert the optimistic update on failure
        setItems(initialItems);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update item status."
        });
    }
  };

  return (
    <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCorners}
      >
        {columns.map(column => {
          const columnItems = items.filter(item => item.status === column.id);
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              items={columnItems}
              isDragDisabled={!isClient}
            />
          );
        })}
        <DragOverlay>
          {activeItem ? <KanbanCard item={activeItem} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
