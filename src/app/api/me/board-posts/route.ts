import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export type MeBoardPostItem = {
  id: string;
  title: string;
  content: string | null;
  updatedAt: string;
  boardId: string;
  boardName: string;
  /** カード用サムネイル画像URL（実機写真 or ギャラリー1枚目） */
  thumbnailUrl: string | null;
};

/**
 * 認証ユーザーが公開投稿した BoardPost 一覧を取得（マイページ「投稿」タブ用）
 * Authorization: Bearer <idToken> 必須
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const posts = await prisma.boardPost.findMany({
      where: {
        isPublic: true,
        board: { userId: uid },
      },
      include: {
        board: { select: { id: true, name: true, actualPhotoUrl: true, thumbnail: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const items: MeBoardPostItem[] = posts.map((p) => {
      let thumbnailUrl: string | null = null;
      if (p.imageUrls) {
        try {
          const arr = JSON.parse(p.imageUrls) as unknown;
          if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "string" && arr[0].trim()) {
            thumbnailUrl = arr[0].trim();
          }
        } catch {
          // ignore
        }
      }
      if (!thumbnailUrl && p.photoUrl?.trim()) thumbnailUrl = p.photoUrl.trim();
      if (!thumbnailUrl && p.board.actualPhotoUrl?.trim()) thumbnailUrl = p.board.actualPhotoUrl.trim();
      if (!thumbnailUrl && p.board.thumbnail?.trim()) thumbnailUrl = p.board.thumbnail.trim();
      return {
        id: p.id,
        title: p.title,
        content: p.content ?? null,
        updatedAt: p.updatedAt.toISOString(),
        boardId: p.board.id,
        boardName: p.board.name,
        thumbnailUrl,
      };
    });

    return NextResponse.json({ boardPosts: items });
  } catch (err) {
    console.error("[api/me/board-posts]", err);
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }
}
