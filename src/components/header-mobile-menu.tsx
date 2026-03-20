"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/use-user-profile";
import { isAdminUserId } from "@/lib/admin";
import { MAIN_NAV_ITEMS } from "@/data/nav-items";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
};

const OVERLAY_CLOSE_DELAY_MS = 200;

export function HeaderMobileMenu({ open, onClose }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathnameRef = useRef(pathname);
  const overlayCanCloseRef = useRef(false);
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const [signingOut, setSigningOut] = useState(false);
  const profileUserId = (profile?.user_id as string | null) ?? null;
  const isAdmin = isAdminUserId(profileUserId);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    overlayCanCloseRef.current = false;
    const t = setTimeout(() => {
      overlayCanCloseRef.current = true;
    }, OVERLAY_CLOSE_DELAY_MS);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname;
      if (open) onClose();
    }
  }, [pathname, open, onClose]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      onClose();
      await signOut();
      window.location.href = "/";
    } finally {
      setSigningOut(false);
    }
  }

  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    if (open) {
      setAnimateIn(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setAnimateIn(false);
    }
  }, [open]);

  if (!open) return null;

  const reviewsMainNav = pathname?.startsWith("/reviews/") ? searchParams?.get("mainNav") : null;
  const overrideActiveHref =
    reviewsMainNav === "blog"
      ? "/blog"
      : reviewsMainNav === "event"
        ? "/events"
        : null;

  const getNavLinkClass = (href: string) => {
    const isActive = overrideActiveHref
      ? href === overrideActiveHref
      : pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));
    return isActive
      ? "block w-full rounded-lg px-4 py-3.5 text-left text-sm font-medium text-cyan-400 transition-colors border-l-4 border-cyan-400 bg-cyan-500/10 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
      : "block w-full rounded-lg px-4 py-3.5 text-left text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-cyan-500/10 hover:text-cyan-400/90 active:bg-cyan-500/15";
  };

  const navLinkBaseClass =
    "block w-full rounded-lg px-4 py-3.5 text-left text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-cyan-500/10 hover:text-cyan-400/90 active:bg-cyan-500/15";

  const accentLinkClass =
    "block w-full rounded-lg px-4 py-3.5 text-left text-sm font-medium text-cyan-400 transition-colors border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]";

  const handleOverlayClick = () => {
    if (overlayCanCloseRef.current) onClose();
  };

  return (
    <>
      {/* オーバーレイ：背景を暗くしクリックで閉じる（開直後は無視して即閉じを防ぐ） */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
        aria-hidden
        onClick={handleOverlayClick}
      />
      {/* 右からスライドインするドロワー */}
      <aside
        className={`fixed top-0 right-0 z-[70] flex h-full w-[min(280px,85vw)] flex-col border-l border-cyan-500/20 bg-surface-dark shadow-[-8px_0_32px_rgba(0,0,0,0.4),0_0_24px_rgba(6,182,212,0.08)] transition-transform duration-300 ease-out ${
          animateIn ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="メニュー"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3">
          <span className="text-sm font-semibold text-gray-300">メニュー</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 shrink-0 rounded-lg text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400"
            aria-label="メニューを閉じる"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {!user && (
              <>
                <li className="pb-4">
                  <p className="px-2 py-2 text-xs text-gray-500">ログイン / 新規登録</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Link
                      href="/login"
                      className="flex items-center justify-center rounded-lg border border-cyan-500 px-4 py-3 text-sm font-medium text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)] hover:bg-cyan-500/10 hover:shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all"
                      onClick={onClose}
                    >
                      ログイン
                    </Link>
                    <Link
                      href="/signup"
                      className="flex items-center justify-center rounded-lg border border-cyan-500 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)] hover:bg-cyan-500/20 transition-all"
                      onClick={onClose}
                    >
                      新規登録
                    </Link>
                  </div>
                </li>
                <li className="pt-4 border-t border-surface-border" aria-hidden />
              </>
            )}
            <li>
              <Link href="/about" className={accentLinkClass} onClick={onClose}>
                Gear-Loomとは？
              </Link>
            </li>
            {MAIN_NAV_ITEMS.map(({ href, label }) => (
              <li key={href + label}>
                <Link href={href} className={getNavLinkClass(href)} onClick={onClose}>
                  {label}
                </Link>
              </li>
            ))}
            {user ? (
              <>
                <li className="pt-4 mt-4 border-t border-surface-border" aria-hidden />
                <li>
                  <Link href="/mypage" className={getNavLinkClass("/mypage")} onClick={onClose}>
                    マイページ
                  </Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link href="/admin" className={getNavLinkClass("/admin")} onClick={onClose}>
                      管理者
                    </Link>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className={`w-full ${navLinkBaseClass} disabled:opacity-50`}
                  >
                    {signingOut ? "ログアウト中…" : "ログアウト"}
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="pt-4 mt-4 border-t border-surface-border" aria-hidden />
                <li>
                  <Link href="/signup" className={accentLinkClass} onClick={onClose}>
                    無料会員登録
                  </Link>
                </li>
                <li>
                  <Link href="/login" className={getNavLinkClass("/login")} onClick={onClose}>
                    ログイン
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}
