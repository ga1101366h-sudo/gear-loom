import type { Metadata } from "next";
import { Syne, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteLayout } from "@/components/site-layout";
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
  title: "Gear-Loom（ギアルーム）| 楽器・機材レビュー UGC プラットフォーム",
  description:
    "ギアルーム（Gear-Loom）は楽器演奏者向けユーザー生成コンテンツプラットフォーム。機材レビューを共有し、EC検索リンクで購入までサポート。",
  openGraph: {
    siteName: "Gear-Loom（ギアルーム）",
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
    <html lang="ja" className="dark" suppressHydrationWarning>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4447190031977944"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body
        className={`${syne.variable} ${notoSansJP.variable} font-sans antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4447190031977944"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <AuthProvider>
          <SiteLayout>{children}</SiteLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
