"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useSWRConfig } from "swr";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { updateGearOrder } from "@/actions/user-gears";
import { CategoryIcon } from "@/components/category-icon";
import { formatCategoryPath } from "@/lib/utils";
import type { UserGearItem } from "@/types/gear";

type Props = {
  gears: UserGearItem[];
  swrKey: [string, string] | null;
};

function SortableGearCard({ item }: { item: UserGearItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.userGearId });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-start gap-1.5 flex-shrink-0 ${
        isDragging ? "shadow-2xl opacity-80 border-cyan-500/50" : ""
      }`}
    >
      <div className="flex items-stretch w-full min-w-0 gap-2">
        <button
          type="button"
          className="shrink-0 flex items-center justify-center w-8 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none -ml-1"
          aria-label="並び替え"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs shrink-0">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 border border-white/10 text-gray-400">
              <CategoryIcon name={item.category} className="h-3.5 w-3.5" />
            </span>
            <span className="px-2 py-0.5 bg-white/10 rounded-full text-gray-200">
              {formatCategoryPath(item.category)}
            </span>
          </span>
          <span className="text-gray-200 whitespace-pre-wrap min-w-0 leading-tight text-sm md:text-base">
            {[item.manufacturer, item.name].filter(Boolean).join(" / ") || item.name}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MypageGearList({ gears, swrKey }: Props) {
  const { mutate } = useSWRConfig();
  const { user } = useAuth();
  const [localGears, setLocalGears] = useState<UserGearItem[]>(gears);

  useEffect(() => {
    setLocalGears(gears);
  }, [gears]);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(pointerSensor);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = localGears.findIndex((g) => g.userGearId === active.id);
      const newIndex = localGears.findIndex((g) => g.userGearId === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(localGears, oldIndex, newIndex);
      setLocalGears(reordered);
      if (!user || !swrKey) return;
      const token = await user.getIdToken(true);
      const result = await updateGearOrder(
        reordered.map((g) => g.userGearId),
        token
      );
      if (result.success) {
        mutate(swrKey);
      } else {
        toast.error(result.error);
        setLocalGears(gears);
      }
    },
    [localGears, user, swrKey, mutate, gears]
  );

  if (localGears.length === 0) {
    return null;
  }

  return (
    <DndContext
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always },
      }}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localGears.map((g) => g.userGearId)}
        strategy={rectSortingStrategy}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {localGears.map((item) => (
            <SortableGearCard key={item.userGearId} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
