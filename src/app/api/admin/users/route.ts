import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";

export type AdminUserItem = {
  id: string;
  display_name: string | null;
  user_id: string | null;
  created_at: string;
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
    const list: AdminUserItem[] = snap.docs
      .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        display_name: (data.display_name as string) ?? null,
        user_id: (data.user_id as string) ?? null,
        created_at: (data.created_at as string) ?? "",
      };
    })
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return NextResponse.json({ users: list });
  } catch (err) {
    console.error("[admin users]", err);
    return NextResponse.json({ error: "一覧の取得に失敗しました。" }, { status: 500 });
  }
}
