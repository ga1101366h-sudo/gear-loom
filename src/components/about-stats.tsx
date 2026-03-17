"use client";

import useSWR from "swr";
import type { AboutPageCounts } from "@/lib/firebase/data";

const NUMBER_ITEMS = [
  { key: "reviews" as const, unit: "件", label: "投稿されたレビュー" },
  { key: "profiles" as const, unit: "人", label: "登録ユーザー" },
  { key: "boardPosts" as const, unit: "件", label: "投稿されたエフェクターボード" },
  { key: "liveEvents" as const, unit: "件", label: "登録されたライブ日程" },
] as const;

function formatCount(n: number | undefined): string {
  if (n == null) return "…";
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
  if (n > 0) return `${n}+`;
  return "0";
}

type Props = {
  initialCounts: AboutPageCounts;
};

export function AboutStats({ initialCounts }: Props) {
  const { data, isLoading } = useSWR<AboutPageCounts>(
    "/api/about/stats",
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch about stats");
      return (await res.json()) as AboutPageCounts;
    },
    {
      fallbackData: initialCounts,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
    }
  );

  const counts = data ?? initialCounts;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {NUMBER_ITEMS.map((item) => {
        const value = counts[item.key];
        const display = formatCount(value);
        const isSkeleton = isLoading && value == null;
        return (
          <div
            key={item.label}
            className="rounded-2xl border border-surface-border/80 bg-black/50 p-8 text-center shadow-lg backdrop-blur-sm"
          >
            <p className="font-display text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-700 sm:text-6xl md:text-7xl">
              {isSkeleton ? (
                <span className="inline-block w-16 animate-pulse text-gray-600">…</span>
              ) : (
                <>
                  {display}
                  <span className="text-2xl sm:text-3xl md:text-4xl">{item.unit}</span>
                </>
              )}
            </p>
            <p className="mt-2 text-sm font-medium text-gray-300 sm:text-base">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

