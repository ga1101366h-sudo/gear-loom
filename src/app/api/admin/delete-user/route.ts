import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";

export async function POST(request: Request) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  let body: { uid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const targetUid = body.uid?.trim();
  if (!targetUid) {
    return NextResponse.json({ error: "uid を指定してください。" }, { status: 400 });
  }

  // 自分自身の削除は許可しない（任意）
  if (targetUid === verified.uid) {
    return NextResponse.json({ error: "自分自身のアカウントはこの操作では削除できません。" }, { status: 400 });
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();
  if (!auth || !db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    await auth.deleteUser(targetUid);
    await db.collection("profiles").doc(targetUid).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin delete-user]", err);
    return NextResponse.json(
      { error: "ユーザー削除に失敗しました。" },
      { status: 500 }
    );
  }
}
