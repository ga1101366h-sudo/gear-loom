import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  getReviewByIdFromFirestore,
  getReviewLikeCountFromFirestore,
  getReviewHelpfulCountFromFirestore,
  type ReviewDetail,
} from "@/lib/firebase/data";
import { isContentOnlyCategorySlug } from "@/data/post-categories";
import { ECSearchLinks } from "@/components/ec-search-links";
import { ReviewHelpfulButton } from "@/components/review-helpful-button";
import { ReviewCompareButton } from "@/components/review-compare-button";
import { ReviewLikeButton } from "@/components/review-like-button";
import { ReviewImagesGallery } from "@/components/review-images-gallery";
import { ReviewOwnerActions } from "@/components/review-owner-actions";
import { ShareToXButton } from "@/components/share-to-x-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-electric-blue text-lg" aria-label={`${rating}点`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "opacity-100" : "opacity-30"}>
          ★
        </span>
      ))}
    </span>
  );
}

function getFirebaseStorageUrl(storagePath: string): string {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  const encoded = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
}

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://gear-loom.com")
  );
}

/** X・Facebook 等でシェア時の「写真付きリンクカード」用メタデータ。Xで画像を安定表示するため絶対URL・推奨サイズを利用 */
const OG_IMAGE_DEFAULT =
  process.env.NEXT_PUBLIC_OG_IMAGE_DEFAULT ?? "https://placehold.co/1200x675/1a2332/7dd3fc?text=Gear-Loom";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 675; // X推奨 1.78:1

function ensureAbsoluteImageUrl(url: string | null, fallback: string): string {
  if (!url || typeof url !== "string" || !url.startsWith("https://")) return fallback;
  // Firebase Storage のバケット未設定などで /b//o/ になっている場合は無効
  if (url.includes("/b//o/")) return fallback;
  try {
    new URL(url);
    return url;
  } catch {
    return fallback;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const review = await getReviewByIdFromFirestore(id);
  if (!review) return { title: "レビューが見つかりません" };

  const title = `${review.title} | Gear-Loom`;
  const description =
    (review.body_md?.slice(0, 120).replace(/\n/g, " ").trim() ?? "") + (review.body_md && review.body_md.length > 120 ? "…" : "") ||
    (review.gear_name ? `${review.gear_name}のレビュー` : "楽器・機材のレビュー");
  const origin = getSiteOrigin();
  const url = `${origin}/reviews/${id}`;

  const images = (review as ReviewDetail).review_images ?? [];
  const firstImage = images.length > 0
    ? [...images].sort((a, b) => a.sort_order - b.sort_order)[0]
    : null;
  const rawReviewImageUrl = firstImage ? getFirebaseStorageUrl(firstImage.storage_path) : null;
  const ogImageUrl = ensureAbsoluteImageUrl(rawReviewImageUrl, OG_IMAGE_DEFAULT);
  const imageAlt = review.title || review.gear_name || "Gear-Loom レビュー";
  const ogImages = [{ url: ogImageUrl, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: imageAlt }];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Gear-Loom",
      type: "article",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
      imageAlt,
    },
    alternates: { canonical: url },
  };
}

function getYouTubeEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    // youtu.be/VIDEO_ID
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    if (host.endsWith("youtube.com")) {
      // https://www.youtube.com/watch?v=VIDEO_ID
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        if (!id) return null;
        return `https://www.youtube.com/embed/${id}`;
      }
      // https://www.youtube.com/embed/VIDEO_ID
      if (url.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${url.pathname}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const review = await getReviewByIdFromFirestore(id);
  if (!review) notFound();

  const [likeCount, helpfulCount] = await Promise.all([
    getReviewLikeCountFromFirestore(id),
    getReviewHelpfulCountFromFirestore(id),
  ]);

  const categoryName =
    review.categories && "name_ja" in review.categories
      ? (review.categories as { name_ja: string }).name_ja
      : "";
  const categorySlug =
    review.categories && "slug" in review.categories
      ? (review.categories as { slug: string }).slug
      : "";
  const isContentOnlyCategory = categorySlug ? isContentOnlyCategorySlug(categorySlug) : false;
  const makerName = (review as ReviewDetail).maker_name ?? null;
  const profile = review.profiles as { display_name: string | null; user_id: string | null } | undefined;
  const images = (review as ReviewDetail).review_images ?? [];
  const youtubeEmbedUrl = getYouTubeEmbedUrl((review as ReviewDetail).youtube_url ?? null);
  const eventUrl = (review as ReviewDetail).event_url ?? null;
  const situations = ((review as ReviewDetail).situations ?? []) as string[];

  const SITUATION_LABELS: Record<string, string> = {
    home: "自宅・宅録",
    studio: "スタジオ",
    livehouse: "ライブハウス",
    streaming: "配信",
  };
  const galleryImages =
    images.length > 0
      ? images
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((img) => ({
            url: getFirebaseStorageUrl(img.storage_path),
          }))
      : [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">← トップ</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/reviews">レビュー一覧</Link>
        </Button>
        <ReviewOwnerActions reviewId={review.id} authorId={review.author_id} />
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardDescription className="flex items-center gap-2 flex-wrap">
            {categorySlug ? (
              <Link
                href={`/reviews?category=${encodeURIComponent(categorySlug)}`}
                className="text-electric-blue hover:underline"
              >
                {categoryName}
              </Link>
            ) : (
              <span className="text-electric-blue">{categoryName}</span>
            )}
          </CardDescription>
          <CardTitle className="text-2xl">{review.title}</CardTitle>
          {!isContentOnlyCategory && (
            <div className="flex flex-col gap-0.5 text-gray-300">
              {makerName && (
                <p className="text-sm text-gray-400">{makerName}</p>
              )}
              {review.gear_name && (
                <p className="text-lg">{review.gear_name}</p>
              )}
            </div>
          )}
          {situations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {situations.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2.5 py-0.5 text-[11px] text-electric-blue"
                >
                  {SITUATION_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          )}
          {/* 星評価（機材レビューの場合） */}
          {!isContentOnlyCategory && review.rating > 0 && (
            <div className="flex items-center">
              <StarRating rating={review.rating} />
            </div>
          )}
          {/* ハート・役に立った・比較リスト・Xでポスト：スマホは2列、PCは横並び */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            <ReviewLikeButton reviewId={review.id} initialCount={likeCount} initialLiked={false} className="w-full sm:w-auto justify-center sm:justify-start" />
            <ReviewHelpfulButton reviewId={review.id} initialCount={helpfulCount} className="w-full sm:w-auto justify-center sm:justify-start" />
            <ReviewCompareButton reviewId={review.id} className="w-full sm:w-auto justify-center sm:justify-start" />
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto justify-center sm:justify-start">
              <ShareToXButton path={`/reviews/${review.id}`} text={review.title} />
            </Button>
          </div>
          {/* 投稿者・日付 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {profile && profile.user_id ? (
              <Link
                href={`/users/${encodeURIComponent(profile.user_id)}`}
                className="text-electric-blue hover:underline"
              >
                {profile.display_name
                  ? `${profile.display_name} @${profile.user_id}`
                  : `@${profile.user_id}`}
              </Link>
            ) : profile?.display_name ? (
              <span className="text-gray-500">{profile.display_name}</span>
            ) : null}
            <span className="text-gray-500">
              {new Date(review.created_at).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {galleryImages.length > 0 && <ReviewImagesGallery images={galleryImages} />}

          {categorySlug === "event" && eventUrl && (
            <div className="rounded-lg border border-surface-border bg-surface-card/50 px-4 py-3">
              <p className="text-sm text-gray-400 mb-1">イベントURL</p>
              <a
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-electric-blue hover:underline break-all"
              >
                {eventUrl}
              </a>
            </div>
          )}

          {youtubeEmbedUrl && (
            <div className="w-full overflow-hidden rounded-lg border border-surface-border bg-black aspect-video">
              <iframe
                src={`${youtubeEmbedUrl}?rel=0`}
                title="YouTube video player"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}

          {review.body_md ? (
            <div className="text-sm md:text-base text-gray-100 whitespace-pre-wrap leading-relaxed">
              {review.body_md}
            </div>
          ) : review.body_html ? (
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: review.body_html }}
            />
          ) : (
            <p className="text-gray-500">本文はありません。</p>
          )}
        </CardContent>
      </Card>

      <ECSearchLinks gearName={review.gear_name} makerName={makerName} />
    </div>
  );
}
