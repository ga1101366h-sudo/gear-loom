import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1]?.trim() ?? null;
  }
  if (
    token == null ||
    token === "" ||
    token === "undefined" ||
    token === "null"
  ) {
    return null;
  }
  return token;
}

/**
 * 所有機材を1件削除する。本人の UserGear のみ削除可能。
 * Authorization: Bearer <idToken> 必須
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userGearId: string }> },
) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "有効な認証トークンが提供されていません。" },
      { status: 401 },
    );
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    console.error("🔥 Token Verification Error:", err);
    return NextResponse.json(
      { error: "トークンの検証に失敗しました。" },
      { status: 401 },
    );
  }

  try {
    const { userGearId } = await params;

    const userGear = await prisma.userGear.findFirst({
      where: { id: userGearId, userId: uid },
    });
    if (!userGear) {
      return NextResponse.json({ error: "対象の所有機材が見つかりません。" }, { status: 404 });
    }

    await prisma.userGear.delete({ where: { id: userGearId } });
    revalidatePath("/");
    revalidatePath("/mypage");
    revalidatePath("/profile");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("🗄️ Database Error:", err);
    return NextResponse.json(
      { error: "データベースの処理に失敗しました。" },
      { status: 500 },
    );
  }
}
