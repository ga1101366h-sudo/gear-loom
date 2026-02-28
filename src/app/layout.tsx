import type { Metadata } from "next";
import { Syne, Noto_Sans_JP } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { HeaderAuth } from "@/components/header-auth";
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

const navItems = [
  { href: "/reviews", label: "レビュー" },
  { href: "/reviews/compare", label: "比較リスト" },
  { href: "/notebook", label: "カスタム手帳" },
  { href: "/blog", label: "ブログ" },
  { href: "/likes", label: "いいね" },
  { href: "/photos", label: "フォト" },
  { href: "/events", label: "イベント" },
  { href: "/help", label: "ヘルプ" },
];

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
          <div className="container mx-auto w-full min-[1708px]:max-w-[min(90vw,2200px)] flex min-h-[52px] sm:h-14 items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 flex-wrap sm:flex-nowrap">
            <a
              href="/"
              className="font-display text-xl font-bold tracking-tight text-electric-blue shrink-0 transition-all duration-300 hover:tracking-wide hover:drop-shadow-glow py-2 min-h-[44px] flex items-center touch-manipulation"
            >
              Gear-Loom
            </a>
            <nav className="flex items-center gap-1 sm:gap-3 overflow-x-auto py-2 sm:py-0 scrollbar-hide -mx-1">
              {navItems.map(({ href, label }) => (
                <a
                  key={href + label}
                  href={href}
                  className="text-sm text-gray-300 hover:text-electric-blue transition-all duration-200 whitespace-nowrap hover:translate-y-[-1px] px-3 py-2.5 min-h-[44px] flex items-center touch-manipulation rounded-md active:bg-white/5"
                >
                  {label}
                </a>
              ))}
            </nav>
            <HeaderAuth />
          </div>
        </header>
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)] [padding-bottom:max(5rem,env(safe-area-inset-bottom))]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
