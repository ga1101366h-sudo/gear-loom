/**
 * 投稿・レビュー用カテゴリ定義
 * Digimart 準拠の3階層カテゴリを扱うためのラッパー
 */

import {
  CATEGORY_LEVEL1,
  CATEGORY_LEVEL2,
  CATEGORY_LEVEL3,
  getAllCategoryOptions,
  getCategoryDisplayLabel,
  getCategoryParentName,
  getCategoryParentIconName,
  getLevel2IdBySubGroupName,
  LEGACY_SLUG_TO_NEW,
  toCategorySlug,
  parseCategorySlug,
  type CategoryOption,
} from "./category-hierarchy";
import { MEGA_MENU_CATEGORIES } from "./categories";

const PATH_SEP = " > ";

/**
 * レビュー一覧などで表示する「大カテゴリ > 中カテゴリ > 詳細」形式のラベルを返す。
 * slug が "大__中__小" の3段階の場合はそのまま結合、level2__level3 の場合は階層から解決する。
 */
export function getCategoryPathDisplay(slug: string): string {
  const normalized = normalizeCategorySlug(slug);
  if (!normalized.trim()) return "";
  const parts = normalized.split("__").filter(Boolean);
  if (parts.length >= 3) return parts.join(PATH_SEP);
  if (parts.length === 2) {
    const parsed = parseCategorySlug(normalized);
    if (parsed) {
      const l2 = CATEGORY_LEVEL2.find((c) => c.id === parsed.parentId);
      const l3 = CATEGORY_LEVEL3.find((c) => c.id === parsed.childId);
      if (l2 && l3) {
        const l1 = CATEGORY_LEVEL1.find((c) => c.id === l2.parentId);
        return [l1?.name ?? parsed.parentId, l2.name, l3.name].join(PATH_SEP);
      }
    }
  }
  if (parts.length === 1) return getCategoryLabel(normalized) || parts[0];
  return getCategoryLabel(normalized) || normalized;
}

const SLUG_SEP = "__";

/**
 * Firestore 検索用：slug に対応する日本語パスを "__" 区切りで返す。
 * 英語 slug (level2Id__level3Id) の場合は「大__中__小」に変換する。
 */
export function getCategoryPathSlug(slug: string): string {
  const normalized = normalizeCategorySlug(slug);
  if (!normalized.trim()) return "";
  const parts = normalized.split(SLUG_SEP).filter(Boolean);
  if (parts.length >= 3) return normalized;
  if (parts.length === 2) {
    const parsed = parseCategorySlug(normalized);
    if (parsed) {
      const l2 = CATEGORY_LEVEL2.find((c) => c.id === parsed.parentId);
      const l3 = CATEGORY_LEVEL3.find((c) => c.id === parsed.childId);
      if (l2 && l3) {
        const l1 = CATEGORY_LEVEL1.find((c) => c.id === l2.parentId);
        return [l1?.name ?? parsed.parentId, l2.name, l3.name].join(SLUG_SEP);
      }
    }
  }
  return normalized;
}

/**
 * Firestore 検索用：1つの slug でヒットさせるための候補を返す。
 * 英語 slug・階層の日本語パス・メガメニュー上の日本語パスの3パターンを返す（重複除く）。
 */
export function getCategoryPathSlugVariants(slug: string): string[] {
  const normalized = normalizeCategorySlug(slug);
  if (!normalized.trim()) return [];
  const seen = new Set<string>([normalized]);
  const pathSlug = getCategoryPathSlug(normalized);
  if (pathSlug && !seen.has(pathSlug)) seen.add(pathSlug);
  const parts = normalized.split(SLUG_SEP).filter(Boolean);
  if (parts.length === 2) {
    const parsed = parseCategorySlug(normalized);
    if (parsed) {
      const l2 = CATEGORY_LEVEL2.find((c) => c.id === parsed.parentId);
      const l3 = CATEGORY_LEVEL3.find((c) => c.id === parsed.childId);
      if (l2 && l3) {
        const menuMain = MEGA_MENU_CATEGORIES.find((cat) =>
          cat.subGroups.some((sg) => sg.title === l2.name)
        );
        if (menuMain) {
          const menuPath = [menuMain.mainCategory, l2.name, l3.name].join(SLUG_SEP);
          if (!seen.has(menuPath)) seen.add(menuPath);
        }
      }
    }
  }
  return Array.from(seen);
}

/**
 * 第1階層名（メガメニューの大カテゴリ名）から、その直下にある第2階層の level2 id 一覧を返す。
 * 「ベース」→ ["electric-bass", "bass-amp", "bass-effector", ...] のように、検索で使う prefix 用。
 */
