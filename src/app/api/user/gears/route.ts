import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { getGearsByUserId } from "@/lib/user-gears";
import type { UserGearItem } from "@/types/gear";

function ensureUser(uid: string) {
  return prisma.user.upsert({
    where: { id: uid },
    create: { id: uid },
    update: {},
  });
}

function toUserGearItem(ug: {
  id: string;
  customImageUrl: string | null;
  gear: {
    id: string;
    name: string;
    manufacturer: string | null;
    category: string;
    effectorType: string | null;
    imageUrl: string | null;
    defaultIcon: string | null;
  };
}): UserGearItem {
  const effectiveImageUrl = ug.customImageUrl?.trim() || ug.gear.imageUrl?.trim() || null;
  return {
    userGearId: ug.id,
    id: ug.gear.id,
    name: ug.gear.name,
    manufacturer: ug.gear.manufacturer ?? null,
    category: ug.gear.category,
    effectorType: ug.gear.effectorType ?? null,
    imageUrl: effectiveImageUrl,
    defaultIcon: ug.gear.defaultIcon ?? null,
  };
}

type PostBody =
  | { gearId: string }
  | {
      name: string;
      manufacturer?: string | null;
      category?: string;
      effectorType?: string | null;
      imageUrl?: string | null;
      defaultIcon?: string | null;
    };

/** 有効な Bearer トークンだけを返す。undefined / "undefined" / "null" / 空文字は弾く */
function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1]?.trim() ?? null;
  }
  if (
    token == null ||
    token === "" ||
    token === "undefined" ||
    token === "null"
  ) {
    return null;
  }
  return token;
}

/**
 * ログインユーザーの所有機材を UserGear 経由で取得し、GearData の配列として返す。
 * Authorization: Bearer <idToken> 必須
 */
export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "有効な認証トークンが提供されていません。" },
      { status: 401 },
    );
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // 1. トークン検証フェーズ
  let decoded: { uid: string };
  try {
    decoded = await auth.verifyIdToken(token);
  } catch (err) {
    console.error("🔥 Token Verification Error:", err);
    return NextResponse.json(
      { error: "トークンの検証に失敗しました。" },
      { status: 401 },
    );
  }

  // 2. データベース処理フェーズ
  try {
    const uid = decoded.uid;
    await ensureUser(uid);
    const items = await getGearsByUserId(uid);
    const res = NextResponse.json(items);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (err) {
    console.error("🗄️ Database Error:", err);
    return NextResponse.json(
      { error: "データベースの処理に失敗しました。" },
      { status: 500 },
    );
  }
}

/**
 * 所有機材を追加する。gearId で既存 Gear を紐付けるか、name 等で新規 Gear を作成して紐付ける。
 * マスターデータ（Gear）の二重化を防ぐため、name / manufacturer で既存レコードを検索してから create する。
 * Authorization: Bearer <idToken> 必須
 */
export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "有効な認証トークンが提供されていません。" },
      { status: 401 },
    );
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // 1. トークン検証フェーズ
  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    console.error("🔥 Token Verification Error:", err);
    return NextResponse.json(
      { error: "トークンの検証に失敗しました。" },
      { status: 401 },
    );
  }

  // 2. データベース処理フェーズ
  try {
    await ensureUser(uid);

    const body = (await request.json()) as PostBody;
    let gearId: string;

    // 既存 Gear ID を指定して紐付けるパス
    if ("gearId" in body && typeof body.gearId === "string" && body.gearId.trim()) {
      gearId = body.gearId.trim();
      const gear = await prisma.gear.findUnique({ where: { id: gearId } });
      if (!gear) {
        return NextResponse.json({ error: "指定された機材が見つかりません。" }, { status: 404 });
      }
    } else if ("name" in body && typeof body.name === "string" && body.name.trim()) {
      // name ベースでマスターデータを find-or-create するパス
      const name = body.name.trim();
      const manufacturerRaw =
        typeof body.manufacturer === "string" ? body.manufacturer.trim() : null;
      const category =
        typeof body.category === "string" && body.category.trim()
          ? body.category.trim()
          : "ギターエフェクター";
      const effectorTypeRaw =
        typeof body.effectorType === "string" ? body.effectorType.trim() : null;
      const imageUrlRaw =
        typeof body.imageUrl === "string" ? body.imageUrl.trim() : null;
      const defaultIconRaw =
        typeof body.defaultIcon === "string" ? body.defaultIcon.trim() : null;

      // 1. name (+ manufacturer) で既存 Gear を検索（SQLite は mode: "insensitive" 非対応のため完全一致）
      const existingGear = await prisma.gear.findFirst({
        where: {
          name,
          ...(manufacturerRaw ? { manufacturer: manufacturerRaw } : {}),
        },
      });

      let gear =
        existingGear ??
        (await prisma.gear.create({
          data: {
            name,
            manufacturer: manufacturerRaw || null,
            category,
            effectorType: effectorTypeRaw || null,
            imageUrl: imageUrlRaw || null,
            defaultIcon: defaultIconRaw || null,
            authorId: uid,
          },
        }));

      gearId = gear.id;
    } else {
      return NextResponse.json({ error: "gearId または name は必須です。" }, { status: 400 });
    }

    // 4. すでにこのユーザーがこの Gear を所有していないかチェック
    let existing = await prisma.userGear.findUnique({
      where: { userId_gearId: { userId: uid, gearId } },
      include: { gear: true },
    });
    if (existing) {
      const newCategory =
        typeof (body as { category?: string }).category === "string"
          ? (body as { category: string }).category.trim()
          : "";
      if (
        newCategory &&
        existing.gear.category !== newCategory
      ) {
        await prisma.gear.update({
          where: { id: gearId },
          data: { category: newCategory },
        });
        existing = await prisma.userGear.findUnique({
          where: { userId_gearId: { userId: uid, gearId } },
          include: { gear: true },
        });
      }
      revalidatePath("/");
      revalidatePath("/mypage");
      revalidatePath("/profile");
      return NextResponse.json(toUserGearItem(existing!));
    }

    // 5. 未所有なら UserGear を作成
    const userGear = await prisma.userGear.create({
      data: { userId: uid, gearId },
      include: { gear: true },
    });
    revalidatePath("/");
    revalidatePath("/mypage");
    revalidatePath("/profile");
    // 6. 紐付けられた Gear データ（UserGearItem）を返却
    return NextResponse.json(toUserGearItem(userGear));
  } catch (err) {
    console.error("🗄️ Database Error:", err);
    return NextResponse.json(
      { error: "データベースの処理に失敗しました。" },
      { status: 500 },
    );
  }
}
