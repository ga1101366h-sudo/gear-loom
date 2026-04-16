"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { shouldUnoptimizeFirebaseStorage } from "@/lib/image-optimization";
import { CATEGORY_LEVEL1, CATEGORY_LEVEL2 } from "@/data/category-hierarchy";
import { getGroupSlugByCategorySlug } from "@/data/post-categories";
import type { Review } from "@/types/database";

// category_slug（Firestore上の実際のスラッグ）を取得
function resolveCategorySlug(review: Review): string {
  const slug =
    review.categories && "slug" in review.categories
      ? (review.categories as { slug: string }).slug
      : review.category_id;
  return slug ?? "";
}

// getGroupSlugByCategorySlug を使って Level1 ID に正規化
// Japanese path slugs (e.g. "ギター__エレキギター__ストラト") も解決できるよう拡張
function getTopLevelId(review: Review): string {
  const slug = resolveCategorySlug(review);
  if (!slug) return "other";

  const result = getGroupSlugByCategorySlug(slug);

  // 英語の Level1 ID として解決済みならそのまま返す
  if (CATEGORY_LEVEL1.some((c) => c.id === result)) return result;

  // 日本語パス形式を解決: "L1名__L2名__L3名" または "L2名__L3名"
  const parts = slug.split("__").filter(Boolean);
  if (parts.length >= 2) {
    // 先頭が Level1 の日本語名か？
    const l1ByName = CATEGORY_LEVEL1.find((c) => c.name === parts[0]);
    if (l1ByName) return l1ByName.id;
    // 先頭が Level2 の日本語名か？（2階層形式）
    const l2ByName = CATEGORY_LEVEL2.find((c) => c.name === parts[0]);
    if (l2ByName) return l2ByName.parentId;
  } else if (parts.length === 1) {
    const l1ByName = CATEGORY_LEVEL1.find((c) => c.name === parts[0]);
    if (l1ByName) return l1ByName.id;
  }

  return "other";
}

// ----------------------------------------------------------------
// ユーティリティ
// ----------------------------------------------------------------
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%231a2332' width='400' height='400'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3EGear-Loom%3C/text%3E%3C/svg%3E";

function getFirstImageUrl(review: Review): string | null {
  if (!review.review_images?.length) return null;
  const first = [...review.review_images].sort(
    (a, b) => a.sort_order - b.sort_order
  )[0];
  return getFirebaseStorageUrl(first.storage_path) || null;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----------------------------------------------------------------
// PhotoGallery コンポーネント
// ----------------------------------------------------------------
export function PhotoGallery({ reviews }: { reviews: Review[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [shuffleKey, setShuffleKey] = useState(0);

  // 画像付きレビューのみ抽出
  const reviewsWithImages = useMemo(
    () => reviews.filter((r) => r.review_images && r.review_images.length > 0),
    [reviews]
  );

  // 実際のデータにある Level1 カテゴリだけタブに表示
  const availableCategories = useMemo(() => {
    const presentIds = new Set(
      reviewsWithImages.map((r) => getTopLevelId(r))
    );
    return CATEGORY_LEVEL1.filter((c) => presentIds.has(c.id));
  }, [reviewsWithImages]);

  // カテゴリフィルター適用
  const filtered = useMemo(() => {
    if (selectedCategory === "all") return reviewsWithImages;
    return reviewsWithImages.filter(
      (r) => getTopLevelId(r) === selectedCategory
    );
  }, [reviewsWithImages, selectedCategory]);

  // シャッフル（shuffleKey が変わるたびに再計算）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const displayed = useMemo(() => shuffleArray(filtered), [filtered, shuffleKey]);

  const handleShuffle = useCallback(() => setShuffleKey((k) => k + 1), []);

  const handleCategoryChange = useCallback((id: string) => {
    setSelectedCategory(id);
    setShuffleKey((k) => k + 1); // カテゴリ切替時もシャッフル
  }, []);

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">フォト</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          className="gap-2 text-gray-300 border-gray-600 hover:text-white"
        >
          <Shuffle className="w-4 h-4" />
          シャッフル
        </Button>
      </div>

      {/* カテゴリフィルタータブ */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleCategoryChange("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-electric-blue text-white"
              : "bg-surface-card text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          すべて
        </button>
        {availableCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-electric-blue text-white"
                : "bg-surface-card text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 件数表示 */}
      <p className="text-xs text-gray-500">
        {displayed.length}件
      </p>

      {/* フォトグリッド */}
      {displayed.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          {selectedCategory === "all"
            ? "まだ画像付きの投稿がありません。"
            : "このカテゴリの画像はまだありません。"}
        </div>
      ) : (
        <ul className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {displayed.map((r) => {
            const imageUrl = getFirstImageUrl(r);
            const href = `/reviews/${r.id}`;

            return (
              <li key={r.id}>
                <Link
                  href={href}
                  className="group relative block aspect-square overflow-hidden rounded-lg bg-surface-card"
                >
                  <Image
                    src={imageUrl ?? PLACEHOLDER_IMG}
                    alt={r.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    unoptimized={
                      imageUrl
                        ? shouldUnoptimizeFirebaseStorage(imageUrl)
                        : true
                    }
                  />
                  {/* ホバーオーバーレイ */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                    <p className="text-white text-xs font-bold line-clamp-2 leading-snug">
                      {r.title}
                    </p>
                    {r.gear_name && (
                      <p className="text-gray-300 text-xs mt-0.5 truncate">
                        {r.gear_name}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
