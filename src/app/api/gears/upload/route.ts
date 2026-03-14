import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

/**
 * ユーザー専用の機材画像をアップロードする。
 * 認証必須。UserGear.customImageUrl のみ更新し、Gear.imageUrl は変更しない。
 */
export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 },
      );
    }

    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    let uid: string;
    try {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
    } catch (err) {
      console.error("🔥 [upload] Token verification error:", err);
      return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    }

    const formData = await request.formData();
    const gearId = (formData.get("gearId") as string)?.trim() || null;
    const image = formData.get("image") as Blob | File | null;

    if (!gearId) {
      return NextResponse.json(
        { error: "gearId（現在選択中の機材ID）は必須です" },
        { status: 400 },
      );
    }
    if (!image || image.size === 0) {
      return NextResponse.json(
        { error: "画像（image）は必須です" },
        { status: 400 },
      );
    }

    const userGear = await prisma.userGear.findUnique({
      where: { userId_gearId: { userId: uid, gearId } },
      include: { gear: true },
    });
    if (!userGear) {
      return NextResponse.json(
        { error: "この機材を所有していません。先にマイギアに追加してください。" },
        { status: 404 },
      );
    }

    const dir = path.join(process.cwd(), "public", "uploads", "user", uid);
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    const filePath = path.join(dir, filename);
    const buffer = Buffer.from(await (image as Blob).arrayBuffer());
    await writeFile(filePath, buffer);
    const customImageUrl = `/uploads/user/${uid}/${filename}`;

    await prisma.userGear.update({
      where: { id: userGear.id },
      data: { customImageUrl },
    });

    const gear = userGear.gear;
    const response = {
      id: gear.id,
      name: gear.name,
      manufacturer: gear.manufacturer,
      category: gear.category,
      effectorType: gear.effectorType,
      imageUrl: customImageUrl,
      defaultIcon: gear.defaultIcon,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("🗄️ [POST /api/gears/upload] Error:", err);
    return NextResponse.json(
      { error: "画像の保存に失敗しました" },
      { status: 500 },
    );
  }
}
