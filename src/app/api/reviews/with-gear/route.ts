/**
 * 未登録機材をレビュー投稿と同時に保存するAPI
 * Authorization: Bearer <idToken> 必須。機材＋レビューをトランザクション的に作成する
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { isContentOnlyCategorySlug, getGroupSlugByCategorySlug } from "@/data/post-categories";
import { buildGearDisplayName, findOrCreateGear } from "@/lib/gears/link-gear";

export type WithGearBody = {
  gear: { name: string; imageUrl: string; affiliateUrl: string };
  review: {
    categorySlug: string;
    categoryNameJa: string;
    title: string;
    gearName: string;
    makerName: string;
    rating: number;
    bodyMd: string;
    youtubeUrl?: string;
    eventUrl?: string;
    situations?: string[];
    specTagIds?: string[];
    addToOwnedGear?: boolean;
  };
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();
  if (!auth || !db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { gear: gearPayload, review: reviewPayload } = body as WithGearBody;
  if (!gearPayload?.name?.trim() || !reviewPayload?.categorySlug?.trim()) {
    return NextResponse.json(
      { error: "gear.name と review.categorySlug は必須です。" },
      { status: 400 }
    );
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const profileSnap = await db.collection("profiles").doc(uid).get();
    const profile = profileSnap.data();
    const authorDisplayName =
      (profile?.display_name as string) ?? decoded.email?.split("@")[0] ?? "";
    const authorUserId = (profile?.user_id as string) ?? null;
    const authorAvatarUrl = (profile?.avatar_url as string) ?? null;

    const categorySlug = String(reviewPayload.categorySlug ?? "").trim();
    const categoryNameJa = String(reviewPayload.categoryNameJa ?? "").trim();
    const groupSlug = getGroupSlugByCategorySlug(categorySlug) || "other";
    const isContentOnly = isContentOnlyCategorySlug(categorySlug);

    let makerId: string | null = null;
    const makerName = String(reviewPayload.makerName ?? "").trim();
    if (makerName && groupSlug) {
      const existing = await db
        .collection("makers")
        .where("group_slug", "==", groupSlug)
        .where("name", "==", makerName)
        .limit(1)
        .get();
      if (!existing.empty) {
        makerId = existing.docs[0].id;
      } else {
        const makerRef = await db.collection("makers").doc();
        await makerRef.set({
          name: makerName,
          group_slug: groupSlug,
          created_at: new Date().toISOString(),
        });
        makerId = makerRef.id;
      }
    }

    const now = new Date();
    // 機材ページは「あれば再利用・無ければ作成」する（2026-08-03）。
    // 以前は毎回新規作成していたため、同じ機材を2人がレビューすると機材ページが2枚できていた。
    // 表示名は手入力投稿の経路と同じ規則（メーカー名＋機材名）に揃える。
    // 楽天の商品名をそのまま使うと、同じ機材でも経路によって名前が変わり名寄せできないため。
    const gearDisplayName =
      buildGearDisplayName(
        makerName,
        String(reviewPayload.gearName ?? "").trim() || String(gearPayload.name ?? "").trim()
      ) || String(gearPayload.name ?? "").trim();
    const gearResult = await findOrCreateGear(db, {
      displayName: gearDisplayName,
      imageUrl: String(gearPayload.imageUrl ?? "").trim(),
      affiliateUrl: String(gearPayload.affiliateUrl ?? "").trim(),
      createdAt: now,
    });
    const gearId = gearResult.gearId;

    const specTagIds = Array.isArray(reviewPayload.specTagIds) ? reviewPayload.specTagIds : [];
    let specTagNames: string[] = [];
    if (specTagIds.length > 0) {
      const tagSnap = await db.collection("spec_tags").get();
      const tagMap = new Map(tagSnap.docs.map((d) => [d.id, (d.data().name_ja as string) ?? ""]));
      specTagNames = specTagIds.map((id) => tagMap.get(id) ?? "").filter(Boolean);
    }

    const reviewRef = db.collection("reviews").doc();
    await reviewRef.set({
      author_id: uid,
      category_id: categorySlug,
      category_slug: categorySlug,
      category_name_ja: categoryNameJa,
      ...(makerId && { maker_id: makerId }),
      maker_name: isContentOnly ? null : (makerName || null),
      gear_id: gearId,
      gear_name: isContentOnly ? "" : String(reviewPayload.gearName ?? gearPayload.name ?? "").trim(),
      author_display_name: authorDisplayName,
      author_user_id: authorUserId,
      author_avatar_url: authorAvatarUrl,
      title: String(reviewPayload.title ?? "").trim(),
      rating: isContentOnly ? 0 : Number(reviewPayload.rating) || 0,
      body_md: String(reviewPayload.bodyMd ?? "").trim() || null,
      body_html: null,
      youtube_url: (reviewPayload.youtubeUrl as string)?.trim() || null,
      event_url: categorySlug === "event" ? (reviewPayload.eventUrl as string)?.trim() || null : null,
      situations: Array.isArray(reviewPayload.situations) && reviewPayload.situations.length > 0 ? reviewPayload.situations : null,
      spec_tag_ids: specTagIds,
      spec_tag_names: specTagNames,
      review_images: [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    if (reviewPayload.addToOwnedGear && !isContentOnly && (reviewPayload.gearName || gearPayload.name)) {
      const currentOwned = (profile?.owned_gear as string) ?? "";
      const makerPart = makerName ? `${makerName} / ` : "";
      const lineCore = `${makerPart}${String(reviewPayload.gearName || gearPayload.name).trim()}`;
      const newLine = categoryNameJa ? `[${categoryNameJa}] ${lineCore}` : lineCore;
      const lines = currentOwned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.includes(newLine)) {
        const newText = currentOwned ? `${currentOwned}\n${newLine}` : newLine;
        await db.collection("profiles").doc(uid).set(
          { owned_gear: newText.trim() || null, updated_at: new Date().toISOString() },
          { merge: true }
        );
      }
    }

    return NextResponse.json({
      reviewId: reviewRef.id,
      gearId,
    });
  } catch (err) {
    console.error("[reviews/with-gear]", err);
    return NextResponse.json(
      { error: "保存に失敗しました。" },
      { status: 500 }
    );
  }
}

