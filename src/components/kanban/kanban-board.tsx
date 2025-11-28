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
import { editItem } from '@/firebase/firestore/mutations';
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
  const { user } = useUser();
  const firestore = useFirestore();
  const [items, setItems] = useState(initialItems);

  // This effect ensures that the local state is updated whenever the server sends new data.
  // This is the single source of truth.
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
  
      // This is the optimistic update.
      // We create a new array with the updated item status.
      if (activeItem.status !== newStatus) {
        return currentItems.map(i => {
          if (i.id === activeId) {
            return {
              ...i,
              status: newStatus,
              archivedAt: newStatus === 'Archived' && !i.archivedAt ? new Date().toISOString() : i.archivedAt
            };
          }
          return i;
        });
      }
  
      return currentItems;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;

    if (!over || !user || !firestore) {
      // If drag is cancelled or conditions aren't met, revert to server state.
      setItems(initialItems);
      return;
    };
    
    const activeId = String(active.id);
    const overId = String(over.id);

    const activeItem = items.find(i => i.id === activeId);
    const initialItem = initialItems.find(i => i.id === activeId);

    if (!activeItem || !initialItem) return;
    
    let targetStatus: Status | undefined;
    
    // Find the target status based on where the item was dropped
    if (columns.some(c => c.id === overId)) {
      targetStatus = overId as Status;
    } else {
      const overItem = items.find(i => i.id === overId);
      if(overItem) {
        targetStatus = overItem.status;
      }
    }

    // Only persist changes if the status has actually changed.
    if (targetStatus && initialItem.status !== targetStatus) {
      try {
          const updatedItem = { ...activeItem, status: targetStatus };
          if (targetStatus === 'Archived' && !activeItem.archivedAt) {
            updatedItem.archivedAt = new Date().toISOString();
          }
          // Fire-and-forget the update. The real-time listener will handle the UI update.
          editItem(firestore, user.uid, updatedItem);
      } catch (error) {
          // On failure, the real-time listener will eventually revert the state,
          // but we can also show an immediate toast.
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to update item status."
          });
      }
    } else {
      // If no status change, just revert to the server state to ensure consistency.
      setItems(initialItems);
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
