"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { getFirebaseStorageUrl } from "@/lib/utils";
import { isContentOnlyCategorySlug } from "@/data/post-categories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Review } from "@/types/database";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-electric-blue text-sm" aria-label={`${rating}点`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "opacity-100" : "opacity-30"}>
          ★
        </span>
      ))}
    </span>
  );
}

const SITUATION_LABELS: Record<string, string> = {
  home: "自宅・宅録",
  studio: "スタジオ",
  livehouse: "ライブハウス",
  streaming: "配信",
};

function getBodySnippet(r: Review): string {
  if (r.body_md && r.body_md.trim()) return r.body_md.trim();
  if (r.body_html && r.body_html.trim()) {
    const text = r.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text || "本文なし";
  }
  return "本文なし";
}

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a2332' width='400' height='260'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3EGear-Loom%3C/text%3E%3C/svg%3E";

function getFirstReviewImageUrl(r: Review): string | null {
  if (!r.review_images?.length) return null;
  const first = [...r.review_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const url = getFirebaseStorageUrl(first.storage_path);
  return url || null;
}

export default function ReviewComparePage() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseFirestore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !db) {
      setLoading(false);
      return;
    }
    (async () => {
      const uid = user.uid;
      const comparesSnap = await getDocs(
        query(collection(db, "review_compares"), where("user_id", "==", uid)),
      );
      const reviewIds = comparesSnap.docs.map((d) => d.data().review_id as string).filter(Boolean);
      const uniqueIds = Array.from(new Set(reviewIds)).slice(0, 8); // 最大8件まで
      const result: Review[] = [];
      const promises = uniqueIds.map((rid) =>
        getDoc(doc(db, "reviews", rid)).then((snap) => {
          if (!snap.exists()) return null;
          const data = snap.data()!;
          return {
            id: snap.id,
            author_id: data.author_id ?? "",
            category_id: data.category_id ?? "",
            maker_id: data.maker_id ?? null,
            maker_name: (data.maker_name as string | null) ?? null,
            title: data.title ?? "",
            gear_name: data.gear_name ?? "",
            rating: data.rating ?? 0,
            body_md: data.body_md ?? null,
            body_html: data.body_html ?? null,
            youtube_url: (data.youtube_url as string | null) ?? null,
            situations: (data.situations as string[] | null) ?? null,
            created_at: data.created_at ?? "",
            updated_at: data.updated_at ?? "",
            categories: data.category_name_ja
              ? {
                  id: "",
                  slug: (data.category_slug as string) ?? "",
                  name_ja: data.category_name_ja,
                  name_en: null,
                  sort_order: 0,
                  created_at: "",
                }
              : undefined,
            review_images: (data.review_images as { storage_path: string; sort_order: number }[] | undefined) ?? [],
          } as Review;
        }),
      );
      const loaded = await Promise.all(promises);
      result.push(...loaded.filter((r): r is Review => r != null));
      setReviews(result);
      setLoading(false);
    })();
  }, [user, authLoading, db]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">
        比較リストを読み込み中です…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-400 space-y-4">
        <p>比較リストを見るにはログインが必要です。</p>
        <Button asChild>
          <Link href="/login?next=/reviews/compare">ログインする</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">比較リスト</h1>
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            まだ比較リストに追加されたレビューがありません。レビュー詳細ページの「比較リストに追加」から登録できます。
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-electric-blue text-lg">レビュー比較</CardTitle>
            <CardDescription>
              最大8件まで、機材や評価・シチュエーション・本文をカード形式で比較できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {reviews.map((r) => {
                const imageUrl = getFirstReviewImageUrl(r);
                const showStars = !isContentOnlyCategorySlug(r.category_id) && r.rating > 0;
                return (
                <div
                  key={r.id}
                  className="rounded-lg border border-surface-border bg-surface-card/60 overflow-hidden space-y-2"
                >
                  <div className="relative aspect-[400/260] w-full bg-surface-card shrink-0">
                    <Link href={`/reviews/${r.id}`} className="block size-full">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        />
                      ) : (
                        <Image
                          src={PLACEHOLDER_IMG}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 25vw"
                          unoptimized
                        />
                      )}
                    </Link>
                  </div>
                  <div className="p-4 space-y-2">
                  <div>
                    <Link
                      href={`/reviews/${r.id}`}
                      className="font-medium text-white hover:text-electric-blue line-clamp-2"
                    >
                      {r.title}
                    </Link>
                    <div className="text-xs text-gray-400 line-clamp-1">{r.gear_name}</div>
                  </div>
                  <div className="text-[11px] text-gray-500 border-t border-surface-border/60 pt-2">
                    メーカー
                  </div>
                  <div className="text-sm text-gray-200">{r.maker_name || "-"}</div>
                  <div className="text-[11px] text-gray-500 border-t border-surface-border/60 pt-2">
                    評価
                  </div>
                  <div>
                    {showStars && <StarRating rating={r.rating} />}
                  </div>
                  <div className="text-[11px] text-gray-500 border-t border-surface-border/60 pt-2">
                    シチュエーション
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(r.situations ?? []).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2 py-0.5 text-[11px]"
                      >
                        {SITUATION_LABELS[s] ?? s}
                      </span>
                    ))}
                    {(r.situations ?? []).length === 0 && (
                      <span className="text-xs text-gray-500">未設定</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 border-t border-surface-border/60 pt-2">
                    本文（抜粋）
                  </div>
                  <div className="text-xs text-gray-300 whitespace-pre-wrap line-clamp-5">
                    {getBodySnippet(r)}
                  </div>
                  </div>
                </div>
              );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

