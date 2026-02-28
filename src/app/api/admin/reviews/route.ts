import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";

export type AdminReviewItem = {
  id: string;
  title: string;
  author_id: string;
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
    const snap = await db.collection("reviews").orderBy("created_at", "desc").limit(500).get();
    const list: AdminReviewItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: (data.title as string) ?? "",
        author_id: (data.author_id as string) ?? "",
        created_at: (data.created_at as string) ?? "",
      };
    });
    return NextResponse.json({ reviews: list });
  } catch (err) {
    console.error("[admin reviews]", err);
    return NextResponse.json({ error: "一覧の取得に失敗しました。" }, { status: 500 });
  }
}
