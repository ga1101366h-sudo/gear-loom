/**
 * 投稿済みレビューに機材ページ（gears）を紐付けるAPI。
 * Authorization: Bearer <idToken> 必須。
 *
 * 背景（2026-08-03）:
 * 機材名を手入力する投稿は、クライアントから Firestore へ直接書いていて gears を作っていなかった。
 * そのため機材ページが1枚も存在せず、sitemap の機材URLも0件だった。
 * クライアントに gears を直接書かせると Firestore ルールを緩める必要があるため、
 * サーバー側（Admin SDK）でこのAPIが名寄せと作成を担当する。
 *
 * 設計:
 * - 受け取るのは reviewId だけ。機材名・カテゴリは**サーバーがレビュー本体から読む**
 *   （クライアントの申告を信じない）。
 * - 冪等：すでに gear_id があるレビューには何もしない。
 * - 呼び出し元はレビュー保存後に投げる。失敗しても投稿処理は止めない（レビューは保存済みのため）。
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { findOrCreateGearForReview } from "@/lib/gears/link-gear";

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

  const reviewId = String((body as { reviewId?: string })?.reviewId ?? "").trim();
  if (!reviewId) {
    return NextResponse.json({ error: "reviewId は必須です。" }, { status: 400 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const snap = await db.collection("reviews").doc(reviewId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "レビューが見つかりません。" }, { status: 404 });
    }
    const review = snap.data()!;

    // 他人のレビューを書き換えられないようにする
    if (String(review.author_id ?? "") !== uid) {
      return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
    }

    // すでに紐付いていれば何もしない（再送・二重送信への保険）
    if (review.gear_id) {
      return NextResponse.json({ status: "skipped", reason: "already linked", gearId: review.gear_id });
    }

    // 1枚目のレビュー画像を機材ページの画像に使う（無ければ空のまま。捏造しない）
    const images = Array.isArray(review.review_images)
      ? [...(review.review_images as { storage_path?: string; sort_order?: number }[])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )
      : [];
    const firstPath = images[0]?.storage_path ?? "";
    const imageUrl = firstPath ? getFirebaseStorageUrl(firstPath) : "";

    const createdAtRaw = review.created_at;
    const createdAt =
      typeof createdAtRaw === "string" && !Number.isNaN(Date.parse(createdAtRaw))
        ? new Date(createdAtRaw)
        : undefined;

    const result = await findOrCreateGearForReview(db, {
      reviewId,
      categorySlug: String(review.category_id ?? review.category_slug ?? ""),
      makerName: (review.maker_name as string | null) ?? null,
      gearName: String(review.gear_name ?? ""),
      imageUrl,
      affiliateUrl: "",
      createdAt,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[gears/link]", err);
    return NextResponse.json({ error: "機材ページの作成に失敗しました。" }, { status: 500 });
  }
}
