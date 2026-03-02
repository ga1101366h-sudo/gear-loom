import { NextResponse } from "next/server";
import { getAdminFirestore, deleteReviewImagesFromStorage } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";

export async function POST(request: Request) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  let body: { reviewId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const reviewId = body.reviewId?.trim();
  if (!reviewId) {
    return NextResponse.json({ error: "reviewId を指定してください。" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    await db.collection("reviews").doc(reviewId).delete();
    await deleteReviewImagesFromStorage(reviewId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin delete-review]", err);
    return NextResponse.json(
      { error: "記事の削除に失敗しました。" },
      { status: 500 }
    );
  }
}
