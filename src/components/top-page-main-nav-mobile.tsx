"use client";

import Link from "next/link";
import { MAIN_NAV_ITEMS } from "@/data/nav-items";

/** スマホのみ：トップページの「新着レビュー」直上に表示するメインナビ（横スライド） */
export function TopPageMainNavMobile() {
  return (
    <nav
      className="md:hidden w-full overflow-x-auto scrollbar-hide -mx-3 px-3 py-3 border-b border-surface-border/50"
      aria-label="メインメニュー"
    >
      <div className="flex gap-2 shrink-0 w-max">
        {MAIN_NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href + label}
            href={href}
            className="shrink-0 rounded-lg border border-surface-border bg-surface-card/80 px-4 py-2.5 text-sm text-gray-300 hover:text-electric-blue hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-colors whitespace-nowrap"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
