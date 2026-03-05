import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getReviewsFromFollowedUsersFromFirestore } from "@/lib/firebase/data";
import type { NewReviewItem } from "@/components/new-reviews-carousel";

function getStorageUrl(storagePath: string): string {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  if (!bucket) return "";
  const encoded = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
}

/**
 * ログインユーザーがフォローしているユーザーのレビュー一覧（トップページ「フォロー中のユーザの記事」用）
 * Authorization: Bearer <idToken> 必須
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const reviews = await getReviewsFromFollowedUsersFromFirestore(uid, 12);
    const categoryName = (r: (typeof reviews)[number]) =>
      r.categories && "name_ja" in r.categories ? (r.categories as { name_ja: string }).name_ja : "";
    const items: NewReviewItem[] = reviews.map((r) => {
      let image: string | null = null;
      if (r.review_images && r.review_images.length > 0) {
        const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
        const url = getStorageUrl(first.storage_path);
        image = url || null;
      }
      const profile = r.profiles;
      const authorName =
        profile?.display_name?.trim() ||
        (profile?.user_id?.trim() ? `@${profile.user_id.trim()}` : "ユーザー");
      const authorAvatar = profile?.avatar_url?.trim() || null;
      return {
        id: r.id,
        title: r.title,
        gear_name: r.gear_name,
        rating: r.rating,
        excerpt: "レビューを読む →",
        image,
        category: categoryName(r),
        author: authorName,
        author_avatar: authorAvatar,
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/me/following-reviews]", err);
    return NextResponse.json({ error: "取得に失敗しました。" }, { status: 500 });
  }
}
