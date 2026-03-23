import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProfilesByUids } from "@/lib/firebase/data";
import { BoardPostActionBar } from "@/components/board-post-action-bar";
import { BoardImagesViewer } from "@/components/board-images-viewer";
import { BoardPostExtraImages } from "@/components/board-post-extra-images";
import { BoardFlowReadonly } from "@/components/board-flow-readonly";
import { BoardOwnerActions } from "@/components/board-owner-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { isFirebaseStorageHttpsUrl, toOgProxyImageUrl } from "@/lib/og-proxy";

export const revalidate = 120;

function getRequestOrigin(): string {
  return "https://www.gear-loom.com";
}

type Props = { params: Promise<{ id: string }> };

/** X・Facebook 等でシェア時に画像プレビューを表示するため、動的OG画像URLを明示的に指定 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.boardPost.findUnique({
    where: { id },
    include: { board: { include: { user: true } } },
  });
  if (!post) return { title: "エフェクターボード | Gear-Loom" };
  const title =
    post.title?.trim() || post.board?.name?.trim() || "エフェクターボード";
  const description =
    post.content?.slice(0, 120) ||
    "Gear-Loomで共有されたエフェクターボードの投稿です。";
  const origin = getRequestOrigin();
  const url = `${origin}/boards/post/${id}`;
  const board = post.board;
  const primaryImage =
    board?.actualPhotoUrl?.trim() || board?.thumbnail?.trim() || null;
  const ogImageUrl =
    primaryImage &&
    primaryImage.startsWith("https://") &&
    isFirebaseStorageHttpsUrl(primaryImage)
      ? toOgProxyImageUrl(origin, primaryImage)
      : `${origin}/boards/post/${id}/opengraph-image`;

  return {
    title: `${title} | Gear-Loom`,
    description,
    openGraph: {
      title: `${title} | Gear-Loom`,
      description,
      url,
      siteName: "Gear-Loom",
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Gear-Loom`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function BoardPostDetailPage({ params }: Props) {
  const { id } = await params;
  const post = await prisma.boardPost.findUnique({
    where: { id },
    include: { board: { include: { user: true } } },
  });
  if (!post || !post.isPublic) notFound();

  const board = post.board;
  const userId = board?.userId;
  let authorDisplayName = "名無しユーザー";
  let authorUserId: string | null = null;
  let authorAvatarUrl: string | null = null;
  if (userId) {
    try {
      const profileMap = await getProfilesByUids([userId]);
      const profile = profileMap.get(userId);
      authorDisplayName =
        profile?.display_name?.trim() ||
        profile?.user_id?.trim() ||
        board?.user?.displayName?.trim() ||
        board?.user?.email?.trim() ||
        "名無しユーザー";
      authorUserId = profile?.user_id?.trim() ?? userId;
      authorAvatarUrl = profile?.avatar_url?.trim() ?? null;
    } catch {
      authorDisplayName =
        board?.user?.displayName?.trim() ||
        board?.user?.email?.trim() ||
        "名無しユーザー";
      authorUserId = userId;
    }
  } else if (board?.user) {
    authorDisplayName =
      board.user.displayName?.trim() ||
      board.user.email?.trim() ||
      "名無しユーザー";
  }

  // 1. ギャラリー画像（BoardPost.imageUrls）は「追加画像」としてのみ扱う
  let galleryImageUrls: string[] = [];
  if (post.imageUrls) {
    try {
      const parsed = JSON.parse(post.imageUrls) as unknown;
      if (Array.isArray(parsed)) {
        galleryImageUrls = parsed
          .map((u) => (typeof u === "string" ? u.trim() : ""))
          .filter((u) => u.length > 0);
      }
    } catch {
      galleryImageUrls = [];
    }
  }

  // 2. 実機写真の表示条件
  const actualPhotoUrl = board?.actualPhotoUrl?.trim();
  const hasActualPhoto = Boolean(actualPhotoUrl);

  // 3. 配線図（インタラクティブ）の表示条件（nodes または edges のどちらかがあれば表示）
  let hasFlowData = false;
  if (board && (board.nodes != null || board.edges != null)) {
    try {
      const parsedNodes: unknown[] = [];
      const parsedEdges: unknown[] = [];
      if (board.nodes && typeof board.nodes === "string" && board.nodes.trim()) {
        const n = JSON.parse(board.nodes) as unknown;
        if (Array.isArray(n)) parsedNodes.push(...n);
      }
      if (board.edges && typeof board.edges === "string" && board.edges.trim()) {
        const e = JSON.parse(board.edges) as unknown;
        if (Array.isArray(e)) parsedEdges.push(...e);
      }
      if (parsedNodes.length > 0 || parsedEdges.length > 0) {
        hasFlowData = true;
      }
    } catch {
      hasFlowData = false;
    }
  }

  const title = post.title?.trim() || board?.name?.trim() || "エフェクターボード";
  const thumbnailUrl =
    (board?.actualPhotoUrl?.trim() || board?.thumbnail?.trim()) ?? null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">← トップ</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/boards">みんなのエフェクターボード</Link>
        </Button>
        <BoardOwnerActions postId={post.id} ownerId={userId ?? null} />
      </div>

      <Card className="border border-surface-border/80 bg-surface-card/80 overflow-hidden">
        <CardHeader className="space-y-4 border-b border-surface-border/80">
          <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            {title}
          </h1>
          {/* アクションバー（いいね・Xでポスト） */}
          <BoardPostActionBar
            postId={post.id}
            title={title}
            thumbnailUrl={thumbnailUrl}
            ownerId={userId ?? null}
          />
          {(userId || board?.user) && (
            <div className="flex items-center gap-3 pt-2">
              {userId ? (
                <Link
                  href={`/users/${encodeURIComponent(userId)}`}
                  className="flex items-center gap-3 rounded-md transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  aria-label={`${authorDisplayName}さんのプロフィールへ`}
                >
                  {authorAvatarUrl ? (
                    <span className="relative inline-block h-9 w-9 shrink-0 rounded-full overflow-hidden bg-surface-card border border-surface-border">
                      <Image
                        src={authorAvatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                        unoptimized
                      />
                    </span>
                  ) : (
                    <div
                      className="h-9 w-9 shrink-0 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-semibold text-sm"
                      aria-hidden
                    >
                      {authorDisplayName.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <span
                    className="text-sm text-electric-blue hover:underline transition-colors"
                    style={{ textShadow: "0 0 8px rgba(0, 212, 255, 0.5)" }}
                  >
                    {authorUserId
                      ? `${authorDisplayName} @${authorUserId}`
                      : authorDisplayName}
                  </span>
                </Link>
              ) : (
                <>
                  {authorAvatarUrl ? (
                    <span className="relative inline-block h-9 w-9 shrink-0 rounded-full overflow-hidden bg-surface-card border border-surface-border">
                      <Image
                        src={authorAvatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                        unoptimized
                      />
                    </span>
                  ) : (
                    <div
                      className="h-9 w-9 shrink-0 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-semibold text-sm"
                      aria-hidden
                    >
                      {authorDisplayName.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <span className="text-sm text-gray-300">{authorDisplayName}</span>
                </>
              )}
              <span className="text-sm text-gray-500">
                {new Date(post.updatedAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-8">
          {hasActualPhoto && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                実機写真
              </h2>
              <BoardImagesViewer actualPhotoUrl={actualPhotoUrl!} thumbnailUrl={null} />
            </section>
          )}

          {hasFlowData && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                配線図（インタラクティブ）
              </h2>
              <BoardFlowReadonly nodesJson={board!.nodes} edgesJson={board!.edges} />
            </section>
          )}

          {post.content?.trim() ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                解説
              </h2>
              <div className="text-sm md:text-base text-gray-100 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
