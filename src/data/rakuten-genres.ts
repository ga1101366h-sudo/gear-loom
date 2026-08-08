/**
 * 楽天API ジャンルIDマッピング
 * キーワード検索時は「楽器・音響機器」で絞り込み、関係ない商品ヒットを防ぐ
 *
 * ★2026-08-08 修正（案2a）
 *  旧実装は「マップのキーの階層」と「引き当てに使う値の階層」が食い違っていて、
 *  事実上すべてのカテゴリが汎用ジャンル 112493（楽器・音響機器）に落ちていた。
 *    - PARENT_TO_RAKUTEN_GENRE のキーは effector / amp / instrument … 系の文字列だったが、
 *      引き当てには slug（level2Id__level3Id）の先頭＝ level2 id（bass-effector など）を渡していた。
 *    - CATEGORY_SLUG_TO_RAKUTEN_GENRE には単体 slug（bass-effector など）しか無いのに、
 *      引き当てには生の slug（bass-effector__overdrive）を渡していたので構造上ヒットしない。
 *  そのため、どのカテゴリページも同じ20商品を表示していた（2026-08-08 調査・レビューD）。
 *
 *  修正方針＝カテゴリ階層（category-hierarchy.ts）の id をそのままキーにする。
 *    個別上書き → Level2 → Level1 → メガメニュー第1階層名（日本語）→ 汎用 の順に引く。
 *
 * ★ジャンルIDの出典（すべて実測。2026-08-08）
 *  - ジャンル名 … https://search.rakuten.co.jp/search/mall/-/<genreId>/ の <title>
 *  - 親子関係 … 同ページ内 JSON-LD の BreadcrumbList（rakuten.co.jp/category/<genreId>/）
 *  - 楽天のジャンル検索API（IchibaGenre/Search）は現在の認証情報では 404 / wrong_parameter で使えないため、
 *    上記の公開ジャンルページと、商品検索APIが返す各商品の genreId の集計で確認した。
 */

import { normalizeCategorySlug } from "./post-categories";
import {
  CATEGORY_LEVEL2,
  CATEGORY_LEVEL3,
  getCategorySlugFromDisplayPath,
  getLevel2IdBySubGroupName,
} from "./category-hierarchy";
import { MEGA_MENU_CATEGORIES } from "./categories";

/** メガメニュー用：3階層（mainCategory > subGroups > items） */
export type { CategoryData } from "./categories";
export { MEGA_MENU_CATEGORIES } from "./categories";

/** 楽器・音響機器（大ジャンル）。キーワード検索時に必ず指定する */
export const RAKUTEN_GENRE_INSTRUMENTS = 112493;

/**
 * Level1（大カテゴリ）id → 楽天ジャンルID
 * キーは category-hierarchy.ts の CATEGORY_LEVEL1.id と一致させること。
 */
const LEVEL1_TO_RAKUTEN_GENRE: Record<string, number> = {
  guitar: 566956, // ギター（ギター・ベース）
  bass: 112499, // ベース（ギター・ベース）
  amp: 205909, // アンプ（ギター用アクセサリー・パーツ）※楽天に「アンプ」単独ジャンルは無い
  effector: 205905, // エフェクター（ギター用アクセサリー・パーツ）
  drum: 211233, // ドラム
  keyboard: 203018, // ピアノ・キーボード
  wind: 204210, // 管楽器・吹奏楽器
  string: 203020, // 弦楽器
  japanese: 203019, // 和楽器
  dtm: 206024, // DAW・DTM・レコーダー
  dj: 204228, // DJ機器
  stand: 566965, // スタンド・ハンガー（ギター・ベース アクセサリー・パーツ）
  cable: 406370, // ケーブル（アクセサリー）
  rack: 206036, // 機材ケース・ラック・マウント（PA機器）
  // 照明・ステージは楽器・音響機器ジャンルに該当ジャンルが無い（実測：商品は「その他」に散る）
  lighting: RAKUTEN_GENRE_INSTRUMENTS,
  stage: RAKUTEN_GENRE_INSTRUMENTS,
  other: RAKUTEN_GENRE_INSTRUMENTS,
};

