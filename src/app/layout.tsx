import type { Metadata } from "next";
import { Syne, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
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

// SNSカード/Canonical を常に本番ドメインへ固定
const siteOrigin = "https://www.gear-loom.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Gear-Loom（ギアルーム）| 楽器・機材レビュー UGC プラットフォーム",
    template: "%s | Gear-Loom",
  },
  description:
    "ギアルーム（Gear-Loom）は楽器演奏者向けユーザー生成コンテンツプラットフォーム。機材レビューを共有し、EC検索リンクで購入までサポート。",
  verification: {
    google: "rsc3cSOPWuvFBL4izw0Q1GpCLZptOs5C8n-H2YgzAdk",
  },
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
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
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
