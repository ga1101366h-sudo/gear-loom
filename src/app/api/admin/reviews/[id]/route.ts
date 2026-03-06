import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../../verify-admin";

/**
 * 管理者が他ユーザーのレビューを更新する（Admin SDK 使用のためクライアントの Firestore ルールの影響を受けない）
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const verified = await verifyAdminFromRequest(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const { id: reviewId } = await params;
  if (!reviewId) {
    return NextResponse.json({ error: "reviewId がありません。" }, { status: 400 });
  }

  const reviewRef = db.collection("reviews").doc(reviewId);
  const reviewSnap = await reviewRef.get();
  if (!reviewSnap.exists) {
    return NextResponse.json({ error: "レビューが見つかりません。" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "リクエストボディが不正です。" }, { status: 400 });
  }

  const {
    category_id,
    maker_id,
    maker_name,
    category_name_ja,
    category_slug,
    author_display_name,
    author_user_id,
    author_avatar_url,
    title,
    gear_name,
    rating,
    body_md,
    youtube_url,
    event_url,
    situations,
    spec_tag_ids,
    spec_tag_names,
    review_images,
  } = body;

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (category_id !== undefined) updateData.category_id = category_id;
  if (maker_id !== undefined) updateData.maker_id = maker_id;
  if (maker_name !== undefined) updateData.maker_name = maker_name;
  if (category_name_ja !== undefined) updateData.category_name_ja = category_name_ja;
  if (category_slug !== undefined) updateData.category_slug = category_slug;
  if (author_display_name !== undefined) updateData.author_display_name = author_display_name;
  if (author_user_id !== undefined) updateData.author_user_id = author_user_id;
  if (author_avatar_url !== undefined) updateData.author_avatar_url = author_avatar_url;
  if (title !== undefined) updateData.title = title;
  if (gear_name !== undefined) updateData.gear_name = gear_name;
  if (rating !== undefined) updateData.rating = rating;
  if (body_md !== undefined) updateData.body_md = body_md;
  if (youtube_url !== undefined) updateData.youtube_url = youtube_url;
  if (event_url !== undefined) updateData.event_url = event_url;
  if (situations !== undefined) updateData.situations = situations;
  if (spec_tag_ids !== undefined) updateData.spec_tag_ids = spec_tag_ids;
  if (spec_tag_names !== undefined) updateData.spec_tag_names = spec_tag_names;
  if (review_images !== undefined) updateData.review_images = review_images;
  updateData.body_html = null;

  try {
    await reviewRef.update(updateData);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin reviews PATCH]", err);
    return NextResponse.json({ error: "更新に失敗しました。" }, { status: 500 });
  }
}
