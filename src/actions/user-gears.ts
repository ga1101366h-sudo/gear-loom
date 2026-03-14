"use server";

import { revalidatePath } from "next/cache";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export type UpdateGearOrderResult = { success: true } | { success: false; error: string };

/**
 * 所有機材の並び順を更新する。userGearIds の並び順で sortOrder を 0, 1, 2... に設定する。本人の UserGear のみ。
 */
export async function updateGearOrder(
  userGearIds: string[],
  idToken: string
): Promise<UpdateGearOrderResult> {
  const auth = getAdminAuth();
  if (!auth) {
    return { success: false, error: "サーバー設定エラー" };
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error("[updateGearOrder] Token verification failed:", err);
    return { success: false, error: "認証に失敗しました。再度ログインしてください。" };
  }

  if (!Array.isArray(userGearIds) || userGearIds.length === 0) {
    return { success: true };
  }

  const trimmedIds = userGearIds.filter(
    (id): id is string => typeof id === "string" && id.trim() !== ""
  ).map((id) => id.trim());

  try {
    const owned = await prisma.userGear.findMany({
      where: { userId: uid, id: { in: trimmedIds } },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((ug) => ug.id));
    const orderMap = new Map(
      trimmedIds
        .map((id, index) => [id, index] as const)
        .filter(([id]) => ownedIds.has(id))
    );

    await prisma.$transaction(
      Array.from(orderMap.entries()).map(([id, sortOrder]) =>
        prisma.userGear.update({
          where: { id },
          data: { sortOrder },
        })
      )
    );
    revalidatePath("/mypage");
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error("[updateGearOrder] Database error:", err);
    return { success: false, error: "並び順の更新に失敗しました。" };
  }
}
