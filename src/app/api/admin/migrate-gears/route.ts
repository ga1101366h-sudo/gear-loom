import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

/** Firebase owned_gear の1行をパースして { category, manufacturer, name } を返す */
function parseOwnedGearLine(line: string): { category: string; manufacturer: string | null; name: string } {
  const trimmed = line.trim();
  const match = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
  const category = (match ? match[1].trim() : "") || "その他";
  const rest = (match ? match[2].trim() : trimmed) || "";
  if (rest.includes(" / ")) {
    const idx = rest.indexOf(" / ");
    const manufacturer = rest.slice(0, idx).trim() || null;
    const name = rest.slice(idx + 3).trim() || rest;
    return { category, manufacturer, name };
  }
  return { category, manufacturer: null, name: rest || trimmed };
}

/**
 * Firebase Firestore の profiles.owned_gear（テキスト）を Prisma UserGear に移行する。
 * 開発環境でのみ実行可能。冪等（何度実行しても重複しない）。
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "このAPIは開発環境でのみ実行できます。" },
      { status: 403 },
    );
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error("🗄️ [migrate-gears] Firebase Admin Firestore が利用できません。");
    return NextResponse.json(
      { error: "Firebase の初期化に失敗しています。" },
      { status: 500 },
    );
  }

  try {
    const snap = await db.collection("profiles").get();
    let migratedCount = 0;

    for (const doc of snap.docs) {
      const uid = doc.id;
      const data = doc.data();
      const ownedGearRaw = (data.owned_gear as string) ?? "";
      const lines = ownedGearRaw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      // 1. User の upsert
      await prisma.user.upsert({
        where: { id: uid },
        create: { id: uid },
        update: {},
      });

      for (const line of lines) {
        const { category, manufacturer, name } = parseOwnedGearLine(line);
        if (!name) continue;

        // 2. Gear の find-first or create（name + manufacturer で完全一致判定。SQLite のため大文字小文字は区別）
        const existingGear = await prisma.gear.findFirst({
          where: {
            name,
            ...(manufacturer ? { manufacturer } : { manufacturer: null }),
          },
        });

        const gear =
          existingGear ??
          (await prisma.gear.create({
            data: {
              name,
              manufacturer: manufacturer || null,
              category,
              authorId: uid,
            },
          }));

        // 3. UserGear の findUnique → なければ create
        const existingLink = await prisma.userGear.findUnique({
          where: { userId_gearId: { userId: uid, gearId: gear.id } },
        });
        if (!existingLink) {
          await prisma.userGear.create({
            data: { userId: uid, gearId: gear.id },
          });
          migratedCount += 1;
        }
      }
    }

    return NextResponse.json({ success: true, migratedCount });
  } catch (err) {
    console.error("🗄️ [migrate-gears] 移行エラー:", err);
    return NextResponse.json(
      { error: "機材データの移行に失敗しました。", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
