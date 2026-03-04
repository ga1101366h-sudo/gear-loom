/**
 * 機材検索 API
 * GET /api/gears/search?q=キーワード
 * - Firestore の gears を名前の前方一致で検索
 * - 同時に楽天API（楽器・音響機器ジャンル）を叩き、両方の結果を返す
 */

import { NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { fetchRakutenItems } from "@/lib/rakuten";
import type { Gear } from "@/types/database";

export type GearSearchResult = {
  gears: Gear[];
  apiItems: Array<{
    itemName: string;
    itemUrl: string;
    affiliateUrl?: string;
    imageUrl: string;
    itemPrice?: number;
    shopName?: string;
    reviewCount?: number;
  }>;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const result: GearSearchResult = { gears: [], apiItems: [] };

  const db = getAdminFirestore();
  if (db && q.length >= 1) {
    const ref = db.collection("gears");
    const snapshot = await ref
      .where("name", ">=", q)
      .where("name", "<=", q + "\uf8ff")
      .limit(20)
      .get();

    result.gears = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name ?? ""),
        imageUrl: String(data.imageUrl ?? ""),
        affiliateUrl: String(data.affiliateUrl ?? ""),
        reviewCount: Number(data.reviewCount ?? 0),
        createdAt: data.createdAt?.toMillis?.()
          ? new Date(data.createdAt.toMillis()).toISOString()
          : String(data.createdAt ?? ""),
      };
    });
  }

  if (q.length >= 1) {
    const rakutenItems = await fetchRakutenItems(q);
    result.apiItems = rakutenItems.map((item) => ({
      itemName: item.itemName,
      itemUrl: item.itemUrl,
      affiliateUrl: item.affiliateUrl,
      imageUrl:
        item.mediumImageUrls?.[0]?.imageUrl ||
        item.smallImageUrls?.[0]?.imageUrl ||
        "",
      itemPrice: item.itemPrice,
      shopName: item.shopName,
      reviewCount: item.reviewCount,
    }));
  }

  return Response.json(result);
}
