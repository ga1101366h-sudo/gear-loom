import { NextResponse } from "next/server";
import {
  getAdminAuth,
  getAdminFirestore,
  deleteUserStorageFiles,
  deleteAllUserDataFromFirestore,
} from "@/lib/firebase/admin";
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
    // 1. Firestore: 記事・予定・手帳・フォロー・プロフィールをすべて削除
    await deleteAllUserDataFromFirestore(db, targetUid);
    // 2. Storage: アバター・所持機材画像・ノート画像を削除
    await deleteUserStorageFiles(targetUid);
    // 3. Firebase Auth からユーザー削除
    try {
      await auth.deleteUser(targetUid);
    } catch (authErr) {
      const msg = authErr instanceof Error ? authErr.message : "";
      const isNoUser = /no user record|provided identifier|user-not-found/i.test(msg);
      if (isNoUser) {
        // Auth にユーザーが存在しない（既に削除済みなど）→ 上記まで完了していれば成功とする
      } else {
        throw authErr;
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin delete-user]", err);
    const message = err instanceof Error ? err.message : "不明なエラー";
    const isPermission = /permission|権限|insufficient|forbidden/i.test(message);
    const errorText = isPermission
      ? "Firebase のサービスアカウントに「Authentication のユーザー削除」権限を付与してください。"
      : message || "ユーザー削除に失敗しました。";
    return NextResponse.json(
      { error: errorText },
      { status: 500 }
    );
  }
}
