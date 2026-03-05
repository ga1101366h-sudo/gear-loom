"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const PLACEHOLDER_PHRASES = [
  "例: ストラトキャスター",
  "例: BOSS BD-2 レビュー",
  "例: 空間系エフェクター",
  "気になる機材を探してみよう...",
];

const ROTATE_MS = 3500;

export function HeroSearchInput() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PLACEHOLDER_PHRASES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <form
      action="/reviews"
      method="get"
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      role="search"
    >
      <input
        type="search"
        name="q"
        placeholder={PLACEHOLDER_PHRASES[index]}
        aria-label="レビューを検索"
        className="flex-1 min-w-0 rounded-xl border border-white/20 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-gray-400 focus:border-electric-blue/50 focus:outline-none focus:ring-2 focus:ring-electric-blue/25 backdrop-blur-sm md:text-base md:py-2.5 md:px-4"
      />
      <Button
        type="submit"
        variant="default"
        className="shrink-0 min-h-[40px] rounded-xl px-4 md:min-h-[42px] md:px-5"
      >
        検索
      </Button>
    </form>
  );
}
