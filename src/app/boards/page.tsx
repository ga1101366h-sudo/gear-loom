import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getProfilesByUids } from "@/lib/firebase/data";
import { shouldUnoptimizeFirebaseStorage } from "@/lib/image-optimization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export default async function BoardsPage() {
  const posts = await prisma.boardPost.findMany({
    where: { isPublic: true },
    include: {
      board: {
        include: { user: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const uniqueUids = [...new Set(posts.map((p) => p.board?.userId).filter(Boolean))] as string[];
  const profileMap = await getProfilesByUids(uniqueUids);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-white mb-6">
        みんなのエフェクターボード
      </h1>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <p className="mb-2">
              まだ投稿されたボードはありません。最初のボードを投稿してみましょう！
            </p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/mypage">マイページへ</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const board = post.board;
            const uid = board?.userId;
            const profile = uid ? profileMap.get(uid) : undefined;
            const authorLabel =
              profile?.display_name?.trim() ||
              profile?.user_id?.trim() ||
              (board?.user
                ? (board.user.displayName?.trim() || board.user.email?.trim() || "名無しユーザー")
                : "名無しユーザー");
            const authorAvatarUrl = profile?.avatar_url?.trim() || null;
            const title = post.title?.trim() || board?.name?.trim() || "無題";
            const updatedAt = post.updatedAt;
            const actualPhotoUrl =
              board?.actualPhotoUrl?.trim() || post.photoUrl?.trim() || null;
            const hasActual = Boolean(actualPhotoUrl);
            const hasThumbnail = Boolean(board?.thumbnail?.trim());

            return (
              <Link
                key={post.id}
                href={`/boards/post/${encodeURIComponent(post.id)}`}
                className="group flex flex-col rounded-xl border border-surface-border bg-white/[0.03] overflow-hidden text-left transition-colors hover:border-cyan-500/50"
              >
                <div className="relative aspect-video w-full bg-[#0a0a0a] shrink-0 overflow-hidden">
                  {hasActual && hasThumbnail ? (
                    <div className="flex w-full h-full" data-testid="board-card-split">
                      <div className="relative w-1/2 h-full">
                        <Image
                          src={actualPhotoUrl!}
                          alt="実機写真"
                          fill
                          className="object-cover group-hover:opacity-90 transition-opacity"
                          unoptimized={shouldUnoptimizeFirebaseStorage(actualPhotoUrl!)}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                      <div className="relative w-1/2 h-full border-l border-surface-border">
                        <Image
                          src={board!.thumbnail!}
                          alt="配線図"
                          fill
                          className="object-cover group-hover:opacity-90 transition-opacity"
                          unoptimized={shouldUnoptimizeFirebaseStorage(board!.thumbnail!)}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    </div>
                  ) : hasActual ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={actualPhotoUrl!}
                        alt="実機写真"
                        fill
                        className="object-cover group-hover:opacity-90 transition-opacity"
                        unoptimized={shouldUnoptimizeFirebaseStorage(actualPhotoUrl!)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  ) : hasThumbnail ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={board!.thumbnail!}
                        alt="配線図"
                        fill
                        className="object-cover group-hover:opacity-90 transition-opacity"
                        unoptimized={shouldUnoptimizeFirebaseStorage(board!.thumbnail!)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex w-full h-full items-center justify-center bg-gray-800 text-gray-500 text-xs">
                      実機写真や配線図を登録すると、ボード構成と音作りの意図がここに表示されます。
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-1 flex-1 min-w-0">
                  <span className="font-medium text-white truncate">{title}</span>
                  <span className="text-xs text-gray-500">
                    更新:{" "}
                    {new Date(updatedAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </span>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    {authorAvatarUrl ? (
                      <span className="relative inline-block w-5 h-5 shrink-0 rounded-full overflow-hidden bg-surface-card">
                        <Image
                          src={authorAvatarUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="20px"
                          unoptimized
                        />
                      </span>
                    ) : (
                      <span
                        className="w-5 h-5 shrink-0 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-[10px] font-semibold"
                        aria-hidden
                      >
                        {authorLabel.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 truncate">{authorLabel}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link href="/">トップに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
