import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { getFollowCountsFromFirestore } from "@/lib/firebase/data";

/**
 * 認証ユーザー自身のフォロー数・フォロワー数を取得（Admin SDK で確実に取得）
 * Authorization: Bearer <idToken> 必須
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const counts = await getFollowCountsFromFirestore(uid);
    return NextResponse.json({
      followingCount: counts.followingCount,
      followersCount: counts.followersCount,
    });
  } catch (err) {
    console.error("[api/me/follow-counts]", err);
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }
}
