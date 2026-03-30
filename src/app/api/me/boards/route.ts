import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

/**
 * 認証ユーザー自身の保存済みエフェクターボード一覧を取得（最新更新順）
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

    const boards = await prisma.board.findMany({
      where: { userId: uid },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        thumbnail: true,
        actualPhotoUrl: true,
        nodes: true,
        edges: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      boards: boards.map((b) => ({
        id: b.id,
        name: b.name,
        thumbnail: b.thumbnail ?? null,
        actualPhotoUrl: b.actualPhotoUrl ?? null,
        nodes: b.nodes ?? null,
        edges: b.edges ?? null,
        updatedAt: b.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[api/me/boards]", err);
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }
}
