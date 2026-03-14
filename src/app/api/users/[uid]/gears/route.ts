import { NextResponse } from "next/server";
import { getGearsByUserId } from "@/lib/user-gears";

/**
 * 指定ユーザー（Firebase UID）の所有機材を返す。認証不要（公開プロフィール用）。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ error: "uid が必要です。" }, { status: 400 });
  }

  try {
    const items = await getGearsByUserId(uid);
    return NextResponse.json(items);
  } catch (err) {
    console.error("🗄️ [GET /api/users/[uid]/gears] Database Error:", err);
    return NextResponse.json(
      { error: "機材一覧の取得に失敗しました。" },
      { status: 500 },
    );
  }
}
