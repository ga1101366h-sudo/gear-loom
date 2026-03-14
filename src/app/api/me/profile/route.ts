import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

/**
 * 認証ユーザー自身のプロフィールを Admin SDK で取得（クライアントの Firestore 権限に依存しない）
 * Authorization: Bearer <idToken> 必須
 */
export async function GET(request: Request) {
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

    const snap = await db.collection("profiles").doc(uid).get();
    if (!snap.exists) {
      return NextResponse.json({ profile: null });
    }

    const data = snap.data()!;
    // 所持機材は Prisma (UserGear) に統一。GET /api/user/gears で取得すること。
    const profile = {
      id: uid,
      display_name: data.display_name ?? null,
      avatar_url: data.avatar_url ?? null,
      user_id: data.user_id ?? null,
      phone: data.phone ?? null,
      bio: data.bio ?? null,
      main_instrument: data.main_instrument ?? null,
      owned_gear: null as string | null,
      owned_gear_images: (data.owned_gear_images as string[] | null) ?? null,
      band_name: data.band_name ?? null,
      band_url: data.band_url ?? null,
      sns_twitter: data.sns_twitter ?? null,
      sns_instagram: data.sns_instagram ?? null,
      sns_youtube: data.sns_youtube ?? null,
      sns_twitch: data.sns_twitch ?? null,
      contact_email: data.contact_email ?? null,
      created_at: (data.created_at as string) ?? "",
      updated_at: (data.updated_at as string) ?? "",
    };

    const res = NextResponse.json({ profile });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (err) {
    console.error("[api/me/profile]", err);
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }
}
