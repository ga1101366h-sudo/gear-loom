import { NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
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
  const auth = getAdminAuth();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const result: IncompleteUserItem[] = [];

    if (auth) {
      // Firebase Auth の全ユーザーを走査し、プロフィールが無い or user_id 未設定を「ID未設定」とする
      let pageToken: string | undefined;
      do {
        const listResult = await auth.listUsers(1000, pageToken);
        for (const userRecord of listResult.users) {
          const uid = userRecord.uid;
          const profileSnap = await db.collection("profiles").doc(uid).get();
          const profile = profileSnap.data();
          const userId = (profile?.user_id as string) ?? "";
          const hasUserId = userId != null && String(userId).trim() !== "";
          if (!hasUserId) {
            result.push({
              uid,
              email: (profile?.email as string) ?? userRecord.email ?? null,
              display_name:
                (profile?.display_name as string) ?? userRecord.displayName ?? null,
            });
          }
        }
        pageToken = listResult.pageToken;
      } while (pageToken);
    } else {
      // Admin Auth が無い場合は従来どおり profiles のみ（プロフィールあり・user_id 未設定）
      const snap = await db.collection("profiles").get();
      const items = snap.docs
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
      result.push(...items);
    }

    return NextResponse.json({ users: result });
  } catch (err) {
    console.error("[admin incomplete-users]", err);
    return NextResponse.json(
      { error: "未完了ユーザー一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}
