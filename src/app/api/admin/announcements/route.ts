import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";
import type { SiteAnnouncement } from "@/lib/firebase/data";

export type AdminAnnouncementItem = SiteAnnouncement;

export async function GET(request: Request) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snap = await db
      .collection("site_announcements")
      .orderBy("date", "desc")
      .limit(50)
      .get();
    const announcements: AdminAnnouncementItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        date: (data.date as string) ?? "",
        title: (data.title as string) ?? "",
        body: (data.body as string) ?? "",
        url: (data.url as string)?.trim() || null,
        is_important: Boolean(data.is_important),
        created_at: (data.created_at as string) ?? "",
      };
    });
    return NextResponse.json({ announcements });
  } catch (err) {
    console.error("[admin announcements GET]", err);
    return NextResponse.json(
      { error: "お知らせ一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const date = typeof body.date === "string" ? body.date.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const bodyText = typeof body.body === "string" ? body.body.trim() : "";
    const url = typeof body.url === "string" ? body.url.trim() || null : null;
    const is_important = Boolean(body.is_important);

    if (!date || !title || !bodyText) {
      return NextResponse.json(
        { error: "日付・タイトル・本文は必須です。" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const docRef = await db.collection("site_announcements").add({
      date,
      title,
      body: bodyText,
      url,
      is_important,
      created_at: now,
      updated_at: now,
    });

    return NextResponse.json({
      id: docRef.id,
      date,
      title,
      body: bodyText,
      url,
      is_important,
      created_at: now,
    });
  } catch (err) {
    console.error("[admin announcements POST]", err);
    return NextResponse.json(
      { error: "お知らせの登録に失敗しました。" },
      { status: 500 }
    );
  }
}
