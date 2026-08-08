"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, ChevronRight } from "lucide-react";
import {
  getCategoryLevel,
  getParentCategoryName,
  getSecondLevelList,
  getThirdLevelList,
  getMainCategoryName,
  getSubGroupTitle,
} from "@/data/category-search";
import { getCategorySlugFromDisplayPath, getLevel2IdBySubGroupName } from "@/data/category-hierarchy";
import { isMainCategoryName } from "@/data/post-categories";
import { VISIBLE_MAIN_CATEGORIES } from "@/data/visible-menu";

/** 同名第3階層の誤認防止のため、parent を付与可能 */
function categoryHref(nameOrSlug: string, parent?: string): string {
  const path = `/category/${encodeURIComponent(nameOrSlug)}`;
  if (parent != null && parent !== "") {
    return `${path}?parent=${encodeURIComponent(parent)}`;
  }
  return path;
}

/**
 * 表示名（日本語）を、実在するカテゴリ slug に解決する。解決できなければ null。
 * ★2026-08-08：未知 slug のカテゴリページを 404 にしたため、
 *   解決できない表示名をそのままURLにすると 404 リンクになる。リンクにしない。
 */
function resolveSlugForDisplayName(
  name: string,
  mainCategoryName?: string | null,
  subGroupTitle?: string | null
): string | null {
  const n = (name || "").trim();
  if (!n) return null;
  if (isMainCategoryName(n)) return n; // 第1階層名はそのまま有効な slug

  // ★第3階層として呼ばれたとき（大・中カテゴリ名が渡っているとき）は、その階層で解決できなければ null。
  //   ここで中カテゴリ名への逆引き（getLevel2IdBySubGroupName）へ落としてはいけない。
  //   落とすと、第3階層の項目名がたまたま別の中カテゴリ名と一致したときに
  //   **まったく別のカテゴリページへリンクする**（2026-08-08 実測で11件。例：
  //   「弦楽器 > バイオリン > アクセサリー」が キーボードアクセサリー /category/keyboard-acc へ飛んでいた）。
  //   別カテゴリへ誤って飛ぶのはリンク切れより悪い（ユーザーを騙す形になる）ため、リンクにしない。
  //   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_レビュー.md ②D
  if (mainCategoryName && subGroupTitle) {
    return getCategorySlugFromDisplayPath(mainCategoryName, subGroupTitle, n);
  }

  // 第2階層として呼ばれたときだけ、中カテゴリ名 → level2 id の逆引きを使う
  return getLevel2IdBySubGroupName(n);
}

type Props = {
  currentCategoryName: string;
  /** URL の ?parent= があれば最優先で「戻る」の表示・遷移先に使用 */
  parentFromUrl?: string;
};

export function SearchSidebar({ currentCategoryName, parentFromUrl }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const level = getCategoryLevel(currentCategoryName);
  const parentName = getParentCategoryName(currentCategoryName);
  const mainName = getMainCategoryName(currentCategoryName);
  const subName = getSubGroupTitle(currentCategoryName);

  const effectiveParent = parentFromUrl ?? parentName;
  const effectiveParentSlug =
    effectiveParent != null ? resolveSlugForDisplayName(effectiveParent) : null;

  const linkBase = "block rounded-md px-3 py-2 text-sm transition-colors hover:text-cyan-400 text-gray-300";

  /**
   * ★2026-08-08 差し戻し対応2：行き先が無い項目は「グレー表示」ではなく **表示しない**
   *   （翔貴さんの決定をメガメニューだけでなくサイドバーにも適用する）。
   *   ただし非表示にするだけだと、配下に実カテゴリを1つも持たない第1階層（管楽器・和楽器など）で
   *   サイドバーが空になり、**行き止まりであること自体は変わらない**。
   *   実測では第1階層25ページ中21ページが「カテゴリリンク0本」だった（再レビュー ③A）。
   *   そこで下の「ほかのカテゴリ」を常に出し、どのカテゴリページからも
   *   中身のあるカテゴリへ必ず辿れるようにする。
   *   出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_再レビュー.md ③A
   */
  type SidebarLink = { label: string; slug: string; parent?: string };
  type SidebarLinkCandidate = { label: string; slug: string | null; parent?: string };

  const childCandidates: SidebarLinkCandidate[] =
    level === 1 && mainName
      ? getSecondLevelList(mainName).map((title) => ({
          label: title,
          slug: resolveSlugForDisplayName(title),
        }))
      : level === 2 && mainName && subName
        ? getThirdLevelList(mainName, subName).map((item) => ({
            label: item,
            slug: resolveSlugForDisplayName(item, mainName, subName),
            parent: subName,
          }))
        : [];

  const childLinks: SidebarLink[] = childCandidates.filter(
    (x): x is SidebarLink => x.slug !== null
  );

  /** 配下に実体のあるカテゴリを持つ第1階層のうち、いま見ているもの以外 */
  const otherMainCategories = VISIBLE_MAIN_CATEGORIES.filter((name) => name !== mainName);

  const navContent = (
    <>
        {effectiveParent != null && effectiveParentSlug ? (
          <Link
            href={categoryHref(effectiveParentSlug)}
            className={`${linkBase} flex items-center gap-1 text-gray-400`}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            {effectiveParent}
          </Link>
        ) : (
          <Link
            href="/reviews"
            className={`${linkBase} flex items-center gap-1 text-gray-400`}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            すべてのカテゴリ
          </Link>
        )}

        {childLinks.length > 0 && (
          <ul className="flex flex-col space-y-1 border-t border-gray-800 pt-2">
            {childLinks.map((link) => (
              <li key={link.label}>
                <Link href={categoryHref(link.slug, link.parent)} className={linkBase}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 下の階層が1件も無いとき、空欄のまま放置しない（何が起きているのか分かるようにする） */}
        {childLinks.length === 0 && (level === 1 || level === 2) && (
          <p className="border-t border-gray-800 pt-2 px-3 py-2 text-xs text-gray-400">
            このカテゴリには、まだ細かい分類がありません。
          </p>
        )}

        {level === 3 && (
          <p className="border-t border-gray-800 pt-2 px-3 py-2 text-sm text-gray-300">
            {currentCategoryName}
          </p>
        )}

        {/* ★行き止まりを作らないための逃げ道。どのカテゴリページからも必ずここから辿れる */}
        {otherMainCategories.length > 0 && (
          <div className="border-t border-gray-800 pt-2">
            <p className="px-3 pb-1 text-xs font-semibold text-gray-400">ほかのカテゴリ</p>
            <ul className="flex flex-col space-y-1">
              {otherMainCategories.map((name) => (
                <li key={name}>
                  <Link href={categoryHref(name)} className={linkBase}>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
    </>
  );

  return (
    <aside className="w-full md:w-56 shrink-0" aria-label="カテゴリ絞り込み">
      {/* モバイル: アコーディオン */}
      <div className="md:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-slate-900/80 px-4 py-3 text-left text-sm font-medium text-gray-200"
          aria-expanded={mobileOpen}
        >
          カテゴリで絞り込む
          {mobileOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
        {mobileOpen && (
          <nav className="mt-1 flex flex-col space-y-2 rounded-lg border border-gray-800 border-t-0 rounded-t-none bg-slate-900/80 p-3">
            {navContent}
          </nav>
        )}
      </div>
      {/* PC: 常時表示 */}
      <nav className="hidden md:flex flex-col space-y-2 rounded-lg border border-gray-800 bg-slate-900/80 p-3">
        {navContent}
      </nav>
    </aside>
  );
}
