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
import { arrayMove } from '@dnd-kit/sortable';
import { useState, useEffect } from 'react';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import type { Item, Status } from '@/lib/types';
import { editItem } from '@/app/items/actions';
import { useToast } from '@/hooks/use-toast';
import { isPast } from 'date-fns';
import { useFirestore, useUser } from '@/firebase';

const columns: { id: Status; title: string }[] = [
  { id: 'Active', title: 'Active' },
  { id: 'Sold Out', title: 'Sold Out' },
  { id: 'Expired', title: 'Expired' },
  { id: 'Archived', title: 'Archived' },
];

export function KanbanBoard({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const checkAndMoveExpiredItems = async () => {
      if (!firestore || !user) return;

      const itemsToMove = items.filter(
        item =>
          item.endDate &&
          isPast(new Date(item.endDate)) &&
          item.status !== 'Expired' &&
          item.status !== 'Archived'
      );

      if (itemsToMove.length > 0) {
        toast({
          title: 'Auto-Update',
          description: `${itemsToMove.length} item(s) moved to Expired.`,
        });

        // Persist changes in the background
        const updates = itemsToMove.map(item =>
          editItem(firestore, user.uid, { ...item, status: 'Expired' })
        );
        
        try {
          await Promise.all(updates);
        } catch (error) {
          console.error("Error auto-updating items to expired:", error);
          toast({
            variant: "destructive",
            title: "Auto-Update Failed",
            description: "Could not move expired items automatically."
          })
        }
      }
    };

    if (items.length > 0) {
        checkAndMoveExpiredItems();
    }
  }, [items, firestore, user, toast]);

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

    if (!over || !firestore || !user) return;
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

    if (!targetStatus || activeItem.status === targetStatus) return;

    // Server update
    try {
        const updatedItem = { ...activeItem, status: targetStatus };
        if (targetStatus === 'Archived' && !activeItem.archivedAt) {
          updatedItem.archivedAt = new Date().toISOString();
        }
        await editItem(firestore, user.uid, updatedItem);
    } catch (error) {
        // The UI will revert automatically due to Firestore's real-time updates failing.
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update item status."
        });
    }
  };

  if (!isClient) {
    return (
        <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {columns.map(column => {
                const columnItems = items.filter(item => item.status === column.id);
                return (
                    <KanbanColumn
                        key={column.id}
                        id={column.id}
                        title={column.title}
                        items={columnItems}
                        isDragDisabled={true}
                    />
                );
            })}
        </div>
    );
  }

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
