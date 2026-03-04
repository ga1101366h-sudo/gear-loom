"use client";

import Link from "next/link";
import { getECSearchLinks } from "@/lib/ec-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ECSearchLinksProps {
  gearName: string;
  makerName?: string | null;
  className?: string;
}

const BUTTON_STYLES: Record<string, string> = {
  Amazon: "bg-[#ff9900] hover:bg-[#e68a00]",
  楽天市場: "bg-[#bf0000] hover:bg-[#a00000]",
  サウンドハウス: "bg-[#5f3c8a] hover:bg-[#4b2f6d]",
  デジマート: "bg-[#0080c6] hover:bg-[#0069a1]",
};

const BUTTON_LABELS: Record<string, string> = {
  Amazon: "Amazonで購入・検索する",
  楽天市場: "楽天市場で購入・検索する",
  サウンドハウス: "サウンドハウスで購入・検索する",
  デジマート: "デジマートで購入・検索する",
};

export function ECSearchLinks({ gearName, makerName, className }: ECSearchLinksProps) {
  const query = [makerName, gearName].filter((v) => v && v.trim().length > 0).join(" ");
  if (!query) return null;

  const links = getECSearchLinks(query);
  if (links.length === 0) return null;

  const xQuery = gearName.trim();
  const xSearchUrl = xQuery
    ? `https://x.com/search?q=${encodeURIComponent(xQuery)}&src=typed_query&f=live`
    : null;

  return (
    <Card className={className}>
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
                className={`w-full rounded-md px-4 py-3 text-sm font-semibold text-white text-center shadow-md transition-transform duration-150 hover:-translate-y-0.5 ${color}`}
              >
                {label}
              </Link>
            );
          })}

          {xSearchUrl && (
            <>
              <Link
                href={xSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-md px-4 py-3 text-sm font-semibold text-white text-center shadow-md transition-transform duration-150 hover:-translate-y-0.5 bg-black hover:bg-zinc-900"
              >
                X でみんなの投稿を見る
              </Link>
              <p className="text-[11px] text-gray-500 text-center">
                商品名で X（旧Twitter）の検索結果ページが開きます。
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
