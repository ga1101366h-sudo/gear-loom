"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { MAIN_NAV_ITEMS } from "@/data/nav-items";

/** スマホのみ：ドロップダウンでメインナビ（PCは別で横タブを維持する想定） */
export function TopPageMainNavMobile() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const reviewsMainNav = pathname?.startsWith("/reviews/") ? searchParams?.get("mainNav") : null;
  const overrideActiveHref =
    reviewsMainNav === "blog" ? "/blog" : reviewsMainNav === "event" ? "/events" : null;

  const currentItem = overrideActiveHref
    ? MAIN_NAV_ITEMS.find((item) => item.href === overrideActiveHref)
    : MAIN_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const label = currentItem?.label ?? "コンテンツ";

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: Event) => {
      const target = e.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  return (
    <nav className="md:hidden w-full -mx-3 px-3 py-3 border-b border-surface-border/50" aria-label="メインメニュー">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-surface-border bg-surface-card/80 px-4 py-3 text-sm text-gray-200 hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-colors"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <span>現在の表示: {label}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-surface-border bg-surface-dark py-1 shadow-xl">
            {MAIN_NAV_ITEMS.map(({ href, label: itemLabel }) => (
              <Link
                key={href + itemLabel}
                href={href}
                className="block px-4 py-3 text-sm text-gray-200 hover:bg-electric-blue/10 hover:text-electric-blue transition-colors"
                onClick={() => setOpen(false)}
              >
                {itemLabel}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
