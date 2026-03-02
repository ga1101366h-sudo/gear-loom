import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";

export type IncompleteUserItem = {
  uid: string;
  email: string | null;
  display_name: string | null;
};

export async function GET(request: Request) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const auth = getAdminAuth();
  const db = getAdminFirestore();
  if (!auth || !db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const result: IncompleteUserItem[] = [];
    let pageToken: string | undefined;
    do {
      const listResult = await auth.listUsers(1000, pageToken);
      for (const userRecord of listResult.users) {
        const profileSnap = await db.collection("profiles").doc(userRecord.uid).get();
        const data = profileSnap.data();
        const userIdSet = data && data.user_id != null && String(data.user_id).trim() !== "";
        if (!userIdSet) {
          result.push({
            uid: userRecord.uid,
            email: userRecord.email ?? null,
            display_name: (data?.display_name as string) ?? userRecord.displayName ?? null,
          });
        }
      }
      pageToken = listResult.pageToken;
    } while (pageToken);

    return NextResponse.json({ users: result });
  } catch (err) {
    console.error("[admin incomplete-users]", err);
    return NextResponse.json(
      { error: "未完了ユーザー一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}
