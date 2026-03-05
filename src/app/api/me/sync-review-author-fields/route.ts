import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

/**
 * プロフィール（表示名・ユーザーID・アイコン）更新後、過去のレビューに保存した
 * 非正規化フィールド（author_display_name, author_user_id, author_avatar_url）を
 * 一括更新する。名前・アイコン変更が過去記事にも反映されるようにする。
 */
export async function POST(request: Request) {
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
    if (!profileSnap.exists) {
      return NextResponse.json({ ok: true, updated: 0 });
    }
    const data = profileSnap.data();
    const author_display_name = (data?.display_name as string)?.trim() ?? null;
    const author_user_id = (data?.user_id as string)?.trim() ?? null;
    const author_avatar_url = (data?.avatar_url as string)?.trim() ?? null;

    const reviewsSnap = await db.collection("reviews").where("author_id", "==", uid).get();
    const BATCH_SIZE = 450;
    let updated = 0;
    for (let i = 0; i < reviewsSnap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = reviewsSnap.docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((d) => {
        batch.update(d.ref, {
          author_display_name,
          author_user_id,
          author_avatar_url,
          updated_at: new Date().toISOString(),
        });
      });
      await batch.commit();
      updated += chunk.length;
    }
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("[api/me/sync-review-author-fields]", err);
    return NextResponse.json({ error: "同期に失敗しました。" }, { status: 500 });
  }
}
