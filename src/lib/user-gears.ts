import { prisma } from "@/lib/prisma";
import type { UserGearItem } from "@/types/gear";

function toUserGearItem(ug: {
  id: string;
  customImageUrl: string | null;
  gear: {
    id: string;
    name: string;
    manufacturer: string | null;
    category: string;
    effectorType: string | null;
    imageUrl: string | null;
    defaultIcon: string | null;
  };
}): UserGearItem {
  const effectiveImageUrl = ug.customImageUrl?.trim() || ug.gear.imageUrl?.trim() || null;
  return {
    userGearId: ug.id,
    id: ug.gear.id,
    name: ug.gear.name,
    manufacturer: ug.gear.manufacturer ?? null,
    category: ug.gear.category,
    effectorType: ug.gear.effectorType ?? null,
    imageUrl: effectiveImageUrl,
    defaultIcon: ug.gear.defaultIcon ?? null,
  };
}

/**
 * 指定ユーザー（Firebase UID）の所有機材を Prisma UserGear から取得する。
 * 公開プロフィール・マイページ・エディタで共通利用。
 */
export async function getGearsByUserId(uid: string): Promise<UserGearItem[]> {
  const userGears = await prisma.userGear.findMany({
    where: { userId: uid },
    include: {
      gear: {
        select: {
          id: true,
          name: true,
          manufacturer: true,
          category: true,
          effectorType: true,
          imageUrl: true,
          defaultIcon: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return userGears.map((ug) => toUserGearItem(ug));
}
