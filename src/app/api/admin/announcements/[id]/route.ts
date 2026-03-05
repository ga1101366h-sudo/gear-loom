import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../../verify-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const date = typeof body.date === "string" ? body.date.trim() : undefined;
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const bodyText = typeof body.body === "string" ? body.body.trim() : undefined;
    const url = typeof body.url === "string" ? body.url.trim() || null : undefined;
    const is_important = typeof body.is_important === "boolean" ? body.is_important : undefined;

    const ref = db.collection("site_announcements").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "お知らせが見つかりません。" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (date !== undefined) updates.date = date;
    if (title !== undefined) updates.title = title;
    if (bodyText !== undefined) updates.body = bodyText;
    if (url !== undefined) updates.url = url;
    if (is_important !== undefined) updates.is_important = is_important;

    await ref.update(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin announcements PATCH]", err);
    return NextResponse.json(
      { error: "お知らせの更新に失敗しました。" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const verified = await verifyAdminFromRequest(_request);
  if (verified instanceof NextResponse) return verified;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const ref = db.collection("site_announcements").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "お知らせが見つかりません。" }, { status: 404 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin announcements DELETE]", err);
    return NextResponse.json(
      { error: "お知らせの削除に失敗しました。" },
      { status: 500 }
    );
  }
}
