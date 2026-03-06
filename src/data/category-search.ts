/**
 * カテゴリ絞り込み検索用ヘルパー
 * データ元: MEGA_MENU_CATEGORIES（ドリルダウン検索用）
 */

import { MEGA_MENU_CATEGORIES } from "./categories";
import { getCategorySlugFromDisplayPath } from "./category-hierarchy";

/**
 * 入力された文字列が第1・第2・第3階層のどれに該当するかを判定する。
 */
export function getCategoryLevel(categoryName: string): 1 | 2 | 3 | null {
  const name = (categoryName || "").trim();
  if (!name) return null;

  const main = MEGA_MENU_CATEGORIES.find((c) => c.mainCategory === name);
  if (main) return 1;

  for (const cat of MEGA_MENU_CATEGORIES) {
    const sub = cat.subGroups.find((sg) => sg.title === name);
    if (sub) return 2;
    for (const sg of cat.subGroups) {
      if (sg.items.includes(name)) return 3;
    }
  }
  return null;
}

/**
 * 入力されたカテゴリに属する「すべての第3階層アイテム名」をフラットな配列で返す。
 * - 第1階層 → 配下の全 items を結合
 * - 第2階層 → その subGroup の items のみ
 * - 第3階層 → [categoryName] のみ
 * 見つからない場合は [categoryName] を返す（検索フォールバック用）。
 */
export function getAllTargetItems(categoryName: string): string[] {
  const name = (categoryName || "").trim();
  if (!name) return [categoryName];

  for (const main of MEGA_MENU_CATEGORIES) {
    if (main.mainCategory === name) {
      const results: string[] = [];
      main.subGroups.forEach((sub) => results.push(...sub.items));
      return results;
    }
    for (const sub of main.subGroups) {
      if (sub.title === name) return [...sub.items];
      if (sub.items.includes(name)) return [name];
    }
  }
  return [categoryName];
}

/**
 * 入力されたカテゴリに属する、Firestore 用 category_slug の一覧を返す。
 * parent 指定時は同名の第3階層を区別するため、その親（第2階層名）配下の slug のみ返す。
 */
export function getAllTargetSlugs(categoryName: string, parent?: string): string[] {
  const name = (categoryName || "").trim();
  if (!name) return [];

  const slugs = new Set<string>();

  /** 英語slugと日本語パス（DBでどちらで保存されていてもヒットするよう両方追加） */
  function addSlugVariants(
    mainName: string,
    subTitle: string,
    itemName: string
  ): void {
    const slug = getCategorySlugFromDisplayPath(mainName, subTitle, itemName);
    if (slug) slugs.add(slug);
    slugs.add(`${mainName}__${subTitle}__${itemName}`);
  }

  // parent 指定時: 第3階層として「親＝parent」の1件のみ返す（同名カテゴリ誤認防止）
  if (parent != null && parent !== "") {
    const parentTrimmed = parent.trim();
    for (const main of MEGA_MENU_CATEGORIES) {
      const sub = main.subGroups.find((sg) => sg.title === parentTrimmed);
      if (sub && sub.items.includes(name)) {
        addSlugVariants(main.mainCategory, sub.title, name);
        return Array.from(slugs);
      }
    }
  }

  const main = MEGA_MENU_CATEGORIES.find((c) => c.mainCategory === name);
  if (main) {
    for (const sg of main.subGroups) {
      for (const item of sg.items) {
        addSlugVariants(main.mainCategory, sg.title, item);
      }
    }
    return Array.from(slugs);
  }

  for (const cat of MEGA_MENU_CATEGORIES) {
    const sub = cat.subGroups.find((sg) => sg.title === name);
    if (sub) {
      for (const item of sub.items) {
        addSlugVariants(cat.mainCategory, sub.title, item);
      }
      return Array.from(slugs);
    }
    for (const sg of cat.subGroups) {
      if (sg.items.includes(name)) {
        addSlugVariants(cat.mainCategory, sg.title, name);
        return Array.from(slugs);
      }
    }
  }
  return [];
}

/**
 * 第2階層リスト（subGroup の title 一覧）。第1階層名を渡す。
 */
export function getSecondLevelList(mainCategoryName: string): string[] {
  const main = MEGA_MENU_CATEGORIES.find((c) => c.mainCategory === (mainCategoryName || "").trim());
  return main ? main.subGroups.map((sg) => sg.title) : [];
}

/**
 * 第3階層リスト（item 名一覧）。第1・第2階層名を渡す。
 */
export function getThirdLevelList(mainCategoryName: string, subGroupTitle: string): string[] {
  const main = MEGA_MENU_CATEGORIES.find((c) => c.mainCategory === (mainCategoryName || "").trim());
  if (!main) return [];
  const sub = main.subGroups.find((sg) => sg.title === (subGroupTitle || "").trim());
  return sub ? [...sub.items] : [];
}

/**
 * 親カテゴリの表示名を返す。第1階層なら null、第2なら mainCategory、第3なら subGroup.title。
 */
export function getParentCategoryName(categoryName: string): string | null {
  const name = (categoryName || "").trim();
  if (!name) return null;
  for (const cat of MEGA_MENU_CATEGORIES) {
    const sub = cat.subGroups.find((sg) => sg.title === name);
    if (sub) return cat.mainCategory;
    for (const sg of cat.subGroups) {
      if (sg.items.includes(name)) return sg.title;
    }
  }
  return null;
}

/**
 * 現在のカテゴリが属する第1階層名を返す。
 */
export function getMainCategoryName(categoryName: string): string | null {
  const name = (categoryName || "").trim();
  if (!name) return null;
  const main = MEGA_MENU_CATEGORIES.find((c) => c.mainCategory === name);
  if (main) return name;
  for (const cat of MEGA_MENU_CATEGORIES) {
    if (cat.subGroups.some((sg) => sg.title === name)) return cat.mainCategory;
    for (const sg of cat.subGroups) {
      if (sg.items.includes(name)) return cat.mainCategory;
    }
  }
  return null;
}

/**
 * 現在のカテゴリが属する第2階層名を返す。第1階層の場合は null。
 */
export function getSubGroupTitle(categoryName: string): string | null {
  const name = (categoryName || "").trim();
  if (!name) return null;
  for (const cat of MEGA_MENU_CATEGORIES) {
    if (cat.subGroups.some((sg) => sg.title === name)) return name;
    for (const sg of cat.subGroups) {
      if (sg.items.includes(name)) return sg.title;
    }
  }
  return null;
}
