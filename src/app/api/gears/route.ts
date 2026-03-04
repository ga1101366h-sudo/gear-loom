/**
 * 機材一括取得・新規作成 API
 * GET /api/gears - 一覧（未使用の場合は削除可）
 * POST /api/gears - 楽天API結果を gears に新規保存
 */

import { NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";

export type CreateGearBody = {
  name: string;
  imageUrl: string;
  affiliateUrl: string;
};

export async function POST(request: NextRequest) {
  const db = getAdminFirestore();
  if (!db) {
    return Response.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { name, imageUrl, affiliateUrl } = body as CreateGearBody;
  const nameStr = typeof name === "string" ? name.trim() : "";
  const imageStr = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const affiliateStr = typeof affiliateUrl === "string" ? affiliateUrl.trim() : "";

  if (!nameStr) {
    return Response.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const ref = db.collection("gears").doc();
  const now = new Date();
  await ref.set({
    name: nameStr,
    imageUrl: imageStr || "",
    affiliateUrl: affiliateStr || "",
    reviewCount: 0,
    createdAt: now,
  });

  return Response.json({ id: ref.id });
}
