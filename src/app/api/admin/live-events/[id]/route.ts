import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../../verify-admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const { id } = await params;
  const eventId = id?.trim();
  if (!eventId) {
    return NextResponse.json({ error: "id を指定してください。" }, { status: 400 });
  }

  let body: {
    title?: string;
    event_date?: string;
    venue?: string | null;
    venue_url?: string | null;
    description?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const ref = db.collection("live_events").doc(eventId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "該当のライブ予定がありません。" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.event_date !== undefined) updates.event_date = body.event_date;
    if (body.venue !== undefined) updates.venue = body.venue;
    if (body.venue_url !== undefined) updates.venue_url = body.venue_url;
    if (body.description !== undefined) updates.description = body.description;

    await ref.update(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin live-events PATCH]", err);
    return NextResponse.json(
      { error: "ライブ予定の更新に失敗しました。" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const { id } = await params;
  const eventId = id?.trim();
  if (!eventId) {
    return NextResponse.json({ error: "id を指定してください。" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const ref = db.collection("live_events").doc(eventId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "該当のライブ予定がありません。" }, { status: 404 });
    }
    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin live-events DELETE]", err);
    return NextResponse.json(
      { error: "ライブ予定の削除に失敗しました。" },
      { status: 500 }
    );
  }
}
