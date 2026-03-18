"use client";

import Link from "next/link";
import { getECSearchLinks } from "@/lib/ec-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ECSearchLinksProps {
  gearName: string;
  makerName?: string | null;
  className?: string;
  /** レビュー詳細ページ用：メーカー名・機材名が無い場合に使う検索用タイトル */
  reviewTitle?: string;
}

const BUTTON_STYLES: Record<string, string> = {
  Amazon: "bg-[#ff9900] hover:bg-[#e68a00]",
  楽天市場: "bg-[#bf0000] hover:bg-[#a00000]",
  サウンドハウス:
    "flex items-center justify-center gap-2 px-4 py-2 w-full text-sm font-medium transition-colors border rounded-md border-blue-500/50 text-blue-400 hover:bg-blue-500/10",
  デジマート: "bg-[#0080c6] hover:bg-[#0069a1]",
};

const BUTTON_LABELS: Record<string, string> = {
  Amazon: "Amazonで購入・検索する",
  楽天市場: "楽天市場で購入・検索する",
  サウンドハウス: "サウンドハウスで購入・検索する",
  デジマート: "デジマートで購入・検索する",
};

export function ECSearchLinks({
  gearName,
  makerName,
  className,
  reviewTitle,
}: ECSearchLinksProps) {
  const ecQuery = [makerName, gearName].filter((v) => v && v.trim().length > 0).join(" ");
  if (!ecQuery) return null;

  const links = getECSearchLinks(ecQuery);
  if (links.length === 0) return null;

  const baseSearchQuery =
    [makerName, gearName].filter((v) => v && v.trim().length > 0).join(" ") ||
    reviewTitle?.trim() ||
    "";

  const encodedSearch = baseSearchQuery ? encodeURIComponent(baseSearchQuery) : null;
  const xSearchUrl = encodedSearch
    ? `https://x.com/search?q=${encodedSearch}&src=typed_query&f=live`
    : null;
  const youtubeSearchUrl = encodedSearch
    ? `https://www.youtube.com/results?search_query=${encodedSearch}`
    : null;

  const wrapperClassName = className
    ? `space-y-4 ${className}`
    : "space-y-4";

  return (
    <div className={wrapperClassName}>
      <Card>
        <CardHeader className="pb-3 border-b border-surface-border/60">
          <CardTitle className="text-sm font-medium text-gray-300">
            この機材を購入・検索する
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
            {links.map(({ name, url }) => {
              const color = BUTTON_STYLES[name] ?? "bg-electric-blue hover:bg-electric-blue-dim";
              const label = BUTTON_LABELS[name] ?? `${name}で購入・検索する`;
              return (
                <Link
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    name === "サウンドハウス"
                      ? color
                      : `w-full rounded-md px-4 py-3 text-sm font-semibold text-white text-center shadow-md transition-transform duration-150 hover:-translate-y-0.5 ${color}`
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {(xSearchUrl || youtubeSearchUrl) && (
        <Card>
          <CardHeader className="pb-3 border-b border-surface-border/60">
            <CardTitle className="text-sm font-medium text-gray-300">
              他の投稿や試奏動画を探す
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
              {xSearchUrl && (
                <Link
                  href={xSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-md px-4 py-3 text-sm font-semibold text-white text-center shadow-md transition-transform duration-150 hover:-translate-y-0.5 bg-black hover:bg-zinc-900"
                >
                  X でみんなの投稿を見る
                </Link>
              )}

              {youtubeSearchUrl && (
                <Link
                  href={youtubeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-md px-4 py-3 text-sm font-semibold text-white text-center shadow-md transition-transform duration-150 hover:-translate-y-0.5 bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <span className="text-base" aria-hidden>
                    ▶
                  </span>
                  <span>YouTubeで検索する</span>
                </Link>
              )}

              {(xSearchUrl || youtubeSearchUrl) && (
                <p className="text-[11px] text-gray-500 text-center">
                  商品名やタイトルで各サービスの検索結果ページが開きます。
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
