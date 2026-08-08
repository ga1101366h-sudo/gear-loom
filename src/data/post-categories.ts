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
  // コンテンツ系カテゴリ（イベント・ブログ・カスタム手帳など）は単一ラベルで表示する
  if (normalized === "event") return "イベント";
  if (normalized === "blog") return "ブログ";
  if (normalized === "custom") return "カスタム手帳";
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

// ------------------------------------------------------------------
// カテゴリページ（/category/[slug]）の slug 解決
// ------------------------------------------------------------------

/**
 * 表示名を突き合わせ用に正規化する。
 * 既存レビューの category_id は「大__中__小」の日本語パスで保存されているが、
 * メニュー定義の「DI/プリアンプ」「フットコントローラー/セレクター」に対して
 * "/" が落ちた形（「DIプリアンプ」）で保存されているものが実在するため、
 * "/"（半角・全角）と空白を無視して比較する。
 */
function normalizeDisplayNameForMatch(name: string): string {
  return (name || "").replace(/[/／\s]/g, "");
}

/**
 * 日本語の表示名パス「大__中__小」がメガメニュー定義に実在するかを判定し、
 * 実在する場合は「メニュー定義どおりの正規表記のパス」と第3階層（小カテゴリ）の表示名を返す。
 * 実在しなければ null。
 * ※既存レビューの category_id がこの形式で保存されているため、カテゴリページで解決できる必要がある。
 *   ただし保存値は "/" や空白が落ちている場合があるので、突き合わせは
 *   normalizeDisplayNameForMatch（"/" と空白を無視）で行い、**正規表記の方を返す**。
 */
export function matchMegaMenuDisplayPath(
  path: string
): { canonicalPath: string; leafName: string } | null {
  const parts = (path || "").split("__").map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 3) return null;
  const [mainName, subTitle, itemName] = parts;
  const main = MEGA_MENU_CATEGORIES.find((c) => c.mainCategory === mainName);
  if (!main) return null;
  const sub =
    main.subGroups.find((sg) => sg.title === subTitle) ??
    main.subGroups.find(
      (sg) => normalizeDisplayNameForMatch(sg.title) === normalizeDisplayNameForMatch(subTitle)
    );
  if (!sub) return null;
  const item =
    sub.items.find((i) => i === itemName) ??
    sub.items.find(
      (i) => normalizeDisplayNameForMatch(i) === normalizeDisplayNameForMatch(itemName)
    );
  if (!item) return null;
  return {
    canonicalPath: [main.mainCategory, sub.title, item].join("__"),
    leafName: item,
  };
}

/**
 * 日本語の表示名パス「大__中__小」が実在すれば第3階層（小カテゴリ）の表示名を返す。実在しなければ null。
 * ※判定の本体は matchMegaMenuDisplayPath（DRY）。
 */
export function getMegaMenuDisplayPathLeafName(path: string): string | null {
  return matchMegaMenuDisplayPath(path)?.leafName ?? null;
}

/**
 * URLで渡された slug をデコードする（％エンコード・二重エンコード対策）。
 * カテゴリページ本体と middleware で同じ判定をするために共通化してある。
 */
export function decodeCategorySlug(slug: string): string {
  let s = slug;
  let prev = "";
  while (s.includes("%") && s !== prev) {
    prev = s;
    try {
      s = decodeURIComponent(s);
    } catch {
      break;
    }
  }
  return s;
}

/**
 * 「メニュー定義どおりの正規表記」に落とすための正規化（"/"・"／"・空白をすべて除去）。
 * 既存レビューの category_id は "/" や空白が落ちた形で保存されているものが実在するため、
 * その1形だけは正規形と同じ扱いで通す（＝許容するのは正規形と全除去形の**最大2通りだけ**）。
 */
function stripSeparators(name: string): string {
  return (name || "").replace(/[/／\s]/g, "");
}

