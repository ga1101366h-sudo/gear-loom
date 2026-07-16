import Script from "next/script";

/**
 * Google Analytics 4（gtag.js）を root layout に注入するコンポーネント。
 *
 * 測定IDは環境変数 `NEXT_PUBLIC_GA_ID`（例: G-XXXXXXX）で制御する。
 * 未設定の場合は何も出力しない（開発・プレビュー環境で計測されないようにするため）。
 * 実IDはハードコードしない。
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
