"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
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
import imageCompression from "browser-image-compression";
import { GripVertical, X as XIcon, ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateBoardPost, deleteBoardPost } from "@/actions/board-post";
import toast from "react-hot-toast";

type BoardPostEditFormProps = {
  postId: string;
  ownerId: string;
  initialTitle: string;
  initialContent: string;
  /** 追加画像の初期URL一覧（BoardPost.extraImages などから供給） */
  initialImageUrls: string[];
  /** 相対URLを解決するためのオリジン（例: https://www.gear-loom.com） */
  siteOrigin: string;
};

export function BoardPostEditForm({
  postId,
  ownerId,
  initialTitle,
  initialContent,
  initialImageUrls,
  siteOrigin,
}: BoardPostEditFormProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageItems, setImageItems] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  });
  const sensors = useSensors(pointerSensor);

  // サーバーから渡された追加画像URL配列を、必ずクライアント側の初期ステートに反映する
  useEffect(() => {
    setImageItems(
      (initialImageUrls ?? []).map((url, idx) => ({
        id: `${idx}-${url}`,
        url,
      })),
    );
  }, [initialImageUrls]);

  // 所有者チェック：本人以外は一覧にリダイレクト
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.uid !== ownerId) {
      router.replace("/boards");
    }
  }, [authLoading, user, ownerId, router]);

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImageItems((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleImagesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !user) return;

    setUploading(true);
    try {
      const token = await user.getIdToken(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        try {
          const compressed = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            exifOrientation: 1,
          });
          const formData = new FormData();
          formData.append("image", compressed, file.name || "image.jpg");
          const res = await fetch("/api/board-post/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
          }
          if (data.url) uploadedUrls.push(data.url);
        } catch (err) {
          console.error("[BoardPostEditForm] image upload error", err);
          const msg = err instanceof Error ? err.message : "画像のアップロードに失敗しました。";
          toast.error(msg);
        }
      }
      if (uploadedUrls.length > 0) {
        setImageItems((prev) => [
          ...prev,
          ...uploadedUrls.map((url) => ({
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${url}`,
            url,
          })),
        ]);
        toast.success("画像を追加しました。更新ボタンで保存されます。");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("タイトルを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken(true);
      const result = await updateBoardPost(
        postId,
        trimmedTitle,
        content.trim(),
        token,
        imageItems.map((item) => item.url),
      );
      if (result.success) {
        toast.success("投稿を更新しました。");
        router.push(`/boards/post/${postId}`);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!window.confirm("このボードの記事を削除しますか？")) return;

    setDeleting(true);
    try {
      const token = await user.getIdToken(true);
      const result = await deleteBoardPost(postId, token);
      if (result.success) {
        toast.success("投稿を削除しました。");
        router.push("/boards");
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            読み込み中...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <a href={`/boards/post/${postId}`}>← 詳細に戻る</a>
        </Button>
      </div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              ボード記事を編集
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              タイトルと解説文を編集したあと、「更新する」で保存します。
            </p>
          </div>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="board-edit-title">タイトル（必須）</Label>
              <Input
                id="board-edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-edit-content">
                ボードの解説・こだわりポイント（任意）
              </Label>
              <textarea
                id="board-edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue resize-y"
                placeholder="このボードのポイントや使用機材の説明など"
              />
            </div>
            <div className="space-y-2">
              <Label>追加画像（任意・複数可）</Label>
              <p className="text-xs text-gray-500">
                一番上の画像が優先的に表示されます。ドラッグ＆ドロップで順番を入れ替えられます。
              </p>
              {imageItems.length > 0 && (
                <DndContext
                  sensors={sensors}
                  onDragEnd={handleImageDragEnd}
                >
                  <SortableContext
                    items={imageItems.map((item) => item.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {imageItems.map((item) => (
                        <SortableImageCard
                          key={item.id}
                          id={item.id}
                          url={item.url}
                          siteOrigin={siteOrigin}
                          onRemove={() =>
                            setImageItems((prev) =>
                              prev.filter((p) => p.id !== item.id),
                            )
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleImagesSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" aria-hidden />
                  <span>画像を追加する</span>
                </Button>
                {uploading && (
                  <span className="text-xs text-gray-400">
                    画像をアップロード中です…
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "更新中..." : "更新する"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "削除中..." : "投稿を削除する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

type SortableImageCardProps = {
  id: string;
  url: string;
  siteOrigin: string;
  onRemove: () => void;
};

function SortableImageCard({ id, url, siteOrigin, onRemove }: SortableImageCardProps) {
  const displayUrl = url.startsWith("/") ? `${siteOrigin}${url}` : url;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 40 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg border border-surface-border bg-surface-card overflow-hidden group ${
        isDragging ? "ring-2 ring-electric-blue shadow-xl" : ""
      }`}
    >
      <button
        type="button"
        className="absolute top-1 left-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-gray-200 hover:bg-black/80 cursor-grab active:cursor-grabbing"
        aria-label="並び替え"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" aria-hidden />
      </button>
      <div className="relative w-full h-28 sm:h-32 bg-slate-900/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayUrl}
          alt=""
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const parent = e.currentTarget.closest(".relative");
            if (parent && !parent.querySelector(".board-post-edit-img-fallback")) {
              const fallback = document.createElement("span");
              fallback.className = "board-post-edit-img-fallback absolute inset-0 flex items-center justify-center text-xs text-gray-500";
              fallback.textContent = "画像を表示できません";
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="この画像を削除"
      >
        <XIcon className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}


