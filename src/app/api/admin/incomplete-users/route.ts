import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";

export type IncompleteUserItem = {
  uid: string;
  email: string | null;
  display_name: string | null;
};

export async function GET(request: Request) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snap = await db.collection("profiles").get();
    const result: IncompleteUserItem[] = snap.docs
      .filter((d) => {
        const data = d.data();
        const userId = (data.user_id as string) ?? "";
        return userId == null || String(userId).trim() === "";
      })
      .map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          email: (data.email as string) ?? null,
          display_name: (data.display_name as string) ?? null,
        };
      });
    return NextResponse.json({ users: result });
  } catch (err) {
    console.error("[admin incomplete-users]", err);
    return NextResponse.json(
      { error: "未完了ユーザー一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}
