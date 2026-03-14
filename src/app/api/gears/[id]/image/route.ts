/**
 * ユーザー専用の機材画像（UserGear.customImageUrl）を削除する。
 * DELETE /api/gears/[id]/image
 * 認証必須。UserGear の customImageUrl を null にし、Gear.imageUrl は変更しない。
 */

import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
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
      console.error("🔥 [DELETE image] Token verification error:", err);
      return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    }

    const { id: gearId } = await params;
    if (!gearId?.trim()) {
      return NextResponse.json(
        { error: "機材ID（id）は必須です" },
        { status: 400 },
      );
    }

    const userGear = await prisma.userGear.findUnique({
      where: { userId_gearId: { userId: uid, gearId } },
      include: { gear: true },
    });
    if (!userGear) {
      return NextResponse.json(
        { error: "この機材を所有していません。" },
        { status: 404 },
      );
    }

    await prisma.userGear.update({
      where: { id: userGear.id },
      data: { customImageUrl: null },
    });

    const gear = userGear.gear;
    const response = {
      id: gear.id,
      name: gear.name,
      manufacturer: gear.manufacturer,
      category: gear.category,
      effectorType: gear.effectorType,
      imageUrl: null,
      defaultIcon: gear.defaultIcon,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("🗄️ [DELETE /api/gears/[id]/image] Error:", err);
    return NextResponse.json(
      { error: "画像の削除に失敗しました" },
      { status: 500 },
    );
  }
}
