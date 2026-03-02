import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";

export type AdminLiveEventItem = {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  venue: string | null;
  venue_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  profile_display_name: string | null;
  profile_user_id: string | null;
};

export async function GET(request: Request) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const eventsSnap = await db.collection("live_events").orderBy("event_date", "desc").get();
    const uidSet = new Set<string>();
    eventsSnap.docs.forEach((d) => {
      const uid = d.data().user_id;
      if (uid) uidSet.add(uid);
    });
    const profiles: Record<string, { display_name: string | null; user_id: string | null }> = {};
    await Promise.all(
      Array.from(uidSet).map(async (uid) => {
        const snap = await db.collection("profiles").doc(uid).get();
        const data = snap.data();
        profiles[uid] = {
          display_name: (data?.display_name as string) ?? null,
          user_id: (data?.user_id as string) ?? null,
        };
      })
    );

    const events: AdminLiveEventItem[] = eventsSnap.docs.map((d) => {
      const data = d.data();
      const uid = data.user_id ?? "";
      const profile = profiles[uid];
      return {
        id: d.id,
        user_id: uid,
        title: data.title ?? "",
        event_date: data.event_date ?? "",
        venue: data.venue ?? null,
        venue_url: data.venue_url ?? null,
        description: data.description ?? null,
        created_at: data.created_at ?? "",
        updated_at: data.updated_at ?? "",
        profile_display_name: profile?.display_name ?? null,
        profile_user_id: profile?.user_id ?? null,
      };
    });

    return NextResponse.json({ events });
  } catch (err) {
    console.error("[admin live-events]", err);
    return NextResponse.json(
      { error: "ライブ日程一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}
