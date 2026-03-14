"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { getCategoryPathDisplay } from "@/data/post-categories";
import { isContentOnlyCategorySlug } from "@/data/post-categories";
import type { Review } from "@/types/database";

export const EMPTY_SECTION_CLASS =
  "min-h-[160px] flex flex-col items-center justify-center py-12 text-center space-y-4 rounded-lg border border-dashed border-surface-border bg-surface-card/20 px-4";

export const CAROUSEL_PAGE_SIZE = 5;

export const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a2332' width='400' height='260'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3EGear-Loom%3C/text%3E%3C/svg%3E";

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-electric-blue text-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "opacity-100" : "opacity-30"}>★</span>
      ))}
    </span>
  );
}

export function getFirstReviewImageUrl(r: Review): string | null {
  if (!r.review_images?.length) return null;
  const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const url = getFirebaseStorageUrl(first.storage_path);
  return url || null;
}

export function CarouselNav({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onPrev}
        disabled={currentPage <= 0}
        aria-label="前へ"
      >
        ‹
      </Button>
      <span className="text-xs text-gray-500 tabular-nums">
        {currentPage + 1} / {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onNext}
        disabled={currentPage >= totalPages - 1}
        aria-label="次へ"
      >
        ›
      </Button>
    </div>
  );
}

export function ReviewListItem({
  r,
  imageUrl,
  showStars,
}: {
  r: Review;
  imageUrl: string | null;
  showStars: boolean;
}) {
  return (
    <li>
      <Link
        href={`/reviews/${r.id}`}
        className="flex gap-3 rounded-lg border border-surface-border bg-surface-card/50 overflow-hidden hover:border-electric-blue/50 transition-colors"
      >
        <div className="relative w-24 shrink-0 aspect-[400/260] bg-surface-card">
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill className="object-cover" sizes="96px" />
          ) : (
            <Image src={PLACEHOLDER_IMG} alt="" fill className="object-cover" sizes="96px" unoptimized />
          )}
        </div>
        <div className="min-w-0 py-3 pr-3 flex-1">
          <p className="font-medium text-white line-clamp-1">{r.title}</p>
          <p className="text-sm text-gray-400">{r.gear_name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {showStars && <StarRating rating={r.rating} />}
            <span className="text-xs text-gray-500">
              {(r.categories && "slug" in r.categories
                ? getCategoryPathDisplay((r.categories as { slug: string }).slug)
                : r.category_id
                  ? getCategoryPathDisplay(r.category_id)
                  : "")}
              {" · "}
              {new Date(r.created_at).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

/** 投稿したエフェクターボード用：レビューカードと同じレイアウト（サムネイル＋タイトル・ボード名・日付） */
export function BoardPostListItem({
  post,
  thumbnailUrl,
  onEdit,
  onDelete,
}: {
  post: { id: string; title: string; boardName: string; updatedAt: string };
  thumbnailUrl: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-surface-border bg-surface-card/50 overflow-hidden hover:border-electric-blue/50 transition-colors">
      <Link
        href={`/boards/post/${encodeURIComponent(post.id)}`}
        className="flex min-w-0 flex-1 gap-3"
      >
        <div className="relative w-24 shrink-0 aspect-[400/260] bg-surface-card">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
              unoptimized={thumbnailUrl.startsWith("data:") || thumbnailUrl.startsWith("/")}
            />
          ) : (
            <Image src={PLACEHOLDER_IMG} alt="" fill className="object-cover" sizes="96px" unoptimized />
          )}
        </div>
        <div className="min-w-0 py-3 pr-3 flex-1">
          <p className="font-medium text-white line-clamp-1">{post.title}</p>
          <p className="text-sm text-gray-400">{post.boardName}</p>
          <span className="text-xs text-gray-500 block mt-1">
            {new Date(post.updatedAt).toLocaleDateString("ja-JP")}
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0 py-3 pr-3" onClick={(e) => e.preventDefault()}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            onEdit();
          }}
        >
          編集
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-red-400 hover:text-red-300"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          削除
        </Button>
      </div>
    </li>
  );
}

export { getCategoryPathDisplay, isContentOnlyCategorySlug };
