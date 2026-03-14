import { prisma } from "@/lib/prisma";

export type PublicBoardItem = {
  id: string;
  name: string;
  thumbnail: string | null;
  actualPhotoUrl: string | null;
  updatedAt: string;
};

const boardSelect = {
  id: true,
  name: true,
  thumbnail: true,
  actualPhotoUrl: true,
  updatedAt: true,
} as const;

const boardOrderBy = [{ sortOrder: "asc" as const }, { updatedAt: "desc" as const }];

function mapBoardsToPublic(boards: { id: string; name: string; thumbnail: string | null; actualPhotoUrl: string | null; updatedAt: Date }[]) {
  return boards.map((b) => ({
    id: b.id,
    name: b.name,
    thumbnail: b.thumbnail ?? null,
    actualPhotoUrl: b.actualPhotoUrl ?? null,
    updatedAt: b.updatedAt.toISOString(),
  }));
}

/**
 * 指定ユーザー（Firebase uid）の公開済みボード一覧を取得（公開プロフィール用）。
 * 紐づく BoardPost が存在し、かつ isPublic が true のボードのみ返す。下書きの露出防止のため全件取得のフォールバックは行わない。
 */
export async function getPublishedBoardsByUserUid(
  userUid: string
): Promise<PublicBoardItem[]> {
  if (!userUid?.trim()) return [];
  const uid = userUid.trim();
  try {
    const boards = await prisma.board.findMany({
      where: {
        userId: uid,
        posts: { some: { isPublic: true } },
      },
      orderBy: boardOrderBy,
      select: boardSelect,
    });
    return mapBoardsToPublic(boards);
  } catch (err) {
    console.error("[getPublishedBoardsByUserUid]", err);
    return [];
  }
}
