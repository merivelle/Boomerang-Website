"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "./cn";

/**
 * Ordering, by dragging.
 *
 * The keyboard sensor is not an accessibility box-tick here — it is the reason
 * this replaced ↑/↓ buttons rather than sitting beside them. Tab to a handle,
 * space, arrows, space: the same operation, without a mouse.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  direction = "vertical",
  className,
  children,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  direction?: "vertical" | "grid";
  className?: string;
  children: (item: T, index: number) => React.ReactNode;
}) {
  // dnd-kit derives its aria-describedby ids from a module-level counter, which
  // runs a different number of times on the server than in the browser and so
  // hydrates with a mismatched id. useId() is stable across both.
  const id = useId();

  const sensors = useSensors(
    // 6px of slop, so a click on a button inside a row is still a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    document.body.classList.remove("admin-dragging");
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={
        direction === "vertical" ? [restrictToVerticalAxis, restrictToParentElement] : undefined
      }
      onDragStart={() => document.body.classList.add("admin-dragging")}
      onDragCancel={() => document.body.classList.remove("admin-dragging")}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={direction === "vertical" ? verticalListSortingStrategy : rectSortingStrategy}
      >
        <ul className={className}>{items.map((item, i) => children(item, i))}</ul>
      </SortableContext>
    </DndContext>
  );
}

/**
 * One draggable row. `handle` renders the grip; pass `wholeCardDraggable` for
 * grids, where there is no room for a separate handle and the tile itself is
 * the obvious thing to grab.
 */
export function SortableItem({
  id,
  className,
  wholeCardDraggable = false,
  children,
}: {
  id: string;
  className?: string;
  wholeCardDraggable?: boolean;
  children: (handle: { grip: React.ReactNode; dragging: boolean }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const grip = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="inline-flex h-8 w-6 cursor-grab touch-none items-center justify-center rounded text-zinc-300 transition-colors hover:text-zinc-600 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        className,
        isDragging && "opacity-90 shadow-lg ring-2 ring-zinc-900/10",
        wholeCardDraggable && "cursor-grab touch-none active:cursor-grabbing",
      )}
      {...(wholeCardDraggable ? { ...attributes, ...listeners } : {})}
    >
      {children({ grip: wholeCardDraggable ? null : grip, dragging: isDragging })}
    </li>
  );
}
