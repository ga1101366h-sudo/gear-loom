"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import { VISIBLE_MENU } from "@/data/visible-menu";

/**
 * カテゴリ slug（または表示名）からカテゴリ一覧ページへのリンクを生成。
 * 第3階層で同名カテゴリ（バッファ・コンプレッサー等）の誤認を防ぐため、parent を付与可能。
 */
function getCategoryHref(categorySlugOrName: string, parent?: string): string {
  const path = `/category/${encodeURIComponent(categorySlugOrName)}`;
  if (parent != null && parent !== "") {
    return `${path}?parent=${encodeURIComponent(parent)}`;
  }
  return path;
}

/**
 * ★2026-08-08 SEO修正
 * ① メニューは「クリックで開く」方式にし、閉じている階層のリンクは HTML に出さない。
 *    以前は PC 版が CSS の group-hover で全階層を常時レンダリングしており、
 *    トップページの初期HTMLに /category/ へのリンクが 1,625個（ユニーク 1,299種類）並び、
 *    その大半が実体のないカテゴリだった（2026-08-08 調査・レビューC）。
 * ② slug に解決できないカテゴリは **表示しない**（2026-08-08 翔貴さん決定・差し戻し対応）。
 *    当初は「表示は残してリンクだけ外す（グレー表示）」にしたが、実測すると第3階層1,410件のうち
 *    1,374件（97.4%）が押せないグレー文字になり、たとえば「管楽器 > フルート」を開くと
 *    **押せない文字が並ぶだけの行き止まり**になっていた（ユーザーからは壊れて見える）。
 *    出典：C:\AI組織運営\.company\reviews\2026-08-08_GearLoom_SEO修正第1弾_レビュー.md ②C・⑥
 *    ★ツリーの構築（VISIBLE_MENU）は @/data/visible-menu に切り出してある。
 *      サイドバー（app/category/[slug]/SearchSidebar.tsx）が同じ判定を使うため（同じ判定を2箇所に書かない）。
 */

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

  const closeAll = useCallback(() => {
    setIsMobileMenuOpen(false);
    setOpenCategory(null);
    setOpenSubGroup(null);
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
            {VISIBLE_MENU.map((category, catIndex) => {
              const isCategoryOpen = openCategory === catIndex;

              return (
                <li key={catIndex}>
                  {/* 第1階層（パネルには必ず「○○をすべて見る」が入るので行き止まりにはならない） */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 py-3 px-4 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-slate-800/80 active:bg-slate-800"
                    onClick={() => toggleCategory(catIndex)}
                    aria-expanded={isCategoryOpen}
                  >
                    <span className="min-w-0 flex-1">{category.mainCategory}</span>
                    {isCategoryOpen ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" aria-hidden />
                    )}
                  </button>

                  {/* 第2階層（第1階層の直下にインライン展開） */}
                  {isCategoryOpen && (
                    <ul className="border-t border-gray-800 bg-slate-800/50">
                      <li>
                        <Link
                          href={getCategoryHref(category.mainCategory)}
                          className="flex w-full items-center gap-2 py-3 pl-8 pr-4 text-sm font-semibold text-cyan-500 transition-colors hover:bg-slate-700/50 hover:text-cyan-400 active:bg-slate-700/70 border-l-2 border-cyan-500/50"
                          onClick={closeAll}
                        >
                          <Search className="h-4 w-4 shrink-0" aria-hidden />
                          {category.mainCategory}をすべて見る
                        </Link>
                      </li>
                      {category.subGroups.map((sg) => {
                        const hasItems = sg.items.length > 0;
                        const isSubOpen = openSubGroup === sg.title;

                        // 残った第3階層が無い中カテゴリは、開いても中身が無いのでボタンにせず直接リンクにする
                        if (!hasItems) {
                          return (
                            <li key={sg.title}>
                              <Link
                                href={getCategoryHref(sg.level2Id as string)}
                                className="flex w-full items-center justify-between gap-2 py-3 pl-8 pr-4 text-left text-sm text-gray-300 transition-colors hover:bg-slate-700/50 active:bg-slate-700/70 border-l-2 border-transparent hover:border-cyan-500/50"
                                onClick={closeAll}
                              >
                                <span className="min-w-0 flex-1">{sg.title}</span>
                              </Link>
                            </li>
                          );
                        }

                        return (
                          <li key={sg.title}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 py-3 pl-8 pr-4 text-left text-sm text-gray-300 transition-colors hover:bg-slate-700/50 active:bg-slate-700/70 border-l-2 border-transparent hover:border-cyan-500/50"
                              onClick={() => toggleSubGroup(sg.title)}
                              aria-expanded={isSubOpen}
                            >
                              <span className="min-w-0 flex-1">{sg.title}</span>
                              {isSubOpen ? (
                                <ChevronDown className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
                              ) : (
                                <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" aria-hidden />
                              )}
                            </button>

                            {/* 第3階層（第2階層の直下にインライン展開） */}
                            {isSubOpen && (
                              <ul className="border-t border-gray-800 bg-slate-900/60">
                                {sg.level2Id && (
                                  <li>
                                    <Link
                                      href={getCategoryHref(sg.level2Id)}
                                      className="flex w-full items-center gap-2 py-3 pl-12 pr-4 text-sm font-semibold text-cyan-500 transition-colors hover:bg-slate-700/50 hover:text-cyan-400 active:bg-slate-700/70 border-l-2 border-cyan-500/50"
                                      onClick={closeAll}
                                    >
                                      <Search className="h-4 w-4 shrink-0" aria-hidden />
                                      {sg.title}をすべて見る
                                    </Link>
                                  </li>
                                )}
                                {sg.items.map((item) => (
                                  <li key={item.name}>
                                    <Link
                                      href={getCategoryHref(item.slug, sg.title)}
                                      className="flex w-full items-center py-3 pl-12 pr-4 text-sm text-gray-400 transition-colors hover:bg-slate-700/50 hover:text-cyan-400 active:bg-slate-700/70 border-l-2 border-cyan-500/50"
                                      onClick={closeAll}
                                    >
                                      {item.name}
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

            {/* コンテンツ系（ブログ・イベント）へのショートカット */}
            <li>
              <Link
                href="/blog"
                className="flex w-full items-center justify-between gap-2 py-3 px-4 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-slate-800/80 active:bg-slate-800"
                onClick={closeAll}
              >
                <span className="min-w-0 flex-1">ブログ</span>
              </Link>
            </li>
            <li>
              <Link
                href="/events"
                className="flex w-full items-center justify-between gap-2 py-3 px-4 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-slate-800/80 active:bg-slate-800"
                onClick={closeAll}
              >
                <span className="min-w-0 flex-1">イベント</span>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

/** 第2・第3階層パネル共通スタイル（ダークテーマ・クリッピング防止） */
const PANEL_BASE =
  "rounded-r-lg rounded-bl-lg border border-gray-800 bg-[#111827] shadow-2xl overflow-visible";

/** PC用：クリックで開くカスケードドロップダウン（サウンドハウス風） */
export function TopPageCategoryNav() {
  const [openCategory, setOpenCategory] = useState<number | null>(null);
  const [openSubGroup, setOpenSubGroup] = useState<string | null>(null);

  const toggleCategory = useCallback((index: number) => {
    setOpenCategory((prev) => (prev === index ? null : index));
    setOpenSubGroup(null);
  }, []);

  const toggleSubGroup = useCallback((title: string) => {
    setOpenSubGroup((prev) => (prev === title ? null : title));
  }, []);

  const closeAll = useCallback(() => {
    setOpenCategory(null);
    setOpenSubGroup(null);
  }, []);

  return (
    <div className="hidden md:block relative overflow-visible" onMouseLeave={closeAll}>
      <nav
        className="w-56 shrink-0 rounded-lg border border-gray-800 bg-slate-900 py-2 shadow-2xl overflow-visible"
        aria-label="カテゴリ"
      >
        <div className="px-3 pb-2 pt-1 border-b border-gray-800 mb-1">
          <p className="text-xs font-bold text-gray-400">カテゴリから探す</p>
        </div>

        <ul className="relative overflow-visible">
          {VISIBLE_MENU.map((category, index) => {
            const isCategoryOpen = openCategory === index;
            return (
              <li key={index} className="relative overflow-visible">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400"
                  onClick={() => toggleCategory(index)}
                  aria-expanded={isCategoryOpen}
                >
                  <span className="truncate min-w-0 flex-1">{category.mainCategory}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                </button>

                {/* 第2階層：縦1列のみ。クリックで開いたときだけ描画する */}
                {isCategoryOpen && (
                  <div
                    className={`absolute left-full top-0 z-40 ml-0 block w-max min-w-56 py-2 px-2 ${PANEL_BASE}`}
                  >
                    <ul className="flex flex-col gap-y-0">
                      <li>
                        <Link
                          href={getCategoryHref(category.mainCategory)}
                          className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-cyan-500 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400"
                          onClick={closeAll}
                        >
                          <Search className="h-4 w-4 shrink-0" aria-hidden />
                          {category.mainCategory}をすべて見る
                        </Link>
                      </li>
                      {category.subGroups.map((sg) => {
                        const isSubOpen = openSubGroup === sg.title;
                        const hasItems = sg.items.length > 0;

                        // 残った第3階層が無い中カテゴリは、開いても中身が無いのでボタンにせず直接リンクにする
                        if (!hasItems) {
                          return (
                            <li key={sg.title} className="relative overflow-visible">
                              <Link
                                href={getCategoryHref(sg.level2Id as string)}
                                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400"
                                onClick={closeAll}
                              >
                                <span className="truncate min-w-0 flex-1">{sg.title}</span>
                              </Link>
                            </li>
                          );
                        }

                        return (
                          <li key={sg.title} className="relative overflow-visible">
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400"
                              onClick={() => toggleSubGroup(sg.title)}
                              aria-expanded={isSubOpen}
                            >
                              <span className="truncate min-w-0 flex-1">{sg.title}</span>
                              <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                            </button>

                            {/* 第3階層：クリックで開いたときだけ描画する。中身は grid */}
                            {isSubOpen && (
                              <div
                                className={`absolute left-full top-0 z-50 ml-0 block w-max min-w-64 py-2 px-3 ${PANEL_BASE}`}
                              >
                                <p className="px-4 pb-2 text-xs font-semibold text-gray-500 border-b border-gray-800 mb-2">
                                  {sg.title}
                                </p>
                                {sg.level2Id && (
                                  <Link
                                    href={getCategoryHref(sg.level2Id)}
                                    className="mb-1 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-cyan-500 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400"
                                    onClick={closeAll}
                                  >
                                    <Search className="h-4 w-4 shrink-0" aria-hidden />
                                    {sg.title}をすべて見る
                                  </Link>
                                )}
                                <div
                                  className={`grid gap-x-8 gap-y-0 ${
                                    sg.items.length > 18 ? "grid-cols-3" : "grid-cols-2"
                                  }`}
                                >
                                  {sg.items.map((item) => (
                                    <Link
                                      key={item.name}
                                      href={getCategoryHref(item.slug, sg.title)}
                                      className="block w-full rounded-md px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400 whitespace-nowrap"
                                      onClick={closeAll}
                                    >
                                      {item.name}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}

          {/* コンテンツ系（ブログ・イベント）へのショートカット */}
          <li className="relative overflow-visible">
            <div className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400">
              <Link
                href="/blog"
                className="truncate min-w-0 flex-1 hover:text-cyan-400"
              >
                ブログ
              </Link>
            </div>
          </li>
          <li className="relative overflow-visible">
            <div className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-cyan-900/20 hover:text-cyan-400">
              <Link
                href="/events"
                className="truncate min-w-0 flex-1 hover:text-cyan-400"
              >
                イベント
              </Link>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
