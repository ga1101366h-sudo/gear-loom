"use client";

import type { LucideIcon } from "lucide-react";
import {
  Cable,
  Drum,
  GitMerge,
  Guitar,
  Headphones,
  LayoutGrid,
  Mic,
  MoreHorizontal,
  Music,
  Piano,
  SlidersHorizontal,
  Speaker,
  Zap,
} from "lucide-react";

/** カテゴリ（親）の icon 名 → Lucide アイコンコンポーネント */
export const CATEGORY_GROUP_ICONS: Record<string, LucideIcon> = {
  Guitar,
  Drum,
  Piano,
  Music,
  Mic,
  Headphones,
  Cable,
  MoreHorizontal,
  SlidersHorizontal,
  GitMerge,
  Zap,
  Speaker,
  LayoutGrid,
};

export function getCategoryGroupIcon(iconName: string): LucideIcon {
  return CATEGORY_GROUP_ICONS[iconName] ?? MoreHorizontal;
}
