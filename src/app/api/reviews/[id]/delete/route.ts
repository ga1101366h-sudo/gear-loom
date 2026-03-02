import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore, deleteReviewImagesFromStorage } from "@/lib/firebase/admin";

/** 投稿者本人が自分のレビューを削除する */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();
  if (!auth || !db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const { id: reviewId } = await params;
  if (!reviewId) {
    return NextResponse.json({ error: "reviewId がありません。" }, { status: 400 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const reviewSnap = await db.collection("reviews").doc(reviewId).get();
    if (!reviewSnap.exists) {
      return NextResponse.json({ error: "レビューが見つかりません。" }, { status: 404 });
    }
    const authorId = reviewSnap.data()?.author_id as string | undefined;
    if (authorId !== uid) {
      return NextResponse.json({ error: "この記事を削除する権限がありません。" }, { status: 403 });
    }

    await db.collection("reviews").doc(reviewId).delete();
    await deleteReviewImagesFromStorage(reviewId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reviews delete]", err);
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }
}
