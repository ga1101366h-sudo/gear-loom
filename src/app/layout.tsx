import type { Metadata } from "next";
import { Syne, Noto_Sans_JP } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { HeaderAuth } from "@/components/header-auth";
import { MAIN_NAV_ITEMS } from "@/data/nav-items";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://gear-loom.com");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Gear-Loom | 楽器・機材レビュー UGC プラットフォーム",
  description:
    "楽器演奏者向けユーザー生成コンテンツプラットフォーム。機材レビューを共有し、EC検索リンクで購入までサポート。",
  openGraph: {
    siteName: "Gear-Loom",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body
        className={`${syne.variable} ${notoSansJP.variable} font-sans antialiased min-h-screen`}
      >
        <AuthProvider>
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
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)] [padding-bottom:max(5rem,env(safe-area-inset-bottom))]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