/**
 * slug が「正規形と一字一句一致しているか」を判定する。
 *
 * ★2026-08-08 差し戻し対応（レビュー指摘E）
 *   これが無いと、slug に空白を足すだけで別URLとして 200 が返り、しかも canonical タグが
 *   自分自身を指すため、**同じ内容の重複ページを無限に作れた**。
 *   原因は resolveCategoryNameBySlug が入力全体を trim し、日本語パスの突き合わせが
 *   空白を無視する（normalizeDisplayNameForMatch）一方で、canonical は trim していない
 *   decoded から作られていたという非対称。
 *   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_レビュー.md ②E
 *
 * ★リダイレクトではなく 404 にした理由：
 *   正規形へ 301/308 で寄せる案もあるが、それだと「空白違いの無限のURL」がすべて
 *   リダイレクトとして生き続け、クロール予算と middleware 呼び出し回数を消費し続ける。
 *   実在しないURLは終端（404）で閉じるのが最も単純で、URL空間を有限に保てる。
 *   既存データへの影響が無いことは実測で確認済み（同レビュー ②E「厳密化しても既存ページは
 *   1つも404にならない」＋ 本対応で全1,596件を再実測）。
 */
export function isCanonicalCategorySlug(decoded: string): boolean {
  if (!decoded) return false;
  // 前後の空白（半角・全角・%20 をデコードしたもの）を含む形は正規形ではない
  if (decoded !== decoded.trim()) return false;
  if (resolveCategoryNameBySlug(decoded) === null) return false;

  // 日本語パス「大__中__小」だけは空白無視で突き合わせているので、正規表記と照合し直す
  const matched = matchMegaMenuDisplayPath(decoded);
  if (matched) {
    return (
      decoded === matched.canonicalPath ||
      decoded === stripSeparators(matched.canonicalPath)
    );
  }
  // 他の3経路（第1階層名 / 英語slug / 単体の英語ID）はいずれも完全一致でしか解決しない
  return true;
}

/** エンコード済み slug が実在するカテゴリかどうか（middleware の404判定用） */
export function isKnownCategorySlug(encodedSlug: string): boolean {
  return isCanonicalCategorySlug(decodeCategorySlug(encodedSlug));
}

/**
 * カテゴリページの slug を「実在するカテゴリ」に解決して表示名を返す。
 * 解決できない slug は null を返し、呼び出し側（category/[slug]/page.tsx）で 404 にする。
 *
 * ★以前は「解決できなければ slug をそのまま表示名にする」フォールバックがあり、
 *   任意の文字列が 200 を返す無限のURL空間になっていた（2026-08-08 調査・レビューE）。
 *   そのフォールバックを廃止したのがこの関数。
 *
 * 解決できる（＝200を返す）のは次の4種類だけ：
 *   1. メガメニューの第1階層名（日本語・25件）      例）ギター
 *   2. 英語 slug「level2Id__level3Id」               例）bass-effector__overdrive
 *   3. 単体の英語ID（level1 / level2 / level3 / コンテンツ系） 例）bass-effector, blog
 *   4. 日本語の表示名パス「大__中__小」（既存レビューの category_id 形式）
 *      例）ベース__ベースエフェクター__オーバードライブ
 */
export function resolveCategoryNameBySlug(slug: string): string | null {
  const decoded = (slug || "").trim();
  if (!decoded) return null;
  if (isMainCategoryName(decoded)) return decoded;

  const normalized = normalizeCategorySlug(decoded);
  const flat = Array.isArray(POST_CATEGORY_FLAT) ? POST_CATEGORY_FLAT : [];
  const fromFlat = flat.find((c) => c.slug === normalized)?.name_ja;
  if (fromFlat) return fromFlat;

  const fromLabel = getCategoryLabel(decoded);
  if (fromLabel && fromLabel !== decoded) return fromLabel;

  return getMegaMenuDisplayPathLeafName(decoded);
}

export type { CategoryOption };
