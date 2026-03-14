import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 指定ユーザーの「公開済み」ボード一覧を取得（公開プロフィールの機材タブ用）。
 * 認証不要。紐づく BoardPost が存在し isPublic === true のボードのみ返す。
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params;
    if (!uid?.trim()) {
      return NextResponse.json({ error: "uid が必要です" }, { status: 400 });
    }

    const boards = await prisma.board.findMany({
      where: {
        userId: uid.trim(),
        posts: { some: { isPublic: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        thumbnail: true,
        actualPhotoUrl: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      boards: boards.map((b) => ({
        id: b.id,
        name: b.name,
        thumbnail: b.thumbnail ?? null,
        actualPhotoUrl: b.actualPhotoUrl ?? null,
        updatedAt: b.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[GET /api/users/[uid]/boards]", err);
    return NextResponse.json(
      { error: "ボードの取得に失敗しました" },
      { status: 500 }
    );
  }
}
