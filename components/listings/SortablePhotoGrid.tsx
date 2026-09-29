"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderById } from "@/lib/listings/photo-order";

type SortablePhotoGridProps<T extends { id: string }> = {
  items: T[];
  enabled?: boolean;
  disabled?: boolean;
  onReorder: (next: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  renderOverlay: (item: T) => React.ReactNode;
  trailing?: React.ReactNode;
};

export function SortablePhotoGrid<T extends { id: string }>({
  items,
  enabled = true,
  disabled = false,
  onReorder,
  renderItem,
  renderOverlay,
  trailing,
}: SortablePhotoGridProps<T>) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((item) => item.id === activeId) ?? null;
  const canDrag = enabled && items.length > 1;

  useEffect(() => {
    if (!activeId) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [activeId]);

  if (!canDrag) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.id}>{renderItem(item)}</div>
        ))}
        {trailing}
      </div>
    );
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function place(id: string | number | undefined): number | null {
    if (id == null) return null;
    const index = items.findIndex((item) => item.id === String(id));
    return index >= 0 ? index + 1 : null;
  }

  const announcements: Announcements = {
    onDragStart({ active }) {
      const index = place(active.id);
      return index ? `Picked up photo ${index} of ${items.length}.` : undefined;
    },
    onDragOver({ over }) {
      const index = place(over?.id);
      return index ? `Photo is over position ${index} of ${items.length}.` : undefined;
    },
    onDragEnd({ over }) {
      const index = place(over?.id);
      return index ? `Photo dropped at position ${index} of ${items.length}.` : "Reorder cancelled.";
    },
    onDragCancel() {
      return "Reorder cancelled.";
    },
  };

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (disabled) return;
    const overId = event.over ? String(event.over.id) : null;
    const next = reorderById(items, String(event.active.id), overId, (item) => item.id);
    if (next) onReorder(next);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{ announcements }}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <SortablePhotoTile key={item.id} id={item.id} disabled={disabled}>
              {renderItem(item)}
            </SortablePhotoTile>
          ))}
          {trailing}
        </div>
      </SortableContext>
      <DragOverlay>
        {active ? (
          <div className="w-36 cursor-grabbing overflow-hidden rounded-xl border border-neutral-200 shadow-card">{renderOverlay(active)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortablePhotoTile({ id, disabled, children }: { id: string; disabled?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative min-w-0">
      {isDragging ? (
        <div className="aspect-square rounded-xl border-2 border-dashed border-brand-400 bg-[#fcfbfa]" aria-hidden />
      ) : (
        <>
          {children}
          <button
            type="button"
            className="absolute left-0 top-0 z-10 flex h-11 w-11 cursor-grab touch-none items-start justify-start p-1.5 text-white active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Drag to reorder"
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <span className="rounded-md bg-black/60 p-1">
              <GripVertical size={14} />
            </span>
          </button>
        </>
      )}
    </div>
  );
}
