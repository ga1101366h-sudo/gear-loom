"use client";

import { X } from "lucide-react";
import { BoardLikeButton } from "@/components/board-like-button";
import { ShareToXButton } from "@/components/share-to-x-button";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface BoardPostActionBarProps {
  postId: string;
  title: string;
  /** マイページお気に入り表示用。実機写真 or キャンバスサムネイルのURL */
  thumbnailUrl?: string | null;
  /** 記事のオーナー（Board.userId = Firebase UID）。シェアテキスト分岐用 */
  ownerId: string | null;
}

/** ボード詳細のアクションバー（いいね・Xシェア） */
export function BoardPostActionBar({
  postId,
  title,
  thumbnailUrl = null,
  ownerId,
}: BoardPostActionBarProps) {
  const { user } = useAuth();
  const isOwner = !!user && !!ownerId && user.uid === ownerId;

  const shareText = isOwner
    ? `${title} を投稿しました！\n#GearLoom\n#エフェクターボード`
    : `${title} | Gear-Loom\n#GearLoom\n#エフェクターボード`;
  const path = `/boards/post/${postId}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
      <BoardLikeButton
        postId={postId}
        title={title}
        thumbnailUrl={thumbnailUrl ?? null}
      />
      {/* Xでポスト（スマホでアイコンが細長くならないよう aspect-square で正方形を維持） */}
      <Button
        variant="outline"
        size="sm"
        asChild
        className="h-10 min-h-10 w-full flex items-center justify-center gap-1.5 rounded-md border border-white/20 bg-zinc-950 px-3 text-xs font-medium text-white whitespace-nowrap shadow-lg shadow-white/5 transition-all hover:bg-zinc-800 col-span-2 sm:col-span-1"
      >
        <ShareToXButton
          path={path}
          text={shareText}
          className="inline-flex h-full w-full min-w-0 items-center justify-center gap-1.5 text-white"
        >
          <span className="inline-flex shrink-0 items-center justify-center w-6 h-6" aria-hidden>
            <X className="w-4 h-4" aria-hidden />
          </span>
          <span className="hidden sm:inline">でポスト</span>
        </ShareToXButton>
      </Button>
    </div>
  );
}
