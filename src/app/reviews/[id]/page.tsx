import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PenLine, X } from "lucide-react";
import {
  getReviewByIdFromFirestore,
  getReviewLikeCountFromFirestore,
  getReviewHelpfulCountFromFirestore,
  type ReviewDetail,
} from "@/lib/firebase/data";
import { isContentOnlyCategorySlug, getCategoryLabel } from "@/data/post-categories";
import { ECSearchLinks } from "@/components/ec-search-links";
import { ReviewHelpfulButton } from "@/components/review-helpful-button";
import { ReviewCompareButton } from "@/components/review-compare-button";
import { ReviewLikeButton } from "@/components/review-like-button";
import { ReviewAddToOwnedGearButton } from "@/components/review-add-to-owned-gear-button";
import { ReviewImagesGallery } from "@/components/review-images-gallery";
import { ReviewOwnerActions } from "@/components/review-owner-actions";
import { ShareToXButton } from "@/components/share-to-x-button";
import { buildReviewShareText } from "@/lib/x-share";
import { ReviewShareToXButton } from "@/components/review-share-to-x-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const revalidate = 120;

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
  return "https://www.gear-loom.com";
}

/** X・Facebook 等でシェア時の画像は同一ドメインの動的OG画像（opengraph-image）を指定し、確実に表示されるようにする */
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 675; // X推奨 1.78:1

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
  // Twitter/X はスクレイピングで参照する `og:image` が重要なので、
  // どのカテゴリでも必ず応答する動的OG（フォールバック込み）を使う。
  const ogImageUrl = `${origin}/reviews/${id}/opengraph-image`;
  const imageAlt = review.title || review.gear_name || "Gear-Loom レビュー";
  const ogImages = [
    { url: ogImageUrl, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: imageAlt },
  ];

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

  const categorySlug =
    review.categories && "slug" in review.categories
      ? (review.categories as { slug: string }).slug
      : review.category_id ?? "";
  let categoryName = categorySlug
    ? getCategoryLabel(categorySlug)
    : (review.categories && "name_ja" in review.categories ? (review.categories as { name_ja: string }).name_ja : "");
  const isContentOnlyCategory = categorySlug ? isContentOnlyCategorySlug(categorySlug) : false;
  // コンテンツ系カテゴリ（ブログ・イベントなど）は日本語ラベルを明示
  if (categorySlug === "event") {
    categoryName = "イベント";
  } else if (categorySlug === "blog") {
    categoryName = "ブログ";
  } else if (categorySlug === "custom") {
    categoryName = "カスタム手帳";
  }
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

  const prefillCategory = categorySlug || review.category_id;
  const newReviewParams = new URLSearchParams();
  if (prefillCategory) newReviewParams.set("category", prefillCategory);
  if (makerName) newReviewParams.set("manufacturer", makerName);
  if (review.gear_name) newReviewParams.set("gear_name", review.gear_name);
  const newReviewHref =
    `/reviews/new` + (newReviewParams.toString() ? `?${newReviewParams.toString()}` : "");
  const showGearReviewCta =
    !isContentOnlyCategory && !!review.gear_name && review.gear_name.trim().length > 0;

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
              (() => {
                const parts = categorySlug.split("__").filter(Boolean);
                // スラグ分割で階層が取れない場合 or コンテンツ系カテゴリ（event/blog/custom）は単一ラベルで表示
                if (parts.length === 0 || isContentOnlyCategory) {
                  return (
                    <Link
                      href={`/reviews?category=${encodeURIComponent(categorySlug)}`}
                      className="text-electric-blue hover:underline"
                    >
                      {categoryName || categorySlug}
                    </Link>
                  );
                }
                return (
                  <>
                    {parts.map((label, i) => {
                      const slugUpToHere = parts.slice(0, i + 1).join("__");
                      const href = `/reviews?category=${encodeURIComponent(slugUpToHere)}`;
                      return (
                        <span key={`${label}-${i}`}>
                          {i > 0 && <span className="text-gray-500 mx-1">›</span>}
                          <Link href={href} className="text-electric-blue hover:underline">
                            {label}
                          </Link>
                        </span>
                      );
                    })}
                  </>
                );
              })()
            ) : (
              <span className="text-electric-blue">{categoryName}</span>
            )}
          </CardDescription>
          <CardTitle className="text-2xl">{review.title}</CardTitle>
          {!isContentOnlyCategory && (
            <div className="flex flex-col gap-0.5 text-gray-300">
              {makerName && (
                <p className="text-sm">
                  <Link
                    href={`/reviews?q=${encodeURIComponent(makerName)}`}
                    className="inline-flex items-center gap-1 text-electric-blue hover:text-cyan-300 hover:underline"
                  >
                    <span>{makerName}</span>
                    <span className="text-[10px]" aria-hidden>
                      🔎
                    </span>
                  </Link>
                </p>
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
          {/* アクションボタン：上段（役に立った＋持ってる）、下段（いいね・比較・X共有） */}
          <div className="flex flex-col gap-3">
            <div className={`grid gap-3 ${!isContentOnlyCategory ? "grid-cols-2" : "grid-cols-1"}`}>
              <ReviewHelpfulButton
                reviewId={review.id}
                initialCount={helpfulCount}
                className="h-10 w-full flex items-center justify-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2 text-xs font-medium text-gray-200 whitespace-nowrap hover:bg-white/10"
              />
              {!isContentOnlyCategory && (
                <ReviewAddToOwnedGearButton
                  gearName={review.gear_name}
                  categoryNameJa={categoryName}
                  makerName={makerName}
                  className="h-10 w-full"
                />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <ReviewLikeButton
                reviewId={review.id}
                initialCount={likeCount}
                initialLiked={false}
                className="h-10 w-full flex items-center justify-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2 text-xs font-medium text-gray-200 whitespace-nowrap hover:bg-white/10"
              />
              <ReviewCompareButton
                reviewId={review.id}
                className="h-10 w-full flex items-center justify-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2 text-xs font-medium text-gray-200 whitespace-nowrap hover:bg-white/10"
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-10 w-full flex items-center justify-center gap-1.5 rounded-md border border-white/20 bg-zinc-950 px-2 text-xs font-medium text-white whitespace-nowrap shadow-lg shadow-white/5 transition-all hover:bg-zinc-800"
              >
                <ReviewShareToXButton
                  reviewId={review.id}
                  title={review.title}
                  makerName={makerName}
                  gearName={review.gear_name}
                  categoryNameJa={categoryName}
                  categorySlug={categorySlug}
                  authorUid={review.author_id}
                  className="inline-flex h-full w-full items-center justify-center gap-1.5 text-white"
                />
              </Button>
            </div>
          </div>
          {/* 投稿者・日付 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {profile && profile.user_id ? (
              <Link
                href={`/users/${encodeURIComponent(profile.user_id)}`}
                className="text-electric-blue hover:underline transition-colors"
                style={{ textShadow: "0 0 8px rgba(0, 212, 255, 0.5)" }}
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

      {showGearReviewCta && (
        <Card className="my-6 rounded-2xl border border-surface-border/70 bg-slate-900/70 shadow-lg shadow-black/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white sm:text-base">
                <span aria-hidden>💡</span>
                <span>あなたの愛機についても教えてください</span>
              </h3>
              <p className="text-xs text-gray-400 sm:text-sm">
                同じ機材でも使い方は人それぞれ。あなたのセッティングやプレイスタイルでの感想も、ぜひレビューに残してみてください。
              </p>
            </div>
            <Button
              asChild
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/80 bg-transparent px-6 py-2.5 text-xs font-medium text-cyan-300 shadow-none hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors sm:w-auto sm:text-sm"
            >
              <Link href={newReviewHref}>
                <PenLine className="h-4 w-4" aria-hidden="true" />
                <span>この機材のレビュー記事を書く</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <ECSearchLinks
        gearName={review.gear_name}
        makerName={makerName}
        reviewTitle={review.title}
      />
    </div>
  );
}
