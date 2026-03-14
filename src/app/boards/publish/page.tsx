"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { publishBoardPost } from "@/actions/board-post";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import toast from "react-hot-toast";

type SelectableBoard = {
  id: string;
  name: string;
  thumbnail: string | null;
  actualPhotoUrl: string | null;
  updatedAt: string;
};

function BoardsPublishContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBoardId = searchParams.get("boardId");

  const [boards, setBoards] = useState<SelectableBoard[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [title, setTitle] = useState("私のエフェクターボード");
  const [content, setContent] = useState("");
  const [postToX, setPostToX] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setBoards([]);
      setBoardsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken(true);
        const res = await fetch("/api/me/boards", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          setBoards([]);
          return;
        }
        const json = (await res.json()) as { boards?: SelectableBoard[] };
        const list = Array.isArray(json.boards) ? json.boards : [];
        if (!cancelled) {
          const sorted = list
            .slice()
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          setBoards(sorted);
          setBoardsLoading(false);
          if (sorted.length > 0) {
            const found = sorted.find((b) => b.id === initialBoardId);
            setSelectedBoardId(found ? found.id : sorted[0].id);
          } else {
            setSelectedBoardId(null);
          }
        }
      } catch {
        if (!cancelled) {
          setBoards([]);
          setBoardsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, initialBoardId]);

  const selectedBoard = useMemo(
    () => boards.find((b) => b.id === selectedBoardId) ?? null,
    [boards, selectedBoardId]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !selectedBoard) return;
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        toast.error("タイトルを入力してください。");
        return;
      }
      setSubmitting(true);
      try {
        const token = await user.getIdToken(true);
        const photoUrl = selectedBoard.actualPhotoUrl ?? null;
        const result = await publishBoardPost(
          selectedBoard.id,
          trimmedTitle,
          content.trim(),
          photoUrl,
          postToX,
          token
        );
        if (result.success) {
          toast.success("ボードを公開しました！");
          const baseUrl =
            typeof window !== "undefined" ? window.location.origin : "";
          const postUrl = `${baseUrl}/boards/post/${result.postId}`;
          if (postToX) {
            const tweetText = `${trimmedTitle}を公開しました！\n#エフェクターボード\n#GearLoom\n${postUrl}`;
            const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            window.open(shareUrl, "_blank", "noopener,noreferrer");
          }
          router.push("/boards");
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "投稿に失敗しました"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [user, selectedBoard, title, content, postToX, router]
  );

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

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-gray-400">
              エフェクターボードを投稿するにはログインしてください。
            </p>
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent("/boards/publish")}`}>
                ログイン
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (boardsLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            ボードを読み込み中...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          エフェクターボードを投稿
        </h1>
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-gray-300 text-sm sm:text-base">
              まだ保存されたエフェクターボードがありません。
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              まずはエディタを開いてボードを作成し、「保存」してから投稿しましょう。
            </p>
            <Button asChild className="mt-2">
              <Link href="/board/editor">エディタを開いてボードを作成する</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          エフェクターボードを投稿
        </h1>
        <p className="text-sm text-gray-400">
          マイページで保存したボードを選び、タイトルと解説を付けて
          「みんなのエフェクターボード」に公開します。
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="board-select">投稿するボード（必須）</Label>
          <select
            id="board-select"
            value={selectedBoardId ?? ""}
            onChange={(e) =>
              setSelectedBoardId(e.target.value || null)
            }
            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-electric-blue"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}（更新:{" "}
                {new Date(b.updatedAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
                ）
              </option>
            ))}
          </select>
        </div>

        {selectedBoard && (
          <div className="flex flex-col sm:flex-row gap-4 border border-surface-border/60 rounded-lg bg-surface-card/40 p-3">
            {selectedBoard.actualPhotoUrl && (
              <div className="relative aspect-video w-full sm:w-1/2 rounded-md overflow-hidden bg-black border border-surface-border">
                <Image
                  src={selectedBoard.actualPhotoUrl}
                  alt="実機写真"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
            )}
            {selectedBoard.thumbnail && (
              <div className="relative aspect-video w-full sm:w-1/2 rounded-md overflow-hidden bg-black border border-surface-border">
                <Image
                  src={selectedBoard.thumbnail}
                  alt="配線図"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
            )}
            {!selectedBoard.actualPhotoUrl && !selectedBoard.thumbnail && (
              <p className="text-xs text-gray-400">
                このボードにはまだ画像が登録されていません。エディタから実機写真または配線図を保存すると、ここに表示されます。
              </p>
            )}
          </div>
        )}
      </Card>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6 p-6">
          <div className="space-y-2">
            <Label htmlFor="board-publish-title">タイトル（必須）</Label>
            <Input
              id="board-publish-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: メインのペダルボード"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-publish-content">
              ボードの解説・こだわりポイント（任意）
            </Label>
            <textarea
              id="board-publish-content"
              className="flex min-h-[100px] w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="このボードのポイントや使用機材の説明など"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="board-publish-x"
              checked={postToX}
              onChange={(e) => setPostToX(e.target.checked)}
              className="rounded border-gray-600"
            />
            <Label htmlFor="board-publish-x" className="cursor-pointer text-gray-300">
              同時にX (Twitter) でシェアする
            </Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting || !selectedBoard}>
              {submitting ? "公開中..." : "公開する"}
            </Button>
            <Button type="button" variant="outline" asChild disabled={submitting}>
              <Link href="/mypage">キャンセル</Link>
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default function BoardsPublishPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-8">
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              読み込み中...
            </CardContent>
          </Card>
        </div>
      }
    >
      <BoardsPublishContent />
    </Suspense>
  );
}

