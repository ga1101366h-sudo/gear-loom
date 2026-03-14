"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getBoardById, type BoardData } from "@/actions/board";
import { publishBoardPost } from "@/actions/board-post";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CameraOff, GitMerge, Network } from "lucide-react";
import toast from "react-hot-toast";

function BoardPreview({
  board,
  onExpandImage,
}: {
  board: BoardData;
  onExpandImage: (url: string) => void;
}) {
  const { thumbnail, actualPhotoUrl } = board;
  return (
    <div className="flex flex-col w-full space-y-8">
      <div className="w-full">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200 border-l-4 border-cyan-500 pl-3 mb-4">
          <Camera className="w-5 h-5 text-cyan-500 shrink-0" aria-hidden />
          実機写真
        </h3>
        {actualPhotoUrl ? (
          <div
            className="relative aspect-video w-full rounded-xl overflow-hidden border border-surface-border cursor-pointer transition-opacity hover:opacity-90"
            role="button"
            tabIndex={0}
            onClick={() => onExpandImage(actualPhotoUrl)}
            onKeyDown={(e) => e.key === "Enter" && onExpandImage(actualPhotoUrl)}
            aria-label="実機写真を拡大表示"
          >
            <Image
              src={actualPhotoUrl}
              alt="実機写真"
              fill
              className="object-cover"
              unoptimized={actualPhotoUrl.startsWith("data:") || actualPhotoUrl.startsWith("/")}
              sizes="100vw"
            />
          </div>
        ) : (
          <div className="aspect-video w-full rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 flex flex-col items-center justify-center text-gray-500">
            <CameraOff className="w-12 h-12 mb-3 opacity-50 shrink-0" aria-hidden />
            <p className="text-sm font-medium text-gray-400">実機写真が未登録です</p>
            <p className="text-xs mt-1 text-gray-500">エディタ画面から登録できます</p>
          </div>
        )}
      </div>
      <div className="w-full">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200 border-l-4 border-cyan-500 pl-3 mb-4">
          <GitMerge className="w-5 h-5 text-cyan-500 shrink-0" aria-hidden />
          配線図
        </h3>
        {thumbnail ? (
          <div
            className="relative aspect-video w-full rounded-xl overflow-hidden border border-surface-border cursor-pointer transition-opacity hover:opacity-90"
            role="button"
            tabIndex={0}
            onClick={() => onExpandImage(thumbnail)}
            onKeyDown={(e) => e.key === "Enter" && onExpandImage(thumbnail)}
            aria-label="配線図を拡大表示"
          >
            <Image
              src={thumbnail}
              alt="配線図"
              fill
              className="object-cover"
              unoptimized={thumbnail.startsWith("data:")}
              sizes="100vw"
            />
          </div>
        ) : (
          <div className="aspect-video w-full rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/50 flex flex-col items-center justify-center text-gray-500">
            <Network className="w-12 h-12 mb-3 opacity-50 shrink-0" aria-hidden />
            <p className="text-sm font-medium text-gray-400">配線図が未登録です</p>
            <p className="text-xs mt-1 text-gray-500">ボードを保存すると自動で生成されます</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostBoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardId = searchParams.get("boardId");
  const { user, loading: authLoading } = useAuth();
  const [board, setBoard] = useState<BoardData | null | undefined>(undefined);
  const [title, setTitle] = useState("私のエフェクターボード");
  const [content, setContent] = useState("");
  const [postToX, setPostToX] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId?.trim()) {
      setBoard(null);
      return;
    }
    let cancelled = false;
    getBoardById(boardId.trim()).then((data) => {
      if (!cancelled) setBoard(data ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !boardId?.trim()) return;
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        toast.error("記事タイトルを入力してください。");
        return;
      }
      setIsSubmitting(true);
      try {
        const token = await user.getIdToken(true);
        const photoUrl = board?.actualPhotoUrl ?? null;
        const result = await publishBoardPost(
          boardId.trim(),
          trimmedTitle,
          content.trim(),
          photoUrl,
          postToX,
          token
        );
        if (result.success) {
          toast.success("投稿しました！");
          const baseUrl =
            typeof window !== "undefined" ? window.location.origin : "";
          const postUrl = `${baseUrl}/boards/post/${result.postId}`;
          if (postToX) {
            const tweetText = `${trimmedTitle}を公開しました！\n#エフェクターボード\n#GearLoom\n${postUrl}`;
            const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            window.open(shareUrl, "_blank", "noopener,noreferrer");
          }
          router.push(`/boards/post/${result.postId}`);
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "投稿に失敗しました");
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, boardId, title, content, postToX, board?.actualPhotoUrl, router]
  );

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center text-gray-400">読み込み中...</CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-400 mb-4">投稿するにはログインしてください。</p>
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent("/post/board" + (boardId ? `?boardId=${encodeURIComponent(boardId)}` : ""))}`}>
                ログイン
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!boardId?.trim()) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-400 mb-4">ボードを選択してください。</p>
            <Button variant="outline" asChild>
              <Link href="/mypage">マイページへ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (board === undefined) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center text-gray-400">ボードを読み込み中...</CardContent>
        </Card>
      </div>
    );
  }

  if (board === null) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-400 mb-4">ボードが見つかりません。</p>
            <Button variant="outline" asChild>
              <Link href="/mypage">マイページへ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-8">
        <span className="inline-block bg-cyan-500/10 text-cyan-400 text-xs px-2 py-1 rounded-md font-medium mb-2">
          選択中のボード
        </span>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight mb-6">{board.name}</h1>
        <BoardPreview board={board} onExpandImage={setExpandedImage} />
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6 p-6">
          <div className="space-y-2">
            <Label htmlFor="board-post-title">記事タイトル（必須）</Label>
            <Input
              id="board-post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: メインのペダルボード"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-post-content">解説コメント（任意）</Label>
            <textarea
              id="board-post-content"
              className="flex min-h-[100px] w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="このボードのポイントや使用機材の説明など"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="board-post-x"
              checked={postToX}
              onChange={(e) => setPostToX(e.target.checked)}
              className="rounded border-gray-600"
            />
            <Label htmlFor="board-post-x" className="cursor-pointer text-gray-300">
              同時にX (Twitter) でシェアする
            </Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "投稿中..." : "投稿する"}
            </Button>
            <Button type="button" variant="outline" asChild disabled={isSubmitting}>
              <Link href="/mypage">キャンセル</Link>
            </Button>
          </div>
        </Card>
      </form>

      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpandedImage(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setExpandedImage(null)}
          aria-label="拡大画像を閉じる"
        >
          <img
            src={expandedImage}
            alt="拡大表示"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
