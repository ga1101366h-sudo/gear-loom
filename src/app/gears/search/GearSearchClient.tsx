"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setPendingGear } from "@/lib/pending-gear";
import type { GearSearchResult } from "@/app/api/gears/search/route";

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%231a2332' width='200' height='200'/%3E%3Ctext fill='%236b7280' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12'%3E機材%3C/text%3E%3C/svg%3E";

export function GearSearchClient() {
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qFromUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GearSearchResult | null>(null);

  const runSearch = useCallback(async (keyword: string) => {
    const q = keyword.trim();
    if (!q) {
      setResult({ gears: [], apiItems: [] });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/gears/search?q=${encodeURIComponent(q)}`
      );
      const data = (await res.json()) as GearSearchResult;
      setResult(data);
    } catch {
      setResult({ gears: [], apiItems: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(qFromUrl);
    if (qFromUrl.trim()) runSearch(qFromUrl);
    else setResult(null);
  }, [qFromUrl, runSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const url = new URL(window.location.href);
    url.searchParams.set("q", q);
    window.history.pushState({}, "", url.toString());
    runSearch(q);
  }

  /** 未登録機材をクリック → 仮レビュー画面へ（DBには保存しない） */
  function handleOpenReviewWithApiGear(item: GearSearchResult["apiItems"][0]) {
    setPendingGear({
      name: item.itemName,
      imageUrl: item.imageUrl || "",
      affiliateUrl: item.affiliateUrl || item.itemUrl,
    });
    router.push("/reviews/new?from=rakuten");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="機材名で検索（例: Strymon BigSky）"
          className="flex-1 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-white placeholder:text-gray-500 focus:border-electric-blue focus:outline-none focus:ring-1 focus:ring-electric-blue"
          aria-label="機材検索"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "検索中…" : "検索"}
        </Button>
      </form>

      {loading && (
        <p className="text-sm text-gray-400">検索しています…</p>
      )}

      {result && !loading && (
        <>
          {result.gears.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">
                登録済み機材（{result.gears.length}件）
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {result.gears.map((g) => (
                  <li key={g.id}>
                    <Card className="h-full overflow-hidden transition-all hover:border-electric-blue/50">
                      <Link href={`/gears/${g.id}`} className="block">
                        <div className="relative aspect-square w-full bg-surface-card">
                          {g.imageUrl ? (
                            <Image
                              src={g.imageUrl}
                              alt={g.name}
                              fill
                              className="object-cover"
                              sizes="(max-width:640px) 100vw, 25vw"
                              unoptimized
                            />
                          ) : (
                            <div
                              className="h-full w-full bg-surface-card"
                              style={{ backgroundImage: `url(${PLACEHOLDER_IMG})`, backgroundSize: "cover" }}
                            />
                          )}
                        </div>
                        <CardHeader className="p-3">
                          <CardTitle className="line-clamp-2 text-base text-white">
                            {g.name}
                          </CardTitle>
                          {g.reviewCount > 0 && (
                            <CardDescription className="text-xs text-gray-400">
                              レビュー {g.reviewCount}件
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Link>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.apiItems.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">
                楽天から見つかった機材（レビューを書くと機材が登録されます）
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {result.apiItems.map((item) => {
                  const key = item.itemName + item.itemUrl;
                  return (
                    <li key={key}>
                      <Card className="h-full overflow-hidden transition-all">
                        <div className="relative aspect-square w-full bg-surface-card">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.itemName}
                              fill
                              className="object-cover"
                              sizes="(max-width:640px) 100vw, 25vw"
                              unoptimized
                            />
                          ) : (
                            <div
                              className="h-full w-full bg-surface-card"
                              style={{ backgroundImage: `url(${PLACEHOLDER_IMG})`, backgroundSize: "cover" }}
                            />
                          )}
                        </div>
                        <CardHeader className="p-3">
                          <CardTitle className="line-clamp-2 text-base text-white">
                            {item.itemName}
                          </CardTitle>
                          {item.itemPrice != null && (
                            <CardDescription className="text-xs text-gray-400">
                              ￥{item.itemPrice.toLocaleString()}
                              {item.shopName && ` ・ ${item.shopName}`}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleOpenReviewWithApiGear(item)}
                          >
                            この機材でレビューを書く
                          </Button>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {result.gears.length === 0 && result.apiItems.length === 0 && query.trim() && (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                該当する機材は見つかりませんでした。別のキーワードで検索してみてください。
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!result && !loading && query.trim() === "" && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            上の検索窓で機材名を入力して検索してください。
          </CardContent>
        </Card>
      )}
    </div>
  );
}
