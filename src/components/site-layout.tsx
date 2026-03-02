"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase/client";
import { HeaderAuth } from "@/components/header-auth";
import { MAIN_NAV_ITEMS } from "@/data/nav-items";

// user_id 未設定でもログアウトせず表示を許可するパス（公開ページ＋設定系）
const ALLOWED_WITHOUT_USER_ID = [
  "/onboarding",
  "/login",
  "/profile",
  "/signup",
  "/",
  "/reviews",
  "/events",
  "/blog",
  "/photos",
  "/likes",
  "/instruments",
  "/help",
  "/privacy",
  "/contact",
];

function isAllowedWithoutUserId(path: string | null): boolean {
  if (!path) return true;
  const base = path.split("?")[0];
  if (ALLOWED_WITHOUT_USER_ID.some((p) => p !== "/" && (base === p || base.startsWith(p + "/")))) return true;
  if (base === "/") return true;
  // レビュー一覧・個別閲覧は許可。編集・新規は許可しない
  if (base === "/reviews") return true;
  if (/^\/reviews\/[^/]+$/.test(base)) return true; // /reviews/xxx のみ
  return false;
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const db = getFirebaseFirestore();
  const isEmbed = pathname?.startsWith("/embed");

  // 初回ログインで user_id 未設定のままオンボーディング以外へ遷移した場合はログアウトしてトップへ
  useEffect(() => {
    if (isEmbed || !user || !db || isAllowedWithoutUserId(pathname ?? null)) return;
    let cancelled = false;
    (async () => {
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      if (cancelled) return;
      const data = profileSnap.data();
      const userIdSet = data && data.user_id != null && String(data.user_id).trim() !== "";
      if (!userIdSet) {
        await signOut();
        router.replace("/");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, user?.uid, db, signOut, router]);

  if (isEmbed) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)]">
        {children}
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass-card border-b border-surface-border transition-shadow duration-300 hover:shadow-electric-glow/20 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto w-full min-[1708px]:max-w-[min(90vw,2200px)] flex min-h-[44px] sm:h-12 md:h-14 items-center gap-2 sm:gap-3 px-2 sm:px-4">
          <a
            href="/"
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-electric-blue shrink-0 transition-all duration-300 hover:tracking-wide hover:drop-shadow-glow py-1.5 sm:py-2 min-h-[40px] sm:min-h-[44px] flex items-center touch-manipulation"
          >
            Gear-Loom
          </a>
          <div className="hidden md:block flex-1 min-w-0 overflow-hidden" aria-hidden>
            <nav
              className="flex items-center gap-0 sm:gap-1 overflow-x-auto scrollbar-hide w-full py-1 -mx-1"
              aria-label="メインメニュー"
            >
              {MAIN_NAV_ITEMS.map(({ href, label }) => (
                <a
                  key={href + label}
                  href={href}
                  className="shrink-0 text-xs sm:text-sm text-gray-300 hover:text-electric-blue transition-all duration-200 whitespace-nowrap px-2 py-2 sm:px-3 sm:py-2.5 min-h-[40px] sm:min-h-[44px] flex items-center touch-manipulation rounded-md active:bg-white/5"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <HeaderAuth />
        </div>
      </header>
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)] [padding-bottom:max(5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
      <footer className="border-t border-surface-border py-4">
        <div className="container mx-auto px-3 sm:px-4 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)] flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-electric-blue transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/contact" className="hover:text-electric-blue transition-colors">
            お問い合わせ
          </Link>
        </div>
      </footer>
    </>
  );
}
