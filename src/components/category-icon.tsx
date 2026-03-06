"use client";

import type { LucideIcon } from "lucide-react";
import {
  Cable,
  Drum,
  GitMerge,
  Guitar,
  Headphones,
  Mic,
  Music,
  Piano,
  SlidersHorizontal,
  Speaker,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CategoryIconProps = {
  /** 日本語のカテゴリ名（例: ベース, ベースエフェクター, スイッチャー・ルーティング機器 など） */
  name?: string | null;
  className?: string;
};

function pickIconByCategoryName(name?: string | null): LucideIcon {
  const raw = (name ?? "").trim();
  if (!raw) return Music;

  // 判定は日本語ラベルベースでざっくり行う（優先度の高いものから順に）
  if (raw.includes("スイッチャー") || raw.includes("ルーティング")) return GitMerge;
  if (raw.includes("エフェクター") || raw.includes("エフェクト")) return SlidersHorizontal;
  if (raw.includes("アンプ")) return Speaker;
  if (raw.includes("ベース") || raw.includes("ギター")) return Guitar;
  if (raw.includes("ドラム") || raw.includes("パーカッション")) return Drum;
  if (raw.includes("ピアノ") || raw.includes("キーボード") || raw.includes("シンセ")) return Piano;
  if (raw.includes("マイク")) return Mic;
  if (raw.includes("ヘッドホン") || raw.includes("イヤホン")) return Headphones;
  if (raw.includes("ケーブル")) return Cable;

  return Music;
}

export function CategoryIcon({ name, className }: CategoryIconProps) {
  const Icon = pickIconByCategoryName(name);
  return <Icon className={cn("h-3.5 w-3.5 text-current", className)} aria-hidden />;
}

