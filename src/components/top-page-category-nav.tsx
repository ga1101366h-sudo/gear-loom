"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import { MEGA_MENU_CATEGORIES } from "@/data/rakuten-genres";

/**
 * カテゴリ名からレビュー一覧へのリンクを生成
 */
function getCategoryHref(categoryName: string): string {
  return `/reviews?category=${encodeURIComponent(categoryName)}`;
}

/** モバイル用：ボタンで開閉する多段アコーディオンメニュー（縦方向インライン展開のみ） */
export function TopPageCategoryNavMobile() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<number | null>(null);
  const [openSubGroup, setOpenSubGroup] = useState<string | null>(null);

  const toggleMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
    if (isMobileMenuOpen) {
      setOpenCategory(null);
      setOpenSubGroup(null);
    }
  }, [isMobileMenuOpen]);

  const toggleCategory = useCallback((index: number) => {
    setOpenCategory((prev) => (prev === index ? null : index));
    setOpenSubGroup(null);
  }, []);

  const toggleSubGroup = useCallback((title: string) => {
    setOpenSubGroup((prev) => (prev === title ? null : title));
  }, []);

  return (
    <nav className="md:hidden w-full px-3 py-2" aria-label="カテゴリ">
      <button
        type="button"
        onClick={toggleMenu}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500 bg-transparent py-3 text-sm font-medium text-cyan-500 transition-colors hover:bg-cyan-500/10"
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-category-accordion"
      >
        <Search className="h-4 w-4" aria-hidden />
        カテゴリから探す
      </button>

      {isMobileMenuOpen && (
        <div
          id="mobile-category-accordion"
          className="mt-2 rounded-lg border border-gray-800 bg-slate-900/80 overflow-visible"
        >
          <ul className="divide-y divide-gray-800">
            {MEGA_MENU_CATEGORIES.map((category, catIndex) => {
              const hasSub = category.subGroups.length > 0;
              const isCategoryOpen = openCategory === catIndex;

              return (
                <li key={catIndex}>
                  {/* 第1階層 */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 py-3 px-4 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-slate-800/80 active:bg-slate-800"
                    onClick={() => hasSub && toggleCategory(catIndex)}
                  >
                    <span className="min-w-0 flex-1">{category.mainCategory}</span>
                    {hasSub &&
                      (isCategoryOpen ? (
                        <ChevronDown className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" aria-hidden />
                      ))}
                  </button>

                  {/* 第2階層（第1階層の直下にインライン展開） */}
                  {hasSub && isCategoryOpen && (
                    <ul className="border-t border-gray-800 bg-slate-800/50">
                      {category.subGroups.map((sg) => {
                        const hasItems = sg.items.length > 0;
                        const isSubOpen = openSubGroup === sg.title;

                        return (
                          <li key={sg.title}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 py-3 pl-8 pr-4 text-left text-sm text-gray-300 transition-colors hover:bg-slate-700/50 active:bg-slate-700/70 border-l-2 border-transparent hover:border-cyan-500/50"
                              onClick={() => hasItems && toggleSubGroup(sg.title)}
                            >
                              <span className="min-w-0 flex-1">{sg.title}</span>
                              {hasItems &&
                                (isSubOpen ? (
                                  <ChevronDown className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
                                ) : (
                                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" aria-hidden />
                                ))}
                            </button>

                            {/* 第3階層（第2階層の直下にインライン展開） */}
                            {hasItems && isSubOpen && (
                              <ul className="border-t border-gray-800 bg-slate-900/60">
                                {sg.items.map((item) => (
                                  <li key={item}>
                                    <Link
                                      href={getCategoryHref(item)}
                                      className="flex w-full items-center py-3 pl-12 pr-4 text-sm text-gray-400 transition-colors hover:bg-slate-700/50 hover:text-cyan-400 active:bg-slate-700/70 border-l-2 border-cyan-500/50"
                                      onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        setOpenCategory(null);
                                        setOpenSubGroup(null);
                                      }}
                                    >
                                      {item}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}

/** 第2・第3階層パネル共通スタイル（ダークテーマ・クリッピング防止） */
const PANEL_BASE =
  "rounded-r-lg rounded-bl-lg border border-gray-800 bg-[#111827] shadow-2xl overflow-visible";

/** PC用：group / group-hover によるシンプルなカスケードドロップダウン（サウンドハウス風） */
export function TopPageCategoryNav() {
  return (
    <div className="hidden md:block relative overflow-visible">
      <nav
        className="w-56 shrink-0 rounded-lg border border-gray-800 bg-slate-900 py-2 shadow-2xl overflow-visible"
        aria-label="カテゴリ"
      >
        <div className="px-3 pb-2 pt-1 border-b border-gray-800 mb-1">
          <p className="text-xs font-bold text-gray-400">カテゴリから探す</p>
        </div>

        <ul className="relative overflow-visible">
          {MEGA_MENU_CATEGORIES.map((category, index) => {
            const hasSub = category.subGroups.length > 0;
            return (
              <li
                key={index}
                className={`relative overflow-visible ${hasSub ? "group/main" : ""}`}
              >
                <div className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400">
                  <span className="truncate min-w-0">{category.mainCategory}</span>
                  {hasSub && <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />}
                </div>

                {/* 第2階層：縦1列のみ。group-hover/main で右隣に表示 */}
                {hasSub && category.subGroups.length > 0 && (
                  <div
                    className={`absolute left-full top-0 z-40 ml-0 hidden w-max min-w-56 py-2 px-2 group-hover/main:block ${PANEL_BASE}`}
                  >
                    <ul className="flex flex-col gap-y-0">
                      {category.subGroups.map((sg) => (
                        <li
                          key={sg.title}
                          className={`relative overflow-visible ${sg.items.length > 0 ? "group/sub" : ""}`}
                        >
                          <div className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400">
                            <span className="truncate min-w-0">{sg.title}</span>
                            {sg.items.length > 0 && (
                              <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                            )}
                          </div>

                          {/* 第3階層：ホバーした項目のすぐ右隣。group-hover/sub で表示。中身は grid */}
                          {sg.items.length > 0 && (
                            <div
                              className={`absolute left-full top-0 z-50 ml-0 hidden w-max min-w-64 py-2 px-3 group-hover/sub:block ${PANEL_BASE}`}
                            >
                              <p className="px-4 pb-2 text-xs font-semibold text-gray-500 border-b border-gray-800 mb-2">
                                {sg.title}
                              </p>
                              <div
                                className={`grid gap-x-8 gap-y-0 ${
                                  sg.items.length > 18 ? "grid-cols-3" : "grid-cols-2"
                                }`}
                              >
                                {sg.items.map((item) => (
                                  <Link
                                    key={item}
                                    href={getCategoryHref(item)}
                                    className="block w-full rounded-md px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400 whitespace-nowrap"
                                  >
                                    {item}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