/**
 * Level2（中カテゴリ）id → 楽天ジャンルID
 * キーは category-hierarchy.ts の CATEGORY_LEVEL2.id と一致させること。
 * ここに無い level2 は Level1 のジャンルにフォールバックする。
 */
const LEVEL2_TO_RAKUTEN_GENRE: Record<string, number> = {
  // Guitar
  "electric-guitar": 205906, // エレキギター
  "acoustic-guitar": 400258, // アコースティックギター（205907 は商品0件の旧ジャンル。実測で差し替え）
  "guitar-parts": 205908, // ギター用アクセサリー・パーツ
  "guitar-accessory": 205908,
  // Bass
  "electric-bass": 205993, // エレキベース
  "acoustic-bass": 211150, // アコースティックベース
  "bass-parts": 205994, // ベース用アクセサリー・パーツ
  // Amp
  "guitar-amp": 205909, // アンプ（ギター用）
  "bass-amp": 205995, // アンプ（ベース用）
  "acoustic-amp": 205909, // 実測：アコースティックギターアンプの商品も 205909 に入っている
  // ※ keyboard-amp は楽天に該当ジャンルが無いため Level1（amp）にフォールバックさせる
  // Effector
  "guitar-effector": 205905, // エフェクター（ギター用）
  "bass-effector": 211182, // エフェクター（ベース用）
  switcher: 205905,
  "multi-effector": 205905,
  outboard: 568296, // エフェクター・プロセッサー（PA機器）
  // Drum
  "drum-set": 211260, // ドラムセット
  snare: 211244, // スネア
  cymbal: 211234, // クラッシュシンバル
  "electronic-drum": 505086, // 電子ドラム
  percussion: 211307, // パーカッション・打楽器
  // Keyboard
  synth: 551197, // キーボード・シンセサイザー
  piano: 211219, // 電子ピアノ
  "keyboard-acc": 203018, // ピアノ・キーボード（アクセサリー専用ジャンルは使わない）
  // DTM
  "audio-interface": 206045, // オーディオインターフェイス
  "daw-soft": 206024, // DAW・DTM・レコーダー
  monitor: 500247, // モニターヘッドホン（PA機器）
  mic: 406336, // マイク（PA機器）
  // Other（コンテンツ系）は楽天カタログの対象外なので登録しない
};

/**
 * メガメニューの第1階層名（日本語）→ 楽天ジャンルID
 * `/category/ギター` のように第1階層名がそのまま slug になるURLがあるため必要。
 * ここに無い第1階層名は汎用ジャンルになる。
 */
const MAIN_CATEGORY_NAME_TO_RAKUTEN_GENRE: Record<string, number> = {
  ギター: 566956,
  ベース: 112499,
  マイク: 406336,
  "ヘッドホン・イヤホン": 500247,
  配信機材: 566955, // PA機器
  ウクレレ: 211209, // ウクレレ（弦楽器）
  "ドラム・パーカッション": 211233,
  "ピアノ・シンセサイザー": 203018,
  管楽器: 204210,
  弦楽器: 203020,
  和楽器: 203019,
  "DTM・DAW": 206024,
  "DJ & VJ": 204228,
  スタンド各種: 566965,
  "ケーブル・コネクター": 406370,
  "ラック・ケース": 206036,
};

/**
 * サイトのカテゴリスラッグ（旧単体 slug、または個別に上書きしたい slug）→ 楽天ジャンルID
 * 階層で引けるものはここに書かない（二重管理を避ける）。ここは例外の置き場。
 */
