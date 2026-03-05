"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { POST_CATEGORY_GROUPS } from "@/data/post-categories";

function getCategoryHref(slug: string): string {
  switch (slug) {
    case "custom":
      return "/notebook";
    case "blog":
      return "/blog";
    case "photo":
      return "/photos";
    case "event":
      return "/events";
    default:
      return `/category/${encodeURIComponent(slug)}`;
  }
}

const ALL_CATEGORY_ITEMS = POST_CATEGORY_GROUPS.flatMap((g) => g.items);

/** スマホ用：「カテゴリから探す」ボタン＋タップで開くボトムシート */
export function TopPageCategoryNavMobile() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [animateUp, setAnimateUp] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sheetOpen) {
      setAnimateUp(false);
      return;
    }
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimateUp(true));
    });
    return () => {
      document.body.style.overflow = "";
      cancelAnimationFrame(id);
    };
  }, [sheetOpen]);

  return (
    <>
      <nav className="md:hidden w-full px-3 py-2" aria-label="カテゴリ">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-electric-blue/40 bg-electric-blue/10 py-3 text-sm font-medium text-electric-blue hover:bg-electric-blue/20 transition-colors"
        >
          <Search className="h-4 w-4" aria-hidden />
          🔍 カテゴリから探す
        </button>
      </nav>

      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/70 transition-opacity"
            aria-hidden
            onClick={() => setSheetOpen(false)}
          />
          <div
            ref={sheetRef}
            className={`fixed bottom-0 left-0 right-0 z-[56] max-h-[85vh] overflow-hidden rounded-t-2xl border-t border-surface-border bg-surface-dark shadow-2xl transition-transform duration-300 ease-out ${
              animateUp ? "translate-y-0" : "translate-y-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="カテゴリ一覧"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface-dark px-4 py-3">
              <span className="text-sm font-semibold text-gray-200">カテゴリから探す</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-electric-blue/10 hover:text-electric-blue"
              >
                閉じる
              </button>
            </div>
            <div className="overflow-y-auto p-4 pb-[env(safe-area-inset-bottom)]">
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORY_ITEMS.map((i) => (
                  <Link
                    key={i.slug}
                    href={getCategoryHref(i.slug)}
                    className="rounded-full border border-surface-border bg-surface-card/80 px-3 py-2 text-xs text-gray-300 hover:text-electric-blue hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-colors whitespace-nowrap"
                    onClick={() => setSheetOpen(false)}
                  >
                    {i.name_ja}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function TopPageCategoryNav() {
  return (
    <nav
      className="hidden md:block w-52 shrink-0 space-y-1 rounded-lg border border-surface-border bg-surface-card/80 py-3 px-3"
      aria-label="カテゴリ"
    >
      <p className="px-2 pb-2 text-xs font-medium text-gray-500 border-b border-surface-border/50 mb-2">
        カテゴリ
      </p>
      {POST_CATEGORY_GROUPS.map((g) => (
        <div key={g.groupLabel || g.items[0]?.slug} className="space-y-0.5">
          {g.groupLabel && (
            <p className="px-2 pt-2 first:pt-0 text-xs font-medium text-gray-500">
              {g.groupLabel}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.items.map((i) => (
              <li key={i.slug}>
                <Link
                  href={getCategoryHref(i.slug)}
                  className="block px-2 py-1.5 text-sm text-gray-300 hover:text-electric-blue hover:bg-electric-blue/5 rounded transition-colors"
                >
                  {i.name_ja}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
