"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CarouselNav,
  ReviewListItem,
  BoardPostListItem,
  EMPTY_SECTION_CLASS,
  CAROUSEL_PAGE_SIZE,
  getFirstReviewImageUrl,
  isContentOnlyCategorySlug,
} from "./mypage-shared";
import { useAuth } from "@/contexts/AuthContext";
import { updateBoardPost, deleteBoardPost } from "@/actions/board-post";
import type { Review } from "@/types/database";

export type MypageBoardPostItem = {
  id: string;
  title: string;
  content: string | null;
  updatedAt: string;
  boardId: string;
  boardName: string;
  thumbnailUrl?: string | null;
};

interface MyPageReviewTabProps {
  myReviews: Review[];
  totalLikes: number;
  mypageBoardPosts?: MypageBoardPostItem[];
  swrKey?: [string, string] | null;
  /** 投稿タブから機材タブへ切り替えるコールバック（エンプティ時の「機材タブで…」ボタン用） */
  onSwitchToGearTab: () => void;
}

export function MyPageReviewTab({
  myReviews,
  totalLikes,
  mypageBoardPosts = [],
  swrKey = null,
  onSwitchToGearTab,
}: MyPageReviewTabProps) {
  const [myReviewsPage, setMyReviewsPage] = useState(0);
  const [boardPostsPage, setBoardPostsPage] = useState(0);
  const { user } = useAuth();
  const { mutate } = useSWRConfig();
  const [editPost, setEditPost] = useState<MypageBoardPostItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletePost, setDeletePost] = useState<MypageBoardPostItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const openEdit = useCallback((post: MypageBoardPostItem) => {
    setEditPost(post);
    setEditTitle(post.title);
    setEditContent(post.content ?? "");
    setEditSubmitting(false);
  }, []);

  const openDelete = useCallback((post: MypageBoardPostItem) => {
    setDeletePost(post);
    setDeleteSubmitting(false);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!user || !editPost) return;
    const title = editTitle.trim();
    if (!title) {
      toast.error("タイトルを入力してください。");
      return;
    }
    setEditSubmitting(true);
    try {
      const token = await user.getIdToken(true);
      // ここではタイトル・本文のみ更新（追加画像は個別編集画面で管理）
      const result = await updateBoardPost(editPost.id, title, editContent.trim(), token);
      if (result.success) {
        toast.success("投稿を更新しました");
        setEditPost(null);
        if (swrKey) mutate(swrKey);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error("[MyPageReviewTab] updateBoardPost", err);
      toast.error("更新に失敗しました。");
    } finally {
      setEditSubmitting(false);
    }
  }, [user, editPost, editTitle, editContent, swrKey, mutate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!user || !deletePost) return;
    setDeleteSubmitting(true);
    try {
      const token = await user.getIdToken(true);
      const result = await deleteBoardPost(deletePost.id, token);
      if (result.success) {
        toast.success("投稿を削除しました");
        setDeletePost(null);
        if (swrKey) mutate(swrKey);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      console.error("[MyPageReviewTab] deleteBoardPost", err);
      toast.error("削除に失敗しました。");
    } finally {
      setDeleteSubmitting(false);
    }
  }, [user, deletePost, swrKey, mutate]);

  return (
    <div className="space-y-12">
      {/* 投稿した機材（レビュー） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">投稿した機材（レビュー）</CardTitle>
          <CardDescription>自分が投稿した機材・レビュー一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {myReviews.length === 0 ? (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-muted-foreground text-sm">まだ投稿がありません。</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {myReviews
                  .slice(
                    myReviewsPage * CAROUSEL_PAGE_SIZE,
                    myReviewsPage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE
                  )
                  .map((r) => {
                    const imageUrl = getFirstReviewImageUrl(r);
                    const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
                    return (
                      <ReviewListItem key={r.id} r={r} imageUrl={imageUrl} showStars={showStars} />
                    );
                  })}
              </ul>
              <CarouselNav
                currentPage={myReviewsPage}
                totalPages={Math.max(1, Math.ceil(myReviews.length / CAROUSEL_PAGE_SIZE))}
                onPrev={() => setMyReviewsPage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setMyReviewsPage((p) =>
                    Math.min(Math.ceil(myReviews.length / CAROUSEL_PAGE_SIZE) - 1, p + 1)
                  )
                }
              />
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/reviews/new">新規投稿</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 投稿したエフェクターボード（投稿した機材・レビューと同じカードUI） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">投稿したエフェクターボード</CardTitle>
          <CardDescription>みんなのボードに公開した投稿の一覧。編集・削除ができます。</CardDescription>
        </CardHeader>
        <CardContent>
          {mypageBoardPosts.length === 0 ? (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-muted-foreground text-sm">まだ投稿がありません。</p>
              <Button variant="outline" size="sm" onClick={onSwitchToGearTab}>
                機材タブでボードを作成し、みんなのボードに投稿
              </Button>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {mypageBoardPosts
                  .slice(
                    boardPostsPage * CAROUSEL_PAGE_SIZE,
                    boardPostsPage * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE
                  )
                  .map((post) => (
                    <BoardPostListItem
                      key={post.id}
                      post={{
                        id: post.id,
                        title: post.title,
                        boardName: post.boardName,
                        updatedAt: post.updatedAt,
                      }}
                      thumbnailUrl={post.thumbnailUrl ?? null}
                      onEdit={() => openEdit(post)}
                      onDelete={() => openDelete(post)}
                    />
                  ))}
              </ul>
              <CarouselNav
                currentPage={boardPostsPage}
                totalPages={Math.max(1, Math.ceil(mypageBoardPosts.length / CAROUSEL_PAGE_SIZE))}
                onPrev={() => setBoardPostsPage((p) => Math.max(0, p - 1))}
                onNext={() =>
                  setBoardPostsPage((p) =>
                    Math.min(Math.ceil(mypageBoardPosts.length / CAROUSEL_PAGE_SIZE) - 1, p + 1)
                  )
                }
              />
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={onSwitchToGearTab}>
                  機材タブでボードを作成し、みんなのボードに投稿
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* レビューにもらったイイね */}
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">レビューにもらったイイね</CardTitle>
          <CardDescription>自分の投稿へのいいね合計</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">
            {totalLikes} <span className="text-gray-500 text-base font-normal ml-1">件</span>
          </p>
        </CardContent>
      </Card>

      {/* 編集モーダル */}
      <Dialog.Root open={!!editPost} onOpenChange={(open) => !open && setEditPost(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-surface-dark p-4 sm:p-6 shadow-xl flex flex-col"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title className="text-lg font-semibold text-white mb-4">投稿を編集</Dialog.Title>
            <Dialog.Description className="sr-only">タイトルと解説を変更して更新します。</Dialog.Description>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-board-post-title">タイトル（必須）</Label>
                <Input
                  id="edit-board-post-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-surface-card border-surface-border text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-board-post-content">解説・こだわりポイント（任意）</Label>
                <textarea
                  id="edit-board-post-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="flex w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue resize-y"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" disabled={editSubmitting}>キャンセル</Button>
              </Dialog.Close>
              <Button type="button" onClick={handleEditSubmit} disabled={editSubmitting}>
                {editSubmitting ? "更新中..." : "更新する"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 削除確認モーダル */}
      <Dialog.Root open={!!deletePost} onOpenChange={(open) => !open && setDeletePost(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-surface-dark p-4 sm:p-6 shadow-xl flex flex-col"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title className="text-lg font-semibold text-white mb-2">投稿を削除しますか？</Dialog.Title>
            <Dialog.Description className="text-sm text-gray-400 mb-6">
              {deletePost && `「${deletePost.title}」を削除すると、みんなのボード一覧から非表示になります。この操作は取り消せません。`}
            </Dialog.Description>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" disabled={deleteSubmitting}>キャンセル</Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="outline"
                className="text-red-400 hover:text-red-300"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? "削除中..." : "削除する"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