export const CATEGORY_SLUG_TO_RAKUTEN_GENRE: Record<string, number> = {
  // 旧スラッグ（LEGACY_SLUG_TO_NEW で変換されないもの）
  "eleki-guitar": 205906,
  "aco-classic-guitar": 400258,
  "bass-body": 205993,
  "effector-board": 205905,
  "switcher-routing": 205905,
  "power-supply": 205905,
  "effector-board-base": 205905,
  "amp-body": 205909,
  "snare-cymbal-pedal": 211244,
  "e-drum": 505086,
  "synth-keyboard": 551197,
  "piano-e-piano": 211219,
  brass: 204210,
  woodwind: 204210,
  strings: 203020,
  "monitor-headphone": 500247,
  "dtm-soft": 206024,
  "mixer-pa": 566955,
  "dj-controller": 563796,
  "streaming-gear": 566955,
  "cable-shield": 406372, // シールドケーブル
  "string-pick-stick": 566957,
  "case-stand": 566965,
  wagakki: 203019,
  custom: RAKUTEN_GENRE_INSTRUMENTS,
};

/**
 * 日本語の表示名パス「大__中__小」（既存レビューの category_id 形式）を、引き当て可能なキーに変換する。
 * ① 英語 slug（level2Id__level3Id）→ ② 中カテゴリの level2 id → ③ 第1階層名（日本語）の順に落とす。
 * ※メガメニューの表示名は category-hierarchy の階層より細かく、①で解決できないものが実在するため。
 */
function toEnglishSlugIfDisplayPath(slug: string): string {
  const parts = slug.split("__").map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 3) return slug;
  const [mainName, subTitle, itemName] = parts;
  if (!MEGA_MENU_CATEGORIES.some((c) => c.mainCategory === mainName)) return slug;
  return (
    getCategorySlugFromDisplayPath(mainName, subTitle, itemName) ??
    getLevel2IdBySubGroupName(subTitle) ??
    mainName
  );
}

/**
 * カテゴリ slug から、そのカテゴリに対応する楽天ジャンルIDを返す。
 * 引き当ての順序：個別上書き → Level2 → Level1 → 第1階層名（日本語）→ 汎用（楽器・音響機器）
 */
export function getRakutenGenreIdForCategory(slug: string): number {
  const raw = (slug || "").trim();
  if (!raw) return RAKUTEN_GENRE_INSTRUMENTS;

  const normalized = toEnglishSlugIfDisplayPath(normalizeCategorySlug(raw));

  // 1. 個別上書き（旧スラッグなど）
  const override = CATEGORY_SLUG_TO_RAKUTEN_GENRE[normalized];
  if (override) return override;

  // 2. level2Id__level3Id 形式 → level2 → level1
  if (normalized.includes("__")) {
    const level2Id = normalized.split("__")[0];
    const byLevel2 = LEVEL2_TO_RAKUTEN_GENRE[level2Id];
    if (byLevel2) return byLevel2;
    const level1Id = CATEGORY_LEVEL2.find((c) => c.id === level2Id)?.parentId;
    if (level1Id && LEVEL1_TO_RAKUTEN_GENRE[level1Id]) return LEVEL1_TO_RAKUTEN_GENRE[level1Id];
    return RAKUTEN_GENRE_INSTRUMENTS;
  }

  // 3. 単体の level2 id
  const byLevel2 = LEVEL2_TO_RAKUTEN_GENRE[normalized];
  if (byLevel2) return byLevel2;

  // 4. 単体の level1 id
  const byLevel1 = LEVEL1_TO_RAKUTEN_GENRE[normalized];
  if (byLevel1) return byLevel1;

  // 5. 単体の level3 id（親の level2 → level1 で引く）
  const level3 = CATEGORY_LEVEL3.find((c) => c.id === normalized);
  if (level3) {
    const byParentLevel2 = LEVEL2_TO_RAKUTEN_GENRE[level3.parentId];
    if (byParentLevel2) return byParentLevel2;
    const level1Id = CATEGORY_LEVEL2.find((c) => c.id === level3.parentId)?.parentId;
    if (level1Id && LEVEL1_TO_RAKUTEN_GENRE[level1Id]) return LEVEL1_TO_RAKUTEN_GENRE[level1Id];
  }

  // 6. メガメニューの第1階層名（日本語）
  const byMainName = MAIN_CATEGORY_NAME_TO_RAKUTEN_GENRE[normalized];
  if (byMainName) return byMainName;

  return RAKUTEN_GENRE_INSTRUMENTS;
}
