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
import { updateItem } from '@/app/items/actions';
import { useToast } from '@/hooks/use-toast';
import { isPast } from 'date-fns';

const columns: { id: Status; title: string }[] = [
  { id: 'Active', title: 'Active' },
  { id: 'Sold Out', title: 'Sold Out' },
  { id: 'Expired', title: 'Expired' },
];

export function KanbanBoard({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const checkAndMoveExpiredItems = async () => {
      const today = new Date().toISOString().split('T')[0];
      const itemsToMove = items.filter(
        item =>
          item.expirationDate &&
          isPast(new Date(item.expirationDate)) &&
          item.status !== 'Expired'
      );

      if (itemsToMove.length > 0) {
        toast({
          title: 'Auto-Update',
          description: `${itemsToMove.length} item(s) moved to Expired.`,
        });

        const updatedItems = items.map(item =>
          itemsToMove.find(itm => itm.id === item.id)
            ? { ...item, status: 'Expired' as Status }
            : item
        );
        setItems(updatedItems);

        // Persist changes in the background
        await Promise.all(
          itemsToMove.map(item => updateItem({ ...item, status: 'Expired' }))
        );
      }
    };

    checkAndMoveExpiredItems();
    // We only want this to run once on mount for the initial check.
    // Subsequent updates will be handled by user actions or page reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return [...currentItems];
      }
  
      return currentItems;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;
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

    if (!targetStatus) return;

    // optimistic update
    const previousItems = [...items];
    const updatedItems = items.map(item =>
        item.id === activeId ? { ...item, status: targetStatus! } : item
    );
    setItems(updatedItems);
    
    // Server update
    try {
        await updateItem({ ...activeItem, status: targetStatus });
    } catch (error) {
        setItems(previousItems); // rollback on error
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update item status."
        });
    }
  };

  if (!isClient) {
    return (
      <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map(column => {
          const columnItems = items.filter(item => item.status === column.id);
          return (
            <KanbanColumn key={column.id} id={column.id} title={column.title} items={columnItems} isDragDisabled />
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-3">
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
            <KanbanColumn key={column.id} id={column.id} title={column.title} items={columnItems} />
          );
        })}
        <DragOverlay>
          {activeItem ? <KanbanCard item={activeItem} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
