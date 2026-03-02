import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

const USER_ID_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export async function POST(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? request.nextUrl.origin;

  let body: { sid?: string; displayName?: string; userId?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const sid = body.sid?.trim();
  const displayName = String(body.displayName ?? "").trim().slice(0, 80);
  const userId = String(body.userId ?? "").trim().toLowerCase();
  const nextPath = String(body.next ?? "/").trim().slice(0, 300) || "/";

  if (!sid) {
    return NextResponse.json({ error: "セッションがありません。" }, { status: 400 });
  }
  if (!USER_ID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: "ユーザーIDは3〜30文字の半角英数字・アンダースコアのみ使用できます。" },
      { status: 400 }
    );
  }

  const db = getAdminFirestore();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const sessionSnap = await db.collection("signup_sessions").doc(sid).get();
  const session = sessionSnap.data();
  if (!sessionSnap.exists || !session) {
    return NextResponse.json({ error: "セッションが無効または期限切れです。" }, { status: 404 });
  }

  const expiresAt = (session.expires_at as number) ?? 0;
  if (Date.now() > expiresAt) {
    await db.collection("signup_sessions").doc(sid).delete();
    return NextResponse.json({ error: "セッションの有効期限が切れました。" }, { status: 410 });
  }

  const xId = session.x_id as string;
  const xName = (session.name as string) ?? null;
  const xProfileImage = (session.profile_image_url as string) ?? null;

  const existingProfile = await db.collection("profiles").where("user_id", "==", userId).limit(1).get();
  if (!existingProfile.empty) {
    return NextResponse.json(
      { error: "このユーザーIDはすでに使われています。" },
      { status: 400 }
    );
  }

  const firebaseUid = `x_${xId}`;
  const now = new Date().toISOString();
  await db.collection("profiles").doc(firebaseUid).set({
    display_name: displayName || xName || null,
    user_id: userId,
    avatar_url: xProfileImage ?? null,
    created_at: now,
    updated_at: now,
  });

  const customToken = await auth.createCustomToken(firebaseUid);

  await db.collection("signup_sessions").doc(sid).delete();

  return NextResponse.json({
    token: customToken,
    next: nextPath,
    completeUrl: `${origin}/signup/x/complete?token=${encodeURIComponent(customToken)}&next=${encodeURIComponent(nextPath)}`,
  });
}
