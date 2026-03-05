import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../verify-admin";

export type AdminNotebookEntryItem = {
  id: string;
  user_id: string;
  gear_name: string;
  maker_name: string | null;
  title: string;
  created_at: string;
  profile_display_name?: string | null;
  profile_user_id?: string | null;
};

export async function GET(request: Request) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snap = await db.collection("gear_notebook_entries").orderBy("created_at", "desc").limit(500).get();
    const entries: AdminNotebookEntryItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        user_id: (data.user_id as string) ?? "",
        gear_name: (data.gear_name as string) ?? "",
        maker_name: (data.maker_name as string) ?? null,
        title: (data.title as string) ?? "",
        created_at: (data.created_at as string) ?? "",
      };
    });
    const userIds = [...new Set(entries.map((e) => e.user_id).filter(Boolean))];
    const profileMap = new Map<string, { display_name: string | null; user_id: string | null }>();
    await Promise.all(
      userIds.map(async (uid) => {
        const docSnap = await db.collection("profiles").doc(uid).get();
        if (docSnap.exists) {
          const d = docSnap.data();
          profileMap.set(uid, {
            display_name: (d?.display_name as string) ?? null,
            user_id: (d?.user_id as string) ?? null,
          });
        }
      })
    );
    const list = entries.map((e) => {
      const profile = profileMap.get(e.user_id);
      return {
        ...e,
        profile_display_name: profile?.display_name ?? null,
        profile_user_id: profile?.user_id ?? null,
      };
    });
    return NextResponse.json({ entries: list });
  } catch (err) {
    console.error("[admin notebook-entries]", err);
    return NextResponse.json({ error: "一覧の取得に失敗しました。" }, { status: 500 });
  }
}
