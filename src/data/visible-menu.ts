/**
 * 「行き先のある項目だけ」を残したカテゴリツリー（メガメニュー・サイドバー共通）。
 *
 * ★2026-08-08 翔貴さん決定：slug に解決できないカテゴリは **表示しない**。
 *   当初は「表示は残してリンクだけ外す（グレー表示）」にしたが、実測すると第3階層1,410件のうち
 *   1,374件（97.4%）が押せないグレー文字になり、たとえば「管楽器 > フルート」を開くと
 *   **押せない文字が並ぶだけの行き止まり**になっていた（ユーザーからは壊れて見える）。
 *   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_レビュー.md ②C・⑥
 *
 * ★この判定をここに置いている理由（2026-08-08 差し戻し対応2）：
 *   当初は top-page-category-nav.tsx の中に閉じており、サイドバー（SearchSidebar.tsx）には
 *   適用されていなかった。その結果、第1階層25ページ中21ページで
 *   **サイドバーがグレー文字だけ・カテゴリリンク0本の行き止まり**になっていた（レビュアー役の実測）。
 *   メガメニューは app/page.tsx（トップページ）にしか無いため、カテゴリページに入った後の
 *   回遊はサイドバーだけが頼りで、逃げ道が1本も無い状態だった。
 *   同じ判定を2箇所に書かないよう、データ層に切り出して両方から参照する。
 *   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_再レビュー.md ③A
 */

import { MEGA_MENU_CATEGORIES } from "./categories";
import { getCategorySlugFromDisplayPath, getLevel2IdBySubGroupName } from "./category-hierarchy";

/** 表示する第3階層（行き先のあるものだけ） */
export type VisibleMenuItem = { name: string; slug: string };
/** 表示する第2階層。items が空でも level2Id があれば「その中カテゴリ自体」への行き先はある */
export type VisibleSubGroup = { title: string; level2Id: string | null; items: VisibleMenuItem[] };
export type VisibleMenuCategory = { mainCategory: string; subGroups: VisibleSubGroup[] };

/**
 * メニュー定義から「行き先のある項目だけ」を残したツリーを作る（モジュール読み込み時に1回だけ計算）。
 * - 第3階層：slug に解決できるものだけ残す
 * - 第2階層：残った第3階層が1件も無く、かつ中カテゴリ自体の行き先（level2Id）も無いものは丸ごと落とす
 * - 第1階層：25件すべて残す（第1階層名はそのまま有効な slug なので「○○をすべて見る」は必ず生きる）
 */
export const VISIBLE_MENU: VisibleMenuCategory[] = MEGA_MENU_CATEGORIES.map((category) => ({
  mainCategory: category.mainCategory,
  subGroups: category.subGroups
    .map((sg) => ({
      title: sg.title,
      level2Id: getLevel2IdBySubGroupName(sg.title),
      items: sg.items
        .map((name) => ({
          name,
          slug: getCategorySlugFromDisplayPath(category.mainCategory, sg.title, name),
        }))
        .filter((i): i is VisibleMenuItem => i.slug !== null),
    }))
    .filter((sg) => sg.items.length > 0 || sg.level2Id !== null),
}));

/**
 * 配下に実体のあるカテゴリを1つ以上持つ第1階層名の一覧。
 * サイドバーの「ほかのカテゴリ」に使う＝どのカテゴリページからも、
 * 中身のあるカテゴリへ必ず辿れるようにするための最後の逃げ道。
 * ※第1階層名はそのまま有効な slug（isMainCategoryName が true）なのでリンクにできる。
 */
export const VISIBLE_MAIN_CATEGORIES: string[] = VISIBLE_MENU.filter(
  (c) => c.subGroups.length > 0
).map((c) => c.mainCategory);
