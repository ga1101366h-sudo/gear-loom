/**
 * 楽天API ジャンルIDマッピング
 * キーワード検索時は「楽器・音響機器」で絞り込み、関係ない商品ヒットを防ぐ
 */

import { normalizeCategorySlug } from "./post-categories";

/** メガメニュー用：3階層（mainCategory > subGroups > items） */
export type { CategoryData } from "./categories";
export { MEGA_MENU_CATEGORIES } from "./categories";

/** 楽器・音響機器（大ジャンル）。キーワード検索時に必ず指定する */
export const RAKUTEN_GENRE_INSTRUMENTS = 112493;

/** 親カテゴリID → 楽天ジャンルID（新階層用） */
const PARENT_TO_RAKUTEN_GENRE: Record<string, number> = {
  effector: 211182,
  "switcher-routing": 205905,
  "power-board": 205905,
  amp: 205909,
  instrument: 205906,
  "pa-recording": 406336,
  accessory: 566957,
  other: RAKUTEN_GENRE_INSTRUMENTS,
};

/**
 * サイトのカテゴリスラッグ（旧単体 or 新 parent__child）→ 楽天ジャンルID
 * 新スラッグは親IDでマッピング。未定義は RAKUTEN_GENRE_INSTRUMENTS
 */
export const CATEGORY_SLUG_TO_RAKUTEN_GENRE: Record<string, number> = {
  "eleki-guitar": 205906,
  "aco-classic-guitar": 205907,
  "bass-body": 205993,
  "bass-effector": 211182,
  "effector-board": 205905,
  "switcher-routing": 205905,
  "power-supply": 205905,
  "effector-board-base": 205905,
  "amp-body": 205909,
  "drum-set": 211260,
  "snare-cymbal-pedal": 211233,
  "e-drum": 505086,
  "percussion": RAKUTEN_GENRE_INSTRUMENTS,
  "synth-keyboard": 551197,
  "piano-e-piano": 551197,
  "brass": 204210,
  "woodwind": 204210,
  "strings": 203020,
  "mic": 406336,
  "audio-interface": 206045,
  "monitor-headphone": RAKUTEN_GENRE_INSTRUMENTS,
  "dtm-soft": 206024,
  "mixer-pa": 566955,
  "dj-controller": 563796,
  "streaming-gear": 566955,
  "cable-shield": 566957,
  "string-pick-stick": 566957,
  "case-stand": 566957,
  "wagakki": RAKUTEN_GENRE_INSTRUMENTS,
  "custom": RAKUTEN_GENRE_INSTRUMENTS,
};

export function getRakutenGenreIdForCategory(slug: string): number {
  const normalized = normalizeCategorySlug(slug);
  const parentId = normalized.includes("__") ? normalized.split("__")[0] : normalized;
  return PARENT_TO_RAKUTEN_GENRE[parentId] ?? CATEGORY_SLUG_TO_RAKUTEN_GENRE[slug] ?? RAKUTEN_GENRE_INSTRUMENTS;
}
