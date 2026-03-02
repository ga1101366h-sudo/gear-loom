import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  const sid = request.nextUrl.searchParams.get("sid")?.trim();
  if (!sid) {
    return NextResponse.json({ error: "sid が必要です。" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const docSnap = await db.collection("signup_sessions").doc(sid).get();
  const data = docSnap.data();
  if (!docSnap.exists || !data) {
    return NextResponse.json({ error: "セッションが無効または期限切れです。" }, { status: 404 });
  }

  const expiresAt = (data.expires_at as number) ?? 0;
  if (Date.now() > expiresAt) {
    await db.collection("signup_sessions").doc(sid).delete();
    return NextResponse.json({ error: "セッションの有効期限が切れました。" }, { status: 410 });
  }

  const name = (data.name as string) ?? "";
  const username = (data.username as string) ?? "";

  return NextResponse.json({
    name: String(name).trim().slice(0, 80),
    username: String(username).trim().replace(/^@/, "").slice(0, 30),
  });
}
