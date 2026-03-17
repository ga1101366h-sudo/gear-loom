"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PenSquare, Edit3, Layout } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { HeaderAuth } from "@/components/header-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HeaderMobileMenu } from "@/components/header-mobile-menu";
import { MAIN_NAV_ITEMS } from "@/data/nav-items";
import { useUserProfile } from "@/hooks/use-user-profile";

// user_id 未設定のとき許可するパス（設定・認証まわり＋公開プロフィール＋マイページ）。それ以外へ遷移したら即ログアウト
const ALLOWED_WITHOUT_USER_ID = [
  "/onboarding",
  "/login",
  "/profile",
  "/signup",
  "/users", // 公開プロフィール（/users/[userId]）は未認証・user_id 未設定でも閲覧可能
  "/mypage", // マイページ（公開プレビュー等）では user_id 取得のラグで誤ログアウトしないよう許可
];

function isAllowedWithoutUserId(path: string | null): boolean {
  if (!path) return true;
  const base = path.split("?")[0];
  return ALLOWED_WITHOUT_USER_ID.some((p) => base === p || base.startsWith(p + "/"));
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const isEmbed = pathname?.startsWith("/embed");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // user_id 未設定のユーザーが許可外の画面に遷移した場合は遷移先で即座にログアウト
  // 公開プロフィール（/users/*）では絶対にログアウトしない（セッションラグ時の誤判定を防止）
  // ※プロフィール未取得・取得失敗時（profile === undefined）は signOut しない＝ログイン状態を維持
  useEffect(() => {
    if (isEmbed || !user) return;
    const basePath = pathname?.split("?")[0] ?? "";
    if (basePath.startsWith("/users/") || isAllowedWithoutUserId(pathname ?? null)) return;
    if (profileLoading) return;
    if (profile === undefined) return;
    const userIdSet = profile && profile.user_id != null && String(profile.user_id).trim() !== "";
    if (!userIdSet) {
      void signOut();
    }
  }, [pathname, user?.uid, profile, profileLoading, isEmbed, signOut]);

  if (isEmbed) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)]">
        {children}
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full min-w-0 glass-card border-b border-surface-border transition-shadow duration-300 hover:shadow-electric-glow/20 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)] flex min-h-[44px] sm:h-12 md:h-14 items-center justify-between gap-2 px-3 sm:px-4">
          {/* モバイル: ロゴ ＋ 投稿 or ログイン ＋ ハンバーガー */}
          <div className="flex md:hidden w-full min-w-0 items-center gap-2">
            <a
              href="/"
              className="font-display text-base font-bold tracking-tight text-electric-blue shrink-0 transition-all duration-300 hover:drop-shadow-glow py-2 min-h-[44px] flex items-center touch-manipulation"
            >
              Gear-Loom
            </a>
            <div className="flex-1 min-w-0" aria-hidden />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-electric-blue px-2.5 py-2 text-xs font-medium text-surface-dark hover:bg-electric-blue-dim transition-all hover:shadow-electric-glow touch-manipulation"
                  >
                    <PenSquare className="h-4 w-4" aria-hidden />
                    <span>投稿</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  <DropdownMenuItem asChild>
                    <Link href="/reviews/new" className="flex items-center gap-2 cursor-pointer">
                      <Edit3 className="h-4 w-4 shrink-0" aria-hidden />
                      機材レビューを投稿
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/boards/publish" className="flex items-center gap-2 cursor-pointer">
                      <Layout className="h-4 w-4 shrink-0" aria-hidden />
                      エフェクターボードを投稿
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-electric-blue/50 bg-electric-blue/10 px-3 py-2 text-xs font-medium text-electric-blue hover:bg-electric-blue/20 transition-all"
              >
                ログイン
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-electric-blue/10 hover:text-electric-blue transition-colors touch-manipulation"
              aria-label="メニューを開く"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          {/* PC: 従来の横並びナビ */}
          <div className="hidden md:flex md:w-full md:min-w-0 md:items-center md:gap-3">
            <a
              href="/"
              className="font-display text-xl font-bold tracking-tight text-electric-blue shrink-0 transition-all duration-300 hover:tracking-wide hover:drop-shadow-glow py-2 min-h-[44px] flex items-center touch-manipulation"
            >
              Gear-Loom
            </a>
            <div className="flex-1 min-w-0 overflow-hidden" aria-hidden>
              <nav
                className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-full py-1 -mx-1"
                aria-label="メインメニュー"
              >
                {MAIN_NAV_ITEMS.map(({ href, label }) => {
                  const isActive = pathname === href || pathname?.startsWith(href + "/");
                  return (
                    <a
                      key={href + label}
                      href={href}
                      className={`shrink-0 text-sm whitespace-nowrap px-3 py-2.5 min-h-[44px] flex items-center touch-manipulation rounded-md border-b-2 transition-all duration-200 ${
                        isActive
                          ? "text-cyan-400 border-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] [box-shadow:0_4px_12px_rgba(6,182,212,0.6)]"
                          : "text-gray-400 border-transparent hover:text-white hover:border-cyan-400/50"
                      }`}
                    >
                      {label}
                    </a>
                  );
                })}
              </nav>
            </div>
            <Link
              href="/about"
              className="shrink-0 text-sm text-cyan-400 transition-all duration-200 py-2.5 min-h-[44px] flex items-center px-3 hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] whitespace-nowrap"
            >
              Gear-Loomとは？
            </Link>
            <HeaderAuth />
          </div>
        </div>
      </header>
      <HeaderMobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)] [padding-bottom:max(5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
      <footer className="border-t border-surface-border py-4">
        <div className="container mx-auto px-3 sm:px-4 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)] flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-electric-blue transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-electric-blue transition-colors">
            利用規約
          </Link>
          <Link href="/contact" className="hover:text-electric-blue transition-colors">
            お問い合わせ
          </Link>
        </div>
      </footer>
    </>
  );
}
