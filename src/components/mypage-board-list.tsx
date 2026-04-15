"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shouldUnoptimizeFirebaseStorage } from "@/lib/image-optimization";
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
import { GripVertical, Share2, Trash2 } from "lucide-react";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { deleteBoard, updateBoardOrder } from "@/actions/board";
import { BoardFlowReadonly } from "@/components/board-flow-readonly";

export type MypageBoardItem = {
  id: string;
  name: string;
  thumbnail: string | null;
  actualPhotoUrl: string | null;
  nodes?: string | null;
  edges?: string | null;
  updatedAt: string;
};

type Props = {
  boards: MypageBoardItem[];
  swrKey: [string, string] | null;
};

function SortableBoardCard({
  board,
  onDeleteSuccess,
}: {
  board: MypageBoardItem;
  onDeleteSuccess: (id: string) => void;
}) {
  const { user } = useAuth();
  const router = useRouter();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const handleDelete = useCallback(async () => {
    if (!user) return;
    if (!window.confirm("このボードを削除しますか？")) return;
    const token = await user.getIdToken(true);
    const result = await deleteBoard(board.id, token);
    if (result.success) {
      toast.success("ボードを削除しました");
      onDeleteSuccess(board.id);
    } else {
      toast.error(result.error);
    }
  }, [board.id, user, onDeleteSuccess]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col rounded-xl border border-surface-border bg-white/[0.03] overflow-hidden text-left transition-colors hover:border-cyan-500/50 ${
  isDragging ? "shadow-2xl opacity-80 border-cyan-500" : ""
}`}
    >
      <div className="flex items-stretch min-w-0">
        <button
          type="button"
          className="shrink-0 flex items-center justify-center w-8 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
          aria-label="並び替え"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <Link
          href={`/board/editor/${encodeURIComponent(board.id)}`}
          className="min-w-0 flex flex-col flex-1 hover:opacity-90"
        >
          <div className="relative aspect-video w-full bg-[#0a0a0a] shrink-0 overflow-hidden">
            {(() => {
              const hasActual = Boolean(board.actualPhotoUrl?.trim());
              const hasThumbnail = Boolean(board.thumbnail?.trim());
              const hasFlowData = Boolean(board.nodes?.trim() || board.edges?.trim());
              if (hasActual && hasThumbnail) {
                return (
                  <div className="flex w-full h-full">
                    <div className="relative w-1/2 h-full">
                      <Image
                        src={board.actualPhotoUrl!}
                        alt="実機写真"
                        fill
                        className="object-cover"
                        unoptimized={shouldUnoptimizeFirebaseStorage(board.actualPhotoUrl!)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="relative w-1/2 h-full border-l border-surface-border">
                      <Image
                        src={board.thumbnail!}
                        alt="配線図"
                        fill
                        className="object-cover"
                        unoptimized={shouldUnoptimizeFirebaseStorage(board.thumbnail!)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </div>
                );
              }
              if (hasActual && hasFlowData) {
                return (
                  <div className="flex w-full h-full">
                    <div className="relative w-1/2 h-full">
                      <Image
                        src={board.actualPhotoUrl!}
                        alt="実機写真"
                        fill
                        className="object-cover"
                        unoptimized={shouldUnoptimizeFirebaseStorage(board.actualPhotoUrl!)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="relative w-1/2 h-full border-l border-surface-border bg-[#050709]">
                      <BoardFlowReadonly
                        nodesJson={board.nodes ?? null}
                        edgesJson={board.edges ?? null}
                        containerClassName="w-full h-full border-0 rounded-none"
                        interactive={false}
                      />
                    </div>
                  </div>
                );
              }
              if (hasActual) {
                return (
                  <div className="relative w-full h-full">
                    <Image
                      src={board.actualPhotoUrl!}
                      alt="実機写真"
                      fill
                      className="object-cover"
                      unoptimized={shouldUnoptimizeFirebaseStorage(board.actualPhotoUrl!)}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                );
              }
              if (hasThumbnail) {
                return (
                  <div className="relative w-full h-full">
                    <Image
                      src={board.thumbnail!}
                      alt="配線図"
                      fill
                      className="object-cover"
                      unoptimized={shouldUnoptimizeFirebaseStorage(board.thumbnail!)}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                );
              }
              if (hasFlowData) {
                return (
                  <div className="relative w-full h-full bg-[#050709]">
                    <BoardFlowReadonly
                      nodesJson={board.nodes ?? null}
                      edgesJson={board.edges ?? null}
                      containerClassName="w-full h-full border-0 rounded-none"
                      interactive={false}
                    />
                  </div>
                );
              }
              return (
                <div className="flex w-full h-full items-center justify-center bg-gray-800 text-gray-500 text-xs">
                  サムネイルなし
                </div>
              );
            })()}
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="font-medium text-white truncate">{board.name}</span>
            <span className="text-xs text-gray-500">
              更新: {new Date(board.updatedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}
            </span>
          </div>
        </Link>
      </div>
      <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/board/editor/${encodeURIComponent(board.id)}`}
          className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:underline"
        >
          編集する
        </Link>
        <Link
          href={`/boards/publish?boardId=${encodeURIComponent(board.id)}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          みんなのボードに投稿
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleDelete();
          }}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors ml-auto"
          aria-label="ボードを削除"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          削除
        </button>
      </div>
    </div>
  );
}

export function MypageBoardList({ boards, swrKey }: Props) {
  const { mutate } = useSWRConfig();
  const [localBoards, setLocalBoards] = useState<MypageBoardItem[]>(boards);
  const { user } = useAuth();

  useEffect(() => {
    setLocalBoards(boards);
  }, [boards]);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(pointerSensor);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = localBoards.findIndex((b) => b.id === active.id);
      const newIndex = localBoards.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(localBoards, oldIndex, newIndex);
      setLocalBoards(reordered);
      if (!user || !swrKey) return;
      const token = await user.getIdToken(true);
      const result = await updateBoardOrder(
        reordered.map((b) => b.id),
        token
      );
      if (result.success) {
        mutate(swrKey);
      } else {
        toast.error(result.error);
        setLocalBoards(boards);
      }
    },
    [localBoards, user, swrKey, mutate, boards]
  );

  const handleDeleteSuccess = useCallback(
    (deletedId: string) => {
      // ローカル一覧を楽観的に更新
      setLocalBoards((prev) => prev.filter((b) => b.id !== deletedId));

      if (swrKey && user?.uid) {
        // SWR キャッシュの boards からも楽観的に削除し、バックグラウンドで再検証
        mutate(
          swrKey,
          (current: { boards?: MypageBoardItem[] } | undefined) => {
            if (!current) return current;
            const prevBoards: MypageBoardItem[] = Array.isArray(current.boards)
              ? current.boards
              : [];
            return {
              ...current,
              boards: prevBoards.filter((b) => b.id !== deletedId),
            };
          },
          { revalidate: true },
        );
      }
    },
    [mutate, swrKey, user?.uid],
  );

  if (localBoards.length === 0) {
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
        items={localBoards.map((b) => b.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {localBoards.map((board) => (
            <SortableBoardCard
              key={board.id}
              board={board}
              onDeleteSuccess={handleDeleteSuccess}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
