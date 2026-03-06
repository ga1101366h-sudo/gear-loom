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

/** 同名第3階層の誤認防止のため、parent を付与可能 */
function categoryHref(nameOrSlug: string, parent?: string): string {
  const path = `/category/${encodeURIComponent(nameOrSlug)}`;
  if (parent != null && parent !== "") {
    return `${path}?parent=${encodeURIComponent(parent)}`;
  }
  return path;
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

  const linkBase = "block rounded-md px-3 py-2 text-sm transition-colors hover:text-cyan-400 text-gray-300";

  const navContent = (
    <>
        {effectiveParent !== null && effectiveParent !== undefined ? (
          <Link
            href={categoryHref(effectiveParent)}
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

        {level === 1 && mainName && (
          <ul className="flex flex-col space-y-1 border-t border-gray-800 pt-2">
            {getSecondLevelList(mainName).map((title) => (
              <li key={title}>
                <Link href={categoryHref(title)} className={linkBase}>
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {level === 2 && mainName && subName && (
          <ul className="flex flex-col space-y-1 border-t border-gray-800 pt-2">
            {getThirdLevelList(mainName, subName).map((item) => (
              <li key={item}>
                <Link href={categoryHref(item, subName)} className={linkBase}>
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {level === 3 && (
          <p className="border-t border-gray-800 pt-2 px-3 py-2 text-sm text-gray-300">
            {currentCategoryName}
          </p>
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
