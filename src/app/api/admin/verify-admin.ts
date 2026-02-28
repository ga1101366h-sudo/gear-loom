import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { isAdminUserId } from "@/lib/admin";

export type VerifiedAdmin = { uid: string };

/**
 * Request の Authorization: Bearer <idToken> を検証し、
 * プロフィールの user_id が管理者のときだけ { uid } を返す。
 */
export async function verifyAdminFromRequest(request: Request): Promise<NextResponse | VerifiedAdmin> {
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

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;
    const profileSnap = await db.collection("profiles").doc(uid).get();
    const user_id = (profileSnap.data()?.user_id as string) ?? null;
    if (!isAdminUserId(user_id)) {
      return NextResponse.json({ error: "管理者権限がありません。" }, { status: 403 });
    }
    return { uid };
  } catch {
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }
}
