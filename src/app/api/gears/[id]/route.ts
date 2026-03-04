/**
 * 機材1件取得 API
 * GET /api/gears/[id]
 */

import { NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { Gear } from "@/types/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return Response.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  const snap = await db.collection("gears").doc(id).get();
  if (!snap.exists) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const data = snap.data()!;
  const gear: Gear = {
    id: snap.id,
    name: String(data.name ?? ""),
    imageUrl: String(data.imageUrl ?? ""),
    affiliateUrl: String(data.affiliateUrl ?? ""),
    reviewCount: Number(data.reviewCount ?? 0),
    createdAt: data.createdAt?.toMillis?.()
      ? new Date(data.createdAt.toMillis()).toISOString()
      : String(data.createdAt ?? ""),
  };

  return Response.json(gear);
}
