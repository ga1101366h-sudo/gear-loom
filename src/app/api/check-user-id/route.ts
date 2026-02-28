import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";

const USER_ID_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id")?.trim().toLowerCase();

    if (!user_id) {
      return NextResponse.json({ available: false, error: "user_id required" }, { status: 400 });
    }

    if (!USER_ID_REGEX.test(user_id)) {
      return NextResponse.json({
        available: false,
        error: "ユーザーIDは3〜30文字の半角英数字・アンダースコアのみ使用できます。",
      }, { status: 400 });
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json(
        { available: false, error: "確認中にエラーが発生しました。Firebase の設定を確認してください。" },
        { status: 500 }
      );
    }

    const snap = await db
      .collection("profiles")
      .where("user_id", "==", user_id)
      .limit(1)
      .get();

    return NextResponse.json({ available: snap.empty });
  } catch (err) {
    console.error("[check-user-id]", err);
    return NextResponse.json(
      { available: false, error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}