export function getLevel2IdsForMainCategoryName(mainCategoryName: string): string[] {
  const name = mainCategoryName.trim();
  if (!name) return [];
  const cat = MEGA_MENU_CATEGORIES.find((c) => c.mainCategory === name);
  if (!cat) return [];
  const ids: string[] = [];
  for (const sg of cat.subGroups) {
    const id = getLevel2IdBySubGroupName(sg.title);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** 渡した文字列がメガメニューの第1階層名かどうか */
export function isMainCategoryName(name: string): boolean {
  return MEGA_MENU_CATEGORIES.some((c) => c.mainCategory === (name || "").trim());
}

export type PostCategoryItem = { slug: string; name_ja: string };
export type PostCategoryGroup = {
  groupLabel: string;
  groupSlug: string;
  groupIcon: string;
  items: PostCategoryItem[];
};

/** 
 * カテゴリ選択肢のグループ化定義
 * Level 2 (中カテゴリ) をグループヘッダーとし、Level 3 (小カテゴリ) をアイテムとする
 * 例: [エレキギター] -> ストラト, テレキャス...
 */
export const POST_CATEGORY_GROUPS: PostCategoryGroup[] = CATEGORY_LEVEL2.map((l2) => {
  const l1 = CATEGORY_LEVEL1.find((p) => p.id === l2.parentId);
  const children = CATEGORY_LEVEL3.filter((c) => c.parentId === l2.id);

  if (children.length === 0) return null;

  return {
    groupLabel: l2.name,
    groupSlug: l2.id,
    groupIcon: l1?.icon ?? "Circle",
    items: children.map((c) => ({
      slug: toCategorySlug(l2.id, c.id),
      name_ja: c.name,
    })),
  };
}).filter((g): g is PostCategoryGroup => g !== null);

/** 全カテゴリをフラットに（slug → name_ja, groupSlug = parentId） */
export const POST_CATEGORY_FLAT = getAllCategoryOptions().map((o) => ({
  slug: o.slug,
  name_ja: getCategoryDisplayLabel(o.slug),
  groupSlug: o.parentId,
}));

export function normalizeCategorySlug(slug: string): string {
  return LEGACY_SLUG_TO_NEW[slug] ?? slug;
}

/** 
 * groupSlug（＝親ID/Maker Group ID）を返す
 * メーカー検索などで使用するため、Level 1 ID（guitar, bass等）を返すように解決する
 */
export function getGroupSlugByCategorySlug(categorySlug: string): string {
  const normalized = normalizeCategorySlug(categorySlug);
  const parsed = parseCategorySlug(normalized);
  
  if (parsed) {
    // parsed.parentId is Level 2 ID (e.g. electric-guitar)
    // Find Level 2 definition to get Level 1 ID
    const l2 = CATEGORY_LEVEL2.find(c => c.id === parsed.parentId);
    if (l2) return l2.parentId; // Return Level 1 ID (e.g. "guitar")
    
    return parsed.parentId; // Fallback to Level 2 ID if not found
  }
  
  // __を含まない場合（Level 1 IDそのものや、Level 3 ID直書きの場合など）
  // Level 3 IDから逆引きを試みる
  const l3 = CATEGORY_LEVEL3.find(c => c.id === normalized);
  if (l3) {
    const l2 = CATEGORY_LEVEL2.find(c => c.id === l3.parentId);
    if (l2) return l2.parentId;
  }
  
  // Level 2 ID?
  const l2 = CATEGORY_LEVEL2.find(c => c.id === normalized);
  if (l2) return l2.parentId;

  // Level 1 ID?
  const l1 = CATEGORY_LEVEL1.find(c => c.id === normalized);
  if (l1) return l1.id;

  return normalized;
}

export function getCategoryLabel(slug: string): string {
  return getCategoryDisplayLabel(normalizeCategorySlug(slug));
}

export function getCategoryParentLabel(slug: string): string {
  return getCategoryParentName(normalizeCategorySlug(slug));
}

export function getCategoryIconName(slug: string): string {
  return getCategoryParentIconName(normalizeCategorySlug(slug));
}

/**
 * X 連携用：ハッシュタグに使うカテゴリラベルを返す。
 * 3階層ある場合は第2階層、2階層の場合は第2階層、1階層のみの場合は第1階層を使う。
 */
export function getCategoryHashtagLabel(slug: string): string {
  const normalized = normalizeCategorySlug(slug);
  if (!normalized.trim()) return "";
  const parts = normalized.split("__").filter(Boolean);
  if (parts.length >= 2) {
    const parsed = parseCategorySlug(normalized);
    if (parsed) {
      const l2 = CATEGORY_LEVEL2.find((c) => c.id === parsed.parentId);
      if (l2) return l2.name;
    }
    return parts[1];
  }
  if (parts.length === 1) return parts[0];
  return getCategoryLabel(normalized) || "";
}

/**
 * 表示ラベル（owned_gear の [カテゴリ名] 等）からアイコン名を取得する。
 * TODO: 新しい3階層データ（MEGA_MENU_CATEGORIES）に対応したアイコン取得ロジックは後日実装。
 * 一旦マイページのクラッシュを防ぐため、汎用アイコンを返す。
 */
export function getCategoryIconNameByDisplayLabel(_displayLabel: string): string {
  return "Music";
}

export const CONTENT_ONLY_CATEGORY_SLUGS = [
  "custom-root__custom",
  "blog-root__blog",
  "event-root__event",
  "other__custom",
  "other__blog",
  "other__event",
  "custom",
  "blog",
  "event"
] as const;

const CONTENT_ONLY_SET = new Set<string>(CONTENT_ONLY_CATEGORY_SLUGS);

export function isContentOnlyCategorySlug(slug: string): boolean {
  return CONTENT_ONLY_SET.has(slug) || CONTENT_ONLY_SET.has(normalizeCategorySlug(slug));
}

export type { CategoryOption };
